import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddStockModal } from './AddStockModal';
import { useProjectStore } from '../../store/projectStore';
import { Stock } from '../../types';

// Mock window.electronAPI for ColorPicker's useCustomColors
beforeAll(() => {
  window.electronAPI = {
    getCustomColors: vi.fn().mockResolvedValue([]),
    setCustomColors: vi.fn().mockResolvedValue(undefined)
  } as unknown as typeof window.electronAPI;
});

describe('AddStockModal', () => {
  const mockStockLibrary: Stock[] = [
    {
      id: 'stock-1',
      name: 'Plywood 3/4"',
      length: 96,
      width: 48,
      thickness: 0.75,
      grainDirection: 'length',
      pricingUnit: 'per_item',
      pricePerUnit: 50,
      color: '#c4a574'
    },
    {
      id: 'stock-2',
      name: 'Oak Board',
      length: 72,
      width: 6,
      thickness: 1,
      grainDirection: 'length',
      pricingUnit: 'board_foot',
      pricePerUnit: 8,
      color: '#8b5a2b'
    }
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onAddStock: vi.fn(),
    stockLibrary: mockStockLibrary,
    onAddToLibrary: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useProjectStore.setState({
      units: 'imperial'
    });
  });

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(<AddStockModal {...defaultProps} />);

      expect(screen.getByText('Add Stock to Project')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<AddStockModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Add Stock to Project')).not.toBeInTheDocument();
    });

    it('shows stock library list', () => {
      render(<AddStockModal {...defaultProps} />);

      expect(screen.getByText('Plywood 3/4"')).toBeInTheDocument();
      expect(screen.getByText('Oak Board')).toBeInTheDocument();
    });

    it('shows available count', () => {
      render(<AddStockModal {...defaultProps} />);

      expect(screen.getByText('2 available')).toBeInTheDocument();
    });

    it('shows placeholder when no stock selected', () => {
      render(<AddStockModal {...defaultProps} />);

      expect(screen.getByText('Select a stock from the library to view details')).toBeInTheDocument();
    });
  });

  describe('empty library', () => {
    it('shows empty state message', () => {
      render(<AddStockModal {...defaultProps} stockLibrary={[]} />);

      expect(screen.getByText('No stocks in library yet')).toBeInTheDocument();
    });

    it('shows hint to create stock', () => {
      render(<AddStockModal {...defaultProps} stockLibrary={[]} />);

      expect(screen.getByText(/Click "\+" to create your first stock/)).toBeInTheDocument();
    });
  });

  describe('stock selection', () => {
    it('selects stock when clicked', () => {
      render(<AddStockModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Plywood 3/4"'));

      // Should show the stock details
      expect(screen.getByRole('heading', { name: 'Plywood 3/4"' })).toBeInTheDocument();
    });

    it('shows stock dimensions when selected', () => {
      render(<AddStockModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Plywood 3/4"'));

      // Check for dimensions label
      expect(screen.getByText('Dimensions (L × W × T)')).toBeInTheDocument();
    });

    it('shows grain direction when selected', () => {
      render(<AddStockModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Plywood 3/4"'));

      expect(screen.getByText('Grain Direction')).toBeInTheDocument();
      expect(screen.getByText('Along Length')).toBeInTheDocument();
    });

    it('shows pricing info when selected', () => {
      render(<AddStockModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Plywood 3/4"'));

      expect(screen.getByText('Pricing')).toBeInTheDocument();
      expect(screen.getByText('$50.00 Per Sheet/Board')).toBeInTheDocument();
    });

    it('allows multiple selection', () => {
      render(<AddStockModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Plywood 3/4"'));
      fireEvent.click(screen.getByText('Oak Board'));

      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('deselects when clicked again', () => {
      render(<AddStockModal {...defaultProps} />);

      // Click the stock item in the list (not the details heading)
      const stockItems = screen.getAllByText('Plywood 3/4"');
      const listItem = stockItems[0]; // First one is in the list

      fireEvent.click(listItem);
      expect(screen.getByText('1 selected')).toBeInTheDocument();

      // Click again to deselect
      fireEvent.click(listItem);
      expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
    });
  });

  describe('select all', () => {
    it('shows Select All button', () => {
      render(<AddStockModal {...defaultProps} />);

      expect(screen.getByText('Select All')).toBeInTheDocument();
    });

    it('selects all stocks when clicked', () => {
      render(<AddStockModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Select All'));

      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('changes to Deselect All after selection', () => {
      render(<AddStockModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Select All'));

      expect(screen.getByText('Deselect All')).toBeInTheDocument();
    });
  });

  describe('search', () => {
    it('shows search input', () => {
      render(<AddStockModal {...defaultProps} />);

      expect(screen.getByPlaceholderText('Search stock...')).toBeInTheDocument();
    });

    it('filters stocks by search term', () => {
      render(<AddStockModal {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('Search stock...'), {
        target: { value: 'Oak' }
      });

      expect(screen.getByText('Oak Board')).toBeInTheDocument();
      expect(screen.queryByText('Plywood 3/4"')).not.toBeInTheDocument();
    });

    it('shows no results message', () => {
      render(<AddStockModal {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('Search stock...'), {
        target: { value: 'xyz' }
      });

      expect(screen.getByText(/No stocks match "xyz"/)).toBeInTheDocument();
    });

    it('shows clear button when search has value', () => {
      render(<AddStockModal {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('Search stock...'), {
        target: { value: 'test' }
      });

      // Find the clear button (X icon)
      const clearBtn = screen.getByLabelText('Clear search');
      expect(clearBtn).toBeInTheDocument();
    });
  });

  describe('create new stock', () => {
    it('shows create button', () => {
      render(<AddStockModal {...defaultProps} />);

      expect(screen.getByTitle('Create new stock')).toBeInTheDocument();
    });

    it('switches to create mode when clicked', () => {
      render(<AddStockModal {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Create new stock'));

      expect(screen.getByText('Create New Stock')).toBeInTheDocument();
    });

    it('shows form fields in create mode', () => {
      render(<AddStockModal {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Create new stock'));

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Dimensions (L × W × T)')).toBeInTheDocument();
      expect(screen.getByText('Grain Direction')).toBeInTheDocument();
      expect(screen.getByText('Display Color')).toBeInTheDocument();
    });

    it('shows Back button in create mode', () => {
      render(<AddStockModal {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Create new stock'));

      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('shows Create & Add to Project button', () => {
      render(<AddStockModal {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Create new stock'));

      expect(screen.getByText('Create & Add to Project')).toBeInTheDocument();
    });

    it('returns to library view on Back', () => {
      render(<AddStockModal {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Create new stock'));
      fireEvent.click(screen.getByText('Back'));

      expect(screen.queryByText('Create New Stock')).not.toBeInTheDocument();
      expect(screen.getByText('Select a stock from the library to view details')).toBeInTheDocument();
    });

    it('calls callbacks on Create & Add to Project', () => {
      const onAddStock = vi.fn();
      const onAddToLibrary = vi.fn();
      const onClose = vi.fn();

      render(
        <AddStockModal {...defaultProps} onAddStock={onAddStock} onAddToLibrary={onAddToLibrary} onClose={onClose} />
      );

      fireEvent.click(screen.getByTitle('Create new stock'));
      fireEvent.click(screen.getByText('Create & Add to Project'));

      expect(onAddToLibrary).toHaveBeenCalled();
      expect(onAddStock).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('add to project', () => {
    it('disables Add to Project button when nothing selected', () => {
      render(<AddStockModal {...defaultProps} />);

      expect(screen.getByText('Add to Project')).toBeDisabled();
    });

    it('enables Add to Project button when stock selected', () => {
      render(<AddStockModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Plywood 3/4"'));

      expect(screen.getByText('Add to Project (1)')).not.toBeDisabled();
    });

    it('shows count in button when multiple selected', () => {
      render(<AddStockModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Plywood 3/4"'));
      fireEvent.click(screen.getByText('Oak Board'));

      expect(screen.getByText('Add to Project (2)')).toBeInTheDocument();
    });

    it('calls onAddStock for each selected stock', () => {
      const onAddStock = vi.fn();
      render(<AddStockModal {...defaultProps} onAddStock={onAddStock} />);

      fireEvent.click(screen.getByText('Plywood 3/4"'));
      fireEvent.click(screen.getByText('Oak Board'));
      fireEvent.click(screen.getByText('Add to Project (2)'));

      expect(onAddStock).toHaveBeenCalledTimes(2);
    });

    it('calls onClose after adding', () => {
      const onClose = vi.fn();
      render(<AddStockModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Plywood 3/4"'));
      fireEvent.click(screen.getByText('Add to Project (1)'));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('close interactions', () => {
    it('calls onClose when X is clicked', () => {
      const onClose = vi.fn();
      render(<AddStockModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('×'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when Cancel is clicked', () => {
      const onClose = vi.fn();
      render(<AddStockModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose on Escape key', () => {
      const onClose = vi.fn();
      render(<AddStockModal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      const { container } = render(<AddStockModal {...defaultProps} onClose={onClose} />);

      const backdrop = container.firstChild as HTMLElement;
      fireEvent.mouseDown(backdrop);
      fireEvent.click(backdrop);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('state reset', () => {
    it('resets selection when modal reopens', () => {
      const { rerender } = render(<AddStockModal {...defaultProps} />);

      // Select a stock
      fireEvent.click(screen.getByText('Plywood 3/4"'));
      expect(screen.getByText('1 selected')).toBeInTheDocument();

      // Close and reopen
      rerender(<AddStockModal {...defaultProps} isOpen={false} />);
      rerender(<AddStockModal {...defaultProps} isOpen={true} />);

      // Selection should be cleared
      expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
    });

    it('clears search when modal reopens', () => {
      const { rerender } = render(<AddStockModal {...defaultProps} />);

      // Enter search term
      fireEvent.change(screen.getByPlaceholderText('Search stock...'), {
        target: { value: 'Oak' }
      });

      // Close and reopen
      rerender(<AddStockModal {...defaultProps} isOpen={false} />);
      rerender(<AddStockModal {...defaultProps} isOpen={true} />);

      // Search should be cleared
      const input = screen.getByPlaceholderText('Search stock...') as HTMLInputElement;
      expect(input.value).toBe('');
    });
  });
});
