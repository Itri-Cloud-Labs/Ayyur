import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  boolean,
  checkRowSize,
  createAyyurDBSchema,
  day,
  enumOf,
  type Insert,
  integer,
  isDay,
  json,
  type Key,
  MAX_ROW_BYTES,
  MAX_VALUE_BYTES,
  normalizeValue,
  type Patch,
  real,
  ref,
  type Row,
  SchemaError,
  serializeValue,
  table,
  text,
  timestamp,
  utf8Length,
  ValueError,
} from '../schema';

// The example schema from spec 4.1.
const schema = createAyyurDBSchema({
  version: 3,
  minVersion: 2,
  tables: {
    profile: table(
      { name: text(), birthYear: integer().nullable(), voice: enumOf(['gentle', 'direct', 'teacher']).nullable() },
      { singleton: true },
    ),
    habit: table({ title: text(), archived: boolean().default(false) }, { indexes: [['archived']] }),
    habitLog: table(
      { habitId: ref('habit'), day: day(), status: enumOf(['done', 'cleared']) },
      { key: ['habitId', 'day'] },
    ),
    quranReading: table(
      { day: day(), range: json<{ from: number; to: number }>() },
      { appendOnly: true, indexes: [['day']] },
    ),
    prayerTimes: table({ day: day(), times: json<Record<string, number>>() }, { local: true }),
  },
});

/** The problems `createAyyurDBSchema` reports for one table, or [] if it accepts it. */
function problemsFor(tables: Parameters<typeof createAyyurDBSchema>[0]['tables']): readonly string[] {
  try {
    createAyyurDBSchema({ version: 1, minVersion: 1, tables });
    return [];
  } catch (error) {
    if (error instanceof SchemaError) return error.problems;
    throw error;
  }
}

describe('createAyyurDBSchema', () => {
  it('builds metadata for each table kind', () => {
    expect(schema.meta.profile).toMatchObject({ kind: 'singleton', synced: true, key: null });
    expect(schema.meta.habit).toMatchObject({ kind: 'random', synced: true, indexes: [['archived']] });
    expect(schema.meta.habitLog).toMatchObject({ kind: 'keyed', key: ['habitId', 'day'] });
    expect(schema.meta.quranReading).toMatchObject({ kind: 'appendOnly', synced: true });
    expect(schema.meta.prayerTimes).toMatchObject({ kind: 'local', synced: false });
    expect(schema.meta.profile.columnNames).toEqual(['name', 'birthYear', 'voice']);
  });

  it('refuses more than one kind on a table', () => {
    // The types forbid this too; the cast checks the runtime guard for plain JavaScript callers.
    const options = { singleton: true, local: true } as unknown as { singleton: true };
    expect(problemsFor({ broken: table({ name: text() }, options) })).toEqual([
      'broken: a table has one kind; choose one of singleton, key, appendOnly and local',
    ]);
  });

  it('refuses a ref to a keyed table, a local table, or a missing table (rule R8)', () => {
    const problems = problemsFor({
      log: table({ habitId: text(), day: day() }, { key: ['habitId', 'day'] }),
      cache: table({ value: text() }, { local: true }),
      note: table({ log: ref('log'), cache: ref('cache'), ghost: ref('ghost') }),
    });
    expect(problems).toHaveLength(3);
    expect(problems.join('\n')).toMatch(/note\.log: refers to "log", a keyed table/);
    expect(problems.join('\n')).toMatch(/note\.cache: refers to "cache", a local table/);
    expect(problems.join('\n')).toMatch(/note\.ghost: refers to "ghost", which isn't a table/);
  });

  it('refuses key columns that are nullable, of the wrong type, missing or repeated', () => {
    const problems = problemsFor({
      a: table({ when: timestamp(), amount: real(), data: json<string[]>() }, { key: ['when', 'amount', 'data'] }),
      b: table({ day: day().nullable() }, { key: ['day'] }),
      c: table({ day: day() }, { key: ['day', 'day'] }),
      d: table({ day: day() }, { key: ['missing' as 'day'] }),
    });
    expect(problems).toEqual([
      'a.when: a key column can\'t be timestamp; use text, integer, boolean, day, enum or ref',
      'a.amount: a key column can\'t be real; use text, integer, boolean, day, enum or ref',
      'a.data: a key column can\'t be json; use text, integer, boolean, day, enum or ref',
      'b.day: a key column can\'t be nullable',
      'c: key columns are listed twice',
      'd: key column "missing" isn\'t a column of the table',
    ]);
  });

  it('refuses bad and reserved names', () => {
    const problems = problemsFor({
      Habit: table({ title: text() }),
      task: table({ _clocks: text(), id: text(), constructor: text(), 'due-date': text() }),
    });
    expect(problems).toEqual([
      'Habit: table names must match /^[a-z][A-Za-z0-9]{0,63}$/',
      'task._clocks: column names must match /^[a-z][A-Za-z0-9]{0,63}$/',
      'task.id: "id" is a reserved name',
      'task.constructor: "constructor" is a reserved name',
      'task.due-date: column names must match /^[a-z][A-Za-z0-9]{0,63}$/',
    ]);
  });

  it('refuses synced tables with no columns, bad enums, bad indexes and bad defaults', () => {
    const problems = problemsFor({
      empty: table({}),
      mood: table({ level: enumOf(['low', 'low']) }),
      indexed: table({ title: text() }, { indexes: [['nope' as 'title'], []] }),
      defaults: table({ count: integer().default(1.5), when: day().default('2026-02-30') }),
    });
    expect(problems).toEqual([
      'empty: a synced table needs at least one column',
      'mood.level: an enum needs at least one value, with no duplicates or empty strings',
      'indexed: index column "nope" isn\'t a column of the table',
      'indexed: an index needs at least one column',
      'defaults.count default must be a safe integer, got 1.5',
      'defaults.when default must be a date as YYYY-MM-DD, got "2026-02-30"',
    ]);
  });

  it('refuses bad versions', () => {
    expect(() => createAyyurDBSchema({ version: 2, minVersion: 3, tables: {} })).toThrow(SchemaError);
    expect(() => createAyyurDBSchema({ version: 0, minVersion: 0, tables: {} })).toThrow(SchemaError);
  });

  it('lets a local table have no columns', () => {
    expect(problemsFor({ cache: table({}, { local: true }) })).toEqual([]);
  });
});

describe('row types', () => {
  type Tables = typeof schema.tables;

  it('make reads, inserts, patches and keys from the columns', () => {
    expectTypeOf<Row<Tables['profile']>>().toEqualTypeOf<{
      readonly id: string;
      readonly name: string;
      readonly birthYear: number | null;
      readonly voice: 'gentle' | 'direct' | 'teacher' | null;
    }>();
    expectTypeOf<Insert<Tables['habit']>>().toEqualTypeOf<{ title: string; archived?: boolean }>();
    expectTypeOf<Patch<Tables['habit']>>().toEqualTypeOf<{ title?: string; archived?: boolean }>();
    expectTypeOf<Key<Tables['habitLog']>>().toEqualTypeOf<{ habitId: string; day: string }>();
    expectTypeOf<Patch<Tables['habitLog']>>().toEqualTypeOf<{ status?: 'done' | 'cleared' }>();
    expectTypeOf<Row<Tables['quranReading']>['range']>().toEqualTypeOf<{ from: number; to: number }>();
  });

  it('reject a key column that is not a column', () => {
    // @ts-expect-error 'nope' isn't a column of the table.
    table({ day: day() }, { key: ['nope'] });
  });

  it('reject two kinds at once', () => {
    // @ts-expect-error a table has one kind.
    table({ day: day() }, { singleton: true, appendOnly: true });
  });
});

describe('values', () => {
  const where = 'table.column';

  it('normalises text to NFC', () => {
    expect(normalizeValue(text().spec, 'café', where)).toBe('café');
  });

  it('checks each type', () => {
    expect(() => normalizeValue(integer().spec, 2 ** 53, where)).toThrow(ValueError);
    expect(() => normalizeValue(real().spec, Infinity, where)).toThrow(ValueError);
    expect(() => normalizeValue(boolean().spec, 1, where)).toThrow(ValueError);
    expect(() => normalizeValue(enumOf(['a', 'b']).spec, 'c', where)).toThrow(ValueError);
    expect(() => normalizeValue(json().spec, { when: new Date() }, where)).toThrow(ValueError);
    expect(() => normalizeValue(json().spec, [1, NaN], where)).toThrow(ValueError);
    expect(normalizeValue(json().spec, { a: [1, 'two', null, { b: false }] }, where)).toEqual({ a: [1, 'two', null, { b: false }] });
    expect(() => normalizeValue(ref('habit').spec, 'k0123456789abcdef0123456789abcdef', where)).toThrow(ValueError);
    expect(normalizeValue(ref('profile').spec, 'singleton', where)).toBe('singleton');
  });

  it('allows null only in nullable columns', () => {
    expect(() => normalizeValue(text().spec, null, where)).toThrow("table.column can't be null");
    expect(normalizeValue(text().nullable().spec, null, where)).toBeNull();
  });

  it('accepts real dates only', () => {
    expect(isDay('2024-02-29')).toBe(true);
    expect(isDay('2026-02-29')).toBe(false);
    expect(isDay('2026-13-01')).toBe(false);
    expect(isDay('2026-1-01')).toBe(false);
  });

  it('caps one value at 16 KiB and one row at 256 KiB', () => {
    expect(() => serializeValue('x'.repeat(MAX_VALUE_BYTES - 2), where)).not.toThrow();
    expect(() => serializeValue('x'.repeat(MAX_VALUE_BYTES - 1), where)).toThrow(ValueError);
    const value = serializeValue('x'.repeat(MAX_VALUE_BYTES - 2), where);
    expect(() => checkRowSize(Array(MAX_ROW_BYTES / MAX_VALUE_BYTES).fill(value), where)).not.toThrow();
    expect(() => checkRowSize([...Array(MAX_ROW_BYTES / MAX_VALUE_BYTES).fill(value), '1'], where)).toThrow(ValueError);
  });

  it('counts UTF-8 bytes like TextEncoder', () => {
    for (const sample of ['', 'abc', 'é', 'ⴰⵢⵢⵓⵔ', 'بسم الله', '🌙', '\ud800x']) {
      expect(utf8Length(sample)).toBe(new TextEncoder().encode(sample).length);
    }
  });
});
