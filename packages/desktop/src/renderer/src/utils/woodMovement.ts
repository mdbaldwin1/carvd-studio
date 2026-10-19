import type { Part, Stock } from '../types';

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

/** UI advisory threshold, not a claim that narrower parts cannot move. */
export const MOVEMENT_ADVISORY_MIN_WIDTH = 6;

/** Board stock is treated as solid wood; unknown forms receive no numeric estimate.
 * Grain sensitivity controls nesting/appearance, not material identity.
 */
export function movesSeasonally(_part: Pick<Part, 'grainSensitive'>, stock?: Stock): boolean {
  return stock?.form === 'board';
}

/** The dimension that moves: whichever one runs across the grain. */
export function getAcrossGrainWidth(part: Pick<Part, 'length' | 'width' | 'grainDirection'>): number {
  return part.grainDirection === 'width' ? part.length : part.width;
}

/** Roughly how much this part changes across the grain over a year. */
export function estimateSeasonalMovement(
  part: Pick<Part, 'length' | 'width' | 'grainSensitive' | 'grainDirection'>,
  stock?: Stock
): number {
  if (!movesSeasonally(part, stock)) return 0;
  return getAcrossGrainWidth(part) * SEASONAL_MOVEMENT_RATIO;
}

/** Whether this part is wide enough in solid wood for movement to matter. */
export function needsMovementAllowance(
  part: Pick<Part, 'length' | 'width' | 'grainSensitive' | 'grainDirection'>,
  stock?: Stock
): boolean {
  return movesSeasonally(part, stock) && getAcrossGrainWidth(part) >= MOVEMENT_ADVISORY_MIN_WIDTH;
}
