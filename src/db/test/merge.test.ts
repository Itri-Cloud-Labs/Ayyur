import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { formatHlc, type Hlc } from '../clock';
import { liveVersion, type MergeableRow, mergeRow, sameRowState } from '../merge';

type Cell = { hlc: Hlc; value: string };
type Row = MergeableRow<Cell>;

const at = (ms: number, device = '0000000000000001') => formatHlc({ ms, counter: 0, device });
const live = (cells: Record<string, Cell>): Row => ({ deleted: false, version: liveVersion(cells), cells });
const tombstone = (version: Hlc): Row => ({ deleted: true, version, cells: {} });

describe('mergeRow', () => {
  it('keeps the newer cell for each column', () => {
    const a = live({ title: { hlc: at(2), value: 'A2' }, note: { hlc: at(1), value: 'A1' } });
    const b = live({ title: { hlc: at(1), value: 'B1' }, note: { hlc: at(3), value: 'B3' } });
    expect(mergeRow(a, b)).toEqual(live({ title: { hlc: at(2), value: 'A2' }, note: { hlc: at(3), value: 'B3' } }));
  });

  it('takes a column one side lacks from the other', () => {
    const a = live({ title: { hlc: at(1), value: 'A' } });
    const b = live({ note: { hlc: at(2), value: 'B' } });
    expect(mergeRow(a, b).cells).toEqual({ title: { hlc: at(1), value: 'A' }, note: { hlc: at(2), value: 'B' } });
  });

  it('lets a delete win over a newer edit', () => {
    const edit = live({ title: { hlc: at(9), value: 'late edit' } });
    expect(mergeRow(edit, tombstone(at(1)))).toEqual(tombstone(at(1)));
    expect(mergeRow(tombstone(at(1)), edit)).toEqual(tombstone(at(1)));
  });

  it('keeps the larger delete clock when both sides deleted', () => {
    expect(mergeRow(tombstone(at(1)), tombstone(at(2)))).toEqual(tombstone(at(2)));
  });

  it('treats a column named like an Object.prototype property as a plain column', () => {
    const a = live({ constructor: { hlc: at(1), value: 'A' } });
    const b = live({ constructor: { hlc: at(2), value: 'B' } });
    expect(mergeRow(a, b).cells.constructor).toEqual({ hlc: at(2), value: 'B' });
    expect(mergeRow(live({ title: { hlc: at(1), value: 'A' } }), b).cells.constructor).toEqual({ hlc: at(2), value: 'B' });
  });

  it('refuses a live row with no cells', () => {
    expect(() => liveVersion({})).toThrow();
  });
});

describe('sameRowState', () => {
  it('compares deleted, version and cell clocks, not values', () => {
    const a = live({ title: { hlc: at(1), value: 'ciphertext 1' } });
    const b = live({ title: { hlc: at(1), value: 'ciphertext 2' } });
    expect(sameRowState(a, b)).toBe(true);
    expect(sameRowState(a, live({ title: { hlc: at(2), value: 'x' } }))).toBe(false);
    expect(sameRowState(a, tombstone(a.version))).toBe(false);
  });
});

// Invariant 10. Cells get their value from their clock, as real writes do: one clock, one value.
// Clocks come from a small range so that columns often collide.
const columnName = fc.constantFrom('a', 'b', 'c', 'd');
const clock = fc.tuple(fc.integer({ min: 1, max: 6 }), fc.constantFrom('0000000000000001', '0000000000000002')).map(
  ([ms, device]) => at(ms, device),
);
const cellFor = (column: string) => clock.map((hlc): Cell => ({ hlc, value: `${column}@${hlc}` }));
const liveRow = fc
  .uniqueArray(columnName, { minLength: 1, maxLength: 4 })
  .chain((columns) => fc.tuple(...columns.map((column) => cellFor(column).map((cell) => [column, cell] as const))))
  .map((entries) => live(Object.fromEntries(entries)));
const row: fc.Arbitrary<Row> = fc.oneof({ weight: 4, arbitrary: liveRow }, { weight: 1, arbitrary: clock.map(tombstone) });

describe('mergeRow properties', () => {
  it('is commutative', () => {
    fc.assert(
      fc.property(row, row, (a, b) => {
        expect(mergeRow(a, b)).toEqual(mergeRow(b, a));
      }),
    );
  });

  it('is associative', () => {
    fc.assert(
      fc.property(row, row, row, (a, b, c) => {
        expect(mergeRow(mergeRow(a, b), c)).toEqual(mergeRow(a, mergeRow(b, c)));
      }),
    );
  });

  it('is idempotent', () => {
    fc.assert(
      fc.property(row, row, (a, b) => {
        expect(mergeRow(a, a)).toEqual(a);
        const merged = mergeRow(a, b);
        expect(mergeRow(merged, b)).toEqual(merged);
      }),
    );
  });

  it('never loses a delete', () => {
    fc.assert(
      fc.property(row, row, (a, b) => {
        if (a.deleted || b.deleted) expect(mergeRow(a, b).deleted).toBe(true);
      }),
    );
  });
});
