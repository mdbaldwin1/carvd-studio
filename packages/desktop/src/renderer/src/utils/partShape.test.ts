import { describe, expect, it } from 'vitest';
import {
  createBoardStock,
  createPlywoodStock,
  createTestPart,
  createTestStock
} from '../../../../tests/helpers/factories';
import { getPartShape, getStockShapeKind, isPartDimensionLockedToStock } from './partShape';

const rodStock = createTestStock({
  id: 'rod-1',
  name: '3/8" Birch Dowel',
  length: 36,
  width: 0.375,
  thickness: 0.375,
  pricingUnit: 'per_item',
  form: 'rod'
});

describe('part shape', () => {
  it('makes a part round only when it is cut from round stock', () => {
    const board = createBoardStock({ id: 'board-1' });
    const stocks = [board, rodStock, createPlywoodStock({ id: 'ply-1' })];

    expect(getPartShape(createTestPart({ stockId: 'rod-1' }), stocks)).toBe('round');
    expect(getPartShape(createTestPart({ stockId: 'board-1' }), stocks)).toBe('rectangular');
    expect(getPartShape(createTestPart({ stockId: 'ply-1' }), stocks)).toBe('rectangular');
  });

  it('treats a part with no stock, or a missing one, as rectangular', () => {
    expect(getPartShape(createTestPart({ stockId: null }), [rodStock])).toBe('rectangular');
    // A dangling stock reference is only a warning elsewhere; it must not make
    // the part vanish into an unrenderable shape.
    expect(getPartShape(createTestPart({ stockId: 'deleted' }), [rodStock])).toBe('rectangular');
    expect(getStockShapeKind(undefined)).toBe('rectangular');
  });

  it('follows the stock when a part is reassigned', () => {
    const stocks = [rodStock, createBoardStock({ id: 'board-1' })];
    const part = createTestPart({ stockId: 'rod-1' });
    expect(getPartShape(part, stocks)).toBe('round');
    // Shape is derived, never stored, so moving to lumber squares it off again.
    expect(getPartShape({ ...part, stockId: 'board-1' }, stocks)).toBe('rectangular');
  });

  it('locks every dimension of a dowel except its length', () => {
    // Ripping makes a board narrower; nothing makes a dowel thinner.
    expect(isPartDimensionLockedToStock('round', 'width')).toBe(true);
    expect(isPartDimensionLockedToStock('round', 'thickness')).toBe(true);
    expect(isPartDimensionLockedToStock('round', 'length')).toBe(false);

    for (const dimension of ['length', 'width', 'thickness'] as const) {
      expect(isPartDimensionLockedToStock('rectangular', dimension)).toBe(false);
    }
  });
});
