import type { Part } from '../types';

/**
 * Wood moves across the grain, and along it hardly at all.
 *
 * This is the thing that decides whether a piece survives a winter. A board
 * takes up moisture in a damp August and gives it back in a dry January, and
 * it does so almost entirely across its width -- a 12" solid panel swings
 * something like an eighth of an inch over the year. Fix that panel rigidly
 * across its width and it has nowhere to go, so it splits, or it bursts the
 * joint holding it.
 *
 * None of this applies to plywood or MDF. Their plies cross, so they move
 * about as little as anything made of wood can.
 */

/**
 * Seasonal change across the grain, as a fraction of the board's width.
 *
 * A deliberately middling figure for flat-sawn hardwood through an ordinary
 * indoor year. Real movement depends on species, on how the board was sawn --
 * quarter-sawn moves roughly half as much as flat-sawn -- and on how far the
 * humidity actually swings where the piece will live. The app knows none of
 * those, so this is an order-of-magnitude allowance and is described that way
 * wherever it is shown.
 */
export const SEASONAL_MOVEMENT_RATIO = 1 / 96;

/**
 * Below this there is nothing worth allowing for.
 *
 * A 3" rail moves about a thirty-second across the year, which is inside the
 * slop of any joint. Panels are where it bites.
 */
export const MOVEMENT_ADVISORY_MIN_WIDTH = 6;

/** Whether this part is solid wood that will actually move. */
export function movesSeasonally(part: Pick<Part, 'grainSensitive'>): boolean {
  // A part cut from sheet goods comes off stock with no grain direction, and
  // the app records that by leaving the part grain-insensitive. Those are the
  // ones that stay put, so this flag is the whole test.
  return part.grainSensitive;
}

/** The dimension that moves: whichever one runs across the grain. */
export function getAcrossGrainWidth(part: Pick<Part, 'length' | 'width' | 'grainDirection'>): number {
  return part.grainDirection === 'width' ? part.length : part.width;
}

/** Roughly how much this part changes across the grain over a year. */
export function estimateSeasonalMovement(
  part: Pick<Part, 'length' | 'width' | 'grainSensitive' | 'grainDirection'>
): number {
  if (!movesSeasonally(part)) return 0;
  return getAcrossGrainWidth(part) * SEASONAL_MOVEMENT_RATIO;
}

/** Whether this part is wide enough in solid wood for movement to matter. */
export function needsMovementAllowance(
  part: Pick<Part, 'length' | 'width' | 'grainSensitive' | 'grainDirection'>
): boolean {
  return movesSeasonally(part) && getAcrossGrainWidth(part) >= MOVEMENT_ADVISORY_MIN_WIDTH;
}
