import { describe, expect, it } from 'vitest';
import {
  getStockDiameter,
  inferStockForm,
  isCountedStockForm,
  isRectangularStockForm,
  resolveStockForm,
  STOCK_FORMS,
  type StockShape
} from './stock';

const stock = (overrides: Partial<StockShape> = {}): StockShape => ({
  name: '4/4 Walnut',
  length: 96,
  width: 6,
  thickness: 0.75,
  grainDirection: 'length',
  pricingUnit: 'board_foot',
  pricePerUnit: 12,
  color: '#6b4b32',
  ...overrides
});

describe('stock forms', () => {
  it('classifies legacy stock the way the library has always been grouped', () => {
    // A full sheet: wide and long.
    expect(inferStockForm(stock({ name: '3/4" Plywood', length: 96, width: 48 }))).toBe('sheet');
    // MDF has no grain, which is how sheet goods have always been spotted.
    expect(inferStockForm(stock({ name: '3/4" MDF', length: 96, width: 30, grainDirection: 'none' }))).toBe('sheet');
    expect(inferStockForm(stock())).toBe('board');
    expect(inferStockForm(stock({ name: '2x4', length: 96, width: 3.5, thickness: 1.5 }))).toBe('board');
  });

  it('never infers a form that did not exist before the field did', () => {
    // Legacy files can only hold sheets and boards, so the migration cannot
    // invent rod or insert stock and silently change how a project behaves.
    const legacy = [
      stock({ length: 96, width: 48 }),
      stock({ grainDirection: 'none' }),
      stock({ width: 3.5 }),
      stock({ length: 36, width: 0.375, thickness: 0.375 })
    ];
    for (const candidate of legacy) {
      expect(isRectangularStockForm(inferStockForm(candidate))).toBe(true);
    }
  });

  it('prefers a stored form over the dimension heuristic', () => {
    // A 36" x 3/8" rod would infer as a board; the stored form must win, or
    // every saved dowel would come back as lumber.
    const rod = stock({ name: '3/8" Birch Dowel', length: 36, width: 0.375, thickness: 0.375, form: 'rod' });
    expect(inferStockForm(rod)).toBe('board');
    expect(resolveStockForm(rod)).toBe('rod');
    expect(resolveStockForm(stock())).toBe('board');
  });

  it('separates the forms that get nested from the ones that get counted', () => {
    expect(isRectangularStockForm('sheet')).toBe(true);
    expect(isRectangularStockForm('board')).toBe(true);
    expect(isRectangularStockForm('rod')).toBe(false);
    expect(isRectangularStockForm('insert')).toBe(false);

    expect(isCountedStockForm('insert')).toBe(true);
    // A rod is round, but it is still cut from a blank.
    expect(isCountedStockForm('rod')).toBe(false);
    expect(isCountedStockForm('board')).toBe(false);
  });

  it('reads a rod diameter from either square dimension', () => {
    const rod = stock({ length: 36, width: 0.375, thickness: 0.375, form: 'rod' });
    expect(getStockDiameter(rod)).toBeCloseTo(0.375);
    expect(rod.width).toBeCloseTo(rod.thickness);
  });

  it('enumerates every form exactly once', () => {
    expect(STOCK_FORMS).toEqual(['sheet', 'board', 'rod', 'insert']);
    expect(new Set(STOCK_FORMS).size).toBe(STOCK_FORMS.length);
  });
});
