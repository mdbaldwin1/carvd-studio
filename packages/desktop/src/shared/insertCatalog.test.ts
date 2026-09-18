import { describe, expect, it } from 'vitest';
import {
  BISCUIT_CATALOG,
  DOMINO_CATALOG,
  DOWEL_PIN_CATALOG,
  findInsertCatalogEntry,
  getInsertCatalog,
  INSERT_CATALOG
} from './insertCatalog';
import { getPacksNeeded, isRoundStock, isStockDimensionFixed, resolveStockForm } from './stock';

describe('insert catalogue', () => {
  it('ships the complete biscuit range', () => {
    // Four sizes is the whole practical range, so a partial list would only
    // teach the user to go and check the box anyway.
    expect(BISCUIT_CATALOG.map((entry) => entry.name)).toEqual([
      'FF Face Frame Biscuit',
      '#0 Biscuit',
      '#10 Biscuit',
      '#20 Biscuit'
    ]);
    // Every biscuit is 4mm thick whatever its size.
    for (const biscuit of BISCUIT_CATALOG) {
      expect(biscuit.thickness).toBeCloseTo(4 / 25.4, 6);
      // Grain runs at 45 degrees, which the app cannot express -- recording it
      // as along-the-length would be a lie, so it is recorded as no grain.
      expect(biscuit.grainDirection).toBe('none');
    }
  });

  it('ships the complete Domino line', () => {
    expect(DOMINO_CATALOG).toHaveLength(8);
    // Thickness is the number the machine is set to, so it must round-trip.
    expect(DOMINO_CATALOG[0].thickness).toBeCloseTo(4 / 25.4, 6);
    expect(DOMINO_CATALOG.at(-1)).toMatchObject({ name: '14 × 24 × 100 mm Domino' });
    expect(DOMINO_CATALOG.at(-1)!.length).toBeCloseTo(100 / 25.4, 6);
  });

  it('ships dowel pins in both imperial and metric', () => {
    expect(DOWEL_PIN_CATALOG.length).toBeGreaterThanOrEqual(10);
    // A pin is round, so it is square in section at its diameter.
    for (const pin of DOWEL_PIN_CATALOG) {
      expect(pin.width).toBeCloseTo(pin.thickness, 9);
      expect(isRoundStock(pin)).toBe(true);
    }
  });

  it('treats every entry as an insert sold by the box', () => {
    for (const entry of INSERT_CATALOG) {
      expect(resolveStockForm(entry)).toBe('insert');
      expect(entry.packSize).toBeGreaterThan(1);
      expect(entry.pricePerUnit).toBeGreaterThan(0);
      // Nothing about a manufactured insert is the user's to resize.
      for (const dimension of ['length', 'width', 'thickness'] as const) {
        expect(isStockDimensionFixed(entry, dimension)).toBe(true);
      }
    }
  });

  it('gives every entry a distinct id and name', () => {
    expect(new Set(INSERT_CATALOG.map((entry) => entry.id)).size).toBe(INSERT_CATALOG.length);
    expect(new Set(INSERT_CATALOG.map((entry) => entry.name)).size).toBe(INSERT_CATALOG.length);
  });

  it('looks an entry up by kind and by id', () => {
    expect(getInsertCatalog('biscuit')).toEqual(BISCUIT_CATALOG);
    expect(getInsertCatalog('loose_tenon')).toEqual([]);
    expect(findInsertCatalogEntry('insert-biscuit-20')?.name).toBe('#20 Biscuit');
    expect(findInsertCatalogEntry('nothing-like-it')).toBeUndefined();
  });

  it('rounds a count up to whole boxes', () => {
    // Biscuits come 100 to a box; 24 of them is still one box.
    expect(getPacksNeeded(24, 100)).toBe(1);
    expect(getPacksNeeded(100, 100)).toBe(1);
    expect(getPacksNeeded(101, 100)).toBe(2);
    expect(getPacksNeeded(0, 100)).toBe(0);
    // Sold singly, or with no pack size recorded, one buys one.
    expect(getPacksNeeded(7, 1)).toBe(7);
    expect(getPacksNeeded(7, undefined)).toBe(7);
  });
});
