// Tables and the schema, spec 4.1 to 4.3 and the rules in section 5 that a schema can check.
// `createAyyurDBSchema` refuses a broken schema when it is imported, so a bad table fails at app
// start instead of turning into a sync bug months later.

import type { Column, ColumnSpec, ColumnValue, IsOptional } from './columns';
import { normalizeValue, serializeValue, ValueError } from './values';

type AnyColumn = Column<any, any, any>;
export type Columns = Record<string, AnyColumn>;

export type TableKind = 'random' | 'appendOnly' | 'keyed' | 'singleton' | 'local';

type ColumnName<C extends Columns> = keyof C & string;
type Indexes<C extends Columns> = { indexes?: readonly (readonly ColumnName<C>[])[] };
type NoKind = { singleton?: never; key?: never; appendOnly?: never; local?: never };

/** One kind per table, so the options object can set at most one of these. */
export type TableOptions<C extends Columns> = Indexes<C> &
  (
    | NoKind
    | (Omit<NoKind, 'singleton'> & { singleton: true })
    | (Omit<NoKind, 'key'> & { key: readonly [ColumnName<C>, ...ColumnName<C>[]] })
    | (Omit<NoKind, 'appendOnly'> & { appendOnly: true })
    | (Omit<NoKind, 'local'> & { local: true })
  );

export type TableDef<C extends Columns = Columns, K extends string = string> = {
  readonly columns: C;
  readonly options: TableOptions<C>;
  /** Type-only: the key column names. Never set at runtime. */
  readonly keyColumns?: K;
};

// The column parameter is invariant (it appears in both the columns and the options), so
// constraints that accept any table need `any` here.
export type AnyTableDef = TableDef<any, any>;

type KeyOf<O> = O extends { key: readonly (infer K)[] } ? K & string : never;

export function table<C extends Columns, const O extends TableOptions<C> = NoKind>(
  columns: C,
  options?: O,
): TableDef<C, KeyOf<O>> {
  return Object.freeze({ columns, options: Object.freeze({ ...(options ?? {}) }) as TableOptions<C> });
}

/** What the store, sync and snapshots need to know about a table at runtime. */
export type TableMeta = {
  readonly name: string;
  readonly kind: TableKind;
  /** False only for local tables. */
  readonly synced: boolean;
  readonly columns: Readonly<Record<string, ColumnSpec>>;
  /** Content column names in declaration order. */
  readonly columnNames: readonly string[];
  /** Key column names in key order, or null if the table isn't keyed. */
  readonly key: readonly string[] | null;
  readonly indexes: readonly (readonly string[])[];
};

export type AyyurDBSchema<T extends Record<string, AnyTableDef> = Record<string, AnyTableDef>> = {
  readonly version: number;
  readonly minVersion: number;
  readonly tables: T;
  readonly meta: Readonly<Record<keyof T & string, TableMeta>>;
};

/** Table and column names (spec 4.2). Convex refuses field names that start with `_` or `$`. */
export const NAME_PATTERN = /^[a-z][A-Za-z0-9]{0,63}$/;

/**
 * Names a column can't have. `id` is the row id. The rest are on Object.prototype, and code that
 * reads `cells[column]` from a plain object would find them on every row.
 */
export const RESERVED_COLUMN_NAMES: ReadonlySet<string> = new Set([
  'id',
  'constructor',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  'toString',
  'valueOf',
]);

const KEY_COLUMN_TYPES: ReadonlySet<ColumnSpec['type']> = new Set(['text', 'integer', 'boolean', 'day', 'enum', 'ref']);
const REF_TARGET_KINDS: ReadonlySet<TableKind> = new Set(['random', 'appendOnly', 'singleton']);

export class SchemaError extends Error {
  override name = 'SchemaError';
  constructor(readonly problems: readonly string[]) {
    super(`The AyyurDB schema is invalid:\n${problems.map((problem) => `- ${problem}`).join('\n')}`);
  }
}

export function createAyyurDBSchema<const T extends Record<string, AnyTableDef>>(input: {
  version: number;
  minVersion: number;
  tables: T;
}): AyyurDBSchema<T> {
  const problems: string[] = [];
  const { version, minVersion } = input;
  const tables: Record<string, TableDef> = input.tables;

  if (!Number.isSafeInteger(version) || version < 1) problems.push(`version must be a positive integer, got ${version}`);
  if (!Number.isSafeInteger(minVersion) || minVersion < 1 || minVersion > version) {
    problems.push(`minVersion must be an integer from 1 to version (${version}), got ${minVersion}`);
  }

  // Kinds first, because checking a ref needs its target's kind.
  const kinds = new Map<string, TableKind>();
  for (const [name, def] of Object.entries(tables)) {
    const kind = kindOf(def.options);
    if (kind === null) problems.push(`${name}: a table has one kind; choose one of singleton, key, appendOnly and local`);
    kinds.set(name, kind ?? 'random');
  }

  const meta: Record<string, TableMeta> = {};
  for (const [name, def] of Object.entries(tables)) {
    const kind = kinds.get(name)!;
    if (!NAME_PATTERN.test(name)) problems.push(`${name}: table names must match ${NAME_PATTERN}`);

    const columnNames = Object.keys(def.columns);
    if (kind !== 'local' && columnNames.length === 0) problems.push(`${name}: a synced table needs at least one column`);

    const columns: Record<string, ColumnSpec> = {};
    for (const columnName of columnNames) {
      const spec: ColumnSpec = def.columns[columnName].spec;
      columns[columnName] = spec;
      const where = `${name}.${columnName}`;
      if (!NAME_PATTERN.test(columnName)) problems.push(`${where}: column names must match ${NAME_PATTERN}`);
      if (RESERVED_COLUMN_NAMES.has(columnName)) problems.push(`${where}: "${columnName}" is a reserved name`);

      if (spec.type === 'enum') {
        const values = spec.values ?? [];
        if (values.length === 0 || new Set(values).size !== values.length || values.some((value) => value === '')) {
          problems.push(`${where}: an enum needs at least one value, with no duplicates or empty strings`);
        }
      }
      if (spec.type === 'ref') {
        const target = spec.target ?? '';
        const targetKind = kinds.get(target);
        if (targetKind === undefined) problems.push(`${where}: refers to "${target}", which isn't a table in this schema`);
        else if (!REF_TARGET_KINDS.has(targetKind)) {
          problems.push(`${where}: refers to "${target}", a ${targetKind} table; a ref must target a random-id, append-only or singleton table (rule R8)`);
        }
      }
      if (spec.default) {
        try {
          serializeValue(normalizeValue(spec, spec.default.value, `${where} default`), `${where} default`);
        } catch (error) {
          if (!(error instanceof ValueError)) throw error;
          problems.push(error.message);
        }
      }
    }

    let key: string[] | null = null;
    if (kind === 'keyed') {
      key = [...(def.options.key ?? [])];
      if (new Set(key).size !== key.length) problems.push(`${name}: key columns are listed twice`);
      for (const columnName of key) {
        const spec = columns[columnName];
        if (!spec) problems.push(`${name}: key column "${columnName}" isn't a column of the table`);
        else if (!KEY_COLUMN_TYPES.has(spec.type)) {
          problems.push(`${name}.${columnName}: a key column can't be ${spec.type}; use text, integer, boolean, day, enum or ref`);
        } else if (spec.nullable) problems.push(`${name}.${columnName}: a key column can't be nullable`);
      }
    }

    const indexes = (def.options.indexes ?? []).map((index) => [...index]);
    for (const index of indexes) {
      if (index.length === 0) problems.push(`${name}: an index needs at least one column`);
      for (const columnName of index) {
        if (!columns[columnName]) problems.push(`${name}: index column "${columnName}" isn't a column of the table`);
      }
    }

    meta[name] = Object.freeze({
      name,
      kind,
      synced: kind !== 'local',
      columns: Object.freeze(columns),
      columnNames: Object.freeze(columnNames),
      key: key && Object.freeze(key),
      indexes: Object.freeze(indexes.map((index) => Object.freeze(index))),
    });
  }

  if (problems.length > 0) throw new SchemaError(problems);
  return Object.freeze({
    version,
    minVersion,
    tables: input.tables,
    meta: Object.freeze(meta) as AyyurDBSchema<T>['meta'],
  });
}

function kindOf(options: TableOptions<Columns>): TableKind | null {
  const kinds: TableKind[] = [];
  if (options.singleton === true) kinds.push('singleton');
  if (options.key !== undefined) kinds.push('keyed');
  if (options.appendOnly === true) kinds.push('appendOnly');
  if (options.local === true) kinds.push('local');
  if (kinds.length > 1) return null;
  return kinds[0] ?? 'random';
}

// Row types, spec 4.4.

type Simplify<T> = { [K in keyof T]: T[K] } & {};
type ColumnsOf<T extends AnyTableDef> = T['columns'];
type KeyColumnsOf<T extends AnyTableDef> = NonNullable<T['keyColumns']> & keyof ColumnsOf<T>;
type OptionalColumns<C extends Columns> = { [K in keyof C]: IsOptional<C[K]> extends true ? K : never }[keyof C];

/** A row as reads return it. */
export type Row<T extends AnyTableDef> = Simplify<
  { readonly id: string } & { readonly [K in keyof ColumnsOf<T>]: ColumnValue<ColumnsOf<T>[K]> }
>;

/** What an insert or upsert needs: every column except nullable ones and ones with a default. */
export type Insert<T extends AnyTableDef> = Simplify<
  { [K in Exclude<keyof ColumnsOf<T>, OptionalColumns<ColumnsOf<T>>>]: ColumnValue<ColumnsOf<T>[K]> } & {
    [K in OptionalColumns<ColumnsOf<T>>]?: ColumnValue<ColumnsOf<T>[K]>;
  }
>;

/** What an update may change. Key columns can't change: a different key is a different row. */
export type Patch<T extends AnyTableDef> = Simplify<{
  [K in Exclude<keyof ColumnsOf<T>, KeyColumnsOf<T>>]?: ColumnValue<ColumnsOf<T>[K]>;
}>;

/** A keyed table's key, as `upsert` and `update` by key take it. */
export type Key<T extends AnyTableDef> = Simplify<{ [K in KeyColumnsOf<T>]: ColumnValue<ColumnsOf<T>[K]> }>;
