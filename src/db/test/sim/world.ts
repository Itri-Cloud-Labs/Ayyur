// One user, several phones, one server, and a random sequence of everything that can happen to them.

import { tableChecksums, ZERO_TOTAL, totalsFromRows } from '../../checksum';
import { keyedId } from '../../ids';
import { DAYS, PRAYERS, SimDevice } from './device';
import { createRng, type Rng } from './rng';
import { SimServer, totalsList } from './server';

const START = Date.UTC(2026, 10, 3, 4, 0, 0);
const YEAR = 365 * 24 * 60 * 60 * 1000;

export class World {
  time = START;
  readonly rng: Rng;
  readonly server: SimServer;
  readonly devices: SimDevice[];
  /** What happened, step by step, for the failure message. */
  readonly log: string[] = [];

  constructor(seed: number, deviceCount = 3) {
    this.rng = createRng(seed);
    this.server = new SimServer(() => this.time);
    const env = { now: () => this.time, rng: this.rng, server: this.server };
    this.devices = Array.from({ length: deviceCount }, (_, i) => new SimDevice(`phone${i}`, env, this.rng.bytes(32)));
  }

  /** One random event. Writes are most common; faults and account changes are rare. */
  step() {
    const { rng } = this;
    this.time += rng.int(4000);
    const device = rng.pick(this.devices);
    const roll = rng.next();
    const say = (what: string) => this.log.push(`${device.name}: ${what}`);

    if (roll < 0.4) {
      this.randomWrite(device, say);
    } else if (roll < 0.55) {
      say('push');
      device.push({ loseResponses: true });
    } else if (roll < 0.7) {
      const options = { pages: 1 + rng.int(2), pageSize: 1 + rng.int(8), interrupt: rng.chance(0.2) };
      say(`pull ${JSON.stringify(options)}`);
      device.pull(options);
    } else if (roll < 0.75) {
      say('reconcile');
      device.reconcile();
    } else if (roll < 0.82) {
      if (device.state !== 'on') {
        say('turn sync on or unlock');
        device.join();
      }
    } else if (roll < 0.84) {
      say('sign out');
      device.signOut();
    } else if (roll < 0.85 && device.state === 'on') {
      say('delete my cloud copy');
      this.server.wipe('delete');
      device.signOut();
    } else if (roll < 0.86 && device.state === 'on') {
      say('start over with an empty cloud copy');
      this.server.wipe('reset');
      device.signOut();
      device.join();
    } else if (roll < 0.88) {
      const offset = rng.pick([-10 * 60_000, -30_000, 0, 45_000, YEAR]);
      say(`set clock offset ${offset}`);
      device.offset = offset;
    }
  }

  private randomWrite(device: SimDevice, say: (what: string) => void) {
    const { rng } = this;
    const habits = device.liveRows('habit');
    const kind = rng.int(5);
    if (kind === 0 || (kind <= 2 && habits.length === 0)) {
      const title = `habit ${rng.int(1000)}`;
      say(`insert habit "${title}"`);
      device.insertHabit(title);
    } else if (kind === 1) {
      const { rowId } = rng.pick(habits);
      const patch = rng.chance(0.5) ? { title: `title ${rng.int(1000)}` } : { archived: rng.chance(0.5) };
      say(`edit habit ${rowId.slice(0, 8)} ${JSON.stringify(patch)}`);
      device.editHabit(rowId, patch);
    } else if (kind === 2) {
      const { rowId } = rng.pick(habits);
      say(`remove habit ${rowId.slice(0, 8)}`);
      device.removeHabit(rowId);
    } else if (kind === 3) {
      const [day, prayer, status] = [rng.pick(DAYS), rng.pick(PRAYERS), rng.pick(['done', 'cleared'] as const)];
      say(`log ${prayer} on ${day} as ${status}`);
      device.logPrayer(day, prayer, status);
    } else {
      const patch = rng.chance(0.5) ? { name: `name ${rng.int(100)}` } : { voice: rng.pick(['gentle', 'direct', 'teacher']) };
      say(`edit profile ${JSON.stringify(patch)}`);
      device.editProfile(patch);
    }
  }

  /**
   * Ends the run: clocks get fixed, every phone turns sync on, and sync runs with no faults until
   * nothing changes. Returns how many rounds it took, or throws if it never settles.
   */
  settle(): number {
    for (const device of this.devices) device.offset = this.rng.int(60_000) - 30_000;
    for (let round = 1; round <= 20; round++) {
      this.time += 1000;
      for (const device of this.devices) {
        if (device.state !== 'on') device.join();
        device.push();
        device.pull();
      }
      for (const device of this.devices) device.reconcile();
      if (this.isSettled()) return round;
    }
    throw new Error('sync never settled');
  }

  private isSettled() {
    return this.devices.every(
      (device) =>
        device.state === 'on' &&
        device.pending.size === 0 &&
        device.cursor === this.server.seq &&
        sameTotals(device.totals, this.server.totals),
    );
  }

  /** Checks the invariants that must hold once everything has synced. Returns the problems found. */
  problems(): string[] {
    const problems: string[] = [];
    const server = this.server;
    const serverRows = new Map([...server.rows].map(([slot, { table, rowId, row }]) => [slot, { table, rowId, row }]));

    for (const device of this.devices) {
      // Invariant 11: every device holds exactly what the server holds.
      const missing = [...serverRows.keys()].filter((slot) => !device.rows.has(slot));
      const extra = [...device.rows.keys()].filter((slot) => !serverRows.has(slot));
      const different = [...serverRows.keys()].filter(
        (slot) => device.rows.has(slot) && canonical(device.rows.get(slot)) !== canonical(serverRows.get(slot)),
      );
      if (missing.length + extra.length + different.length > 0) {
        problems.push(`${device.name}: ${missing.length} rows missing, ${extra.length} extra, ${different.length} different`);
      }
      // Invariant 9: running totals equal a full scan.
      if (!sameTotals(device.totals, scanTotals(device.rows.values()))) problems.push(`${device.name}: running totals drifted`);
    }
    if (!sameTotals(server.totals, scanTotals(serverRows.values()))) problems.push('server: running totals drifted');

    const required: Record<string, string[]> = { habit: ['title', 'archived'], prayerLog: ['day', 'prayer', 'status'], profile: [] };
    for (const { table, rowId, row } of serverRows.values()) {
      // Every live row on the server holds every required column (spec 11.3).
      const absent = row.deleted ? [] : required[table].filter((column) => !Object.hasOwn(row.cells, column));
      if (absent.length > 0) problems.push(`${table}/${rowId}: missing required columns ${absent.join(', ')}`);
      // Invariant 6: keyed tables and singletons are never deleted.
      if (row.deleted && table !== 'habit') problems.push(`${table}/${rowId}: deleted, but its table has no remove`);
      // Invariant 7: keyed ids match their key under the account's id key.
      if (table === 'prayerLog' && server.vault) {
        const expected = keyedId(server.vault.idKey, table, [row.cells.day.value as string, row.cells.prayer.value as string]);
        if (rowId !== expected) problems.push(`${table}/${rowId}: id doesn't match its key`);
      }
    }
    // Rule R5: one row per key, so at most one row per day and prayer.
    const keys = [...serverRows.values()]
      .filter((row) => row.table === 'prayerLog')
      .map(({ row }) => `${row.cells.day.value}/${row.cells.prayer.value}`);
    if (new Set(keys).size !== keys.length) problems.push('prayerLog: two rows for the same day and prayer');
    return problems;
  }
}

/** JSON with object keys sorted, so key order doesn't count as a difference. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_, inner) =>
    inner && typeof inner === 'object' && !Array.isArray(inner)
      ? Object.fromEntries(Object.entries(inner).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : inner,
  );
}

function scanTotals(rows: Iterable<{ table: string; rowId: string; row: { version: string; deleted: boolean } }>) {
  const totals = totalsFromRows([...rows].map(({ table, rowId, row }) => ({ table, id: rowId, version: row.version, deleted: row.deleted })));
  return new Map(totals.map(({ table, bucket, total }) => [`${table}\0${bucket}`, total]));
}

/** Equal totals, counting a missing bucket as empty. */
function sameTotals(a: ReadonlyMap<string, string>, b: ReadonlyMap<string, string>) {
  const keys = new Set([...a.keys(), ...b.keys()]);
  return [...keys].every((key) => (a.get(key) ?? ZERO_TOTAL) === (b.get(key) ?? ZERO_TOTAL));
}

export function checksumOf(totals: ReadonlyMap<string, string>) {
  return tableChecksums(totalsList(totals));
}
