import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShoppingListItem } from './ShoppingListItem';
import type { StockSummary } from '../../types';

describe('ShoppingListItem for dowel rod', () => {
  const rodSummary = (overrides: Partial<StockSummary> = {}): StockSummary => ({
    stockId: 'rod-1',
    stockName: '3/8" Birch Dowel',
    boardsNeeded: 2,
    boardFeet: 0,
    cost: 7,
    stockLength: 36,
    stockWidth: 0.375,
    stockThickness: 0.375,
    pricingUnit: 'per_item',
    pricePerUnit: 3.5,
    linearFeet: 6,
    actualBoardsUsed: 2,
    averageUtilization: 80,
    wasteSquareInches: 1,
    form: 'rod',
    ...overrides
  });

  const renderRod = (overrides: Partial<StockSummary> = {}) =>
    render(<ShoppingListItem summary={rodSummary(overrides)} units="imperial" checked={false} onToggle={vi.fn()} />);

  it('counts dowel by the rod, not the board', () => {
    renderRod();
    expect(screen.getByText(/Buy: 2 rods/)).toBeInTheDocument();
    expect(screen.getByText('$3.50/rod')).toBeInTheDocument();
  });

  it('says one rod in the singular', () => {
    renderRod({ boardsNeeded: 1, actualBoardsUsed: 1 });
    expect(screen.getByText(/Buy: 1 rod(?!s)/)).toBeInTheDocument();
  });

  it('describes a rod by its diameter and length', () => {
    renderRod();
    expect(screen.getByText('3/8" dia × 36"')).toBeInTheDocument();
  });

  it('gives linear feet and withholds board feet', () => {
    renderRod();
    // Board feet on a dowel measure the box around it, not the rod.
    expect(screen.getByText(/6.0 linear ft/)).toBeInTheDocument();
    expect(screen.queryByText(/board feet total/)).not.toBeInTheDocument();
  });
});
