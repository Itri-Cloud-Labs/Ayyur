// Schema snapshots and the evolution check, spec 4.5. Each released schema version is committed as a
// snapshot. A test diffs the current schema against the latest snapshot and fails if a breaking
// change lands without raising minVersion to the new version.

import type { ColumnSpec, ColumnType } from './columns';
import type { AyyurDBSchema, TableKind, TableMeta } from './schema';

export type ColumnSnapshot = {
  type: ColumnType;
  nullable: boolean;
  hasDefault: boolean;
  values?: string[];
  target?: string;
};

export type TableSnapshot = {
  kind: TableKind;
  key: string[] | null;
  columns: Record<string, ColumnSnapshot>;
  indexes: string[][];
};

export type SchemaSnapshot = {
  version: number;
  minVersion: number;
  tables: Record<string, TableSnapshot>;
};

/**
 * - `breaking`: older clients can't sync safely with it; needs minVersion raised.
 * - `additive`: older clients keep syncing; they keep unknown columns in `_extra`.
 * - `local`: changes only the device, such as an index, a default, or a local table.
 */
export type ChangeKind = 'breaking' | 'additive' | 'local';

export type SchemaChange = { kind: ChangeKind; what: string };

/** A JSON-ready snapshot with sorted keys, so committed snapshots diff cleanly. */
export function snapshotOf(schema: AyyurDBSchema): SchemaSnapshot {
  const tables: Record<string, TableSnapshot> = {};
  for (const name of Object.keys(schema.meta).sort()) tables[name] = tableSnapshot(schema.meta[name]);
  return { version: schema.version, minVersion: schema.minVersion, tables };
}

function tableSnapshot(meta: TableMeta): TableSnapshot {
  const columns: Record<string, ColumnSnapshot> = {};
  for (const name of [...meta.columnNames].sort()) columns[name] = columnSnapshot(meta.columns[name]);
  return {
    kind: meta.kind,
    key: meta.key ? [...meta.key] : null,
    columns,
    indexes: meta.indexes.map((index) => [...index]),
  };
}

function columnSnapshot(spec: ColumnSpec): ColumnSnapshot {
  const snapshot: ColumnSnapshot = { type: spec.type, nullable: spec.nullable, hasDefault: spec.default !== undefined };
  if (spec.values) snapshot.values = [...spec.values];
  if (spec.target !== undefined) snapshot.target = spec.target;
  return snapshot;
}

/** Every difference between two snapshots that matters, classified. */
export function diffSchemas(previous: SchemaSnapshot, next: SchemaSnapshot): SchemaChange[] {
  const changes: SchemaChange[] = [];
  const names = [...new Set([...Object.keys(previous.tables), ...Object.keys(next.tables)])].sort();

  for (const name of names) {
    const before = previous.tables[name];
    const after = next.tables[name];
    const wasSynced = before !== undefined && before.kind !== 'local';
    const isSynced = after !== undefined && after.kind !== 'local';

    if (!before) {
      changes.push({ kind: isSynced ? 'additive' : 'local', what: `${name}: new table` });
      continue;
    }
    if (!after) {
      changes.push({ kind: wasSynced ? 'breaking' : 'local', what: `${name}: table removed` });
      continue;
    }
    if (!wasSynced && !isSynced) {
      if (JSON.stringify(before) !== JSON.stringify(after)) changes.push({ kind: 'local', what: `${name}: local table changed` });
      continue;
    }
    if (!wasSynced) {
      changes.push({ kind: 'additive', what: `${name}: local table became synced` });
      continue;
    }
    if (!isSynced) {
      changes.push({ kind: 'breaking', what: `${name}: synced table became local` });
      continue;
    }

    if (before.kind !== after.kind) {
      changes.push({ kind: 'breaking', what: `${name}: kind changed from ${before.kind} to ${after.kind}` });
    }
    if (JSON.stringify(before.key) !== JSON.stringify(after.key)) {
      changes.push({ kind: 'breaking', what: `${name}: key changed` });
    }
    if (JSON.stringify(before.indexes) !== JSON.stringify(after.indexes)) {
      changes.push({ kind: 'local', what: `${name}: indexes changed` });
    }
    changes.push(...diffColumns(name, before.columns, after.columns));
  }
  return changes;
}

function diffColumns(
  table: string,
  previous: Record<string, ColumnSnapshot>,
  next: Record<string, ColumnSnapshot>,
): SchemaChange[] {
  const changes: SchemaChange[] = [];
  const names = [...new Set([...Object.keys(previous), ...Object.keys(next)])].sort();
  for (const name of names) {
    const before = previous[name];
    const after = next[name];
    const where = `${table}.${name}`;
    if (!before) {
      const safe = after.nullable || after.hasDefault;
      changes.push(
        safe
          ? { kind: 'additive', what: `${where}: new column` }
          : { kind: 'breaking', what: `${where}: new column that is required and has no default` },
      );
      continue;
    }
    if (!after) {
      changes.push({ kind: 'breaking', what: `${where}: column removed` });
      continue;
    }
    if (before.type !== after.type) {
      changes.push({ kind: 'breaking', what: `${where}: type changed from ${before.type} to ${after.type}` });
    }
    // Either direction breaks: an older client can't store a null in a required column, and a newer
    // client that made a column required can't read nulls an older one still writes.
    if (before.nullable !== after.nullable) {
      changes.push({ kind: 'breaking', what: `${where}: ${after.nullable ? 'became nullable' : 'became required'}` });
    }
    if (JSON.stringify(before.values) !== JSON.stringify(after.values)) {
      changes.push({ kind: 'breaking', what: `${where}: enum values changed` });
    }
    if (before.target !== after.target) changes.push({ kind: 'breaking', what: `${where}: ref target changed` });
    if (before.hasDefault !== after.hasDefault) {
      changes.push({ kind: 'local', what: `${where}: ${after.hasDefault ? 'default added' : 'default removed'}` });
    }
  }
  return changes;
}

/**
 * What's wrong with releasing `next` after `previous`, or an empty list if nothing is. The schema
 * snapshot test fails on any problem.
 */
export function evolutionProblems(previous: SchemaSnapshot, next: SchemaSnapshot): string[] {
  const problems: string[] = [];
  const changes = diffSchemas(previous, next);
  const breaking = changes.filter((change) => change.kind === 'breaking');

  if (next.version < previous.version) problems.push(`version went down from ${previous.version} to ${next.version}`);
  if (changes.length > 0 && next.version === previous.version) {
    problems.push(`the schema changed but version is still ${next.version}; raise it`);
  }
  if (next.minVersion < previous.minVersion) {
    problems.push(`minVersion went down from ${previous.minVersion} to ${next.minVersion}`);
  }
  if (breaking.length > 0 && next.minVersion !== next.version) {
    problems.push(
      `breaking changes need minVersion raised to ${next.version}: ${breaking.map((change) => change.what).join('; ')}`,
    );
  }
  return problems;
}
