// A simulated Convex deployment for one user. It follows spec section 8 with the real merge, clock and
// checksum modules. Values aren't encrypted here: the merge only ever reads clocks, so encryption
// doesn't change what converges.

import { bucketChecksums, type BucketTotal, bucketOf, tableChecksums, updateTotal, ZERO_TOTAL } from '../../checksum';
import { type Hlc, isTooFarAhead } from '../../clock';
import { isRowId } from '../../ids';
import { liveVersion, type MergeableRow, mergeRow, sameRowState } from '../../merge';

export type Cell = { readonly hlc: Hlc; readonly value: unknown };
export type SimRow = MergeableRow<Cell>;
export type WireRow = { readonly table: string; readonly rowId: string; readonly row: SimRow };

export type RefusalCode = 'noVault' | 'epochChanged' | 'clockAhead';
export type Refusal = { ok: false; code: RefusalCode; serverTime: number };
export type Result<T> = ({ ok: true } & T) | Refusal;

type Stored = WireRow & { seq: number };

export const slotOf = (table: string, rowId: string) => `${table}\0${rowId}`;
const totalSlot = (table: string, bucket: number) => `${table}\0${bucket}`;

export function totalsList(totals: ReadonlyMap<string, string>): BucketTotal[] {
  return [...totals].map(([slot, total]) => {
    const [table, bucket] = slot.split('\0');
    return { table, bucket: Number(bucket), total };
  });
}

/** Applies one row change to a running totals map, as the store and `push` do in their transactions. */
export function bumpTotals(totals: Map<string, string>, table: string, rowId: string, before: SimRow | null, after: SimRow | null) {
  const slot = totalSlot(table, bucketOf(rowId));
  const meta = (row: SimRow | null) => row && { table, id: rowId, version: row.version, deleted: row.deleted };
  totals.set(slot, updateTotal(totals.get(slot) ?? ZERO_TOTAL, meta(before), meta(after)));
}

export class SimServer {
  readonly rows = new Map<string, Stored>();
  readonly totals = new Map<string, string>();
  seq = 0;
  epoch = 1;
  vault: { idKey: Uint8Array; epoch: number } | null = null;
  lastWipe: 'delete' | 'reset' | null = null;

  constructor(private readonly now: () => number) {}

  private refuse(code: RefusalCode): Refusal {
    return { ok: false, code, serverTime: this.now() };
  }

  private check(epoch: number | null): Refusal | null {
    if (!this.vault) return this.refuse('noVault');
    if (epoch !== this.epoch) return this.refuse('epochChanged');
    return null;
  }

  /**
   * Returns, besides the time, every merged row that differs from the row sent: the cells where the
   * server already held something newer. Without them, a phone that pushed an older cell would never
   * learn it lost, because a merge that changes nothing stamps no seq for it to pull.
   */
  push(epoch: number | null, rows: readonly WireRow[]): Result<{ serverTime: number; newer: WireRow[] }> {
    const refused = this.check(epoch);
    if (refused) return refused;
    const now = this.now();
    for (const { row } of rows) {
      const clocks = [row.version, ...Object.values(row.cells).map((cell) => cell.hlc)];
      if (clocks.some((hlc) => isTooFarAhead(hlc, now))) return this.refuse('clockAhead');
    }
    if (rows.length > 100) throw new Error('badRequest: more than 100 rows');

    const newer: WireRow[] = [];
    for (const wire of rows) {
      const { table, rowId, row } = wire;
      const cellCount = Object.keys(row.cells).length;
      if (!isRowId(rowId)) throw new Error(`badRequest: row id ${rowId}`);
      if (row.deleted ? cellCount > 0 : cellCount === 0) throw new Error('badRequest: row shape');
      if (!row.deleted && row.version !== liveVersion(row.cells)) throw new Error('badRequest: version');

      const stored = this.rows.get(slotOf(table, rowId));
      const merged = stored ? mergeRow(stored.row, row) : row;
      if (!sameRowState(merged, row)) newer.push({ table, rowId, row: merged });
      if (stored && sameRowState(stored.row, merged)) continue;
      this.seq += 1;
      this.rows.set(slotOf(table, rowId), { table, rowId, row: merged, seq: this.seq });
      bumpTotals(this.totals, table, rowId, stored?.row ?? null, merged);
    }
    return { ok: true, serverTime: now, newer };
  }

  changes(epoch: number | null, cursor: number, limit: number): Result<{ rows: Stored[]; nextCursor: number }> {
    const refused = this.check(epoch);
    if (refused) return refused;
    const after = [...this.rows.values()].filter((row) => row.seq > cursor).sort((a, b) => a.seq - b.seq);
    const rows = after.slice(0, limit);
    // At the end, the cursor jumps to the account's seq. Wiped rows took their seqs with them, so no
    // remaining row may carry the latest one, and reconcile waits for the cursor to reach it.
    const nextCursor = rows.length === after.length ? this.seq : rows[rows.length - 1].seq;
    return { ok: true, rows, nextCursor };
  }

  checksum(epoch: number | null): Result<{ seq: number; tables: Record<string, string> }> {
    const refused = this.check(epoch);
    if (refused) return refused;
    return { ok: true, seq: this.seq, tables: tableChecksums(totalsList(this.totals)) };
  }

  buckets(epoch: number | null, table: string): Result<{ seq: number; buckets: Record<number, string> }> {
    const refused = this.check(epoch);
    if (refused) return refused;
    return { ok: true, seq: this.seq, buckets: bucketChecksums(totalsList(this.totals), table) };
  }

  bucketRows(epoch: number | null, table: string, bucket: number): Result<{ rows: { rowId: string; version: Hlc; deleted: boolean }[] }> {
    const refused = this.check(epoch);
    if (refused) return refused;
    const rows = [...this.rows.values()]
      .filter((row) => row.table === table && bucketOf(row.rowId) === bucket)
      .map(({ rowId, row }) => ({ rowId, version: row.version, deleted: row.deleted }));
    return { ok: true, rows };
  }

  rowsById(epoch: number | null, table: string, rowIds: readonly string[]): Result<{ rows: WireRow[] }> {
    const refused = this.check(epoch);
    if (refused) return refused;
    const rows = rowIds.flatMap((rowId) => {
      const stored = this.rows.get(slotOf(table, rowId));
      return stored ? [{ table, rowId, row: stored.row }] : [];
    });
    return { ok: true, rows };
  }

  /** `vault.create`. Returns the epoch, or null if a vault exists (`vaultExists`). */
  createVault(idKey: Uint8Array): number | null {
    if (this.vault) return null;
    this.vault = { idKey, epoch: this.epoch };
    return this.epoch;
  }

  /** `wipe`, all at once. The real one bumps the epoch first and then deletes in batches (spec 8.5). */
  wipe(reason: 'delete' | 'reset') {
    this.epoch += 1;
    this.vault = null;
    this.rows.clear();
    this.totals.clear();
    this.lastWipe = reason;
  }
}
