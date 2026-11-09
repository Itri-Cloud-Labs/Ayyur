// The M0 device check, docs/ayyurdb.md section 15. It answers, on a real phone, the questions the
// spec leaves open before the store is built: does SQLCipher open with a raw key, does libsodium run
// Argon2id and how long does it take, how does Drizzle's expo driver run transactions, how long does
// a 50-row write take, and which SecureStore option keeps a key on this device only.
//
// Temporary. Delete this folder, `src/app/m0.tsx` and the row in the You tab once the results are in
// the spec. Nothing here touches the app's own data: it uses its own database file and key name.

import { argon2id } from '@noble/hashes/argon2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { asc, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import type { CheckResult, CheckStatus } from './types';

export type { CheckResult, CheckStatus };

type Report = { status: CheckStatus; lines: string[] };
type Check = { id: string; title: string; run: () => Report | Promise<Report> };

const DB_NAME = 'ayyur-m0-check.db';
const STORE_KEY = 'ayyurdb.m0.check';
const ROWS = 50;
const ROUNDS = 20;

const now = () => performance.now();
const ms = (value: number) => `${value.toFixed(value < 10 ? 2 : 1)} ms`;
const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Lets the screen paint between checks. Several of them block the JS thread. */
const breathe = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

function stats(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  return { median: sorted[Math.floor(sorted.length / 2)], max: sorted[sorted.length - 1] };
}

function timed(samples: number[]) {
  const { median, max } = stats(samples);
  return `median ${ms(median)}, slowest ${ms(max)}`;
}

function deleteDatabase() {
  try {
    SQLite.deleteDatabaseSync(DB_NAME);
  } catch {
    // Not there yet.
  }
}

function openKeyed(keyHex: string) {
  const db = SQLite.openDatabaseSync(DB_NAME, { useNewConnection: true });
  // The raw-key form skips SQLCipher's own key derivation, so opening stays fast (spec 7.3).
  db.execSync(`PRAGMA key = "x'${keyHex}'"`);
  return db;
}

function device(): Report {
  const constants = Platform.constants as Record<string, unknown>;
  const hermes = (globalThis as { HermesInternal?: { getRuntimeProperties?: () => Record<string, unknown> } }).HermesInternal;
  return {
    status: 'info',
    lines: [
      `${Platform.OS} ${Platform.Version}, ${constants.Brand ?? constants.systemName ?? '?'} ${constants.Model ?? ''}`.trim(),
      `JavaScript engine: ${hermes ? `Hermes ${hermes.getRuntimeProperties?.()['OSS Release Version'] ?? ''}` : 'not Hermes'}`,
      __DEV__
        ? 'Development JavaScript. Timings are slower than a release; run again with `npm run dev:fast` for real numbers.'
        : 'Production JavaScript. Timings are representative.',
    ],
  };
}

function sqlcipher(): Report {
  const lines: string[] = [];
  deleteDatabase();
  const keyHex = bytesToHex(Crypto.getRandomBytes(32));
  const wrongKeyHex = bytesToHex(Crypto.getRandomBytes(32));

  let start = now();
  let db = openKeyed(keyHex);
  const version = db.getFirstSync<{ cipher_version: string }>('PRAGMA cipher_version');
  if (!version?.cipher_version) {
    db.closeSync();
    return { status: 'fail', lines: ['`PRAGMA cipher_version` returned nothing, so this build is plain SQLite, not SQLCipher.'] };
  }
  db.execSync('CREATE TABLE probe (id INTEGER PRIMARY KEY, value TEXT NOT NULL)');
  db.runSync('INSERT INTO probe (value) VALUES (?)', 'bismillah');
  lines.push(`SQLCipher ${version.cipher_version}. Created an encrypted database in ${ms(now() - start)}.`);
  db.closeSync();

  // Without the key, or with another key, the file must not open.
  for (const [label, key] of [['no key', null], ['the wrong key', wrongKeyHex]] as const) {
    db = key === null ? SQLite.openDatabaseSync(DB_NAME, { useNewConnection: true }) : openKeyed(key);
    try {
      db.getFirstSync('SELECT count(*) FROM sqlite_master');
      db.closeSync();
      return { status: 'fail', lines: [...lines, `The database opened with ${label}. It is not encrypted.`] };
    } catch (error) {
      lines.push(`With ${label}: refused ("${message(error)}").`);
      db.closeSync();
    }
  }

  start = now();
  db = openKeyed(keyHex);
  const row = db.getFirstSync<{ value: string }>('SELECT value FROM probe');
  const reopen = now() - start;
  db.closeSync();
  deleteDatabase();
  if (row?.value !== 'bismillah') return { status: 'fail', lines: [...lines, 'Reopening with the right key did not return the row.'] };
  lines.push(`Reopened with the right key and read the row in ${ms(reopen)}.`);
  return { status: 'pass', lines };
}

const probe = sqliteTable('probe', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  day: text('day').notNull(),
  status: text('status').notNull(),
  clocks: text('_clocks').notNull(),
  version: text('_version').notNull(),
  deleted: integer('_deleted').notNull(),
});

const probeRow = (round: number, index: number) => {
  const id = Crypto.randomUUID();
  const version = `${(1_700_000_000_000 + round).toString(16).padStart(12, '0')}:${index.toString(16).padStart(4, '0')}:00000000deadbeef`;
  return {
    id,
    title: `Read a page of Quran ${index}`,
    day: '2026-11-09',
    status: 'done',
    clocks: JSON.stringify({ title: version, day: version, status: version }),
    version,
    deleted: 0,
  };
};

/**
 * Times 50-row write transactions three ways, under each durability setting the store could use:
 * raw expo-sqlite with one prepared statement, Drizzle's own `transaction`, and a write shaped like
 * the store's (spec 7.4): the row, its SHA-256 row hash, a checksum total and a pending entry.
 */
function writes(): Report {
  const lines: string[] = [];
  let status: CheckStatus = 'pass';
  deleteDatabase();
  const db = openKeyed(bytesToHex(Crypto.getRandomBytes(32)));
  const orm = drizzle(db);
  try {
    const mode = db.getFirstSync<{ journal_mode: string }>('PRAGMA journal_mode = WAL');
    lines.push(`Journal mode: ${mode?.journal_mode}.`);
    db.execSync(`
      CREATE TABLE probe (id TEXT PRIMARY KEY, title TEXT NOT NULL, day TEXT NOT NULL, status TEXT NOT NULL,
        _clocks TEXT NOT NULL, _version TEXT NOT NULL, _deleted INTEGER NOT NULL);
      CREATE TABLE _checksum ("table" TEXT NOT NULL, bucket INTEGER NOT NULL, total TEXT NOT NULL, PRIMARY KEY ("table", bucket));
      CREATE TABLE _pending ("table" TEXT NOT NULL, id TEXT NOT NULL, "column" TEXT NOT NULL, hlc TEXT NOT NULL,
        PRIMARY KEY ("table", id, "column"));
    `);

    for (const synchronous of ['NORMAL', 'FULL'] as const) {
      db.execSync(`PRAGMA synchronous = ${synchronous}`);

      const raw: number[] = [];
      for (let round = 0; round < ROUNDS; round++) {
        const rows = Array.from({ length: ROWS }, (_, index) => probeRow(round, index));
        const start = now();
        db.withTransactionSync(() => {
          const insert = db.prepareSync('INSERT INTO probe VALUES (?, ?, ?, ?, ?, ?, ?)');
          try {
            for (const row of rows) insert.executeSync(row.id, row.title, row.day, row.status, row.clocks, row.version, row.deleted);
          } finally {
            insert.finalizeSync();
          }
        });
        raw.push(now() - start);
      }

      const viaDrizzle: number[] = [];
      for (let round = 0; round < ROUNDS; round++) {
        const rows = Array.from({ length: ROWS }, (_, index) => probeRow(round, index));
        const start = now();
        orm.transaction((tx) => {
          for (const row of rows) tx.insert(probe).values(row).run();
        });
        viaDrizzle.push(now() - start);
      }

      const storeShaped: number[] = [];
      for (let round = 0; round < ROUNDS; round++) {
        const rows = Array.from({ length: ROWS }, (_, index) => probeRow(round, index));
        const start = now();
        db.withTransactionSync(() => {
          const insert = db.prepareSync('INSERT INTO probe VALUES (?, ?, ?, ?, ?, ?, ?)');
          const total = db.prepareSync('INSERT INTO _checksum VALUES (?, ?, ?) ON CONFLICT DO UPDATE SET total = excluded.total');
          const pending = db.prepareSync('INSERT OR REPLACE INTO _pending VALUES (?, ?, ?, ?)');
          try {
            for (const row of rows) {
              insert.executeSync(row.id, row.title, row.day, row.status, row.clocks, row.version, row.deleted);
              const hash = sha256(utf8ToBytes(`probe\0${row.id}\0${row.version}\0${row.deleted}`));
              total.executeSync('probe', sha256(utf8ToBytes(row.id))[0] >> 4, bytesToHex(hash.subarray(0, 16)));
              for (const column of ['title', 'day', 'status']) pending.executeSync('probe', row.id, column, row.version);
            }
          } finally {
            insert.finalizeSync();
            total.finalizeSync();
            pending.finalizeSync();
          }
        });
        storeShaped.push(now() - start);
      }

      lines.push(`synchronous = ${synchronous}, ${ROWS} rows per transaction, ${ROUNDS} transactions each:`);
      lines.push(`  raw expo-sqlite: ${timed(raw)}`);
      lines.push(`  Drizzle transaction: ${timed(viaDrizzle)}`);
      lines.push(`  store-shaped (row, hash, total, 3 pending): ${timed(storeShaped)}`);
      // Spec 7.4 budgets 8 ms, half a frame, for a write transaction.
      if (synchronous === 'NORMAL' && stats(storeShaped).median > 8) status = 'info';
    }
    if (status === 'info') lines.push('The store-shaped write is over the 8 ms budget in spec 7.4. Transactions need fewer rows each.');

    // A throw inside a transaction must leave nothing behind, in both APIs.
    const before = db.getFirstSync<{ n: number }>('SELECT count(*) AS n FROM probe')!.n;
    for (const [label, attempt] of [
      ['expo-sqlite withTransactionSync', () => db.withTransactionSync(() => { db.runSync('DELETE FROM probe'); throw new Error('rollback'); })],
      ['Drizzle transaction', () => orm.transaction((tx) => { tx.delete(probe).run(); throw new Error('rollback'); })],
    ] as const) {
      try {
        attempt();
      } catch {
        // Expected.
      }
      const after = db.getFirstSync<{ n: number }>('SELECT count(*) AS n FROM probe')!.n;
      if (after !== before) return { status: 'fail', lines: [...lines, `${label} did not roll back after a throw.`] };
    }
    lines.push('A throw rolls the transaction back in expo-sqlite and in Drizzle.');
    lines.push("Drizzle's expo driver is synchronous throughout: `transaction` runs begin, the callback and commit on the JS thread.");
  } finally {
    db.closeSync();
    deleteDatabase();
  }
  return { status, lines };
}

/**
 * Spec 7.6 wants reads off the JS thread. Drizzle's expo driver only reads synchronously, so this
 * compares its `.all()` with the same SQL sent through expo-sqlite's async API.
 */
async function reads(): Promise<Report> {
  const lines: string[] = [];
  deleteDatabase();
  const fresh = openKeyed(bytesToHex(Crypto.getRandomBytes(32)));
  const freshOrm = drizzle(fresh);
  try {
    fresh.execSync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE probe (id TEXT PRIMARY KEY, title TEXT NOT NULL, day TEXT NOT NULL, status TEXT NOT NULL,
        _clocks TEXT NOT NULL, _version TEXT NOT NULL, _deleted INTEGER NOT NULL);
      CREATE INDEX probe_day ON probe (day);
    `);
    fresh.withTransactionSync(() => {
      const insert = fresh.prepareSync('INSERT INTO probe VALUES (?, ?, ?, ?, ?, ?, ?)');
      try {
        for (let index = 0; index < 5000; index++) {
          const row = probeRow(0, index % 0xffff);
          insert.executeSync(row.id, row.title, index < 200 ? '2026-11-09' : '2026-01-01', row.status, row.clocks, row.version, row.deleted);
        }
      } finally {
        insert.finalizeSync();
      }
    });

    const query = freshOrm.select().from(probe).where(sql`${probe.day} = ${'2026-11-09'} AND ${probe.deleted} = 0`).orderBy(asc(probe.id));
    const built = query.toSQL();

    const sync: number[] = [];
    const async: number[] = [];
    let count = 0;
    for (let round = 0; round < ROUNDS; round++) {
      let start = now();
      count = query.all().length;
      sync.push(now() - start);
      start = now();
      const rows = await fresh.getAllAsync(built.sql, built.params as SQLite.SQLiteBindValue[]);
      async.push(now() - start);
      if (rows.length !== count) return { status: 'fail', lines: [`Drizzle returned ${count} rows and the async API ${rows.length} for the same SQL.`] };
    }
    lines.push(`Reading ${count} rows of 5,000 by index, ${ROUNDS} times each:`);
    lines.push(`  Drizzle \`.all()\`, blocking the JS thread: ${timed(sync)}`);
    lines.push(`  same SQL through \`getAllAsync\`, wall time: ${timed(async)}`);
    lines.push('Drizzle has no async mode on expo-sqlite. To keep reads off the JS thread, the store builds SQL with Drizzle and runs it with `getAllAsync`.');
  } finally {
    fresh.closeSync();
    deleteDatabase();
  }
  return { status: 'info', lines };
}

async function secureStore(): Promise<Report> {
  const lines: string[] = [];
  if (!(await SecureStore.isAvailableAsync())) return { status: 'fail', lines: ['SecureStore is not available on this device.'] };
  const value = bytesToHex(Crypto.getRandomBytes(32));
  const options: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

  let start = now();
  SecureStore.setItem(STORE_KEY, value, options);
  const write = now() - start;
  start = now();
  const read = SecureStore.getItem(STORE_KEY, options);
  const readTime = now() - start;
  await SecureStore.deleteItemAsync(STORE_KEY, options);
  const gone = SecureStore.getItem(STORE_KEY, options);

  if (read !== value) return { status: 'fail', lines: ['SecureStore returned a different value from the one stored.'] };
  if (gone !== null) return { status: 'fail', lines: ['SecureStore still returned the value after deleting it.'] };
  lines.push(`Stored a 32-byte key as hex in ${ms(write)} and read it back synchronously in ${ms(readTime)}.`);
  lines.push('The option for "when unlocked, this device only" is `keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY`. It applies on iOS only.');
  if (Platform.OS === 'android') {
    lines.push('On Android, values sit in SharedPreferences under an Android Keystore key, which never leaves the device.');
  }
  return { status: 'pass', lines };
}

function random(): Report {
  const a = Crypto.getRandomBytes(32);
  const b = Crypto.getRandomBytes(32);
  const uuid = Crypto.randomUUID();
  if (a.length !== 32 || bytesToHex(a) === bytesToHex(b)) return { status: 'fail', lines: ['`getRandomBytes(32)` returned bad or repeated bytes.'] };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(uuid)) {
    return { status: 'fail', lines: [`\`randomUUID()\` returned "${uuid}", which is not a lowercase UUID v4.`] };
  }
  const start = now();
  for (let index = 0; index < 1000; index++) sha256(a);
  return {
    status: 'pass',
    lines: [
      '`expo-crypto` gives 32 random bytes and a lowercase UUID v4.',
      `@noble/hashes bundles and runs: 1,000 SHA-256 hashes in ${ms(now() - start)}.`,
    ],
  };
}

/** [opslimit, memory in MiB]. libsodium's "interactive" preset is 2 passes over 64 MiB. */
const ARGON_COSTS: readonly (readonly [number, number])[] = [
  [2, 19],
  [3, 32],
  [2, 64],
  [3, 64],
  [4, 64],
  [3, 128],
];

async function libsodium(): Promise<Report> {
  const lines: string[] = [];
  // Imported here, not at the top, so a missing native module fails this check alone.
  const sodium = await import('react-native-libsodium');
  await sodium.ready;
  if (typeof sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES !== 'number') {
    return { status: 'fail', lines: ["The libsodium native module didn't install its functions. It may not support this React Native version."] };
  }

  // XChaCha20-Poly1305 with associated data shaped like spec 12.2, zero bytes included.
  const key = sodium.crypto_aead_xchacha20poly1305_ietf_keygen();
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ad = ['ayyur.cell.v1', 'user_1', 'habitLog', 'k0123', 'status', '018f0000000a:0000:00000000deadbeef'].join('\0');
  const plaintext = JSON.stringify('done');
  const sealed = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(plaintext, ad, null, nonce, key);
  const opened = sodium.to_string(sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, sealed, ad, nonce, key));
  if (opened !== plaintext) return { status: 'fail', lines: ['XChaCha20-Poly1305 did not decrypt to what was encrypted.'] };
  if (nonce.length !== 24 || sealed.length !== plaintext.length + 16) {
    return { status: 'fail', lines: [`Unexpected sizes: nonce ${nonce.length} bytes, ciphertext ${sealed.length} for ${plaintext.length} bytes.`] };
  }
  lines.push('XChaCha20-Poly1305 round-trips, with a 24-byte nonce and a 16-byte tag.');

  // The associated data is a string with zero bytes in it. If the native side stopped reading at the
  // first zero, a value could be moved to another row or column without decryption failing.
  const moved = [ad.replace('status', 'title'), ad.replace('user_1', 'user_2'), `${ad.slice(0, -1)}e`];
  for (const other of moved) {
    try {
      sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, sealed, other, nonce, key);
      return {
        status: 'fail',
        lines: [...lines, 'Decryption succeeded with different associated data after a zero byte. The library cuts the string at the first zero, so spec 12.2 needs another separator.'],
      };
    } catch {
      // Expected.
    }
  }
  lines.push('Changing the associated data after a zero byte makes decryption fail, so the whole string is bound.');
  lines.push('The library takes associated data as a string only, not bytes.');

  let start = now();
  for (let index = 0; index < 1000; index++) sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(plaintext, ad, null, nonce, key);
  lines.push(`1,000 cell encryptions: ${ms(now() - start)}.`);

  // Argon2id: first that it is the real algorithm, by comparing a cheap derivation with @noble/hashes.
  const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
  const password = 'correct horse battery staple';
  const derive = (ops: number, bytes: number) => sodium.crypto_pwhash(32, password, salt, ops, bytes, sodium.crypto_pwhash_ALG_ARGON2ID13);
  const native = bytesToHex(derive(1, 64 * 1024));
  const reference = bytesToHex(argon2id(password, salt, { t: 1, m: 64, p: 1, dkLen: 32 }));
  if (native !== reference) return { status: 'fail', lines: [...lines, '`crypto_pwhash` ran, but its output differs from the Argon2id reference.'] };
  lines.push('`crypto_pwhash` runs natively and matches the Argon2id reference from @noble/hashes.');

  lines.push('Argon2id timings, to pick about 1 second (spec 12.1). It blocks the JS thread while it runs:');
  for (const [ops, mib] of ARGON_COSTS) {
    await breathe();
    try {
      start = now();
      derive(ops, mib * 1024 * 1024);
      lines.push(`  ${ops} passes over ${mib} MiB: ${ms(now() - start)}`);
    } catch (error) {
      lines.push(`  ${ops} passes over ${mib} MiB: failed ("${message(error)}")`);
    }
  }
  return { status: 'pass', lines };
}

const CHECKS: readonly Check[] = [
  { id: 'device', title: 'Device', run: device },
  { id: 'sqlcipher', title: 'SQLCipher', run: sqlcipher },
  { id: 'writes', title: 'Write transactions', run: writes },
  { id: 'reads', title: 'Reads', run: reads },
  { id: 'secureStore', title: 'SecureStore', run: secureStore },
  { id: 'random', title: 'Random bytes and hashing', run: random },
  { id: 'libsodium', title: 'libsodium', run: libsodium },
];

export const CHECK_TITLES = CHECKS.map(({ id, title }) => ({ id, title }));

/** Runs every check in order. One failing or throwing doesn't stop the rest. */
export async function runDeviceCheck(onResult: (result: CheckResult) => void): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  for (const check of CHECKS) {
    await breathe();
    let report: Report;
    try {
      report = await check.run();
    } catch (error) {
      report = { status: 'fail', lines: [`Threw: ${message(error)}`] };
    }
    const result = { id: check.id, title: check.title, ...report };
    results.push(result);
    onResult(result);
  }
  return results;
}

const MARK: Record<CheckStatus, string> = { pass: 'PASS', fail: 'FAIL', info: 'INFO' };

/** The results as plain text, to share from the phone. */
export function formatReport(results: readonly CheckResult[]): string {
  const body = results.map((result) => `[${MARK[result.status]}] ${result.title}\n${result.lines.join('\n')}`);
  return ['Ayyur M0 device check', ...body].join('\n\n');
}
