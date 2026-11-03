// A simulated phone. Its rows, clock, checksum totals, ids and merges use the real modules. Push, pull,
// reconcile, epochs, re-keying and the clock repair are a model of spec sections 6.4, 9.4 and 11,
// written to match the spec step by step; M3 replaces this model with the real sync code.

import { bucketChecksums, bucketOf, differingBuckets, differingTables, tableChecksums } from '../../checksum';
import { type Clock, createClock, type Hlc, isTooFarAhead, MAX_AHEAD_MS } from '../../clock';
import { keyedId, planRekey, randomId, SINGLETON_ID } from '../../ids';
import { liveVersion, mergeRow, sameRowState } from '../../merge';
import type { Rng } from './rng';
import { bumpTotals, type Cell, type Refusal, SimServer, type SimRow, slotOf, totalsList, type WireRow } from './server';

export const DAYS = ['2026-11-01', '2026-11-02', '2026-11-03'] as const;
export const PRAYERS = ['fajr', 'isha'] as const;

/** The world a device lives in: shared time, randomness and the server. */
export type Env = { now(): number; rng: Rng; server: SimServer };

type Change = { set: Record<string, unknown> } | { remove: true };

export class SimDevice {
  readonly rows = new Map<string, WireRow>();
  readonly totals = new Map<string, string>();
  /** Row slot to `column` or `*` (a delete) to the clock that was written. */
  readonly pending = new Map<string, Map<string, Hlc>>();
  readonly clock: Clock;
  /** How far this phone's wall clock is from true time, in ms. */
  offset = 0;
  state: 'off' | 'on' | 'locked' = 'off';
  epoch: number | null = null;
  cursor = 0;
  clockWrong = false;
  notice: 'cloudDeleted' | 'keyChanged' | null = null;

  constructor(
    readonly name: string,
    private readonly env: Env,
    public idKey: Uint8Array,
  ) {
    this.clock = createClock(env.rng.hex(16), null, () => this.now());
  }

  now() {
    return this.env.now() + this.offset;
  }

  private get server() {
    return this.env.server;
  }

  // Writes, spec 7.4 and 7.5. One clock tick per transaction.

  private write(table: string, rowId: string, change: Change) {
    const slot = slotOf(table, rowId);
    const before = this.rows.get(slot)?.row ?? null;
    const hlc = this.clock.tick();
    // Every write sorts after the row it changes. If not, the server would keep the older cell
    // without stamping a seq, and this device would never learn it lost.
    if (before && hlc <= before.version) throw new Error(`write clock ${hlc} isn't after ${before.version}`);
    let after: SimRow;
    const changed: string[] = [];

    if ('remove' in change) {
      if (!before) throw new Error(`remove of a missing row ${slot}`);
      if (before.deleted) return;
      after = { deleted: true, version: hlc, cells: {} };
    } else {
      if (before?.deleted) throw new Error(`edit of a deleted row ${slot}`);
      const cells: Record<string, Cell> = { ...before?.cells };
      for (const [column, value] of Object.entries(change.set)) {
        // Invariant 3: a column's clock changes only when its value changes.
        if (Object.hasOwn(cells, column) && cells[column].value === value) continue;
        cells[column] = { hlc, value };
        changed.push(column);
      }
      if (changed.length === 0) return;
      after = { deleted: false, version: liveVersion(cells), cells };
    }

    this.store(table, rowId, before, after);
    if (this.state !== 'on') return;
    if ('remove' in change) this.pending.set(slot, new Map([['*', hlc]]));
    else {
      const entries = this.pending.get(slot) ?? new Map<string, Hlc>();
      for (const column of changed) entries.set(column, hlc);
      this.pending.set(slot, entries);
    }
  }

  private store(table: string, rowId: string, before: SimRow | null, after: SimRow) {
    this.rows.set(slotOf(table, rowId), { table, rowId, row: after });
    bumpTotals(this.totals, table, rowId, before, after);
  }

  liveRows(table: string) {
    return [...this.rows.values()].filter((row) => row.table === table && !row.row.deleted);
  }

  insertHabit(title: string) {
    const id = randomId(this.env.rng.bytes);
    this.write('habit', id, { set: { title, archived: false } });
    return id;
  }

  editHabit(rowId: string, patch: Record<string, unknown>) {
    this.write('habit', rowId, { set: patch });
  }

  removeHabit(rowId: string) {
    this.write('habit', rowId, { remove: true });
  }

  /** An upsert on the keyed `prayerLog` table, key `[day, prayer]`. Keyed tables have no remove (rule R6). */
  logPrayer(day: string, prayer: string, status: 'done' | 'cleared') {
    this.write('prayerLog', keyedId(this.idKey, 'prayerLog', [day, prayer]), { set: { day, prayer, status } });
  }

  editProfile(patch: Record<string, unknown>) {
    this.write('profile', SINGLETON_ID, { set: patch });
  }

  // Push, spec 11.3.

  /**
   * What to send for one pending row: the whole row, every cell with its clock (spec 11.3). Sending
   * only the changed columns would let the server create a row missing required columns, if it never
   * received the full row. Entries that no longer describe the local row are dropped.
   */
  private pendingWire(slot: string): WireRow | null {
    const entries = this.pending.get(slot)!;
    const local = this.rows.get(slot)!;
    const deleteClock = entries.get('*');
    if (deleteClock !== undefined) {
      if (local.row.deleted && local.row.version === deleteClock) return local;
      this.pending.delete(slot);
      return null;
    }
    for (const [column, hlc] of entries) {
      if (local.row.deleted || local.row.cells[column]?.hlc !== hlc) entries.delete(column);
    }
    if (entries.size === 0) {
      this.pending.delete(slot);
      return null;
    }
    return local;
  }

  /**
   * Pushes everything pending. With `loseResponses`, Convex sometimes applies a batch but the phone
   * never hears back, as when the network drops mid-request; the entries stay pending and go again.
   */
  push({ loseResponses = false } = {}): boolean {
    while (this.state === 'on' && this.pending.size > 0) {
      const batch = [...this.pending.keys()]
        .slice(0, 100)
        .map((slot) => this.pendingWire(slot))
        .filter((row): row is WireRow => row !== null);
      if (batch.length === 0) continue;
      const result = this.server.push(this.epoch, batch);
      if (!result.ok) {
        this.handleRefusal(result);
        return false;
      }
      if (loseResponses && this.env.rng.chance(0.15)) return false;
      this.clock.receiveServerTime(result.serverTime);
      for (const sent of batch) this.confirm(sent);
      for (const row of result.newer) this.applyPulled(row);
    }
    return this.state === 'on';
  }

  /** Removes pending entries a push confirmed, unless the column changed again while it was in flight. */
  private confirm(sent: WireRow) {
    const slot = slotOf(sent.table, sent.rowId);
    const entries = this.pending.get(slot);
    if (!entries) return;
    if (sent.row.deleted) {
      if (entries.get('*') === sent.row.version) entries.delete('*');
    } else {
      for (const [column, cell] of Object.entries(sent.row.cells)) {
        if (entries.get(column) === cell.hlc) entries.delete(column);
      }
    }
    if (entries.size === 0) this.pending.delete(slot);
  }

  // Pull, spec 11.4.

  /** Merges one row from the server into the local store. Never adds to `_pending`. */
  private applyPulled(wire: WireRow) {
    for (const cell of Object.values(wire.row.cells)) this.clock.receive(cell.hlc);
    this.clock.receive(wire.row.version);
    const slot = slotOf(wire.table, wire.rowId);
    const local = this.rows.get(slot)?.row ?? null;
    const merged = local ? mergeRow(local, wire.row) : wire.row;
    if (!local || !sameRowState(local, merged)) this.store(wire.table, wire.rowId, local, merged);
    // Pending entries the server already beat would change nothing if pushed.
    if (this.pending.has(slot)) this.pendingWire(slot);
  }

  /**
   * Pulls up to `pages` pages. With `interrupt`, the last page stops halfway without moving the
   * cursor, as when the app is killed mid-page; the next pull applies those rows again.
   */
  pull({ pages = Infinity, pageSize = 200, interrupt = false } = {}) {
    for (let page = 0; page < pages && this.state === 'on'; page++) {
      const result = this.server.changes(this.epoch, this.cursor, pageSize);
      if (!result.ok) return this.handleRefusal(result);
      if (result.rows.length === 0) {
        this.cursor = result.nextCursor;
        return;
      }
      const last = interrupt && page === pages - 1;
      const rows = last ? result.rows.slice(0, Math.ceil(result.rows.length / 2)) : result.rows;
      for (const row of rows) this.applyPulled(row);
      if (last) return;
      this.cursor = result.nextCursor;
    }
  }

  // Reconcile, spec 11.5.

  /** Returns true once the local checksums match the server's. */
  reconcile(): boolean {
    for (let round = 0; round < 3; round++) {
      // Preconditions: nothing pending, and the cursor at the server checksum's seq.
      if (!this.push()) return false;
      this.pull();
      if (this.state !== 'on') return false;
      const server = this.server.checksum(this.epoch);
      if (!server.ok) return this.handleRefusal(server), false;
      if (this.pending.size > 0 || this.cursor !== server.seq) continue;

      const local = totalsList(this.totals);
      const tables = differingTables(tableChecksums(local), server.tables);
      if (tables.length === 0) return true;

      const toPush: WireRow[] = [];
      for (const table of tables) {
        const serverBuckets = this.server.buckets(this.epoch, table);
        if (!serverBuckets.ok) return this.handleRefusal(serverBuckets), false;
        for (const bucket of differingBuckets(bucketChecksums(local, table), serverBuckets.buckets)) {
          const serverRows = this.server.bucketRows(this.epoch, table, bucket);
          if (!serverRows.ok) return this.handleRefusal(serverRows), false;
          const theirs = new Map(serverRows.rows.map((row) => [row.rowId, row]));
          const mine = new Map(
            [...this.rows.values()].filter((row) => row.table === table && bucketOf(row.rowId) === bucket).map((row) => [row.rowId, row.row]),
          );

          const fetch = [...theirs.keys()].filter((rowId) => {
            const local = mine.get(rowId);
            return !local || local.version !== theirs.get(rowId)!.version || local.deleted !== theirs.get(rowId)!.deleted;
          });
          const fetched = this.server.rowsById(this.epoch, table, fetch);
          if (!fetched.ok) return this.handleRefusal(fetched), false;
          for (const row of fetched.rows) this.applyPulled(row);

          // Rows only here, and rows that differed: push the merged full row with every cell.
          for (const rowId of mine.keys()) {
            const remote = theirs.get(rowId);
            const local = this.rows.get(slotOf(table, rowId))!.row;
            if (!remote || remote.version !== local.version || remote.deleted !== local.deleted) {
              toPush.push({ table, rowId, row: local });
            }
          }
        }
      }
      for (let start = 0; start < toPush.length; start += 100) {
        const result = this.server.push(this.epoch, toPush.slice(start, start + 100));
        if (!result.ok) return this.handleRefusal(result), false;
        this.clock.receiveServerTime(result.serverTime);
        for (const row of result.newer) this.applyPulled(row);
      }
    }
    return false;
  }

  // Refusals: epochs (11.6) and the clock repair (9.4).

  private handleRefusal(refusal: Refusal) {
    if (refusal.code === 'clockAhead') this.repairClock(refusal.serverTime);
    else this.epochChanged();
  }

  private epochChanged() {
    this.pending.clear();
    this.cursor = 0;
    this.epoch = null;
    if (this.server.vault) {
      this.state = 'locked';
      this.notice = 'keyChanged';
    } else {
      this.state = 'off';
      this.notice = this.server.lastWipe === 'delete' ? 'cloudDeleted' : null;
    }
  }

  /**
   * Spec 9.4. Once this phone's time is back within the bound, it re-stamps every local cell and
   * tombstone whose clock Convex would refuse, in one transaction with one tick. Those clocks were
   * never accepted, so no other device has seen them.
   */
  private repairClock(serverTime: number) {
    if (this.now() > serverTime + MAX_AHEAD_MS) {
      this.clockWrong = true;
      return;
    }
    this.clockWrong = false;
    // The new clock must be later than every clock the device keeps, or a re-stamped cell could sort
    // before a newer cell it already merged, and the device would never pull that cell back.
    let floor: Hlc | null = null;
    for (const { row } of this.rows.values()) {
      for (const hlc of [row.version, ...Object.values(row.cells).map((cell) => cell.hlc)]) {
        if (!isTooFarAhead(hlc, serverTime) && (floor === null || hlc > floor)) floor = hlc;
      }
    }
    this.clock.reset(Math.max(serverTime, this.now()), floor);
    const hlc = this.clock.tick();
    for (const { table, rowId, row } of [...this.rows.values()]) {
      const slot = slotOf(table, rowId);
      if (row.deleted) {
        if (!isTooFarAhead(row.version, serverTime)) continue;
        this.store(table, rowId, row, { deleted: true, version: hlc, cells: {} });
        if (this.state === 'on') this.pending.set(slot, new Map([['*', hlc]]));
        continue;
      }
      const ahead = Object.keys(row.cells).filter((column) => isTooFarAhead(row.cells[column].hlc, serverTime));
      if (ahead.length === 0) continue;
      const cells = { ...row.cells };
      for (const column of ahead) cells[column] = { hlc, value: cells[column].value };
      this.store(table, rowId, row, { deleted: false, version: liveVersion(cells), cells });
      if (this.state !== 'on') continue;
      const entries = this.pending.get(slot) ?? new Map<string, Hlc>();
      for (const column of ahead) entries.set(column, hlc);
      this.pending.set(slot, entries);
    }
  }

  // Account flows, spec 11.7.

  /** Turns sync on, or unlocks. Creates the vault if there is none, otherwise joins the existing one. */
  join() {
    if (this.state === 'on') return;
    if (this.server.vault) {
      this.rekey(this.server.vault.idKey);
      this.epoch = this.server.vault.epoch;
    } else {
      const idKey = this.env.rng.bytes(32);
      this.rekey(idKey);
      this.epoch = this.server.createVault(idKey);
    }
    this.state = 'on';
    this.notice = null;
    this.cursor = 0;
    // Every local row goes out whole (spec 11.7). A row edited while sync was off can end up with the
    // same version as the server's copy after merging, yet hold newer cells in older columns. The
    // checksum compares versions only, so reconcile would never find them.
    this.pending.clear();
    for (const { table, rowId, row } of this.rows.values()) {
      const entries = row.deleted
        ? new Map([['*', row.version]])
        : new Map(Object.entries(row.cells).map(([column, cell]) => [column, cell.hlc]));
      this.pending.set(slotOf(table, rowId), entries);
    }
    this.pull();
    this.reconcile();
  }

  /** Signing out or turning sync off. Local data and the id key stay. */
  signOut() {
    this.state = 'off';
    this.epoch = null;
    this.cursor = 0;
    this.pending.clear();
  }

  /** Spec 6.4: moves every keyed row to its id under `idKey`, merging if two land on one id. */
  rekey(idKey: Uint8Array) {
    if (this.pending.size > 0 && this.state === 'on') throw new Error('re-keying with pending changes');
    const rows = this.liveRows('prayerLog').map(({ rowId, row }) => ({
      id: rowId,
      key: [row.cells.day.value as string, row.cells.prayer.value as string],
    }));
    for (const { from, to } of planRekey(idKey, 'prayerLog', rows)) {
      const moving = this.rows.get(slotOf('prayerLog', from))!.row;
      this.rows.delete(slotOf('prayerLog', from));
      bumpTotals(this.totals, 'prayerLog', from, moving, null);
      const existing = this.rows.get(slotOf('prayerLog', to))?.row ?? null;
      this.store('prayerLog', to, existing, existing ? mergeRow(existing, moving) : moving);
    }
    this.idKey = idKey;
  }
}
