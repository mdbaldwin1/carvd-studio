/**
 * The canonical shape of a piece of stock, shared by every process.
 *
 * Stock is stored in four places that must agree: the project file, the
 * app-level library in electron-store, an assembly's embedded snapshot, and a
 * template definition. Each used to re-declare the same fields by hand, which
 * is how the main process ended up missing `preventOverlap` from its copy of
 * the constraint settings. They all build on `StockShape` now, so a new
 * material field is added once and every store is a compile error until it
 * agrees.
 */

export type StockGrainDirection = 'length' | 'width' | 'none';

export type StockPricingUnit = 'board_foot' | 'per_item';

/**
 * How stock is bought and broken down, which decides the optimizer path, the
 * dimension fields the form offers, and the words the cut list uses.
 *
 * - `sheet`  plywood and MDF; nested in two dimensions.
 * - `board`  dimensional lumber; also nested in two dimensions, because a
 *   board is ripped as well as crosscut.
 * - `rod`    dowel rod; round, and cut to length only. A rod's width and
 *   thickness are both its diameter.
 * - `insert` biscuits, dominoes, dowel pins; bought by the box at fixed sizes
 *   and never cut, so they are counted rather than optimized.
 */
export type StockForm = 'sheet' | 'board' | 'rod' | 'insert';

export const STOCK_FORMS: readonly StockForm[] = ['sheet', 'board', 'rod', 'insert'];

/** The material fields every stock record carries, wherever it is stored. */
export interface StockShape {
  name: string;
  length: number;
  width: number;
  thickness: number;
  grainDirection: StockGrainDirection;
  pricingUnit: StockPricingUnit;
  pricePerUnit: number;
  color: string;
  /** How this stock is bought and cut. Absent in files written before v3. */
  form?: StockForm;
}

/** Round stock records both its width and thickness as the diameter. */
export function getStockDiameter(stock: Pick<StockShape, 'width'>): number {
  return stock.width;
}

/**
 * Classify a stock record that predates the `form` field.
 *
 * This is the rule the new-project picker has always used to group the
 * library, promoted here unchanged so that reading an old file classifies
 * every stock exactly the way the app was already displaying it. Legacy stock
 * can only ever be a sheet or a board -- rod and insert did not exist -- so
 * the migration cannot mint a form that changes any existing behaviour.
 */
export function inferStockForm(stock: Pick<StockShape, 'width' | 'length' | 'grainDirection'>): StockForm {
  if ((stock.width >= 24 && stock.length >= 48) || stock.grainDirection === 'none') return 'sheet';
  return 'board';
}

/** The stored form, or the one inferred from dimensions for legacy records. */
export function resolveStockForm(stock: StockShape): StockForm {
  return stock.form ?? inferStockForm(stock);
}

/** Rod and insert stock is round or fixed-size; neither is nested in two dimensions. */
export function isRectangularStockForm(form: StockForm): boolean {
  return form === 'sheet' || form === 'board';
}

/** Inserts are bought at a fixed size and counted, never cut from a blank. */
export function isCountedStockForm(form: StockForm): boolean {
  return form === 'insert';
}
