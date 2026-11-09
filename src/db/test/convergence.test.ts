// The convergence test, spec section 14: the main test for decision 5. Random runs of edits, deletes,
// same-key upserts, offline phones, lost responses, interrupted pulls, wrong clocks, wipes and
// re-keying, then a full sync. Every phone must end with exactly the server's rows and checksums.
//
// CI runs fixed seeds, so a failure always reproduces. For a wider search locally:
//   SIM_SEEDS=2000 SIM_STEPS=600 SIM_PHONES=5 npm test -- convergence

import { describe, expect, it } from 'vitest';

import { World } from './sim/world';

const SEEDS = Number(process.env.SIM_SEEDS ?? 150);
const STEPS = Number(process.env.SIM_STEPS ?? 300);
const FIRST_SEED = Number(process.env.SIM_FIRST_SEED ?? 1);
const PHONES = Number(process.env.SIM_PHONES ?? 3);

describe('convergence', () => {
  const seeds = Array.from({ length: SEEDS }, (_, i) => FIRST_SEED + i);
  it.each(seeds)(`converges for seed %i after ${STEPS} steps`, (seed) => {
    const world = new World(seed, PHONES);
    for (let step = 0; step < STEPS; step++) world.step();
    let problems: string[];
    try {
      world.settle();
      problems = world.problems();
    } catch (error) {
      problems = [String(error)];
    }
    if (problems.length > 0) {
      expect.fail(`${problems.join('\n')}\nlast steps:\n  ${world.log.slice(-25).join('\n  ')}`);
    }
  });
});
