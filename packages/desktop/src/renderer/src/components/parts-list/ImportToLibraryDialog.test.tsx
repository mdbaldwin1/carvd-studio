import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImportToLibraryDialog } from './ImportToLibraryDialog';
import { useProjectStore } from '../../store/projectStore';
import { Stock, Assembly } from '../../types';

describe('ImportToLibraryDialog', () => {
  const mockStock: Stock = {
    id: 'stock-1',
    name: 'Plywood Sheet',
    length: 48,
    width: 24,
    thickness: 0.75,
    color: '#c4a574',
    material: 'plywood',
    grainDirection: 'length',
    costPerSheet: 50,
    isAvailable: true
  };

  const mockStock2: Stock = {
    id: 'stock-2',
    name: 'Oak Board',
    length: 96,
    width: 6,
    thickness: 1,
    color: '#8b5a2b',
    material: 'hardwood',
    grainDirection: 'length',
    costPerSheet: 30,
    isAvailable: true
  };

  const mockAssembly: Assembly = {
    id: 'assembly-1',
    name: 'Bookshelf',
    description: 'A simple bookshelf',
    parts: [
      {
        id: 'part-1',
        name: 'Side',
        width: 12,
        height: 36,
        depth: 0.75,
        color: '#c4a574',
        x: 0,
        y: 0,
        z: 0,
        rotationY: 0,
        grainDirection: 'height'
      }
    ],
    groups: [],
    groupMembers: [],
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString()
  };

  const defaultProps = {
    isOpen: true,
    missingStocks: [mockStock],
    missingAssemblies: [mockAssembly],
    onImport: vi.fn(),
    onSkip: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useProjectStore.setState({ units: 'imperial' });
  });

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(<ImportToLibraryDialog {...defaultProps} />);

      expect(screen.getByText('Import to Library')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<ImportToLibraryDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Import to Library')).not.toBeInTheDocument();
    });

    it('displays total item count', () => {
      render(<ImportToLibraryDialog {...defaultProps} />);

      expect(screen.getByText(/2 items/)).toBeInTheDocument();
    });

    it('uses singular "item" for 1 item', () => {
      render(<ImportToLibraryDialog {...defaultProps} missingAssemblies={[]} />);

      expect(screen.getByText(/1 item/)).toBeInTheDocument();
    });

    it('displays stocks section', () => {
      render(<ImportToLibraryDialog {...defaultProps} />);

      expect(screen.getByText('Stocks (1)')).toBeInTheDocument();
      expect(screen.getByText('Plywood Sheet')).toBeInTheDocument();
    });

    it('displays assemblies section', () => {
      render(<ImportToLibraryDialog {...defaultProps} />);

      expect(screen.getByText('Assemblies (1)')).toBeInTheDocument();
      expect(screen.getByText('Bookshelf')).toBeInTheDocument();
    });

    it('displays part count for assemblies', () => {
      render(<ImportToLibraryDialog {...defaultProps} />);

      expect(screen.getByText('1 part')).toBeInTheDocument();
    });
  });

  describe('selection controls', () => {
    it('all items are selected by default', () => {
      render(<ImportToLibraryDialog {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeChecked();
      });
    });

    it('can toggle individual stock selection', () => {
      render(<ImportToLibraryDialog {...defaultProps} />);

      const stockCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(stockCheckbox);

      expect(stockCheckbox).not.toBeChecked();
    });

    it('can toggle individual assembly selection', () => {
      render(<ImportToLibraryDialog {...defaultProps} />);

      const assemblyCheckbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(assemblyCheckbox);

      expect(assemblyCheckbox).not.toBeChecked();
    });

    it('Select None deselects all items', () => {
      render(<ImportToLibraryDialog {...defaultProps} />);

      fireEvent.click(screen.getByText('Select None'));

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        expect(checkbox).not.toBeChecked();
      });
    });

    it('Select All selects all items after deselecting', () => {
      render(<ImportToLibraryDialog {...defaultProps} />);

      fireEvent.click(screen.getByText('Select None'));
      fireEvent.click(screen.getByText('Select All'));

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeChecked();
      });
    });

    it('disables Select All when all items are selected', () => {
      render(<ImportToLibraryDialog {...defaultProps} />);

      expect(screen.getByText('Select All')).toBeDisabled();
    });

    it('disables Select None when no items are selected', () => {
      render(<ImportToLibraryDialog {...defaultProps} />);

      fireEvent.click(screen.getByText('Select None'));

      expect(screen.getByText('Select None')).toBeDisabled();
    });
  });

  describe('button interactions', () => {
    it('calls onImport with selected items', () => {
      const onImport = vi.fn();
      render(<ImportToLibraryDialog {...defaultProps} onImport={onImport} />);

      // Use role button to avoid matching heading
      fireEvent.click(screen.getByRole('button', { name: /Import \(2\)/ }));

      expect(onImport).toHaveBeenCalledWith([mockStock], [mockAssembly]);
    });

    it('calls onImport with only selected stocks', () => {
      const onImport = vi.fn();
      render(<ImportToLibraryDialog {...defaultProps} onImport={onImport} />);

      // Deselect the assembly
      const assemblyCheckbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(assemblyCheckbox);

      fireEvent.click(screen.getByRole('button', { name: /Import \(1\)/ }));

      expect(onImport).toHaveBeenCalledWith([mockStock], []);
    });

    it('shows count in Import button', () => {
      render(<ImportToLibraryDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Import \(2\)/ })).toBeInTheDocument();
    });

    it('disables Import when no items selected', () => {
      render(<ImportToLibraryDialog {...defaultProps} />);

      fireEvent.click(screen.getByText('Select None'));

      // When no items selected, button just shows "Import" without count
      expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
    });

    it('calls onSkip when Skip is clicked', () => {
      const onSkip = vi.fn();
      render(<ImportToLibraryDialog {...defaultProps} onSkip={onSkip} />);

      fireEvent.click(screen.getByText('Skip'));

      expect(onSkip).toHaveBeenCalledTimes(1);
    });
  });

  describe('multiple stocks', () => {
    it('handles multiple stocks correctly', () => {
      render(<ImportToLibraryDialog {...defaultProps} missingStocks={[mockStock, mockStock2]} />);

      expect(screen.getByText('Stocks (2)')).toBeInTheDocument();
      expect(screen.getByText('Plywood Sheet')).toBeInTheDocument();
      expect(screen.getByText('Oak Board')).toBeInTheDocument();
    });
  });
});
