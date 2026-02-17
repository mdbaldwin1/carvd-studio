import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditStockModal } from './EditStockModal';
import { Stock } from '../../types';

// Mock window.electronAPI for ColorPicker's useCustomColors
beforeAll(() => {
  window.electronAPI = {
    getCustomColors: vi.fn().mockResolvedValue([]),
    setCustomColors: vi.fn().mockResolvedValue(undefined)
  } as unknown as typeof window.electronAPI;
});

describe('EditStockModal', () => {
  const mockStock: Stock = {
    id: 'stock-1',
    name: 'Test Plywood',
    length: 96,
    width: 48,
    thickness: 0.75,
    grainDirection: 'length',
    pricingUnit: 'per_item',
    pricePerUnit: 50,
    color: '#c4a574'
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    stock: mockStock,
    onUpdateStock: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders when isOpen is true and stock provided', () => {
      render(<EditStockModal {...defaultProps} />);

      expect(screen.getByText('Edit Stock')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<EditStockModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Edit Stock')).not.toBeInTheDocument();
    });

    it('does not render when stock is null and not in create mode', () => {
      render(<EditStockModal {...defaultProps} stock={null} />);

      expect(screen.queryByText('Edit Stock')).not.toBeInTheDocument();
    });

    it('shows form fields', () => {
      render(<EditStockModal {...defaultProps} />);

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Dimensions (L × W × T)')).toBeInTheDocument();
      expect(screen.getByText('Grain Direction')).toBeInTheDocument();
      expect(screen.getByText('Pricing Unit')).toBeInTheDocument();
      expect(screen.getByText('Price ($)')).toBeInTheDocument();
      expect(screen.getByText('Display Color')).toBeInTheDocument();
    });

    it('populates form with stock data', () => {
      render(<EditStockModal {...defaultProps} />);

      const nameInput = screen.getByDisplayValue('Test Plywood');
      expect(nameInput).toBeInTheDocument();
    });

    it('shows Save Changes button in edit mode', () => {
      render(<EditStockModal {...defaultProps} />);

      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('shows Cancel button', () => {
      render(<EditStockModal {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('create mode', () => {
    it('renders in create mode when createMode is true', () => {
      render(<EditStockModal {...defaultProps} stock={null} createMode={true} />);

      expect(screen.getByText('Create New Stock')).toBeInTheDocument();
    });

    it('shows Create Stock button in create mode', () => {
      render(<EditStockModal {...defaultProps} stock={null} createMode={true} />);

      expect(screen.getByText('Create Stock')).toBeInTheDocument();
    });

    it('uses default dimensions when provided', () => {
      render(
        <EditStockModal
          {...defaultProps}
          stock={null}
          createMode={true}
          defaultDimensions={{ length: 48, width: 24, thickness: 0.5 }}
        />
      );

      // The form should be rendered with defaults
      expect(screen.getByText('Create New Stock')).toBeInTheDocument();
    });

    it('uses default form data when no dimensions provided', () => {
      render(<EditStockModal {...defaultProps} stock={null} createMode={true} />);

      // Should have default name
      expect(screen.getByDisplayValue('New Stock')).toBeInTheDocument();
    });
  });

  describe('form interactions', () => {
    it('allows changing name', () => {
      render(<EditStockModal {...defaultProps} />);

      const nameInput = screen.getByDisplayValue('Test Plywood');
      fireEvent.change(nameInput, { target: { value: 'Updated Plywood' } });

      expect(screen.getByDisplayValue('Updated Plywood')).toBeInTheDocument();
    });

    it('allows changing grain direction', () => {
      render(<EditStockModal {...defaultProps} />);

      const grainSelect = screen.getByDisplayValue('Along Length');
      fireEvent.change(grainSelect, { target: { value: 'width' } });

      expect(screen.getByDisplayValue('Along Width')).toBeInTheDocument();
    });

    it('allows changing pricing unit', () => {
      render(<EditStockModal {...defaultProps} />);

      const pricingSelect = screen.getByDisplayValue('Per Sheet/Board');
      fireEvent.change(pricingSelect, { target: { value: 'board_foot' } });

      expect(screen.getByDisplayValue('Per Board Foot')).toBeInTheDocument();
    });

    it('allows changing price', () => {
      render(<EditStockModal {...defaultProps} />);

      const priceInput = screen.getByDisplayValue('50');
      fireEvent.change(priceInput, { target: { value: '75' } });

      expect(screen.getByDisplayValue('75')).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('calls onUpdateStock with stock id and form data in edit mode', () => {
      const onUpdateStock = vi.fn();
      render(<EditStockModal {...defaultProps} onUpdateStock={onUpdateStock} />);

      // Change name
      const nameInput = screen.getByDisplayValue('Test Plywood');
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

      fireEvent.click(screen.getByText('Save Changes'));

      expect(onUpdateStock).toHaveBeenCalledWith(
        'stock-1',
        expect.objectContaining({
          name: 'Updated Name'
        })
      );
    });

    it('calls onClose after successful save', () => {
      const onClose = vi.fn();
      render(<EditStockModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Save Changes'));

      expect(onClose).toHaveBeenCalled();
    });

    it('generates new id in create mode', () => {
      const onUpdateStock = vi.fn();
      render(<EditStockModal {...defaultProps} stock={null} createMode={true} onUpdateStock={onUpdateStock} />);

      fireEvent.click(screen.getByText('Create Stock'));

      expect(onUpdateStock).toHaveBeenCalled();
      const [id] = onUpdateStock.mock.calls[0];
      // Should be a UUID
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe('close interactions', () => {
    it('calls onClose when Cancel is clicked', () => {
      const onClose = vi.fn();
      render(<EditStockModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when X button is clicked', () => {
      const onClose = vi.fn();
      const { container } = render(<EditStockModal {...defaultProps} onClose={onClose} />);

      const closeBtn = screen.getByLabelText('Close');
      fireEvent.click(closeBtn);

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose on Escape key', () => {
      const onClose = vi.fn();
      render(<EditStockModal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      const { container } = render(<EditStockModal {...defaultProps} onClose={onClose} />);

      const backdrop = container.firstChild as HTMLElement;
      fireEvent.mouseDown(backdrop);
      fireEvent.click(backdrop);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('grain direction options', () => {
    it('shows Along Length option', () => {
      render(<EditStockModal {...defaultProps} />);

      expect(screen.getByRole('option', { name: 'Along Length' })).toBeInTheDocument();
    });

    it('shows Along Width option', () => {
      render(<EditStockModal {...defaultProps} />);

      expect(screen.getByRole('option', { name: 'Along Width' })).toBeInTheDocument();
    });

    it('shows No Grain option', () => {
      render(<EditStockModal {...defaultProps} />);

      expect(screen.getByRole('option', { name: 'No Grain (MDF, etc.)' })).toBeInTheDocument();
    });
  });

  describe('pricing unit options', () => {
    it('shows Per Sheet/Board option', () => {
      render(<EditStockModal {...defaultProps} />);

      expect(screen.getByRole('option', { name: 'Per Sheet/Board' })).toBeInTheDocument();
    });

    it('shows Per Board Foot option', () => {
      render(<EditStockModal {...defaultProps} />);

      expect(screen.getByRole('option', { name: 'Per Board Foot' })).toBeInTheDocument();
    });
  });

  describe('state updates on stock change', () => {
    it('updates form when stock prop changes', () => {
      const { rerender } = render(<EditStockModal {...defaultProps} />);

      expect(screen.getByDisplayValue('Test Plywood')).toBeInTheDocument();

      const newStock: Stock = {
        ...mockStock,
        id: 'stock-2',
        name: 'Different Stock'
      };

      rerender(<EditStockModal {...defaultProps} stock={newStock} />);

      expect(screen.getByDisplayValue('Different Stock')).toBeInTheDocument();
    });
  });
});
