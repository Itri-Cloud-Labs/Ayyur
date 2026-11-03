import { describe, expect, it } from 'vitest';

import {
  bucketChecksums,
  bucketOf,
  type BucketTotal,
  differingBuckets,
  differingTables,
  getChecksum,
  rowHash,
  type RowMeta,
  tableChecksums,
  totalFromHex,
  totalsFromRows,
  totalToHex,
  updateTotal,
  ZERO_TOTAL,
} from '../checksum';
import { formatHlc } from '../clock';

const at = (ms: number) => formatHlc({ ms, counter: 0, device: '0000000000000001' });
const row = (id: string, ms: number, deleted = false, table = 'habit'): RowMeta => ({ table, id, version: at(ms), deleted });

describe('rowHash and bucketOf', () => {
  it('follow the exact formulas in spec 10', async () => {
    // Checked against WebCrypto's SHA-256, a separate implementation. If either formula changes,
    // the device and Convex stop agreeing until both update.
    const sha = async (text: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
    const meta = row('singleton', 1, true);
    const digest = await sha(`habit\x00singleton\x00${meta.version}\x001`);
    const hex = Array.from(digest.subarray(0, 16), (byte) => byte.toString(16).padStart(2, '0')).join('');
    expect(totalToHex(rowHash(meta))).toBe(hex);
    expect(bucketOf('singleton')).toBe((await sha('singleton'))[0] >> 4);
  });

  it('change with every field of the row metadata', () => {
    const base = rowHash(row('a', 1));
    expect(rowHash(row('b', 1))).not.toBe(base);
    expect(rowHash(row('a', 2))).not.toBe(base);
    expect(rowHash(row('a', 1, true))).not.toBe(base);
    expect(rowHash(row('a', 1, false, 'task'))).not.toBe(base);
  });

  it('spreads ids over all 16 buckets', () => {
    const buckets = new Set(Array.from({ length: 500 }, (_, i) => bucketOf(`id-${i}`)));
    expect(buckets.size).toBe(16);
  });
});

describe('running totals', () => {
  it('match a full scan after inserts, edits and deletes', () => {
    const rows = new Map<string, RowMeta>();
    const totals = new Map<string, string>();
    const apply = (next: RowMeta) => {
      const slot = `${next.table}/${bucketOf(next.id)}`;
      totals.set(slot, updateTotal(totals.get(slot) ?? ZERO_TOTAL, rows.get(next.id) ?? null, next));
      rows.set(next.id, next);
    };
    for (let i = 0; i < 200; i++) apply(row(`r${i % 37}`, i, i % 11 === 0));

    const asList: BucketTotal[] = [...totals].map(([slot, total]) => {
      const [table, bucket] = slot.split('/');
      return { table, bucket: Number(bucket), total };
    });
    expect(tableChecksums(asList)).toEqual(tableChecksums(totalsFromRows(rows.values())));
  });

  it('wrap around at 2^128 in both directions', () => {
    const max = (1n << 128n) - 1n;
    expect(totalToHex(max + 1n)).toBe(ZERO_TOTAL);
    expect(totalToHex(-1n)).toBe('f'.repeat(32));
    expect(totalFromHex(totalToHex(max))).toBe(max);
  });

  it('refuse to mix two different rows', () => {
    expect(() => updateTotal(ZERO_TOTAL, row('a', 1), row('b', 2))).toThrow();
  });

  it('return to zero when the only row leaves', () => {
    const one = updateTotal(ZERO_TOTAL, null, row('a', 1));
    const back = totalToHex(totalFromHex(one) - rowHash(row('a', 1)));
    expect(back).toBe(ZERO_TOTAL);
  });
});

describe('getChecksum', () => {
  const totals = totalsFromRows([row('a', 1), row('b', 2), row('c', 3, false, 'task')]);
  const source = {
    readTotals: async (table?: string) => totals.filter((total) => table === undefined || total.table === table),
  };

  it('gives one hash per table', async () => {
    const checksum = await getChecksum(source);
    expect(Object.keys(checksum).sort()).toEqual(['habit', 'task']);
  });

  it('gives all 16 buckets for one table', async () => {
    const buckets = await getChecksum(source, { table: 'habit' });
    expect(Object.keys(buckets)).toHaveLength(16);
    expect(buckets).toEqual(bucketChecksums(totals, 'habit'));
  });
});

describe('differing tables and buckets', () => {
  it('treat a missing key as empty', () => {
    expect(differingTables({ habit: ZERO_TOTAL }, {})).toEqual([]);
    expect(differingTables({ habit: '1'.padStart(32, '0') }, {})).toEqual(['habit']);
  });

  it('return buckets as sorted numbers', () => {
    const a = bucketChecksums([], 'habit');
    const b = { ...a, 2: '1'.padStart(32, '0'), 10: '2'.padStart(32, '0') };
    expect(differingBuckets(a, b)).toEqual([2, 10]);
  });
});
