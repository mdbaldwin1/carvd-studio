import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import type { Stock } from '../../types';

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('new-stock-id')
}));

import { StocksTab } from './StocksTab';
import { v4 as uuidv4 } from 'uuid';

// ============================================================
// Setup
// ============================================================

function createStock(overrides: Partial<Stock> = {}): Stock {
  return {
    id: 's1',
    name: 'Plywood',
    length: 96,
    width: 48,
    thickness: 0.75,
    grainDirection: 'length',
    pricingUnit: 'per_item',
    pricePerUnit: 50,
    color: '#c4a574',
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
    setWindowTitle: vi.fn(),
    openExternal: vi.fn(),
    exportStocks: vi.fn().mockResolvedValue({ success: true, filePath: '/test/stocks.json' }),
    importStocks: vi.fn().mockResolvedValue({ success: true, imported: 2 })
  } as unknown as typeof window.electronAPI;
});

beforeEach(() => {
  vi.clearAllMocks();
  (uuidv4 as ReturnType<typeof vi.fn>).mockReturnValue('new-stock-id');
  (window.electronAPI.exportStocks as ReturnType<typeof vi.fn>).mockResolvedValue({
    success: true,
    filePath: '/test/stocks.json'
  });
  (window.electronAPI.importStocks as ReturnType<typeof vi.fn>).mockResolvedValue({
    success: true,
    imported: 2
  });
  useProjectStore.setState({ units: 'imperial' });
  useUIStore.setState({ toast: null, showToast: vi.fn() });
});

// ============================================================
// Tests
// ============================================================

describe('StocksTab', () => {
  const defaultProps = {
    stocks: [createStock()],
    onAddStock: vi.fn(),
    onUpdateStock: vi.fn(),
    onDeleteStock: vi.fn(),
    onClose: vi.fn()
  };

  describe('list sidebar', () => {
    it('renders stock count', () => {
      render(<StocksTab {...defaultProps} />);
      expect(screen.getByText('1 available')).toBeInTheDocument();
    });

    it('renders stock name in list', () => {
      render(<StocksTab {...defaultProps} />);
      expect(screen.getByText('Plywood')).toBeInTheDocument();
    });

    it('renders color swatch for stock', () => {
      const { container } = render(<StocksTab {...defaultProps} />);
      const swatch = container.querySelector('span[style*="background-color"]');
      expect(swatch).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no stocks', () => {
      render(<StocksTab {...defaultProps} stocks={[]} />);
      expect(screen.getByText(/No stocks in library yet/)).toBeInTheDocument();
    });

    it('shows placeholder when no stock selected', () => {
      render(<StocksTab {...defaultProps} />);
      expect(screen.getByText('Select a stock to view details')).toBeInTheDocument();
    });
  });

  describe('stock selection', () => {
    it('shows detail panel when stock is selected', () => {
      render(<StocksTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Plywood'));
      expect(screen.getByText('Dimensions')).toBeInTheDocument();
      expect(screen.getByText('Grain')).toBeInTheDocument();
      expect(screen.getByText('Pricing')).toBeInTheDocument();
    });

    it('shows grain direction', () => {
      render(<StocksTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Plywood'));
      expect(screen.getByText('Along length')).toBeInTheDocument();
    });

    it('shows pricing info', () => {
      render(<StocksTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Plywood'));
      expect(screen.getByText('$50.00 / sheet')).toBeInTheDocument();
    });

    it('shows board foot pricing label', () => {
      const stock = createStock({ pricingUnit: 'board_foot', pricePerUnit: 8.5 });
      render(<StocksTab {...defaultProps} stocks={[stock]} />);
      fireEvent.click(screen.getByText('Plywood'));
      expect(screen.getByText('$8.50 / bd ft')).toBeInTheDocument();
    });
  });

  describe('edit mode', () => {
    it('enters edit mode when clicking Edit', () => {
      render(<StocksTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Plywood'));
      fireEvent.click(screen.getByText('Edit'));
      expect(screen.getByDisplayValue('Plywood')).toBeInTheDocument();
    });

    it('calls onUpdateStock when saving edits', () => {
      render(<StocksTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Plywood'));
      fireEvent.click(screen.getByText('Edit'));

      const nameInput = screen.getByDisplayValue('Plywood');
      fireEvent.change(nameInput, { target: { value: 'Updated Plywood' } });
      fireEvent.click(screen.getByText('Save'));

      expect(defaultProps.onUpdateStock).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({ name: 'Updated Plywood' })
      );
    });

    it('cancels edit mode', () => {
      render(<StocksTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Plywood'));
      fireEvent.click(screen.getByText('Edit'));
      fireEvent.click(screen.getByText('Cancel'));
      // Should show detail view, not form
      expect(screen.getByText('Dimensions')).toBeInTheDocument();
    });
  });

  describe('create mode', () => {
    it('enters create mode when clicking create button', () => {
      render(<StocksTab {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('Create new stock'));
      expect(screen.getByText('New Stock')).toBeInTheDocument();
    });

    it('calls onAddStock when creating', () => {
      render(<StocksTab {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('Create new stock'));
      fireEvent.click(screen.getByText('Create'));

      expect(defaultProps.onAddStock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'new-stock-id', name: 'New Stock' })
      );
    });
  });

  describe('delete', () => {
    it('calls onDeleteStock when clicking delete', () => {
      render(<StocksTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Plywood'));
      fireEvent.click(screen.getByText('Delete'));
      expect(defaultProps.onDeleteStock).toHaveBeenCalledWith('s1');
    });
  });

  describe('search', () => {
    it('filters stocks by search term', () => {
      const stocks = [createStock({ id: 's1', name: 'Plywood' }), createStock({ id: 's2', name: 'Oak Board' })];
      render(<StocksTab {...defaultProps} stocks={stocks} />);

      const searchInput = screen.getByPlaceholderText('Search stocks...');
      fireEvent.change(searchInput, { target: { value: 'Oak' } });

      expect(screen.getByText('Oak Board')).toBeInTheDocument();
      expect(screen.queryByText('Plywood')).not.toBeInTheDocument();
    });

    it('shows no match message', () => {
      render(<StocksTab {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText('Search stocks...');
      fireEvent.change(searchInput, { target: { value: 'zzz' } });
      expect(screen.getByText(/No stocks match/)).toBeInTheDocument();
    });

    it('clears search with clear button', () => {
      render(<StocksTab {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText('Search stocks...');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      fireEvent.click(screen.getByLabelText('Clear search'));
      expect(searchInput).toHaveValue('');
    });
  });

  describe('escape key', () => {
    it('calls onClose when pressing Escape', () => {
      render(<StocksTab {...defaultProps} />);
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('cancels form mode on Escape instead of closing', () => {
      render(<StocksTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Plywood'));
      fireEvent.click(screen.getByText('Edit'));

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByText('Save')).not.toBeInTheDocument();
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('import/export', () => {
    it('shows import button', () => {
      render(<StocksTab {...defaultProps} />);
      expect(screen.getByLabelText('Import stocks')).toBeInTheDocument();
    });

    it('shows export button when stock is selected', () => {
      render(<StocksTab {...defaultProps} />);
      fireEvent.click(screen.getByText('Plywood'));
      expect(screen.getByText('Export')).toBeInTheDocument();
    });
  });

  describe('grain direction display', () => {
    it('shows "None" for no-grain stocks', () => {
      const stock = createStock({ grainDirection: 'none' });
      render(<StocksTab {...defaultProps} stocks={[stock]} />);
      fireEvent.click(screen.getByText('Plywood'));
      expect(screen.getByText('None')).toBeInTheDocument();
    });

    it('shows "Along width" for width grain', () => {
      const stock = createStock({ grainDirection: 'width' });
      render(<StocksTab {...defaultProps} stocks={[stock]} />);
      fireEvent.click(screen.getByText('Plywood'));
      expect(screen.getByText('Along width')).toBeInTheDocument();
    });
  });
});
