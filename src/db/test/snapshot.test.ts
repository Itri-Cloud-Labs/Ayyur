import { describe, expect, it } from 'vitest';

import {
  type AnyTableDef,
  boolean,
  createAyyurDBSchema,
  day,
  diffSchemas,
  enumOf,
  evolutionProblems,
  integer,
  ref,
  type SchemaSnapshot,
  snapshotOf,
  table,
  text,
} from '../schema';

const base = {
  habit: table({ title: text(), archived: boolean().default(false) }),
  habitLog: table({ habitId: ref('habit'), day: day(), status: enumOf(['done', 'cleared']) }, { key: ['habitId', 'day'] }),
  cache: table({ value: text() }, { local: true }),
};

function snap(tables: Record<string, AnyTableDef>, version = 1, minVersion = 1): SchemaSnapshot {
  return snapshotOf(createAyyurDBSchema({ version, minVersion, tables }));
}

const before = snap(base);
const kindsOf = (next: SchemaSnapshot) => diffSchemas(before, next).map((change) => `${change.kind}: ${change.what}`);

describe('snapshotOf', () => {
  it('is plain JSON with sorted keys', () => {
    const snapshot = snap({ zebra: table({ b: text(), a: text() }), apple: table({ x: text() }) });
    expect(Object.keys(snapshot.tables)).toEqual(['apple', 'zebra']);
    expect(Object.keys(snapshot.tables.zebra.columns)).toEqual(['a', 'b']);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });
});

describe('diffSchemas', () => {
  it('finds nothing between equal schemas', () => {
    expect(diffSchemas(before, snap(base))).toEqual([]);
  });

  it('treats new tables and new optional columns as additive', () => {
    expect(
      kindsOf(snap({ ...base, task: table({ title: text() }), habit: table({ ...base.habit.columns, note: text().nullable() }) })),
    ).toEqual(['additive: habit.note: new column', 'additive: task: new table']);
  });

  it('treats a new required column without a default as breaking', () => {
    expect(kindsOf(snap({ ...base, habit: table({ ...base.habit.columns, colour: text() }) }))).toEqual([
      'breaking: habit.colour: new column that is required and has no default',
    ]);
  });

  it('treats removals, renames and type changes as breaking', () => {
    expect(kindsOf(snap({ habitLog: base.habitLog, cache: base.cache, habit: table({ name: text(), archived: integer() }) }))).toEqual([
      'breaking: habit.archived: type changed from boolean to integer',
      'local: habit.archived: default removed',
      'breaking: habit.name: new column that is required and has no default',
      'breaking: habit.title: column removed',
    ]);
  });

  it('treats nullability in either direction, enum values and key changes as breaking', () => {
    const changed = snap({
      ...base,
      habit: table({ title: text().nullable(), archived: boolean().default(false) }),
      habitLog: table(
        { habitId: ref('habit'), day: day(), status: enumOf(['done', 'cleared', 'skipped']) },
        { key: ['day', 'habitId'] },
      ),
    });
    expect(kindsOf(changed)).toEqual([
      'breaking: habit.title: became nullable',
      'breaking: habitLog: key changed',
      'breaking: habitLog.status: enum values changed',
    ]);
  });

  it('treats indexes, defaults and local tables as device-only', () => {
    const changed = snap({
      habit: table({ title: text(), archived: boolean().default(true) }, { indexes: [['archived']] }),
      habitLog: base.habitLog,
      cache: table({ value: text(), extra: integer() }, { local: true }),
    });
    expect(kindsOf(changed)).toEqual(['local: cache: local table changed', 'local: habit: indexes changed']);
  });

  it('treats a synced table becoming local as breaking, and the reverse as additive', () => {
    expect(kindsOf(snap({ ...base, habit: table(base.habit.columns, { local: true }), habitLog: table({ day: day() }) }))).toContain(
      'breaking: habit: synced table became local',
    );
    expect(kindsOf(snap({ ...base, cache: table({ value: text() }) }))).toEqual(['additive: cache: local table became synced']);
  });
});

describe('evolutionProblems', () => {
  const breaking = { ...base, habit: table({ title: text() }) };
  const additive = { ...base, task: table({ title: text() }) };

  it('accepts an additive change with the version raised', () => {
    expect(evolutionProblems(before, snap(additive, 2, 1))).toEqual([]);
  });

  it('requires the version to rise when anything changes', () => {
    expect(evolutionProblems(before, snap(additive, 1, 1))).toEqual(['the schema changed but version is still 1; raise it']);
  });

  it('requires minVersion to equal the new version for a breaking change', () => {
    expect(evolutionProblems(before, snap(breaking, 2, 1))).toEqual([
      'breaking changes need minVersion raised to 2: habit.archived: column removed',
    ]);
    expect(evolutionProblems(before, snap(breaking, 2, 2))).toEqual([]);
  });

  it('never lets version or minVersion go down', () => {
    expect(evolutionProblems(snap(base, 3, 2), snap(base, 2, 1))).toEqual([
      'version went down from 3 to 2',
      'minVersion went down from 2 to 1',
    ]);
  });
});
