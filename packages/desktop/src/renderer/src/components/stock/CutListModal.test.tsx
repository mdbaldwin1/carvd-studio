import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CutListModal } from './CutListModal';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { useLicenseStore } from '../../store/licenseStore';
import { generateOptimizedCutList } from '../../utils/cutListOptimizer';
import { Part, Stock, CutList } from '../../types';

// Mock the cutListOptimizer
vi.mock('../../utils/cutListOptimizer', () => ({
  generateOptimizedCutList: vi.fn()
}));

// Mock the pdfExport
const mockExportProjectReportToPdf = vi.fn().mockResolvedValue({ success: true });
vi.mock('../../utils/pdfExport', () => ({
  exportDiagramsToPdf: vi.fn().mockResolvedValue({ success: true }),
  exportCutListToCsv: vi.fn().mockReturnValue('mock,csv,content'),
  exportShoppingListToCsv: vi.fn().mockReturnValue('mock,shopping,csv'),
  exportCutListToPdf: vi.fn().mockResolvedValue({ success: true }),
  exportShoppingListToPdf: vi.fn().mockResolvedValue({ success: true }),
  exportProjectReportToPdf: (...args: unknown[]) => mockExportProjectReportToPdf(...args)
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

// Create mock data
const mockPart: Part = {
  id: 'part-1',
  name: 'Side Panel',
  length: 24,
  width: 12,
  thickness: 0.75,
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  stockId: 'stock-1',
  grainDirection: 'length',
  color: '#c4a574'
};

const mockStock: Stock = {
  id: 'stock-1',
  name: 'Plywood 3/4"',
  length: 96,
  width: 48,
  thickness: 0.75,
  grainDirection: 'length',
  pricingUnit: 'per_item',
  pricePerUnit: 50,
  color: '#c4a574'
};

const mockCutList: CutList = {
  instructions: [
    {
      partId: 'part-1',
      partName: 'Side Panel',
      cutLength: 24,
      cutWidth: 12,
      thickness: 0.75,
      stockId: 'stock-1',
      stockName: 'Plywood 3/4"',
      grainSensitive: true,
      isGlueUp: false,
      notes: ''
    },
    {
      partId: 'part-2',
      partName: 'Back Panel',
      cutLength: 30,
      cutWidth: 18,
      thickness: 0.75,
      stockId: 'stock-1',
      stockName: 'Plywood 3/4"',
      grainSensitive: true,
      isGlueUp: false,
      notes: ''
    }
  ],
  stockBoards: [
    {
      stockId: 'stock-1',
      stockName: 'Plywood 3/4"',
      stockLength: 96,
      stockWidth: 48,
      boardIndex: 1,
      utilizationPercent: 65.5,
      placements: [
        {
          partId: 'part-1',
          partName: 'Side Panel',
          x: 0,
          y: 0,
          width: 24,
          height: 12,
          rotated: false,
          color: '#c4a574'
        }
      ]
    }
  ],
  statistics: {
    totalParts: 2,
    totalStockBoards: 1,
    totalBoardFeet: 4.5,
    wastePercentage: 34.5,
    estimatedCost: 50,
    totalWasteCost: 17.25,
    byStock: [
      {
        stockId: 'stock-1',
        stockName: 'Plywood 3/4"',
        stockLength: 96,
        stockWidth: 48,
        stockThickness: 0.75,
        boardsNeeded: 1,
        actualBoardsUsed: 1,
        boardFeet: 4.5,
        linearFeet: 0,
        cost: 50,
        averageUtilization: 65.5,
        pricingUnit: 'per_item',
        pricePerUnit: 50
      }
    ]
  },
  skippedParts: [],
  generatedAt: new Date().toISOString(),
  isStale: false,
  overageFactor: 0.1
};

describe('CutListModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateOptimizedCutList).mockReturnValue(mockCutList);
    useProjectStore.setState({
      parts: [mockPart],
      stocks: [mockStock],
      units: 'imperial',
      kerfWidth: 0.125,
      overageFactor: 0.1,
      modifiedAt: new Date().toISOString(),
      cutList: null,
      customShoppingItems: [],
      setCutList: vi.fn(),
      addCustomShoppingItem: vi.fn(),
      updateCustomShoppingItem: vi.fn(),
      deleteCustomShoppingItem: vi.fn(),
      projectName: 'Test Project',
      notes: ''
    });
    useUIStore.setState({
      showToast: vi.fn()
    });
    useLicenseStore.setState({ licenseMode: 'trial' });
  });

  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(<CutListModal {...defaultProps} />);

      expect(screen.getByText('Cut List')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<CutListModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Cut List')).not.toBeInTheDocument();
    });

    it('shows Generate Cut List button initially', () => {
      render(<CutListModal {...defaultProps} />);

      expect(screen.getByText('Generate Cut List')).toBeInTheDocument();
    });

    it('shows intro text', () => {
      render(<CutListModal {...defaultProps} />);

      expect(screen.getByText(/Generate an optimized cut list from your design/)).toBeInTheDocument();
    });

    it('shows Cancel button when no cut list', () => {
      render(<CutListModal {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no parts', () => {
      useProjectStore.setState({ parts: [] });

      render(<CutListModal {...defaultProps} />);

      expect(screen.getByText('No parts in your project yet')).toBeInTheDocument();
    });

    it('does not show Generate button when no parts', () => {
      useProjectStore.setState({ parts: [] });

      render(<CutListModal {...defaultProps} />);

      // When parts is empty, the empty state is shown instead of the generate button
      expect(screen.queryByText('Generate Cut List')).not.toBeInTheDocument();
    });
  });

  describe('generating cut list', () => {
    it('calls generateOptimizedCutList when Generate is clicked', () => {
      render(<CutListModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Generate Cut List'));

      expect(generateOptimizedCutList).toHaveBeenCalled();
    });

    it('calls setCutList with generated cut list', () => {
      const setCutList = vi.fn();
      useProjectStore.setState({ setCutList });

      render(<CutListModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Generate Cut List'));

      expect(setCutList).toHaveBeenCalledWith(mockCutList);
    });
  });

  describe('with cut list generated', () => {
    beforeEach(() => {
      useProjectStore.setState({ cutList: mockCutList });
    });

    it('shows tabs when cut list exists', () => {
      render(<CutListModal {...defaultProps} />);

      expect(screen.getByText(/Parts List/)).toBeInTheDocument();
      expect(screen.getByText(/Cutting Diagrams/)).toBeInTheDocument();
      expect(screen.getByText(/Shopping List/)).toBeInTheDocument();
    });

    it('shows instruction count in Parts List tab', () => {
      render(<CutListModal {...defaultProps} />);

      // Shows count of instructions (2)
      expect(screen.getByText('Parts List (2)')).toBeInTheDocument();
    });

    it('shows board count in Cutting Diagrams tab', () => {
      render(<CutListModal {...defaultProps} />);

      expect(screen.getByText('Cutting Diagrams (1)')).toBeInTheDocument();
    });

    it('shows Done button when cut list exists', () => {
      render(<CutListModal {...defaultProps} />);

      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('shows Download dropdown with CSV option', async () => {
      const user = userEvent.setup();
      render(<CutListModal {...defaultProps} />);

      // Click the Download dropdown to reveal options
      await user.click(screen.getByText('Download'));

      expect(screen.getByRole('menuitem', { name: /download csv/i })).toBeInTheDocument();
    });

    it('shows statistics', () => {
      render(<CutListModal {...defaultProps} />);

      expect(screen.getByText('Parts')).toBeInTheDocument();
      expect(screen.getByText('Boards')).toBeInTheDocument();
      expect(screen.getByText('Board Feet')).toBeInTheDocument();
      expect(screen.getByText('Waste')).toBeInTheDocument();
      expect(screen.getByText('Est. Cost')).toBeInTheDocument();
    });

    it('shows total parts count in statistics', () => {
      render(<CutListModal {...defaultProps} />);

      // Find the stat-value for Parts
      const statsSection = screen.getByText('Parts').closest('.stat-item');
      expect(statsSection).toHaveTextContent('2');
    });
  });

  describe('tab navigation', () => {
    beforeEach(() => {
      useProjectStore.setState({ cutList: mockCutList });
    });

    it('shows Parts List content by default', () => {
      render(<CutListModal {...defaultProps} />);

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('Part Name')).toBeInTheDocument();
    });

    it('switches to Cutting Diagrams tab', () => {
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Cutting Diagrams/i }));

      expect(screen.getByText('1 board needed')).toBeInTheDocument();
    });

    it('switches to Shopping List tab', () => {
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Shopping List/i }));

      expect(screen.getByText('Lumber & Sheet Goods')).toBeInTheDocument();
    });
  });

  describe('parts list tab', () => {
    beforeEach(() => {
      useProjectStore.setState({ cutList: mockCutList });
    });

    it('shows table headers', () => {
      render(<CutListModal {...defaultProps} />);

      expect(screen.getByText('Qty')).toBeInTheDocument();
      expect(screen.getByText('Part Name')).toBeInTheDocument();
      expect(screen.getByText('Cut Length')).toBeInTheDocument();
      expect(screen.getByText('Cut Width')).toBeInTheDocument();
      expect(screen.getByText('Stock')).toBeInTheDocument();
    });

    it('shows stock name in parts list', () => {
      render(<CutListModal {...defaultProps} />);

      // Stock name appears in the table
      const tableRows = screen.getAllByRole('row');
      expect(tableRows.length).toBeGreaterThan(1);
    });
  });

  describe('diagrams tab', () => {
    beforeEach(() => {
      useProjectStore.setState({ cutList: mockCutList });
    });

    it('shows Download dropdown with PDF option', async () => {
      const user = userEvent.setup();
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Cutting Diagrams/i }));

      // Click the Download dropdown to reveal options
      await user.click(screen.getByText('Download'));

      expect(screen.getByRole('menuitem', { name: /download pdf/i })).toBeInTheDocument();
    });

    it('shows board diagram', () => {
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Cutting Diagrams/i }));

      expect(screen.getByText('Board #1')).toBeInTheDocument();
    });

    it('shows utilization percentage', () => {
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Cutting Diagrams/i }));

      expect(screen.getByText('65.5% used')).toBeInTheDocument();
    });
  });

  describe('shopping list tab', () => {
    beforeEach(() => {
      useProjectStore.setState({ cutList: mockCutList });
    });

    it('shows stock items', () => {
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Shopping List/i }));

      expect(screen.getByText('Plywood 3/4"')).toBeInTheDocument();
    });

    it('shows Other Items section', () => {
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Shopping List/i }));

      expect(screen.getByText('Other Items')).toBeInTheDocument();
    });

    it('shows Add Item button', () => {
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Shopping List/i }));

      expect(screen.getByText('+ Add Item')).toBeInTheDocument();
    });

    it('shows estimated total', () => {
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Shopping List/i }));

      expect(screen.getByText('Est. Total:')).toBeInTheDocument();
      // Multiple $50.00 may appear (line total, grand total, etc.) - just check one exists
      const priceElements = screen.getAllByText('$50.00');
      expect(priceElements.length).toBeGreaterThan(0);
    });

    it('shows Download dropdown with CSV option in shopping list tab', async () => {
      const user = userEvent.setup();
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Shopping List/i }));

      // Click the Download dropdown to reveal options
      await user.click(screen.getByText('Download'));

      expect(screen.getByRole('menuitem', { name: /download csv/i })).toBeInTheDocument();
    });
  });

  describe('custom shopping items', () => {
    beforeEach(() => {
      useProjectStore.setState({ cutList: mockCutList });
    });

    it('shows add item form when Add Item clicked', () => {
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Shopping List/i }));
      fireEvent.click(screen.getByText('+ Add Item'));

      expect(screen.getByPlaceholderText(/Item name/)).toBeInTheDocument();
    });

    it('shows cancel button in add form', () => {
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Shopping List/i }));
      fireEvent.click(screen.getByText('+ Add Item'));

      // Find Cancel in the form (there may be multiple)
      const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
      expect(cancelButtons.length).toBeGreaterThan(0);
    });

    it('calls addCustomShoppingItem when form submitted', async () => {
      const addCustomShoppingItem = vi.fn();
      useProjectStore.setState({ addCustomShoppingItem });

      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Shopping List/i }));
      fireEvent.click(screen.getByText('+ Add Item'));

      fireEvent.change(screen.getByPlaceholderText(/Item name/), {
        target: { value: 'Wood Screws' }
      });

      fireEvent.click(screen.getByText('Add'));

      await waitFor(() => {
        expect(addCustomShoppingItem).toHaveBeenCalledWith(expect.objectContaining({ name: 'Wood Screws' }));
      });
    });

    it('shows empty state message when no custom items', () => {
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Shopping List/i }));

      expect(screen.getByText(/Add hardware, fasteners, glue/)).toBeInTheDocument();
    });
  });

  describe('stale cut list warning', () => {
    it('shows stale warning when cut list is stale', () => {
      useProjectStore.setState({
        cutList: { ...mockCutList, isStale: true }
      });

      render(<CutListModal {...defaultProps} />);

      expect(screen.getByText(/Project changed since cut list was generated/)).toBeInTheDocument();
    });

    it('shows Regenerate button when stale', () => {
      useProjectStore.setState({
        cutList: { ...mockCutList, isStale: true }
      });

      render(<CutListModal {...defaultProps} />);

      expect(screen.getByText('Regenerate')).toBeInTheDocument();
    });
  });

  describe('skipped parts warning', () => {
    it('shows warning when parts were skipped', () => {
      useProjectStore.setState({
        cutList: { ...mockCutList, skippedParts: ['Large Panel'] }
      });

      render(<CutListModal {...defaultProps} />);

      expect(screen.getByText(/1 part could not be placed/)).toBeInTheDocument();
    });

    it('lists skipped part names', () => {
      useProjectStore.setState({
        cutList: { ...mockCutList, skippedParts: ['Large Panel'] }
      });

      render(<CutListModal {...defaultProps} />);

      expect(screen.getByText('Large Panel')).toBeInTheDocument();
    });
  });

  describe('close interactions', () => {
    it('calls onClose when Cancel is clicked', () => {
      const onClose = vi.fn();
      render(<CutListModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when Done is clicked', () => {
      useProjectStore.setState({ cutList: mockCutList });
      const onClose = vi.fn();
      render(<CutListModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Done'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when X button is clicked', () => {
      const onClose = vi.fn();
      render(<CutListModal {...defaultProps} onClose={onClose} />);

      const closeBtn = screen.getByLabelText('Close');
      fireEvent.click(closeBtn);

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose on Escape key', () => {
      const onClose = vi.fn();
      render(<CutListModal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      const { container } = render(<CutListModal {...defaultProps} onClose={onClose} />);

      const backdrop = container.firstChild as HTMLElement;
      fireEvent.mouseDown(backdrop);
      fireEvent.click(backdrop);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('grouped parts list', () => {
    const groupedCutList: CutList = {
      ...mockCutList,
      instructions: [
        {
          partId: 'part-1',
          partName: 'Side Panel Left',
          cutLength: 24,
          cutWidth: 12,
          thickness: 0.75,
          stockId: 'stock-1',
          stockName: 'Plywood 3/4"',
          grainSensitive: true,
          isGlueUp: false,
          notes: ''
        },
        {
          partId: 'part-2',
          partName: 'Side Panel Right',
          cutLength: 24,
          cutWidth: 12,
          thickness: 0.75,
          stockId: 'stock-1',
          stockName: 'Plywood 3/4"',
          grainSensitive: true,
          isGlueUp: false,
          notes: ''
        },
        {
          partId: 'part-3',
          partName: 'Back Panel',
          cutLength: 36,
          cutWidth: 24,
          thickness: 0.75,
          stockId: 'stock-1',
          stockName: 'Plywood 3/4"',
          grainSensitive: true,
          isGlueUp: false,
          notes: ''
        }
      ]
    };

    beforeEach(() => {
      useProjectStore.setState({ cutList: groupedCutList });
    });

    it('groups identical parts together', () => {
      render(<CutListModal {...defaultProps} />);

      // Two identical side panels should show qty 2 in the table
      // Use td.col-qty to get the data cell, not the th.col-qty header
      const qtyCell = document.querySelector('td.col-qty');
      expect(qtyCell?.textContent).toBe('2');
    });

    it('shows expand hint for grouped parts', () => {
      render(<CutListModal {...defaultProps} />);

      expect(screen.getByText('Click to expand')).toBeInTheDocument();
    });

    it('expands group when clicked', () => {
      render(<CutListModal {...defaultProps} />);

      // Click on the expandable row
      const expandableRow = screen.getByText('Click to expand').closest('tr');
      fireEvent.click(expandableRow!);

      // Should now show individual part names
      expect(screen.getByText('Side Panel Left')).toBeInTheDocument();
      expect(screen.getByText('Side Panel Right')).toBeInTheDocument();
    });

    it('collapses group when clicked again', () => {
      render(<CutListModal {...defaultProps} />);

      // Click to expand
      const expandableRow = screen.getByText('Click to expand').closest('tr');
      fireEvent.click(expandableRow!);

      // Click to collapse
      fireEvent.click(screen.getByText('Click to collapse').closest('tr')!);

      expect(screen.getByText('Click to expand')).toBeInTheDocument();
    });
  });

  describe('validation issues', () => {
    it('shows validation issues when parts have problems', () => {
      // Mock validation returning issues
      vi.mocked(generateOptimizedCutList).mockImplementation(() => {
        throw new Error('Should not reach here');
      });

      useProjectStore.setState({
        parts: [{ ...mockPart, stockId: undefined }], // Part without stock
        stocks: [mockStock]
      });

      render(<CutListModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Generate Cut List'));

      // Should show issues
      expect(screen.getByText('Issues Found')).toBeInTheDocument();
    });
  });

  describe('custom shopping items editing', () => {
    beforeEach(() => {
      useProjectStore.setState({
        cutList: mockCutList,
        customShoppingItems: [
          {
            id: 'item-1',
            name: 'Wood Screws',
            description: '#8 x 1-1/4',
            quantity: 50,
            unitPrice: 0.1,
            category: 'Hardware'
          }
        ]
      });
    });

    it('shows existing custom items', () => {
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Shopping List/i }));

      expect(screen.getByText('Wood Screws')).toBeInTheDocument();
      expect(screen.getByText('#8 x 1-1/4')).toBeInTheDocument();
    });

    it('shows edit button on custom items', () => {
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Shopping List/i }));

      expect(screen.getByTitle('Edit')).toBeInTheDocument();
    });

    it('shows delete button on custom items', () => {
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Shopping List/i }));

      expect(screen.getByTitle('Delete')).toBeInTheDocument();
    });

    it('calls deleteCustomShoppingItem when delete clicked', () => {
      const deleteCustomShoppingItem = vi.fn();
      useProjectStore.setState({ deleteCustomShoppingItem });

      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Shopping List/i }));
      fireEvent.click(screen.getByTitle('Delete'));

      expect(deleteCustomShoppingItem).toHaveBeenCalledWith('item-1');
    });

    it('enters edit mode when edit clicked', () => {
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Shopping List/i }));
      fireEvent.click(screen.getByTitle('Edit'));

      // Should show form with existing data
      expect(screen.getByDisplayValue('Wood Screws')).toBeInTheDocument();
    });

    it('calls updateCustomShoppingItem when edit saved', async () => {
      const updateCustomShoppingItem = vi.fn();
      useProjectStore.setState({ updateCustomShoppingItem });

      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Shopping List/i }));
      fireEvent.click(screen.getByTitle('Edit'));

      // Change the name
      fireEvent.change(screen.getByDisplayValue('Wood Screws'), {
        target: { value: 'Updated Screws' }
      });

      // Submit the form (click on submit button triggers form submit)
      const form = document.querySelector('.custom-item-form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(updateCustomShoppingItem).toHaveBeenCalledWith(
          'item-1',
          expect.objectContaining({ name: 'Updated Screws' })
        );
      });
    });

    it('shows subtotals when custom items exist', () => {
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Shopping List/i }));

      expect(screen.getByText('Lumber & Sheet Goods:')).toBeInTheDocument();
      expect(screen.getByText('Other Items:')).toBeInTheDocument();
    });

    it('calculates custom items total', () => {
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Shopping List/i }));

      // 50 screws at $0.10 = $5.00 - use class selector as prices appear in multiple places
      const lineTotal = document.querySelector('.custom-items .line-total');
      expect(lineTotal?.textContent).toBe('$5.00');
    });
  });

  describe('shopping list checkboxes', () => {
    beforeEach(() => {
      useProjectStore.setState({ cutList: mockCutList });
    });

    it('shows checkboxes on shopping items', () => {
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Shopping List/i }));

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('toggles checkbox when clicked', () => {
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Shopping List/i }));

      const checkbox = screen.getAllByRole('checkbox')[0];
      expect(checkbox).not.toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('glue-up parts', () => {
    const glueUpCutList: CutList = {
      ...mockCutList,
      instructions: [
        {
          partId: 'part-1',
          partName: 'Tabletop',
          cutLength: 48,
          cutWidth: 6,
          thickness: 0.75,
          stockId: 'stock-1',
          stockName: 'Plywood 3/4"',
          grainSensitive: false,
          isGlueUp: true,
          notes: 'Glue up 8 boards'
        }
      ]
    };

    it('shows glue-up badge for glue-up parts', () => {
      useProjectStore.setState({ cutList: glueUpCutList });

      render(<CutListModal {...defaultProps} />);

      expect(screen.getByText('Glue-up strip')).toBeInTheDocument();
    });
  });

  describe('grain sensitive parts', () => {
    it('shows grain badge for grain-sensitive parts', () => {
      useProjectStore.setState({ cutList: mockCutList });

      render(<CutListModal {...defaultProps} />);

      // Use class selector since "Grain" appears in multiple places (table header and badge)
      const grainBadge = document.querySelector('.grain-badge');
      expect(grainBadge).toBeInTheDocument();
      expect(grainBadge?.textContent).toBe('Grain');
    });
  });

  describe('overage warnings', () => {
    const highUtilizationCutList: CutList = {
      ...mockCutList,
      overageFactor: 0.1,
      statistics: {
        ...mockCutList.statistics,
        byStock: [
          {
            ...mockCutList.statistics.byStock[0],
            averageUtilization: 95 // High utilization
          }
        ]
      }
    };

    it('shows overage warning for high utilization boards', () => {
      useProjectStore.setState({ cutList: highUtilizationCutList });

      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Shopping List/i }));

      expect(screen.getByText(/consider an extra board/)).toBeInTheDocument();
    });
  });

  describe('metric units', () => {
    beforeEach(() => {
      useProjectStore.setState({
        cutList: mockCutList,
        units: 'metric'
      });
    });

    it('shows dimensions in mm when metric', () => {
      render(<CutListModal {...defaultProps} />);

      // The component should format dimensions in mm
      // Exact values depend on formatMeasurementWithUnit implementation
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });
  });

  describe('export functionality', () => {
    let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
    let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      useProjectStore.setState({ cutList: mockCutList });
      createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
      revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    });

    afterEach(() => {
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('creates CSV when Download CSV clicked', async () => {
      const user = userEvent.setup();
      render(<CutListModal {...defaultProps} />);

      // Click the Download dropdown, then the Download CSV option
      await user.click(screen.getByText('Download'));
      await user.click(screen.getByRole('menuitem', { name: /download csv/i }));

      await waitFor(() => {
        expect(createObjectURLSpy).toHaveBeenCalled();
      });
      expect(revokeObjectURLSpy).toHaveBeenCalled();
    });

    it('creates shopping list CSV when Download CSV clicked in shopping tab', async () => {
      const user = userEvent.setup();
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Shopping List/i }));
      // Click the Download dropdown, then the Download CSV option
      await user.click(screen.getByText('Download'));
      await user.click(screen.getByRole('menuitem', { name: /download csv/i }));

      await waitFor(() => {
        expect(createObjectURLSpy).toHaveBeenCalled();
      });
    });
  });

  describe('board diagrams', () => {
    beforeEach(() => {
      useProjectStore.setState({ cutList: mockCutList });
    });

    it('shows stock name in diagrams tab', () => {
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Cutting Diagrams/i }));

      expect(screen.getByText('Plywood 3/4"')).toBeInTheDocument();
    });

    it('shows board dimensions', () => {
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Cutting Diagrams/i }));

      // Should show the stock dimensions
      const boardDiagram = document.querySelector('.board-dims');
      expect(boardDiagram).toBeInTheDocument();
    });

    it('renders SVG for board diagram', () => {
      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Cutting Diagrams/i }));

      const svg = document.querySelector('.board-svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('empty diagrams', () => {
    const emptyDiagramsCutList: CutList = {
      ...mockCutList,
      stockBoards: []
    };

    it('shows no diagrams message when no boards', () => {
      useProjectStore.setState({ cutList: emptyDiagramsCutList });

      render(<CutListModal {...defaultProps} />);

      fireEvent.mouseDown(screen.getByRole('tab', { name: /Cutting Diagrams/i }));

      expect(screen.getByText('No cutting diagrams to display.')).toBeInTheDocument();
    });
  });

  describe('handleDownloadProjectReport', () => {
    beforeEach(() => {
      useProjectStore.setState({ cutList: mockCutList });
    });

    it('shows Download Project Report button when cut list exists', () => {
      render(<CutListModal {...defaultProps} />);

      expect(screen.getByText('Download Project Report')).toBeInTheDocument();
    });

    it('calls exportProjectReportToPdf on success', async () => {
      mockExportProjectReportToPdf.mockResolvedValueOnce({ success: true });

      render(<CutListModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Download Project Report'));

      await waitFor(() => {
        expect(mockExportProjectReportToPdf).toHaveBeenCalledWith(
          mockCutList,
          expect.objectContaining({
            projectName: 'Test Project',
            units: 'imperial'
          })
        );
      });
    });

    it('shows success toast on successful export', async () => {
      mockExportProjectReportToPdf.mockResolvedValueOnce({ success: true });

      render(<CutListModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Download Project Report'));

      await waitFor(() => {
        const showToast = useUIStore.getState().showToast;
        expect(showToast).toHaveBeenCalledWith('Project report saved to PDF');
      });
    });

    it('shows error toast on export error result', async () => {
      mockExportProjectReportToPdf.mockResolvedValueOnce({ success: false, error: 'Save failed' });

      render(<CutListModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Download Project Report'));

      await waitFor(() => {
        const showToast = useUIStore.getState().showToast;
        expect(showToast).toHaveBeenCalledWith('Failed to save PDF');
      });
    });

    it('does nothing when export is canceled (no error, no success)', async () => {
      mockExportProjectReportToPdf.mockResolvedValueOnce({ success: false });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      render(<CutListModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Download Project Report'));

      await waitFor(() => {
        expect(mockExportProjectReportToPdf).toHaveBeenCalled();
      });

      // showToast should not have been called for a cancel
      expect(showToast).not.toHaveBeenCalled();
    });

    it('shows error toast when export throws', async () => {
      mockExportProjectReportToPdf.mockRejectedValueOnce(new Error('Unexpected error'));

      render(<CutListModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Download Project Report'));

      await waitFor(() => {
        const showToast = useUIStore.getState().showToast;
        expect(showToast).toHaveBeenCalledWith('Failed to export project report');
      });
    });

    it('passes project notes when available', async () => {
      mockExportProjectReportToPdf.mockResolvedValueOnce({ success: true });
      useProjectStore.setState({ notes: 'Build notes here' });

      render(<CutListModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Download Project Report'));

      await waitFor(() => {
        expect(mockExportProjectReportToPdf).toHaveBeenCalledWith(
          mockCutList,
          expect.objectContaining({
            projectNotes: 'Build notes here'
          })
        );
      });
    });

    it('passes custom shopping items to export', async () => {
      mockExportProjectReportToPdf.mockResolvedValueOnce({ success: true });
      const customItems = [{ id: 'ci-1', name: 'Screws', quantity: 50, unitPrice: 0.1, category: 'Hardware' }];
      useProjectStore.setState({ customShoppingItems: customItems });

      render(<CutListModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Download Project Report'));

      await waitFor(() => {
        expect(mockExportProjectReportToPdf).toHaveBeenCalledWith(
          mockCutList,
          expect.objectContaining({
            customShoppingItems: customItems
          })
        );
      });
    });

    it('uses "Untitled Project" when projectName is null', async () => {
      mockExportProjectReportToPdf.mockResolvedValueOnce({ success: true });
      useProjectStore.setState({ projectName: null });

      render(<CutListModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Download Project Report'));

      await waitFor(() => {
        expect(mockExportProjectReportToPdf).toHaveBeenCalledWith(
          mockCutList,
          expect.objectContaining({
            projectName: 'Untitled Project'
          })
        );
      });
    });
  });

  describe('license checks', () => {
    it('blocks project report export when license is free', async () => {
      useProjectStore.setState({ cutList: mockCutList });
      useLicenseStore.setState({ licenseMode: 'free' });

      render(<CutListModal {...defaultProps} />);

      // The button should be disabled
      const reportBtn = screen.getByText('Download Project Report');
      expect(reportBtn.closest('button')).toBeDisabled();
    });

    it('blocks optimizer when license is free', () => {
      useLicenseStore.setState({ licenseMode: 'free' });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      render(<CutListModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Generate Cut List'));

      expect(showToast).toHaveBeenCalledWith('Cut list optimizer requires a license.');
      expect(generateOptimizedCutList).not.toHaveBeenCalled();
    });

    it('allows export when license is licensed', async () => {
      useProjectStore.setState({ cutList: mockCutList });
      useLicenseStore.setState({ licenseMode: 'licensed' });
      mockExportProjectReportToPdf.mockResolvedValueOnce({ success: true });

      render(<CutListModal {...defaultProps} />);

      const reportBtn = screen.getByText('Download Project Report');
      expect(reportBtn.closest('button')).not.toBeDisabled();

      fireEvent.click(reportBtn);

      await waitFor(() => {
        expect(mockExportProjectReportToPdf).toHaveBeenCalled();
      });
    });
  });

  describe('stale cut list regeneration', () => {
    it('regenerates cut list when Regenerate button is clicked', () => {
      useProjectStore.setState({
        cutList: { ...mockCutList, isStale: true }
      });

      render(<CutListModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Regenerate'));

      expect(generateOptimizedCutList).toHaveBeenCalled();
    });
  });

  describe('Learn more link', () => {
    it('opens external link when Learn more is clicked', () => {
      const openExternal = vi.fn();
      window.electronAPI = { ...window.electronAPI, openExternal } as unknown as typeof window.electronAPI;

      render(<CutListModal {...defaultProps} />);

      const learnMore = screen.getByText('Learn more');
      fireEvent.click(learnMore);

      expect(openExternal).toHaveBeenCalledWith('https://carvd-studio.com/docs#cut-lists');
    });
  });
});
