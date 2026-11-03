// Row ids, spec section 6. Plain TypeScript: Convex runs this file too, so it must not import React
// Native, Expo or anything under `@/`.

import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

/** The fixed id of a singleton table's only row. */
export const SINGLETON_ID = 'singleton';

/** A value allowed in a key column: text, integer, boolean, day, enum or ref (spec 4.3). */
export type KeyValue = string | number | boolean;

/** Fills a new array with `length` cryptographically random bytes: `expo-crypto` on the phone, Node's crypto in tests. */
export type RandomBytes = (length: number) => Uint8Array;

export const ID_KEY_BYTES = 32;

const RANDOM_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const KEYED_ID_PATTERN = /^k[0-9a-f]{32}$/;

/** A random UUID v4, in lowercase. v4 rather than v7, so the id doesn't reveal when the row was made. */
export function randomId(randomBytes: RandomBytes): string {
  const bytes = randomBytes(16);
  if (bytes.length !== 16) throw new Error('randomBytes returned the wrong number of bytes');
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytesToHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** A new id key for a device or an account (spec 6.3). */
export function newIdKey(randomBytes: RandomBytes): Uint8Array {
  const key = randomBytes(ID_KEY_BYTES);
  if (key.length !== ID_KEY_BYTES) throw new Error('randomBytes returned the wrong number of bytes');
  return key;
}

/**
 * The id of a keyed row (spec 6.2): `k` and the first 16 bytes of
 * HMAC-SHA-256(idKey, JSON.stringify([table, ...key])), in hex. This is the only place that computes it.
 *
 * The hash is keyed so the server can't guess a row's key from its id. A plain hash of
 * `["habitLog", "<habit id>", "2026-11-03"]` could be found by trying every date.
 *
 * @param key the key column values in the order the table's `key` lists them
 */
export function keyedId(idKey: Uint8Array, table: string, key: readonly KeyValue[]): string {
  if (idKey.length !== ID_KEY_BYTES) throw new Error(`An id key must be ${ID_KEY_BYTES} bytes`);
  if (key.length === 0) throw new Error('A keyed id needs at least one key value');
  const values = key.map((value) => {
    if (typeof value === 'string') return value.normalize('NFC');
    if (typeof value === 'number' && !Number.isSafeInteger(value)) {
      throw new TypeError(`Key values must be safe integers, got ${value}`);
    }
    return value;
  });
  const mac = hmac(sha256, idKey, utf8ToBytes(JSON.stringify([table, ...values])));
  return `k${bytesToHex(mac.subarray(0, 16))}`;
}

export function isRandomId(id: string): boolean {
  return RANDOM_ID_PATTERN.test(id);
}

export function isKeyedId(id: string): boolean {
  return KEYED_ID_PATTERN.test(id);
}

/** True for any of the three id forms. Convex checks this in `push` (spec 8.2). */
export function isRowId(id: unknown): id is string {
  return typeof id === 'string' && (id === SINGLETON_ID || isRandomId(id) || isKeyedId(id));
}

export type RekeyMove = { from: string; to: string };

/**
 * Plans re-keying for one keyed table (spec 6.4): the new id of every row whose id changes under
 * `idKey`. The store applies the plan in one write transaction. Under the new key two rows can
 * only land on the same id if local data was already inconsistent; those moves share a `to`, and
 * the store merges them into one row.
 */
export function planRekey(
  idKey: Uint8Array,
  table: string,
  rows: Iterable<{ id: string; key: readonly KeyValue[] }>,
): RekeyMove[] {
  const moves: RekeyMove[] = [];
  for (const row of rows) {
    const to = keyedId(idKey, table, row.key);
    if (to !== row.id) moves.push({ from: row.id, to });
  }
  return moves;
}

