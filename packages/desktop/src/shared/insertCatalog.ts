import type { InsertKind, StockShape } from './stock';

/**
 * The loose-tenon stock a shop actually keeps on the shelf.
 *
 * Closed sets ship complete and open sets ship the common range. A partial
 * list of biscuit sizes is worse than none, because you stop trusting it and
 * go check the box anyway -- but biscuits and Dominoes are small fixed sets,
 * so completeness costs almost nothing. Everything here is seed data in a
 * library the user adds to, so a missing size is a thirty-second fix rather
 * than something to wait for.
 *
 * Dimensions are stored in decimal inches like all other stock, with the
 * metric sizes converted from the millimetres they are sold in.
 */

const MM = 1 / 25.4;

export interface InsertCatalogEntry extends StockShape {
  /** Stable id so a seeded entry is recognised across installs. */
  id: string;
}

function insert(
  id: string,
  name: string,
  insertKind: InsertKind,
  /** Along the joint line. */
  length: number,
  /** Across the joint line, into both mortises. */
  width: number,
  thickness: number,
  packSize: number,
  pricePerUnit: number,
  color: string,
  grainDirection: StockShape['grainDirection'] = 'length'
): InsertCatalogEntry {
  return {
    id,
    name,
    length,
    width,
    thickness,
    grainDirection,
    pricingUnit: 'per_item',
    pricePerUnit,
    color,
    form: 'insert',
    insertKind,
    packSize
  };
}

const BEECH = '#d9c49a';
const BIRCH = '#e3d3ae';
const SIPO = '#9a6b45';

/** Fluted pins, bought by the bag. Sold at a fixed length, never cut. */
export const DOWEL_PIN_CATALOG: InsertCatalogEntry[] = [
  insert(
    'insert-dowel-pin-0250-125',
    '1/4" × 1-1/4" Fluted Dowel Pin',
    'dowel_pin',
    1.25,
    0.25,
    0.25,
    100,
    6.99,
    BIRCH
  ),
  insert('insert-dowel-pin-0250-150', '1/4" × 1-1/2" Fluted Dowel Pin', 'dowel_pin', 1.5, 0.25, 0.25, 100, 7.49, BIRCH),
  insert(
    'insert-dowel-pin-0312-150',
    '5/16" × 1-1/2" Fluted Dowel Pin',
    'dowel_pin',
    1.5,
    0.3125,
    0.3125,
    100,
    7.99,
    BIRCH
  ),
  insert(
    'insert-dowel-pin-0375-150',
    '3/8" × 1-1/2" Fluted Dowel Pin',
    'dowel_pin',
    1.5,
    0.375,
    0.375,
    100,
    8.49,
    BIRCH
  ),
  insert('insert-dowel-pin-0375-200', '3/8" × 2" Fluted Dowel Pin', 'dowel_pin', 2, 0.375, 0.375, 100, 9.49, BIRCH),
  insert('insert-dowel-pin-0500-200', '1/2" × 2" Fluted Dowel Pin', 'dowel_pin', 2, 0.5, 0.5, 50, 10.99, BIRCH),
  insert(
    'insert-dowel-pin-6mm-30',
    '6 × 30 mm Fluted Dowel Pin',
    'dowel_pin',
    30 * MM,
    6 * MM,
    6 * MM,
    100,
    7.49,
    BIRCH
  ),
  insert(
    'insert-dowel-pin-8mm-30',
    '8 × 30 mm Fluted Dowel Pin',
    'dowel_pin',
    30 * MM,
    8 * MM,
    8 * MM,
    100,
    7.99,
    BIRCH
  ),
  insert(
    'insert-dowel-pin-8mm-40',
    '8 × 40 mm Fluted Dowel Pin',
    'dowel_pin',
    40 * MM,
    8 * MM,
    8 * MM,
    100,
    8.49,
    BIRCH
  ),
  insert(
    'insert-dowel-pin-10mm-40',
    '10 × 40 mm Fluted Dowel Pin',
    'dowel_pin',
    40 * MM,
    10 * MM,
    10 * MM,
    100,
    8.99,
    BIRCH
  )
];

/**
 * The complete biscuit range. Compressed beech, all 4 mm thick, with the
 * grain running at 45 degrees so the biscuit swells across the joint -- which
 * the app's along-length/across-width vocabulary cannot express, so it is
 * recorded as no grain rather than as a direction that would be a lie.
 */
export const BISCUIT_CATALOG: InsertCatalogEntry[] = [
  insert('insert-biscuit-ff', 'FF Face Frame Biscuit', 'biscuit', 38 * MM, 12 * MM, 4 * MM, 125, 12.99, BEECH, 'none'),
  insert('insert-biscuit-0', '#0 Biscuit', 'biscuit', 47 * MM, 15 * MM, 4 * MM, 100, 11.99, BEECH, 'none'),
  insert('insert-biscuit-10', '#10 Biscuit', 'biscuit', 53 * MM, 19 * MM, 4 * MM, 100, 12.99, BEECH, 'none'),
  insert('insert-biscuit-20', '#20 Biscuit', 'biscuit', 56 * MM, 23 * MM, 4 * MM, 100, 13.99, BEECH, 'none')
];

/** The complete Domino line, sold in boxes of sipo tenons. */
export const DOMINO_CATALOG: InsertCatalogEntry[] = [
  insert('insert-domino-4x17x20', '4 × 17 × 20 mm Domino', 'domino', 20 * MM, 17 * MM, 4 * MM, 450, 24.0, SIPO),
  insert('insert-domino-5x19x30', '5 × 19 × 30 mm Domino', 'domino', 30 * MM, 19 * MM, 5 * MM, 300, 26.0, SIPO),
  insert('insert-domino-6x20x40', '6 × 20 × 40 mm Domino', 'domino', 40 * MM, 20 * MM, 6 * MM, 190, 28.0, SIPO),
  insert('insert-domino-8x22x40', '8 × 22 × 40 mm Domino', 'domino', 40 * MM, 22 * MM, 8 * MM, 150, 30.0, SIPO),
  insert('insert-domino-8x22x50', '8 × 22 × 50 mm Domino', 'domino', 50 * MM, 22 * MM, 8 * MM, 100, 30.0, SIPO),
  insert('insert-domino-10x24x50', '10 × 24 × 50 mm Domino', 'domino', 50 * MM, 24 * MM, 10 * MM, 85, 32.0, SIPO),
  insert('insert-domino-14x24x70', '14 × 24 × 70 mm Domino', 'domino', 70 * MM, 24 * MM, 14 * MM, 50, 34.0, SIPO),
  insert('insert-domino-14x24x100', '14 × 24 × 100 mm Domino', 'domino', 100 * MM, 24 * MM, 14 * MM, 30, 36.0, SIPO)
];

export const INSERT_CATALOG: InsertCatalogEntry[] = [...DOWEL_PIN_CATALOG, ...BISCUIT_CATALOG, ...DOMINO_CATALOG];

export function getInsertCatalog(kind: InsertKind): InsertCatalogEntry[] {
  return INSERT_CATALOG.filter((entry) => entry.insertKind === kind);
}

export function findInsertCatalogEntry(id: string): InsertCatalogEntry | undefined {
  return INSERT_CATALOG.find((entry) => entry.id === id);
}
