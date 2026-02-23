import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { StockLibraryModal } from './StockLibraryModal';
import { useProjectStore } from '../../store/projectStore';
import { Stock, Assembly } from '../../types';

// Mock window.electronAPI for ColorPicker's useCustomColors
beforeAll(() => {
  window.electronAPI = {
    getCustomColors: vi.fn().mockResolvedValue([]),
    setCustomColors: vi.fn().mockResolvedValue(undefined)
  } as unknown as typeof window.electronAPI;
});

describe('StockLibraryModal', () => {
  const mockStocks: Stock[] = [
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
      width: 8,
      thickness: 1,
      grainDirection: 'length',
      pricingUnit: 'board_foot',
      pricePerUnit: 8,
      color: '#a5784c'
    }
  ];

  const mockAssemblies: Assembly[] = [
    {
      id: 'assembly-1',
      name: 'Drawer Assembly',
      description: 'Standard drawer with dovetails',
      parts: [
        { id: 'p1', name: 'Front', length: 18, width: 6, thickness: 0.75 },
        { id: 'p2', name: 'Back', length: 18, width: 6, thickness: 0.75 }
      ],
      groups: [],
      groupMembers: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      modifiedAt: '2024-01-02T00:00:00.000Z'
    }
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    stocks: mockStocks,
    onAddStock: vi.fn(),
    onUpdateStock: vi.fn(),
    onDeleteStock: vi.fn(),
    assemblies: mockAssemblies,
    onUpdateAssembly: vi.fn(),
    onDeleteAssembly: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useProjectStore.setState({ units: 'imperial' });
  });

  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(<StockLibraryModal {...defaultProps} />);

      expect(screen.getByText('App Library')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<StockLibraryModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('App Library')).not.toBeInTheDocument();
    });

    it('shows Stocks tab', () => {
      render(<StockLibraryModal {...defaultProps} />);

      expect(screen.getByText('Stocks')).toBeInTheDocument();
    });

    it('shows Assemblies tab', () => {
      render(<StockLibraryModal {...defaultProps} />);

      expect(screen.getByText('Assemblies')).toBeInTheDocument();
    });

    it('shows Done button', () => {
      render(<StockLibraryModal {...defaultProps} />);

      expect(screen.getByText('Done')).toBeInTheDocument();
    });
  });

  describe('stocks tab', () => {
    it('shows stock list', () => {
      render(<StockLibraryModal {...defaultProps} />);

      expect(screen.getByText('Plywood 3/4"')).toBeInTheDocument();
      expect(screen.getByText('Oak Board')).toBeInTheDocument();
    });

    it('shows available count', () => {
      render(<StockLibraryModal {...defaultProps} />);

      expect(screen.getByText('2 available')).toBeInTheDocument();
    });

    it('shows placeholder when no stock selected', () => {
      render(<StockLibraryModal {...defaultProps} />);

      expect(screen.getByText('Select a stock to view details')).toBeInTheDocument();
    });

    it('shows create button', () => {
      render(<StockLibraryModal {...defaultProps} />);

      expect(screen.getByTitle('Create new stock')).toBeInTheDocument();
    });

    it('shows search input when stocks exist', () => {
      render(<StockLibraryModal {...defaultProps} />);

      expect(screen.getByPlaceholderText('Search stocks...')).toBeInTheDocument();
    });
  });

  describe('empty stocks', () => {
    it('shows empty state when no stocks', () => {
      render(<StockLibraryModal {...defaultProps} stocks={[]} />);

      expect(screen.getByText(/No stocks in library yet/)).toBeInTheDocument();
    });

    it('does not show search when no stocks', () => {
      render(<StockLibraryModal {...defaultProps} stocks={[]} />);

      expect(screen.queryByPlaceholderText('Search stocks...')).not.toBeInTheDocument();
    });
  });

  describe('stock selection', () => {
    it('selects stock when clicked', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Plywood 3/4"'));

      // Should show stock details - heading with stock name
      expect(screen.getAllByText('Plywood 3/4"').length).toBeGreaterThan(1);
    });

    it('shows stock details when selected', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Plywood 3/4"'));

      expect(screen.getByText('Dimensions')).toBeInTheDocument();
      expect(screen.getByText('Grain')).toBeInTheDocument();
      expect(screen.getByText('Pricing')).toBeInTheDocument();
    });

    it('shows Edit button when stock selected', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Plywood 3/4"'));

      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('shows Delete button when stock selected', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Plywood 3/4"'));

      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  describe('stock editing', () => {
    it('enters edit mode when Edit clicked', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Plywood 3/4"'));
      fireEvent.click(screen.getByText('Edit'));

      expect(screen.getByDisplayValue('Plywood 3/4"')).toBeInTheDocument();
    });

    it('shows form fields in edit mode', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Plywood 3/4"'));
      fireEvent.click(screen.getByText('Edit'));

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Dimensions (L × W × T)')).toBeInTheDocument();
      expect(screen.getByText('Grain Direction')).toBeInTheDocument();
      expect(screen.getByText('Pricing Unit')).toBeInTheDocument();
    });

    it('shows Cancel button in edit mode', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Plywood 3/4"'));
      fireEvent.click(screen.getByText('Edit'));

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('shows Save button in edit mode', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Plywood 3/4"'));
      fireEvent.click(screen.getByText('Edit'));

      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('calls onUpdateStock when Save clicked', () => {
      const onUpdateStock = vi.fn();
      render(<StockLibraryModal {...defaultProps} onUpdateStock={onUpdateStock} />);

      fireEvent.click(screen.getByText('Plywood 3/4"'));
      fireEvent.click(screen.getByText('Edit'));
      fireEvent.click(screen.getByText('Save'));

      expect(onUpdateStock).toHaveBeenCalled();
    });
  });

  describe('stock creation', () => {
    it('enters create mode when + clicked', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Create new stock'));

      expect(screen.getByText('New Stock')).toBeInTheDocument();
    });

    it('shows Create button in create mode', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Create new stock'));

      expect(screen.getByText('Create')).toBeInTheDocument();
    });

    it('calls onAddStock when Create clicked', () => {
      const onAddStock = vi.fn();
      render(<StockLibraryModal {...defaultProps} onAddStock={onAddStock} />);

      fireEvent.click(screen.getByTitle('Create new stock'));
      fireEvent.click(screen.getByText('Create'));

      expect(onAddStock).toHaveBeenCalled();
    });
  });

  describe('stock deletion', () => {
    it('calls onDeleteStock when Delete clicked', () => {
      const onDeleteStock = vi.fn();
      render(<StockLibraryModal {...defaultProps} onDeleteStock={onDeleteStock} />);

      fireEvent.click(screen.getByText('Plywood 3/4"'));
      fireEvent.click(screen.getByText('Delete'));

      expect(onDeleteStock).toHaveBeenCalledWith('stock-1');
    });
  });

  describe('stock search', () => {
    it('filters stocks by search term', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('Search stocks...'), {
        target: { value: 'Oak' }
      });

      expect(screen.getByText('Oak Board')).toBeInTheDocument();
      expect(screen.queryByText('Plywood 3/4"')).not.toBeInTheDocument();
    });

    it('shows no results message when search has no matches', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('Search stocks...'), {
        target: { value: 'xyz' }
      });

      expect(screen.getByText(/No stocks match "xyz"/)).toBeInTheDocument();
    });
  });

  describe('assemblies tab', () => {
    it('switches to assemblies tab', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));

      expect(screen.getByText('Drawer Assembly')).toBeInTheDocument();
    });

    it('shows assembly list', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));

      expect(screen.getByText('2 parts')).toBeInTheDocument();
    });

    it('shows empty state when no assemblies', () => {
      render(<StockLibraryModal {...defaultProps} assemblies={[]} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));

      expect(screen.getByText('No assemblies in library yet')).toBeInTheDocument();
    });
  });

  describe('assembly selection', () => {
    it('selects assembly when clicked', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));
      fireEvent.click(screen.getByText('Drawer Assembly'));

      // Should show details with Edit button
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('shows assembly parts when selected', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));
      fireEvent.click(screen.getByText('Drawer Assembly'));

      expect(screen.getByText('Parts in this assembly:')).toBeInTheDocument();
      expect(screen.getByText('Front')).toBeInTheDocument();
      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('shows description when assembly has one', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));
      fireEvent.click(screen.getByText('Drawer Assembly'));

      expect(screen.getByText('Standard drawer with dovetails')).toBeInTheDocument();
    });
  });

  describe('assembly editing', () => {
    it('enters edit mode when Edit clicked', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));
      fireEvent.click(screen.getByText('Drawer Assembly'));
      fireEvent.click(screen.getByText('Edit'));

      expect(screen.getByText('Edit Assembly')).toBeInTheDocument();
    });

    it('calls onUpdateAssembly when saved', () => {
      const onUpdateAssembly = vi.fn();
      render(<StockLibraryModal {...defaultProps} onUpdateAssembly={onUpdateAssembly} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));
      fireEvent.click(screen.getByText('Drawer Assembly'));
      fireEvent.click(screen.getByText('Edit'));
      fireEvent.click(screen.getByText('Save'));

      expect(onUpdateAssembly).toHaveBeenCalled();
    });
  });

  describe('assembly deletion', () => {
    it('calls onDeleteAssembly when Delete clicked', () => {
      const onDeleteAssembly = vi.fn();
      render(<StockLibraryModal {...defaultProps} onDeleteAssembly={onDeleteAssembly} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));
      fireEvent.click(screen.getByText('Drawer Assembly'));
      fireEvent.click(screen.getByText('Delete'));

      expect(onDeleteAssembly).toHaveBeenCalledWith('assembly-1');
    });
  });

  describe('assembly search', () => {
    const multiAssemblies: Assembly[] = [
      {
        id: 'assembly-1',
        name: 'Drawer Assembly',
        description: 'Standard drawer',
        parts: [{ name: 'Front', length: 18, width: 6, thickness: 0.75 }],
        groups: [],
        groupMembers: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        modifiedAt: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 'assembly-2',
        name: 'Cabinet Box',
        description: 'Basic cabinet',
        parts: [{ name: 'Side', length: 24, width: 18, thickness: 0.75 }],
        groups: [],
        groupMembers: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        modifiedAt: '2024-01-01T00:00:00.000Z'
      }
    ];

    it('shows search input when assemblies exist', () => {
      render(<StockLibraryModal {...defaultProps} assemblies={multiAssemblies} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));

      expect(screen.getByPlaceholderText('Search assemblies...')).toBeInTheDocument();
    });

    it('filters assemblies by search term', () => {
      render(<StockLibraryModal {...defaultProps} assemblies={multiAssemblies} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));
      fireEvent.change(screen.getByPlaceholderText('Search assemblies...'), {
        target: { value: 'Cabinet' }
      });

      expect(screen.getByText('Cabinet Box')).toBeInTheDocument();
      expect(screen.queryByText('Drawer Assembly')).not.toBeInTheDocument();
    });

    it('shows no results message when search has no matches', () => {
      render(<StockLibraryModal {...defaultProps} assemblies={multiAssemblies} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));
      fireEvent.change(screen.getByPlaceholderText('Search assemblies...'), {
        target: { value: 'nonexistent' }
      });

      expect(screen.getByText(/No assemblies match "nonexistent"/)).toBeInTheDocument();
    });

    it('shows clear button when search has text', () => {
      render(<StockLibraryModal {...defaultProps} assemblies={multiAssemblies} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));
      fireEvent.change(screen.getByPlaceholderText('Search assemblies...'), {
        target: { value: 'test' }
      });

      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });

    it('clears search when clear button clicked', () => {
      render(<StockLibraryModal {...defaultProps} assemblies={multiAssemblies} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));
      fireEvent.change(screen.getByPlaceholderText('Search assemblies...'), {
        target: { value: 'Cabinet' }
      });

      const clearBtn = screen.getByLabelText('Clear search');
      fireEvent.click(clearBtn!);

      expect(screen.getByPlaceholderText('Search assemblies...')).toHaveValue('');
      expect(screen.getByText('Drawer Assembly')).toBeInTheDocument();
    });

    it('does not show search when no assemblies', () => {
      render(<StockLibraryModal {...defaultProps} assemblies={[]} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));

      expect(screen.queryByPlaceholderText('Search assemblies...')).not.toBeInTheDocument();
    });
  });

  describe('create new assembly', () => {
    it('shows create button when onCreateNewAssembly provided', () => {
      render(<StockLibraryModal {...defaultProps} onCreateNewAssembly={vi.fn()} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));

      expect(screen.getByTitle('Create new assembly')).toBeInTheDocument();
    });

    it('does not show create button when onCreateNewAssembly not provided', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));

      expect(screen.queryByTitle('Create new assembly')).not.toBeInTheDocument();
    });

    it('calls onCreateNewAssembly when create button clicked', async () => {
      const onCreateNewAssembly = vi.fn().mockResolvedValue(true);
      const onClose = vi.fn();
      render(<StockLibraryModal {...defaultProps} onCreateNewAssembly={onCreateNewAssembly} onClose={onClose} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));
      fireEvent.click(screen.getByTitle('Create new assembly'));

      expect(onCreateNewAssembly).toHaveBeenCalled();
    });

    it('closes modal when create assembly succeeds', async () => {
      const onCreateNewAssembly = vi.fn().mockResolvedValue(true);
      const onClose = vi.fn();
      render(<StockLibraryModal {...defaultProps} onCreateNewAssembly={onCreateNewAssembly} onClose={onClose} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));
      await fireEvent.click(screen.getByTitle('Create new assembly'));

      // Wait for async operation
      await vi.waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('edit assembly in 3D', () => {
    it('shows Edit in 3D button when onEditAssemblyIn3D provided', () => {
      render(<StockLibraryModal {...defaultProps} onEditAssemblyIn3D={vi.fn()} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));
      fireEvent.click(screen.getByText('Drawer Assembly'));

      expect(screen.getByText('Edit in 3D')).toBeInTheDocument();
    });

    it('does not show Edit in 3D button when onEditAssemblyIn3D not provided', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));
      fireEvent.click(screen.getByText('Drawer Assembly'));

      expect(screen.queryByText('Edit in 3D')).not.toBeInTheDocument();
    });

    it('calls onEditAssemblyIn3D when button clicked', async () => {
      const onEditAssemblyIn3D = vi.fn().mockResolvedValue(true);
      render(<StockLibraryModal {...defaultProps} onEditAssemblyIn3D={onEditAssemblyIn3D} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));
      fireEvent.click(screen.getByText('Drawer Assembly'));
      fireEvent.click(screen.getByText('Edit in 3D'));

      expect(onEditAssemblyIn3D).toHaveBeenCalledWith(mockAssemblies[0]);
    });

    it('closes modal when Edit in 3D succeeds', async () => {
      const onEditAssemblyIn3D = vi.fn().mockResolvedValue(true);
      const onClose = vi.fn();
      render(<StockLibraryModal {...defaultProps} onEditAssemblyIn3D={onEditAssemblyIn3D} onClose={onClose} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));
      fireEvent.click(screen.getByText('Drawer Assembly'));
      await fireEvent.click(screen.getByText('Edit in 3D'));

      await vi.waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('assembly edit form', () => {
    it('shows Edit Layout in 3D button in edit mode when onEditAssemblyIn3D provided', () => {
      render(<StockLibraryModal {...defaultProps} onEditAssemblyIn3D={vi.fn()} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));
      fireEvent.click(screen.getByText('Drawer Assembly'));
      fireEvent.click(screen.getByText('Edit'));

      expect(screen.getByText('Edit Layout in 3D')).toBeInTheDocument();
    });

    it('shows description textarea in edit mode', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));
      fireEvent.click(screen.getByText('Drawer Assembly'));
      fireEvent.click(screen.getByText('Edit'));

      expect(screen.getByPlaceholderText('Optional description')).toBeInTheDocument();
    });

    it('updates assembly form when description changed', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));
      fireEvent.click(screen.getByText('Drawer Assembly'));
      fireEvent.click(screen.getByText('Edit'));

      const textarea = screen.getByPlaceholderText('Optional description');
      fireEvent.change(textarea, { target: { value: 'New description' } });

      expect(textarea).toHaveValue('New description');
    });
  });

  describe('assembly groups display', () => {
    const assemblyWithGroups: Assembly[] = [
      {
        id: 'assembly-1',
        name: 'Complex Assembly',
        parts: [{ name: 'Part', length: 12, width: 6, thickness: 0.75 }],
        groups: [
          { originalId: 'g1', name: 'Group 1' },
          { originalId: 'g2', name: 'Group 2' }
        ],
        groupMembers: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        modifiedAt: '2024-01-01T00:00:00.000Z'
      }
    ];

    it('shows groups count when assembly has groups', () => {
      render(<StockLibraryModal {...defaultProps} assemblies={assemblyWithGroups} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));

      expect(screen.getByText('1 part, 2 groups')).toBeInTheDocument();
    });
  });

  describe('assembly drag and drop', () => {
    it('sets assembly item as draggable', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Assemblies/i }));

      const assemblyItem = screen.getByText('Drawer Assembly').closest('li');
      expect(assemblyItem).toHaveAttribute('draggable', 'true');
    });
  });

  describe('stock search clear', () => {
    it('shows clear button when search has text', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('Search stocks...'), {
        target: { value: 'test' }
      });

      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });

    it('clears stock search when clear button clicked', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('Search stocks...'), {
        target: { value: 'Plywood' }
      });

      const clearBtn = screen.getByLabelText('Clear search');
      fireEvent.click(clearBtn!);

      expect(screen.getByPlaceholderText('Search stocks...')).toHaveValue('');
    });
  });

  describe('stock details display', () => {
    it('shows board foot pricing format', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Oak Board'));

      expect(screen.getByText('$8.00 / bd ft')).toBeInTheDocument();
    });

    it('shows per sheet pricing format', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Plywood 3/4"'));

      expect(screen.getByText('$50.00 / sheet')).toBeInTheDocument();
    });

    it('shows grain direction along length', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Oak Board'));

      expect(screen.getByText('Along length')).toBeInTheDocument();
    });

    it('shows grain direction as None when no grain', () => {
      const stockNoGrain: Stock[] = [
        {
          id: 'stock-1',
          name: 'MDF',
          length: 48,
          width: 24,
          thickness: 0.75,
          grainDirection: 'none',
          pricingUnit: 'per_item',
          pricePerUnit: 30,
          color: '#808080'
        }
      ];

      render(<StockLibraryModal {...defaultProps} stocks={stockNoGrain} />);

      fireEvent.click(screen.getByText('MDF'));

      expect(screen.getByText('None')).toBeInTheDocument();
    });

    it('shows color swatch', () => {
      render(<StockLibraryModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Plywood 3/4"'));

      const swatch = document.querySelector('span[style*="background-color"]');
      expect(swatch).toHaveStyle({ backgroundColor: '#c4a574' });
    });
  });

  describe('close interactions', () => {
    it('calls onClose when Done is clicked', () => {
      const onClose = vi.fn();
      render(<StockLibraryModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Done'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when X button is clicked', () => {
      const onClose = vi.fn();
      render(<StockLibraryModal {...defaultProps} onClose={onClose} />);

      const closeBtn = screen.getByLabelText('Close');
      fireEvent.click(closeBtn);

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose on Escape key when not editing', () => {
      const onClose = vi.fn();
      render(<StockLibraryModal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });

    it('cancels edit on Escape key when editing', () => {
      const onClose = vi.fn();
      render(<StockLibraryModal {...defaultProps} onClose={onClose} />);

      // Enter edit mode
      fireEvent.click(screen.getByText('Plywood 3/4"'));
      fireEvent.click(screen.getByText('Edit'));

      // Press escape - should cancel edit, not close modal
      fireEvent.keyDown(window, { key: 'Escape' });

      // Should still be in modal (not closed), but out of edit mode
      expect(screen.getByText('App Library')).toBeInTheDocument();
      expect(screen.queryByText('Save')).not.toBeInTheDocument();
    });

    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      render(<StockLibraryModal {...defaultProps} onClose={onClose} />);

      const backdrop = document.querySelector('[data-state="open"][class*="bg-overlay"]') as HTMLElement;
      fireEvent.mouseDown(backdrop);
      fireEvent.click(backdrop);

      expect(onClose).toHaveBeenCalled();
    });
  });
});
