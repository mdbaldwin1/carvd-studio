import { decimalToFraction } from '../../src/renderer/src/utils/fractions';

/**
 * Wall-clock budgets that survive the machine they run on.
 *
 * A handful of tests guard against pathological regressions in the geometry:
 * an accidental quadratic, a cache that quietly stopped being hit. What they
 * are not meant to catch is the same work being uniformly slower, which is
 * exactly what happens under coverage -- v8 instrumentation roughly doubles
 * code this call-heavy -- and on a loaded CI runner. A fixed millisecond
 * budget conflates the two, so the suite fails under `--coverage` while the
 * code it is guarding is unchanged.
 *
 * There is nothing to interrogate for this: v8 coverage is collected over the
 * inspector protocol and leaves no environment variable or global behind. So
 * the budget is calibrated instead, by timing a known quantity of real work
 * and scaling the allowance by how long it took. The calibration deliberately
 * calls a function from src/ rather than one defined here: everything under
 * tests/ is excluded from coverage, so a local loop would not be instrumented
 * and would not notice the very slowdown it exists to measure.
 */

/**
 * What the calibration below costs on an unloaded developer machine without
 * instrumentation. Only the ratio matters, so this needs to be the right order
 * of magnitude rather than exact.
 */
const REFERENCE_CALIBRATION_MS = 17;

const CALIBRATION_ITERATIONS = 200000;

let measured: number | null = null;

/** How much slower this environment is than the reference one. Never below 1. */
export function environmentSlowdown(): number {
  if (measured !== null) return measured;

  const started = performance.now();
  let sink = 0;
  for (let i = 0; i < CALIBRATION_ITERATIONS; i += 1) {
    // Cheap, pure, and instrumented when coverage is on.
    sink += decimalToFraction(i / 64).length;
  }
  const elapsed = performance.now() - started;
  // Keep the compiler from discarding the loop.
  if (sink < 0) throw new Error('unreachable');

  measured = Math.max(1, elapsed / REFERENCE_CALIBRATION_MS);
  return measured;
}

/**
 * A budget in milliseconds, scaled to this environment.
 *
 * `base` is what the operation should cost on an unloaded developer machine.
 * The headroom is generous on purpose: these assertions are meant to fire on a
 * regression of a different order, not on a bad afternoon.
 */
export function budgetMs(base: number): number {
  return base * environmentSlowdown();
}
