import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import type { CutList, StockSummary, CustomShoppingItem } from '../../types';

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

// Mock featureLimits
vi.mock('../../utils/featureLimits', () => ({
  getBlockedMessage: vi.fn().mockReturnValue('PDF export requires a license')
}));

// Mock pdfExport (dynamic import)
vi.mock('../../utils/pdfExport', () => ({
  exportShoppingListToPdf: vi.fn().mockResolvedValue({ success: true }),
  exportShoppingListToCsv: vi.fn().mockReturnValue('Name,Qty,Price\nPlywood,2,$50.00')
}));

import { ShoppingListTab } from './ShoppingListTab';

// ============================================================
// Setup
// ============================================================

function createStockSummary(overrides: Partial<StockSummary> = {}): StockSummary {
  return {
    stockId: 's1',
    stockName: 'Plywood',
    boardsNeeded: 2,
    boardFeet: 16,
    cost: 100,
    stockLength: 96,
    stockWidth: 48,
    stockThickness: 0.75,
    pricingUnit: 'per_item',
    pricePerUnit: 50,
    linearFeet: 16,
    actualBoardsUsed: 2,
    averageUtilization: 75,
    wasteSquareInches: 2304,
    ...overrides
  };
}

function createCutList(overrides: Partial<CutList> = {}): CutList {
  return {
    id: 'cl-1',
    generatedAt: '2026-01-15T00:00:00.000Z',
    projectModifiedAt: '2026-01-15T00:00:00.000Z',
    isStale: false,
    instructions: [],
    stockBoards: [],
    statistics: {
      totalParts: 4,
      totalStockBoards: 2,
      totalBoardFeet: 16,
      totalWasteSquareInches: 2304,
      wastePercentage: 25,
      estimatedCost: 100,
      totalWasteCost: 25,
      byStock: [createStockSummary()]
    },
    bypassedIssues: [],
    skippedParts: [],
    kerfWidth: 0.125,
    overageFactor: 1.1,
    ...overrides
  };
}

beforeAll(() => {
  window.electronAPI = {
    getPreference: vi.fn(),
    setPreference: vi.fn(),
    showSaveDialog: vi.fn(),
    showOpenDialog: vi.fn(),
    writeBinaryFile: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    addRecentProject: vi.fn(),
    getRecentProjects: vi.fn(),
    clearRecentProjects: vi.fn(),
    setWindowTitle: vi.fn()
  } as unknown as typeof window.electronAPI;
  // Mock URL methods used by CSV export
  URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
  URL.revokeObjectURL = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  useProjectStore.setState({
    customShoppingItems: [],
    addCustomShoppingItem: vi.fn(),
    updateCustomShoppingItem: vi.fn(),
    deleteCustomShoppingItem: vi.fn()
  });
  useUIStore.setState({ toast: null });
});

// ============================================================
// Tests
// ============================================================

describe('ShoppingListTab', () => {
  const defaultProps = {
    cutList: createCutList(),
    units: 'imperial' as const,
    projectName: 'Test Project',
    canExportPDF: true
  };

  describe('rendering', () => {
    it('renders stock type count', () => {
      render(<ShoppingListTab {...defaultProps} />);
      expect(screen.getByText(/1 stock type/)).toBeInTheDocument();
    });

    it('renders estimated total', () => {
      render(<ShoppingListTab {...defaultProps} />);
      expect(screen.getByText(/Est. \$100.00/)).toBeInTheDocument();
    });

    it('renders stock name', () => {
      render(<ShoppingListTab {...defaultProps} />);
      expect(screen.getByText('Plywood')).toBeInTheDocument();
    });

    it('renders quantity with board label', () => {
      render(<ShoppingListTab {...defaultProps} />);
      expect(screen.getByText(/Buy: 2 boards/)).toBeInTheDocument();
    });

    it('renders price per unit', () => {
      render(<ShoppingListTab {...defaultProps} />);
      expect(screen.getByText('$50.00/sheet')).toBeInTheDocument();
    });

    it('renders line total', () => {
      render(<ShoppingListTab {...defaultProps} />);
      const lineTotals = document.querySelectorAll('.line-total');
      expect(lineTotals[0].textContent).toBe('$100.00');
    });

    it('renders grand total', () => {
      render(<ShoppingListTab {...defaultProps} />);
      expect(screen.getByText('Est. Total:')).toBeInTheDocument();
      // $100.00 appears in both line total and grand total, so use getAllByText
      const totals = screen.getAllByText('$100.00');
      expect(totals.length).toBeGreaterThanOrEqual(1);
    });

    it('renders waste info', () => {
      render(<ShoppingListTab {...defaultProps} />);
      expect(screen.getByText('Waste value:')).toBeInTheDocument();
      expect(screen.getByText(/\$25.00/)).toBeInTheDocument();
    });
  });

  describe('board foot pricing', () => {
    it('shows board foot price for board_foot stocks', () => {
      const cutList = createCutList({
        statistics: {
          ...createCutList().statistics,
          byStock: [createStockSummary({ pricingUnit: 'board_foot', pricePerUnit: 8.5, boardFeet: 16 })]
        }
      });
      render(<ShoppingListTab {...defaultProps} cutList={cutList} />);
      expect(screen.getByText('$8.50/bf')).toBeInTheDocument();
      expect(screen.getByText(/16.00 board feet total/)).toBeInTheDocument();
    });

    it('shows linear feet for board_foot stocks', () => {
      const cutList = createCutList({
        statistics: {
          ...createCutList().statistics,
          byStock: [createStockSummary({ pricingUnit: 'board_foot', linearFeet: 12.5 })]
        }
      });
      render(<ShoppingListTab {...defaultProps} cutList={cutList} />);
      expect(screen.getByText(/12.5 linear ft/)).toBeInTheDocument();
    });
  });

  describe('overage display', () => {
    it('shows overage when boardsNeeded > actualBoardsUsed', () => {
      const cutList = createCutList({
        statistics: {
          ...createCutList().statistics,
          byStock: [createStockSummary({ boardsNeeded: 3, actualBoardsUsed: 2 })]
        }
      });
      render(<ShoppingListTab {...defaultProps} cutList={cutList} />);
      expect(screen.getByText(/uses 2, \+1 overage/)).toBeInTheDocument();
    });
  });

  describe('checkboxes', () => {
    it('renders unchecked checkboxes for each stock', () => {
      render(<ShoppingListTab {...defaultProps} />);
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).not.toBeChecked();
    });

    it('toggles checkbox on click', () => {
      render(<ShoppingListTab {...defaultProps} />);
      const checkbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });

  describe('high utilization warnings', () => {
    it('shows warning for stocks with >90% utilization', () => {
      const cutList = createCutList({
        statistics: {
          ...createCutList().statistics,
          byStock: [createStockSummary({ averageUtilization: 95, stockName: 'Tight Plywood' })]
        },
        overageFactor: 1.1
      });
      render(<ShoppingListTab {...defaultProps} cutList={cutList} />);
      expect(screen.getByText(/consider an extra board/)).toBeInTheDocument();
    });
  });

  describe('custom shopping items', () => {
    it('shows empty state when no custom items', () => {
      render(<ShoppingListTab {...defaultProps} />);
      expect(screen.getByText(/Add hardware, fasteners, glue/)).toBeInTheDocument();
    });

    it('shows add item button', () => {
      render(<ShoppingListTab {...defaultProps} />);
      expect(screen.getByText('+ Add Item')).toBeInTheDocument();
    });

    it('shows add form when clicking add button', () => {
      render(<ShoppingListTab {...defaultProps} />);
      fireEvent.click(screen.getByText('+ Add Item'));
      expect(screen.getByPlaceholderText(/Item name/)).toBeInTheDocument();
    });

    it('renders existing custom items', () => {
      const items: CustomShoppingItem[] = [
        { id: 'ci1', name: 'Wood Screws', quantity: 2, unitPrice: 5.99, category: 'Hardware' }
      ];
      useProjectStore.setState({ customShoppingItems: items });

      render(<ShoppingListTab {...defaultProps} />);
      expect(screen.getByText('Wood Screws')).toBeInTheDocument();
      expect(screen.getByText('Hardware')).toBeInTheDocument();
      expect(screen.getByText('Qty: 2')).toBeInTheDocument();
    });

    it('shows combined totals when custom items exist', () => {
      const items: CustomShoppingItem[] = [{ id: 'ci1', name: 'Screws', quantity: 1, unitPrice: 10 }];
      useProjectStore.setState({ customShoppingItems: items });

      render(<ShoppingListTab {...defaultProps} />);
      // Should show lumber + other items breakdown
      expect(screen.getByText('Lumber & Sheet Goods:')).toBeInTheDocument();
      expect(screen.getByText('Other Items:')).toBeInTheDocument();
      // Grand total should be $110 ($100 lumber + $10 custom)
      expect(screen.getByText('$110.00')).toBeInTheDocument();
    });

    it('submits new custom item form', () => {
      const addCustomShoppingItem = vi.fn();
      useProjectStore.setState({ addCustomShoppingItem });

      render(<ShoppingListTab {...defaultProps} />);
      fireEvent.click(screen.getByText('+ Add Item'));

      const nameInput = screen.getByPlaceholderText(/Item name/);
      fireEvent.change(nameInput, { target: { value: 'Hinges' } });

      const form = document.querySelector('.custom-item-form') as HTMLFormElement;
      fireEvent.submit(form);

      expect(addCustomShoppingItem).toHaveBeenCalledWith(expect.objectContaining({ name: 'Hinges' }));
    });

    it('cancels add form', () => {
      render(<ShoppingListTab {...defaultProps} />);
      fireEvent.click(screen.getByText('+ Add Item'));
      expect(screen.getByPlaceholderText(/Item name/)).toBeInTheDocument();

      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByPlaceholderText(/Item name/)).not.toBeInTheDocument();
    });
  });

  describe('download', () => {
    it('renders download button', () => {
      render(<ShoppingListTab {...defaultProps} />);
      expect(screen.getByText('Download')).toBeInTheDocument();
    });
  });

  describe('pluralization', () => {
    it('uses singular for 1 stock type', () => {
      render(<ShoppingListTab {...defaultProps} />);
      expect(screen.getByText(/1 stock type,/)).toBeInTheDocument();
    });

    it('uses plural for multiple stock types', () => {
      const cutList = createCutList({
        statistics: {
          ...createCutList().statistics,
          byStock: [createStockSummary(), createStockSummary({ stockId: 's2', stockName: 'Oak' })]
        }
      });
      render(<ShoppingListTab {...defaultProps} cutList={cutList} />);
      expect(screen.getByText(/2 stock types/)).toBeInTheDocument();
    });

    it('uses singular board for quantity 1', () => {
      const cutList = createCutList({
        statistics: {
          ...createCutList().statistics,
          byStock: [createStockSummary({ boardsNeeded: 1 })]
        }
      });
      render(<ShoppingListTab {...defaultProps} cutList={cutList} />);
      expect(screen.getByText(/Buy: 1 board$/)).toBeInTheDocument();
    });
  });
});
