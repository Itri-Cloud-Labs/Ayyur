// The checksum system, spec section 10. A pure getter: it reads running totals and never decides
// what a mismatch means. Plain TypeScript: Convex runs this file too, so it must not import React
// Native, Expo or anything under `@/`.

import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

import type { Hlc } from '../clock';

export const BUCKETS = 16;

/** A bucket or table total with no rows in it. Totals are 32 lowercase hex characters: 128 bits. */
export const ZERO_TOTAL = '0'.repeat(32);

const MOD = 1n << 128n;

/** The sync metadata a row hash covers. Content is never hashed: the same value encrypts differently each time. */
export type RowMeta = { table: string; id: string; version: Hlc; deleted: boolean };

export type BucketTotal = { table: string; bucket: number; total: string };

/** First 16 bytes of SHA-256(table ‖ 0x00 ‖ id ‖ 0x00 ‖ version ‖ 0x00 ‖ "0" or "1"), as a 128-bit integer. */
export function rowHash({ table, id, version, deleted }: RowMeta): bigint {
  const digest = sha256(utf8ToBytes(`${table}\0${id}\0${version}\0${deleted ? '1' : '0'}`));
  return BigInt(`0x${bytesToHex(digest.subarray(0, 16))}`);
}

/** The first 4 bits of SHA-256(id): 0 to 15. Hashing spreads fixed ids like `singleton` evenly. */
export function bucketOf(id: string): number {
  return sha256(utf8ToBytes(id))[0] >> 4;
}

export function totalToHex(value: bigint): string {
  return (((value % MOD) + MOD) % MOD).toString(16).padStart(32, '0');
}

export function totalFromHex(total: string): bigint {
  if (!/^[0-9a-f]{32}$/.test(total)) throw new TypeError(`Not a checksum total: ${total}`);
  return BigInt(`0x${total}`);
}

/**
 * The new bucket total after one row changes: subtract the old row hash, add the new one (spec 10).
 * `before` is null for a new row. `after` is null only when re-keying moves a row to another id
 * (spec 6.4). Both sides must be the same row, so they share a bucket.
 */
export function updateTotal(total: string, before: RowMeta | null, after: RowMeta | null): string {
  if (before !== null && after !== null && (before.table !== after.table || before.id !== after.id)) {
    throw new Error('updateTotal needs two versions of the same row');
  }
  let value = totalFromHex(total);
  if (after !== null) value += rowHash(after);
  if (before !== null) value -= rowHash(before);
  return totalToHex(value);
}

/** Every bucket total, worked out by scanning rows. For tests, and for rebuilding totals after a repair. */
export function totalsFromRows(rows: Iterable<RowMeta>): BucketTotal[] {
  const sums = new Map<string, bigint>();
  for (const row of rows) {
    const slot = `${row.table}\0${bucketOf(row.id)}`;
    sums.set(slot, (sums.get(slot) ?? 0n) + rowHash(row));
  }
  return [...sums].map(([slot, sum]) => {
    const [table, bucket] = slot.split('\0');
    return { table, bucket: Number(bucket), total: totalToHex(sum) };
  });
}

/** `{ [table]: hash }`. A table's hash is the sum of its bucket totals. Tables with no totals are left out. */
export function tableChecksums(totals: Iterable<BucketTotal>): Record<string, string> {
  const sums = new Map<string, bigint>();
  for (const { table, total } of totals) sums.set(table, (sums.get(table) ?? 0n) + totalFromHex(total));
  return Object.fromEntries([...sums].map(([table, sum]) => [table, totalToHex(sum)]));
}

/** `{ [bucket]: hash }` for one table, with all 16 buckets present. */
export function bucketChecksums(totals: Iterable<BucketTotal>, table: string): Record<number, string> {
  const buckets: Record<number, string> = {};
  for (let bucket = 0; bucket < BUCKETS; bucket++) buckets[bucket] = ZERO_TOTAL;
  for (const total of totals) {
    if (total.table === table) buckets[total.bucket] = total.total;
  }
  return buckets;
}

/** Where the running totals live: `_checksum` in SQLite, `checksums` in Convex. */
export type ChecksumSource = {
  /** The stored bucket totals, for one table or for all of them. */
  readTotals(table?: string): Promise<readonly BucketTotal[]>;
};

/** `getChecksum(source)` gives `{ [table]: hash }`. With `{ table }` it gives that table's 16 bucket hashes. */
export function getChecksum(source: ChecksumSource): Promise<Record<string, string>>;
export function getChecksum(source: ChecksumSource, scope: { table: string }): Promise<Record<number, string>>;
export async function getChecksum(source: ChecksumSource, scope?: { table: string }) {
  if (scope) return bucketChecksums(await source.readTotals(scope.table), scope.table);
  return tableChecksums(await source.readTotals());
}

/** The tables whose hashes differ. A table missing on one side counts as empty. */
export function differingTables(a: Record<string, string>, b: Record<string, string>): string[] {
  return differingKeys(a, b);
}

/** The buckets whose hashes differ. A bucket missing on one side counts as empty. */
export function differingBuckets(a: Record<number, string>, b: Record<number, string>): number[] {
  return differingKeys(a, b)
    .map(Number)
    .sort((x, y) => x - y);
}

function differingKeys(a: Record<string | number, string>, b: Record<string | number, string>): string[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const total = (side: Record<string | number, string>, key: string) => (Object.hasOwn(side, key) ? side[key] : ZERO_TOTAL);
  return [...keys].filter((key) => total(a, key) !== total(b, key)).sort();
}
