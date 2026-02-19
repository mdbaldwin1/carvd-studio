import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useUIStore } from '../../store/uiStore';
import type { CutList, CutInstruction } from '../../types';

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

// Mock featureLimits
vi.mock('../../utils/featureLimits', () => ({
  getBlockedMessage: vi.fn().mockReturnValue('PDF export requires a license')
}));

// Mock pdfExport (dynamic import)
const mockExportCutListToPdf = vi.fn().mockResolvedValue({ success: true });
const mockExportCutListToCsv = vi.fn().mockReturnValue('Part,Length,Width\nTop,24,12');
vi.mock('../../utils/pdfExport', () => ({
  exportCutListToPdf: (...args: unknown[]) => mockExportCutListToPdf(...args),
  exportCutListToCsv: (...args: unknown[]) => mockExportCutListToCsv(...args)
}));

import { CutListPartsTab } from './CutListPartsTab';

// ============================================================
// Setup
// ============================================================

function createInstruction(overrides: Partial<CutInstruction> = {}): CutInstruction {
  return {
    partId: 'p1',
    partName: 'Top Panel',
    cutLength: 24,
    cutWidth: 12,
    thickness: 0.75,
    stockId: 's1',
    stockName: 'Plywood',
    grainSensitive: false,
    canRotate: true,
    isGlueUp: false,
    ...overrides
  };
}

function createCutList(overrides: Partial<CutList> = {}): CutList {
  return {
    id: 'cl-1',
    generatedAt: '2026-01-15T00:00:00.000Z',
    projectModifiedAt: '2026-01-15T00:00:00.000Z',
    isStale: false,
    instructions: [createInstruction()],
    stockBoards: [],
    statistics: {
      totalParts: 1,
      totalStockBoards: 1,
      totalBoardFeet: 2,
      totalWasteSquareInches: 100,
      wastePercentage: 10,
      estimatedCost: 25,
      totalWasteCost: 2.5,
      byStock: []
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
  useUIStore.setState({ toast: null });
});

// ============================================================
// Tests
// ============================================================

describe('CutListPartsTab', () => {
  const defaultProps = {
    cutList: createCutList(),
    units: 'imperial' as const,
    projectName: 'Test Project',
    canExportPDF: true
  };

  describe('rendering', () => {
    it('renders parts count summary', () => {
      render(<CutListPartsTab {...defaultProps} />);
      expect(screen.getByText(/1 unique dimension/)).toBeInTheDocument();
      expect(screen.getByText(/1 parts total/)).toBeInTheDocument();
    });

    it('renders table with correct headers', () => {
      render(<CutListPartsTab {...defaultProps} />);
      expect(screen.getByText('Qty')).toBeInTheDocument();
      expect(screen.getByText('Part Name')).toBeInTheDocument();
      expect(screen.getByText('Cut Length')).toBeInTheDocument();
      expect(screen.getByText('Cut Width')).toBeInTheDocument();
      expect(screen.getByText('Thickness')).toBeInTheDocument();
      expect(screen.getByText('Stock')).toBeInTheDocument();
    });

    it('renders part name for single items', () => {
      render(<CutListPartsTab {...defaultProps} />);
      expect(screen.getByText('Top Panel')).toBeInTheDocument();
    });

    it('shows glue-up badge for glue-up parts', () => {
      const cutList = createCutList({
        instructions: [createInstruction({ isGlueUp: true })]
      });
      render(<CutListPartsTab {...defaultProps} cutList={cutList} />);
      expect(screen.getByText('Glue-up strip')).toBeInTheDocument();
    });

    it('shows grain badge for grain-sensitive parts', () => {
      const cutList = createCutList({
        instructions: [createInstruction({ grainSensitive: true })]
      });
      render(<CutListPartsTab {...defaultProps} cutList={cutList} />);
      expect(screen.getByText('Grain')).toBeInTheDocument();
    });
  });

  describe('grouping', () => {
    it('groups identical parts together', () => {
      const cutList = createCutList({
        instructions: [
          createInstruction({ partId: 'p1', partName: 'Side A' }),
          createInstruction({ partId: 'p2', partName: 'Side B' })
        ]
      });
      render(<CutListPartsTab {...defaultProps} cutList={cutList} />);
      // Should show quantity 2 for the group
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('shows expand/collapse for multi-part groups', () => {
      const cutList = createCutList({
        instructions: [
          createInstruction({ partId: 'p1', partName: 'Side A' }),
          createInstruction({ partId: 'p2', partName: 'Side B' })
        ]
      });
      render(<CutListPartsTab {...defaultProps} cutList={cutList} />);
      expect(screen.getByText('Click to expand')).toBeInTheDocument();
    });

    it('expands group on click to show individual parts', () => {
      const cutList = createCutList({
        instructions: [
          createInstruction({ partId: 'p1', partName: 'Side A' }),
          createInstruction({ partId: 'p2', partName: 'Side B' })
        ]
      });
      render(<CutListPartsTab {...defaultProps} cutList={cutList} />);

      // Click the group row to expand
      fireEvent.click(screen.getByText('Click to expand'));

      expect(screen.getByText('Side A')).toBeInTheDocument();
      expect(screen.getByText('Side B')).toBeInTheDocument();
      expect(screen.getByText('Click to collapse')).toBeInTheDocument();
    });
  });

  describe('pluralization', () => {
    it('uses singular for 1 unique dimension', () => {
      render(<CutListPartsTab {...defaultProps} />);
      expect(screen.getByText(/1 unique dimension \(/)).toBeInTheDocument();
    });

    it('uses plural for multiple unique dimensions', () => {
      const cutList = createCutList({
        instructions: [
          createInstruction({ partId: 'p1', cutLength: 24, cutWidth: 12 }),
          createInstruction({ partId: 'p2', cutLength: 36, cutWidth: 8 })
        ]
      });
      render(<CutListPartsTab {...defaultProps} cutList={cutList} />);
      expect(screen.getByText(/2 unique dimensions/)).toBeInTheDocument();
    });
  });

  describe('download', () => {
    it('renders download button', () => {
      render(<CutListPartsTab {...defaultProps} />);
      expect(screen.getByText('Download')).toBeInTheDocument();
    });
  });

  describe('handleDownloadPDF', () => {
    it('disables Download PDF item when canExportPDF is false', async () => {
      const user = userEvent.setup();
      render(<CutListPartsTab {...defaultProps} canExportPDF={false} />);

      await user.click(screen.getByText('Download'));

      const pdfItem = screen.getByRole('menuitem', { name: /download pdf/i });
      expect(pdfItem).toHaveAttribute('data-disabled');
    });

    it('does not call export when Download PDF is clicked while disabled', async () => {
      const user = userEvent.setup();
      render(<CutListPartsTab {...defaultProps} canExportPDF={false} />);

      await user.click(screen.getByText('Download'));
      await user.click(screen.getByRole('menuitem', { name: /download pdf/i }));

      expect(mockExportCutListToPdf).not.toHaveBeenCalled();
    });

    it('shows success toast on successful PDF export', async () => {
      const user = userEvent.setup();
      mockExportCutListToPdf.mockResolvedValueOnce({ success: true });

      render(<CutListPartsTab {...defaultProps} />);

      await user.click(screen.getByText('Download'));
      await user.click(screen.getByRole('menuitem', { name: /download pdf/i }));

      await waitFor(() => {
        const toast = useUIStore.getState().toast;
        expect(toast?.message).toBe('Parts list saved to PDF');
      });
    });

    it('shows error toast on PDF export error result', async () => {
      const user = userEvent.setup();
      mockExportCutListToPdf.mockResolvedValueOnce({ success: false, error: 'Save failed' });

      render(<CutListPartsTab {...defaultProps} />);

      await user.click(screen.getByText('Download'));
      await user.click(screen.getByRole('menuitem', { name: /download pdf/i }));

      await waitFor(() => {
        const toast = useUIStore.getState().toast;
        expect(toast?.message).toBe('Failed to save PDF');
      });
    });

    it('does nothing when PDF export is canceled (no error, no success)', async () => {
      const user = userEvent.setup();
      mockExportCutListToPdf.mockResolvedValueOnce({ success: false });

      render(<CutListPartsTab {...defaultProps} />);

      await user.click(screen.getByText('Download'));
      await user.click(screen.getByRole('menuitem', { name: /download pdf/i }));

      await waitFor(() => {
        expect(mockExportCutListToPdf).toHaveBeenCalled();
      });

      const toast = useUIStore.getState().toast;
      expect(toast).toBeNull();
    });

    it('shows error toast when PDF export throws', async () => {
      const user = userEvent.setup();
      mockExportCutListToPdf.mockRejectedValueOnce(new Error('Unexpected error'));

      render(<CutListPartsTab {...defaultProps} />);

      await user.click(screen.getByText('Download'));
      await user.click(screen.getByRole('menuitem', { name: /download pdf/i }));

      await waitFor(() => {
        const toast = useUIStore.getState().toast;
        expect(toast?.message).toBe('Failed to export PDF');
      });
    });
  });

  describe('handleDownloadCSV', () => {
    it('creates CSV download and shows toast', async () => {
      const user = userEvent.setup();
      const createElementSpy = vi.spyOn(document, 'createElement');

      render(<CutListPartsTab {...defaultProps} />);

      await user.click(screen.getByText('Download'));
      await user.click(screen.getByRole('menuitem', { name: /download csv/i }));

      await waitFor(() => {
        expect(mockExportCutListToCsv).toHaveBeenCalled();
      });

      // Verify a link element was created for download
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalled();

      const toast = useUIStore.getState().toast;
      expect(toast?.message).toBe('Parts list exported to CSV');

      createElementSpy.mockRestore();
    });

    it('uses project name in CSV filename', async () => {
      const user = userEvent.setup();
      let capturedDownload = '';
      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = originalCreateElement(tag);
        if (tag === 'a') {
          el.click = vi.fn(() => {
            capturedDownload = (el as unknown as { download: string }).download;
          });
        }
        return el;
      });

      render(<CutListPartsTab {...defaultProps} projectName="My Project" />);

      await user.click(screen.getByText('Download'));
      await user.click(screen.getByRole('menuitem', { name: /download csv/i }));

      await waitFor(() => {
        expect(mockExportCutListToCsv).toHaveBeenCalled();
      });

      expect(capturedDownload).toBe('My Project-parts.csv');
      createElementSpy.mockRestore();
    });

    it('uses fallback filename when project name is empty', async () => {
      const user = userEvent.setup();
      let capturedDownload = '';
      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = originalCreateElement(tag);
        if (tag === 'a') {
          el.click = vi.fn(() => {
            capturedDownload = (el as unknown as { download: string }).download;
          });
        }
        return el;
      });

      render(<CutListPartsTab {...defaultProps} projectName="" />);

      await user.click(screen.getByText('Download'));
      await user.click(screen.getByRole('menuitem', { name: /download csv/i }));

      await waitFor(() => {
        expect(mockExportCutListToCsv).toHaveBeenCalled();
      });

      expect(capturedDownload).toBe('cut-list-parts.csv');
      createElementSpy.mockRestore();
    });
  });
});
