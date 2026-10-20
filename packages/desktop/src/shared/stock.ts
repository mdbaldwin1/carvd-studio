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

/**
 * Which loose-tenon family an insert belongs to.
 *
 * These behave identically -- all of them are bought at a fixed size and
 * dropped into matching mortises -- so the kind selects a catalogue and a
 * label rather than a code path.
 */
export type InsertKind = 'dowel_pin' | 'biscuit' | 'domino' | 'loose_tenon';

export const INSERT_KINDS: readonly InsertKind[] = ['dowel_pin', 'biscuit', 'domino', 'loose_tenon'];

export const INSERT_KIND_LABELS: Record<InsertKind, string> = {
  dowel_pin: 'Dowel pin',
  biscuit: 'Biscuit',
  domino: 'Domino',
  loose_tenon: 'Loose tenon'
};

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
  /** Which loose-tenon family this is. Only meaningful when form is `insert`. */
  insertKind?: InsertKind;
  /**
   * How many come in one box or bag. Inserts are sold by the box, so this is
   * what turns "24 biscuits needed" into "buy 1 box". Only meaningful when
   * form is `insert`; one means sold singly.
   */
  packSize?: number;
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

/** How many boxes to buy to get `needed` inserts out of them. */
export function getPacksNeeded(needed: number, packSize: number | undefined): number {
  const perPack = packSize && packSize > 0 ? packSize : 1;
  return Math.ceil(Math.max(needed, 0) / perPack);
}

/**
 * Round in section, so it renders and mates as a cylinder.
 *
 * A dowel pin is a short dowel; the flats of a biscuit or a domino are what
 * make them what they are, so those stay rectangular.
 */
export function isRoundStock(stock: StockShape): boolean {
  const form = resolveStockForm(stock);
  if (form === 'rod') return true;
  return form === 'insert' && stock.insertKind === 'dowel_pin';
}

/**
 * Nothing about an insert is the user's to change: a #20 biscuit is a #20
 * biscuit. A rod is fixed in diameter but cut to length.
 */
export function isStockDimensionFixed(stock: StockShape, dimension: 'length' | 'width' | 'thickness'): boolean {
  const form = resolveStockForm(stock);
  if (form === 'insert') return true;
  return form === 'rod' && dimension !== 'length';
}
