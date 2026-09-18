import type { Part, Stock } from '../types';
import { resolveStockForm } from '../../../shared/stock';

/**
 * The cross-section of a part, which follows the stock it is cut from.
 *
 * A part is round because it came off a dowel, not because it was drawn that
 * way, so the shape is derived rather than stored. Reassigning a dowel to
 * board stock makes it rectangular again, which is the honest answer.
 */
export type PartShape = 'rectangular' | 'round';

export function getStockShapeKind(stock: Stock | undefined): PartShape {
  return stock && resolveStockForm(stock) === 'rod' ? 'round' : 'rectangular';
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
