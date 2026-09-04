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
    features: [],
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
    showItemInFolder: vi.fn(),
    addRecentProject: vi.fn(),
    getRecentProjects: vi.fn(),
    clearRecentProjects: vi.fn(),
    setWindowTitle: vi.fn()
  } as unknown as typeof window.electronAPI;
});

beforeEach(() => {
  vi.clearAllMocks();
  (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
    canceled: false,
    filePath: '/tmp/export.csv'
  });
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
      expect(screen.getByText(/1 unique blank/)).toBeInTheDocument();
      expect(screen.getByText(/1 parts total/)).toBeInTheDocument();
    });

    it('renders table with correct headers', () => {
      render(<CutListPartsTab {...defaultProps} />);
      expect(screen.getByText('Qty')).toBeInTheDocument();
      expect(screen.getByText('Part Name')).toBeInTheDocument();
      expect(screen.getByText('Blank Length')).toBeInTheDocument();
      expect(screen.getByText('Blank Width')).toBeInTheDocument();
      expect(screen.getByText('Thickness')).toBeInTheDocument();
      expect(screen.getByText('Stock')).toBeInTheDocument();
      expect(screen.getByText('Operations / Notes')).toBeInTheDocument();
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

    it('shows fabrication summaries for feature-bearing parts', () => {
      const cutList = createCutList({
        instructions: [
          createInstruction({
            features: [
              {
                id: 'feature-1',
                kind: 'end_cut',
                version: 1,
                enabled: true,
                target: { type: 'face', face: 'left_end' },
                reference: { primaryFrom: 'min' },
                cutType: 'mitre',
                lengthMode: 'long_point',
                parameters: {
                  horizontalAngle: 45
                }
              }
            ]
          })
        ]
      });

      render(<CutListPartsTab {...defaultProps} cutList={cutList} />);

      expect(screen.getByText('1. Mitre 45° on Left End · Long point on Front')).toBeInTheDocument();
      expect(screen.getByText(/Cut blanks first/)).toBeInTheDocument();
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

    it('does not group identical blanks when authored operations differ', () => {
      const cutList = createCutList({
        instructions: [
          createInstruction({
            partId: 'p1',
            partName: 'Rail A',
            features: [
              {
                id: 'feature-1',
                kind: 'end_cut',
                version: 1,
                enabled: true,
                target: { type: 'face', face: 'left_end' },
                reference: { primaryFrom: 'min' },
                cutType: 'mitre',
                lengthMode: 'long_point',
                parameters: { horizontalAngle: 45 }
              }
            ]
          }),
          createInstruction({
            partId: 'p2',
            partName: 'Rail B',
            features: [
              {
                id: 'feature-2',
                kind: 'end_cut',
                version: 1,
                enabled: true,
                target: { type: 'face', face: 'right_end' },
                reference: { primaryFrom: 'max' },
                cutType: 'mitre',
                lengthMode: 'long_point',
                parameters: { horizontalAngle: 45 }
              }
            ]
          })
        ]
      });

      render(<CutListPartsTab {...defaultProps} cutList={cutList} />);

      expect(screen.getByText(/2 unique blanks/)).toBeInTheDocument();
      expect(screen.getByText('Rail A')).toBeInTheDocument();
      expect(screen.getByText('Rail B')).toBeInTheDocument();
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
    it('uses singular for 1 unique blank', () => {
      render(<CutListPartsTab {...defaultProps} />);
      expect(screen.getByText(/1 unique blank \(/)).toBeInTheDocument();
    });

    it('uses plural for multiple unique blanks', () => {
      const cutList = createCutList({
        instructions: [
          createInstruction({ partId: 'p1', cutLength: 24, cutWidth: 12 }),
          createInstruction({ partId: 'p2', cutLength: 36, cutWidth: 8 })
        ]
      });
      render(<CutListPartsTab {...defaultProps} cutList={cutList} />);
      expect(screen.getByText(/2 unique blanks/)).toBeInTheDocument();
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
      mockExportCutListToPdf.mockResolvedValueOnce({ success: true, filePath: '/tmp/parts.pdf' });

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
    it('saves CSV via save dialog and shows toast', async () => {
      const user = userEvent.setup();

      render(<CutListPartsTab {...defaultProps} />);

      await user.click(screen.getByText('Download'));
      await user.click(screen.getByRole('menuitem', { name: /download csv/i }));

      await waitFor(() => {
        expect(mockExportCutListToCsv).toHaveBeenCalled();
      });
      expect(window.electronAPI.showSaveDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultPath: 'Test Project-parts.csv'
        })
      );
      expect(window.electronAPI.writeFile).toHaveBeenCalled();

      const toast = useUIStore.getState().toast;
      expect(toast?.message).toBe('Parts list saved to CSV');
    });

    it('uses project name in CSV filename', async () => {
      const user = userEvent.setup();

      render(<CutListPartsTab {...defaultProps} projectName="My Project" />);

      await user.click(screen.getByText('Download'));
      await user.click(screen.getByRole('menuitem', { name: /download csv/i }));

      await waitFor(() => {
        expect(mockExportCutListToCsv).toHaveBeenCalled();
      });

      expect(window.electronAPI.showSaveDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultPath: 'My Project-parts.csv'
        })
      );
    });

    it('uses fallback filename when project name is empty', async () => {
      const user = userEvent.setup();

      render(<CutListPartsTab {...defaultProps} projectName="" />);

      await user.click(screen.getByText('Download'));
      await user.click(screen.getByRole('menuitem', { name: /download csv/i }));

      await waitFor(() => {
        expect(mockExportCutListToCsv).toHaveBeenCalled();
      });

      expect(window.electronAPI.showSaveDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultPath: 'cut-list-parts.csv'
        })
      );
    });
  });
});
