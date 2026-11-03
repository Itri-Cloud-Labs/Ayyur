// A small seeded random source (mulberry32), so every simulation run can be replayed from its seed.

export type Rng = {
  /** A number in [0, 1). */
  next(): number;
  /** An integer in [0, max). */
  int(max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
  bytes(length: number): Uint8Array;
  hex(length: number): string;
};

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (max: number) => Math.floor(next() * max);
  return {
    next,
    int,
    chance: (probability) => next() < probability,
    pick: (items) => {
      if (items.length === 0) throw new Error('pick from an empty list');
      return items[int(items.length)];
    },
    bytes: (length) => Uint8Array.from({ length }, () => int(256)),
    hex: (length) => Array.from({ length }, () => int(16).toString(16)).join(''),
  };
}
