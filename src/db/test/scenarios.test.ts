// Scenario tests, spec section 14: one per failure that revision 2 fixed, and one per bug the
// convergence test found in the spec. Each drives the simulated phones step by step.

import { describe, expect, it } from 'vitest';

import { keyedId } from '../ids';
import { World } from './sim/world';

const MINUTE = 60_000;
const YEAR = 365 * 24 * 60 * MINUTE;

/** A world with phones whose clocks agree, all signed in unless `signedIn` is false. */
function setup(phones = 2, signedIn = true) {
  const world = new World(7, phones);
  if (signedIn) for (const phone of world.devices) phone.join();
  const tick = (ms = 1000) => (world.time += ms);
  const syncAll = () => {
    for (let round = 0; round < 3; round++) {
      for (const phone of world.devices) {
        phone.push();
        phone.pull();
      }
    }
  };
  return { world, phones: world.devices, server: world.server, tick, syncAll };
}

const prayerRows = <T extends { table: string }>(rows: Iterable<T>) => [...rows].filter((row) => row.table === 'prayerLog');

describe('keyed tables (B1, B2)', () => {
  it('two phones that log the same prayer offline end with one row', () => {
    const { phones, server, tick, syncAll } = setup();
    phones[0].logPrayer('2026-11-03', 'fajr', 'done');
    tick();
    phones[1].logPrayer('2026-11-03', 'fajr', 'done');
    syncAll();
    expect(prayerRows(server.rows.values())).toHaveLength(1);
    expect(prayerRows(phones[0].rows.values())).toHaveLength(1);
  });

  it('a prayer cleared and logged again ends logged', () => {
    const { phones, server, tick, syncAll } = setup();
    phones[0].logPrayer('2026-11-03', 'fajr', 'done');
    tick();
    phones[0].logPrayer('2026-11-03', 'fajr', 'cleared');
    tick();
    phones[0].logPrayer('2026-11-03', 'fajr', 'done');
    syncAll();
    const [row] = prayerRows(server.rows.values());
    expect(row.row.cells.status.value).toBe('done');
    expect(row.row.deleted).toBe(false);
  });

  it('signing in re-keys local rows, so they merge with the account rows for the same prayer', () => {
    const { phones, server, tick } = setup(2, false);
    phones[0].logPrayer('2026-11-03', 'fajr', 'done');
    phones[0].join();
    tick();
    phones[1].logPrayer('2026-11-03', 'fajr', 'cleared');
    const before = [...phones[1].rows.keys()];
    phones[1].join();
    expect([...phones[1].rows.keys()]).not.toEqual(before);
    expect(prayerRows(server.rows.values())).toHaveLength(1);
    const [row] = prayerRows(server.rows.values());
    expect(row.rowId).toBe(keyedId(server.vault!.idKey, 'prayerLog', ['2026-11-03', 'fajr']));
    expect(row.row.cells.status.value).toBe('cleared');
  });
});

describe('epochs (B3)', () => {
  it('after phone A deletes the cloud copy, phone B stops and uploads nothing', () => {
    const { phones, server, tick } = setup();
    phones[1].insertHabit('Read Quran');
    phones[1].push();
    server.wipe('delete');
    phones[0].signOut();
    tick();
    phones[1].insertHabit('Walk');
    expect(phones[1].push()).toBe(false);
    expect(phones[1].state).toBe('off');
    expect(phones[1].notice).toBe('cloudDeleted');
    phones[1].reconcile();
    expect(server.rows.size).toBe(0);
    expect(phones[1].liveRows('habit')).toHaveLength(2);
  });

  it('after phone A resets the key, phone B locks, then uploads its data once unlocked', () => {
    const { phones, server, tick } = setup();
    phones[1].insertHabit('Read Quran');
    phones[1].push();
    server.wipe('reset');
    phones[0].signOut();
    phones[0].join();
    tick();
    phones[1].pull();
    expect(phones[1].state).toBe('locked');
    expect(phones[1].notice).toBe('keyChanged');
    phones[1].join();
    expect(server.rows.size).toBe(1);
    expect(phones[0].liveRows('habit')).toHaveLength(0);
    phones[0].pull();
    expect(phones[0].liveRows('habit')).toHaveLength(1);
  });

  it("moves the cursor to the account's seq after a wipe, so reconcile isn't stuck waiting", () => {
    const { phones, server } = setup(1);
    phones[0].insertHabit('Read Quran');
    phones[0].push();
    server.wipe('reset');
    phones[0].signOut();
    phones[0].join();
    expect(phones[0].cursor).toBe(server.seq);
    expect(phones[0].reconcile()).toBe(true);
  });
});

describe('clocks (B4)', () => {
  it('a phone a year ahead is refused, then repairs once its clock is fixed', () => {
    const { phones, server, tick, syncAll } = setup();
    phones[0].offset = YEAR;
    phones[0].insertHabit('Fast on Monday');
    expect(phones[0].push()).toBe(false);
    expect(phones[0].clockWrong).toBe(true);
    expect(server.rows.size).toBe(0);

    phones[0].offset = 0;
    tick();
    phones[0].push();
    expect(phones[0].clockWrong).toBe(false);
    syncAll();
    expect(server.rows.size).toBe(1);

    // The repaired write no longer beats honest edits made after it.
    tick();
    const [habit] = phones[1].liveRows('habit');
    phones[1].editHabit(habit.rowId, { title: 'Fast on Monday and Thursday' });
    syncAll();
    expect(phones[0].liveRows('habit')[0].row.cells.title.value).toBe('Fast on Monday and Thursday');
  });

  it('a slow phone still writes after the newer cells it pulled', () => {
    const { phones, tick, syncAll } = setup();
    phones[1].offset = -10 * MINUTE;
    const id = phones[0].insertHabit('Read Quran');
    syncAll();
    tick();
    phones[1].editHabit(id, { title: 'Read Quran daily' });
    syncAll();
    expect(phones[0].liveRows('habit')[0].row.cells.title.value).toBe('Read Quran daily');
  });

  it('a repaired clock never goes behind cells the phone already merged', () => {
    const { phones, tick, syncAll } = setup();
    phones[0].offset = YEAR;
    phones[0].logPrayer('2026-11-03', 'fajr', 'done');
    phones[0].push();
    phones[1].offset = 30_000;
    phones[1].logPrayer('2026-11-03', 'fajr', 'cleared');
    phones[1].push();
    phones[0].pull();
    phones[0].offset = -20_000;
    tick();
    phones[0].push();
    syncAll();
    const [mine, theirs] = phones.map((phone) => prayerRows(phone.rows.values())[0].row);
    expect(mine).toEqual(theirs);
  });
});

describe('reconcile (B5) and pulling', () => {
  it("waits for a lagging pull instead of reporting a difference", () => {
    const { phones, server } = setup();
    for (let i = 0; i < 5; i++) phones[0].insertHabit(`habit ${i}`);
    phones[0].push();
    const seq = server.seq;
    expect(phones[1].cursor).toBeLessThan(seq);
    expect(phones[1].reconcile()).toBe(true);
    expect(server.seq).toBe(seq);
  });

  it('applying a page again after an interruption changes nothing', () => {
    const { phones, syncAll } = setup();
    for (let i = 0; i < 6; i++) phones[0].insertHabit(`habit ${i}`);
    phones[0].push();
    phones[1].pull({ pages: 1, pageSize: 6, interrupt: true });
    expect(phones[1].cursor).toBe(0);
    phones[1].pull();
    syncAll();
    expect(phones[1].liveRows('habit')).toHaveLength(6);
    expect(phones[1].reconcile()).toBe(true);
  });

  it('uploads edits made while signed out, even when the merged versions match', () => {
    const { phones, server, tick, syncAll } = setup();
    phones[0].logPrayer('2026-11-03', 'isha', 'done');
    syncAll();
    phones[1].signOut();
    tick();
    phones[1].editProfile({ name: 'Amina' });
    tick();
    phones[0].editProfile({ voice: 'gentle' });
    phones[0].push();
    phones[1].join();
    syncAll();
    expect(server.rows.get(`profile\0singleton`)?.row.cells.name?.value).toBe('Amina');
    expect(phones[0].rows.get(`profile\0singleton`)?.row.cells.name?.value).toBe('Amina');
  });
});
