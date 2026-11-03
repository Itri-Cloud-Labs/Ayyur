// Column builders, spec 4.2. Each builder returns an immutable description; `.nullable()` and
// `.default()` return new ones. The type parameters carry the value type into the row types.

export type ColumnType = 'text' | 'integer' | 'real' | 'boolean' | 'day' | 'timestamp' | 'enum' | 'json' | 'ref';

/** What a column is at runtime. The schema validates it, and snapshots record it. */
export type ColumnSpec = {
  readonly type: ColumnType;
  readonly nullable: boolean;
  /** Present when the column has a default. Applied by the SDK on insert, never by sync. */
  readonly default?: { readonly value: unknown };
  /** The allowed values of an `enum` column. */
  readonly values?: readonly string[];
  /** The table a `ref` column points at. */
  readonly target?: string;
};

declare const valueType: unique symbol;
declare const nullableFlag: unique symbol;
declare const defaultFlag: unique symbol;

export interface Column<T, N extends boolean = false, D extends boolean = false> {
  readonly spec: ColumnSpec;
  /** Type-only markers. They never exist at runtime. */
  readonly [valueType]?: T;
  readonly [nullableFlag]?: N;
  readonly [defaultFlag]?: D;
  nullable(): Column<T, true, D>;
  default(value: N extends true ? T | null : T): Column<T, N, true>;
}

// The type parameters exist only for TypeScript, so one implementation serves every column.
function makeColumn<T, N extends boolean = false, D extends boolean = false>(spec: ColumnSpec): Column<T, N, D> {
  const column = {
    spec: Object.freeze(spec),
    nullable: () => makeColumn<T, true, D>({ ...spec, nullable: true }),
    default: (value: unknown) => makeColumn<T, N, true>({ ...spec, default: { value } }),
  };
  return Object.freeze(column) as unknown as Column<T, N, D>;
}

export function text(): Column<string> {
  return makeColumn({ type: 'text', nullable: false });
}

export function integer(): Column<number> {
  return makeColumn({ type: 'integer', nullable: false });
}

export function real(): Column<number> {
  return makeColumn({ type: 'real', nullable: false });
}

export function boolean(): Column<boolean> {
  return makeColumn({ type: 'boolean', nullable: false });
}

/** A `YYYY-MM-DD` date. Which day an act belongs to is the data model's rule, not the SDK's. */
export function day(): Column<string> {
  return makeColumn({ type: 'day', nullable: false });
}

/** Milliseconds since the epoch. */
export function timestamp(): Column<number> {
  return makeColumn({ type: 'timestamp', nullable: false });
}

export function enumOf<const V extends readonly [string, ...string[]]>(values: V): Column<V[number]> {
  return makeColumn({ type: 'enum', nullable: false, values: Object.freeze([...values]) });
}

/** A JSON value, replaced whole on merge and never merged inside (rule R4). */
export function json<T>(): Column<T> {
  return makeColumn({ type: 'json', nullable: false });
}

/** The id of a row in another synced table, which must be a random-id table or a singleton (rule R8). */
export function ref(target: string): Column<string> {
  return makeColumn({ type: 'ref', nullable: false, target });
}

/** The value a column holds, with `null` when it is nullable. */
export type ColumnValue<C> = C extends Column<infer T, infer N, boolean> ? (N extends true ? T | null : T) : never;

/** True for columns an insert may leave out: nullable ones and ones with a default. */
export type IsOptional<C> = C extends Column<unknown, infer N, infer D> ? (N extends true ? true : D) : never;
