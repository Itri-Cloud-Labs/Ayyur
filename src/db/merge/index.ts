// The merge rule, spec section 9.5. The device and the Convex `push` mutation both call `mergeRow`,
// so this file must stay plain TypeScript with no React Native, Expo or `@/` imports.

import { type Hlc, maxHlc } from '../clock';

/**
 * Any cell that carries the clock of its last write. On the device the rest is the plaintext value;
 * in Convex it is the ciphertext. The merge only ever looks at `hlc`.
 */
export type ClockedCell = { readonly hlc: Hlc };

export type MergeableRow<C extends ClockedCell> = {
  readonly deleted: boolean;
  /** The largest cell clock for a live row, or the delete clock for a tombstone. */
  readonly version: Hlc;
  /** Empty for a tombstone. */
  readonly cells: Readonly<Record<string, C>>;
};

/**
 * Merges two versions of the same row.
 *
 * - If either side is deleted, the result is a tombstone whose version is the largest delete clock.
 *   An edit never brings a deleted row back, whatever its clock (decision 6).
 * - Otherwise each column keeps the cell with the larger clock, and a column one side lacks comes
 *   from the other.
 *
 * Deterministic, commutative, associative and idempotent (invariant 10). Two cells with the same
 * clock come from the same write, so either one is right; `a`'s is kept. In Convex that keeps the
 * stored ciphertext when reconcile sends the same write again, encrypted with a new nonce.
 */
export function mergeRow<C extends ClockedCell>(a: MergeableRow<C>, b: MergeableRow<C>): MergeableRow<C> {
  if (a.deleted || b.deleted) {
    const version = a.deleted && b.deleted ? maxHlc(a.version, b.version) : a.deleted ? a.version : b.version;
    return { deleted: true, version, cells: {} };
  }

  const cells: Record<string, C> = { ...a.cells };
  for (const [column, cell] of Object.entries(b.cells)) {
    const mine = Object.hasOwn(cells, column) ? cells[column] : undefined;
    if (mine === undefined || cell.hlc > mine.hlc) cells[column] = cell;
  }
  return { deleted: false, version: liveVersion(cells), cells };
}

/** The version of a live row: its largest cell clock. Throws for a row with no cells, which can't exist. */
export function liveVersion(cells: Readonly<Record<string, ClockedCell>>): Hlc {
  let version: Hlc | null = null;
  for (const cell of Object.values(cells)) {
    if (version === null || cell.hlc > version) version = cell.hlc;
  }
  if (version === null) throw new Error('A live row must have at least one cell');
  return version;
}

/**
 * True if two rows hold the same sync state: the same `deleted`, `version` and cell clocks. `push`
 * uses this to skip writing, and stamping a `seq`, when a merge changed nothing (spec 8.3).
 */
export function sameRowState(a: MergeableRow<ClockedCell>, b: MergeableRow<ClockedCell>): boolean {
  if (a.deleted !== b.deleted || a.version !== b.version) return false;
  const aColumns = Object.keys(a.cells);
  if (aColumns.length !== Object.keys(b.cells).length) return false;
  return aColumns.every((column) => Object.hasOwn(b.cells, column) && b.cells[column].hlc === a.cells[column].hlc);
}
