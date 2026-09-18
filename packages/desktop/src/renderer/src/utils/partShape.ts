import type { Part, Stock } from '../types';
import { isRoundStock, isStockDimensionFixed } from '../../../shared/stock';

/**
 * The cross-section of a part, which follows the stock it is cut from.
 *
 * A part is round because it came off a dowel, not because it was drawn that
 * way, so the shape is derived rather than stored. Reassigning a dowel to
 * board stock makes it rectangular again, which is the honest answer.
 */
export type PartShape = 'rectangular' | 'round';

export function getStockShapeKind(stock: Stock | undefined): PartShape {
  // A dowel pin is a short dowel, so it is round too. The flats of a biscuit
  // or a domino are what make them what they are, so those stay rectangular.
  return stock && isRoundStock(stock) ? 'round' : 'rectangular';
}

export function getPartShape(part: Pick<Part, 'stockId'>, stocks: readonly Stock[]): PartShape {
  if (!part.stockId) return 'rectangular';
  return getStockShapeKind(stocks.find((stock) => stock.id === part.stockId));
}

/**
 * Round stock cannot be made narrower -- ripping reduces a board's width, but
 * nothing reduces a dowel's diameter short of a lathe. So a round part takes
 * its diameter from its stock and only its length is the user's to set.
 */
export function isPartDimensionLockedToStock(shape: PartShape, dimension: 'length' | 'width' | 'thickness'): boolean {
  return shape === 'round' && dimension !== 'length';
}

/** Which of a part's dimensions its stock decides, if it has one assigned. */
export function isPartDimensionFixedByStock(
  part: Pick<Part, 'stockId'>,
  stocks: readonly Stock[],
  dimension: 'length' | 'width' | 'thickness'
): boolean {
  const stock = part.stockId ? stocks.find((candidate) => candidate.id === part.stockId) : undefined;
  return stock ? isStockDimensionFixed(stock, dimension) : false;
}
