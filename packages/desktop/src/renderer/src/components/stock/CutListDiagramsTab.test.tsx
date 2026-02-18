import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import type { CutList, StockBoard } from '../../types';

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

// Mock featureLimits
vi.mock('../../utils/featureLimits', () => ({
  getBlockedMessage: vi.fn().mockReturnValue('PDF export requires a license')
}));

// Mock pdfExport (dynamic import)
const mockExportDiagramsToPdf = vi.fn().mockResolvedValue({ success: true });
vi.mock('../../utils/pdfExport', () => ({
  exportDiagramsToPdf: (...args: unknown[]) => mockExportDiagramsToPdf(...args)
}));

import { CutListDiagramsTab } from './CutListDiagramsTab';

// ============================================================
// Setup
// ============================================================

function createBoard(overrides: Partial<StockBoard> = {}): StockBoard {
  return {
    stockId: 's1',
    stockName: 'Plywood',
    boardIndex: 1,
    stockLength: 96,
    stockWidth: 48,
    placements: [
      {
        partId: 'p1',
        partName: 'Top',
        x: 0,
        y: 0,
        width: 24,
        height: 12,
        rotated: false,
        color: '#c4a574'
      }
    ],
    wasteArea: 3000,
    usedArea: 288,
    utilizationPercent: 8.8,
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
    stockBoards: [createBoard()],
    statistics: {
      totalParts: 1,
      totalStockBoards: 1,
      totalBoardFeet: 2,
      totalWasteSquareInches: 3000,
      wastePercentage: 65,
      estimatedCost: 50,
      totalWasteCost: 10,
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
});

beforeEach(() => {
  vi.clearAllMocks();
  useProjectStore.setState({
    projectName: 'Test Project'
  });
  useUIStore.setState({ toast: null });
});

// ============================================================
// Tests
// ============================================================

describe('CutListDiagramsTab', () => {
  const defaultProps = {
    cutList: createCutList(),
    units: 'imperial' as const,
    canExportPDF: true
  };

  describe('rendering', () => {
    it('renders board count summary', () => {
      render(<CutListDiagramsTab {...defaultProps} />);
      expect(screen.getByText(/1 board needed/)).toBeInTheDocument();
    });

    it('uses plural for multiple boards', () => {
      const cutList = createCutList({
        stockBoards: [createBoard({ boardIndex: 1 }), createBoard({ boardIndex: 2 })]
      });
      render(<CutListDiagramsTab {...defaultProps} cutList={cutList} />);
      expect(screen.getByText(/2 boards needed/)).toBeInTheDocument();
    });

    it('renders stock group title', () => {
      render(<CutListDiagramsTab {...defaultProps} />);
      expect(screen.getByText('Plywood')).toBeInTheDocument();
    });

    it('renders board number', () => {
      render(<CutListDiagramsTab {...defaultProps} />);
      expect(screen.getByText('Board #1')).toBeInTheDocument();
    });

    it('renders utilization percentage', () => {
      render(<CutListDiagramsTab {...defaultProps} />);
      expect(screen.getByText('8.8% used')).toBeInTheDocument();
    });

    it('renders SVG diagram', () => {
      const { container } = render(<CutListDiagramsTab {...defaultProps} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders part placement rectangles in SVG', () => {
      const { container } = render(<CutListDiagramsTab {...defaultProps} />);
      // Board outline rect + part placement rect
      const rects = container.querySelectorAll('svg rect');
      expect(rects.length).toBeGreaterThanOrEqual(2);
    });

    it('shows empty state when no boards', () => {
      const cutList = createCutList({ stockBoards: [] });
      render(<CutListDiagramsTab {...defaultProps} cutList={cutList} />);
      expect(screen.getByText('No cutting diagrams to display.')).toBeInTheDocument();
    });
  });

  describe('multiple stock types', () => {
    it('groups boards by stock', () => {
      const cutList = createCutList({
        stockBoards: [
          createBoard({ stockId: 's1', stockName: 'Plywood', boardIndex: 1 }),
          createBoard({ stockId: 's2', stockName: 'Oak', boardIndex: 1 })
        ]
      });
      render(<CutListDiagramsTab {...defaultProps} cutList={cutList} />);
      expect(screen.getByText('Plywood')).toBeInTheDocument();
      expect(screen.getByText('Oak')).toBeInTheDocument();
    });
  });

  describe('SVG part labels', () => {
    it('shows part label when part is large enough', () => {
      // Default board: stockLength=96, scale = min(600/96, 4) = 4
      // Placement width=24 => 24*4=96 > 30, height=12 => 12*4=48 > 15 => label shows
      const { container } = render(<CutListDiagramsTab {...defaultProps} />);
      const texts = container.querySelectorAll('svg text');
      const labelTexts = Array.from(texts).map((t) => t.textContent);
      expect(labelTexts).toContain('Top');
    });

    it('does not show part label when part is too small', () => {
      // With scale=4, width=5 => 5*4=20 < 30, so label should not show
      const cutList = createCutList({
        stockBoards: [
          createBoard({
            placements: [
              {
                partId: 'p1',
                partName: 'Tiny',
                x: 0,
                y: 0,
                width: 5,
                height: 2,
                rotated: false,
                color: '#c4a574'
              }
            ]
          })
        ]
      });
      const { container } = render(<CutListDiagramsTab {...defaultProps} cutList={cutList} />);
      const texts = container.querySelectorAll('svg text');
      const labelTexts = Array.from(texts).map((t) => t.textContent);
      expect(labelTexts).not.toContain('Tiny');
    });

    it('does not show part label when width is large enough but height is too small', () => {
      // width=10 => 10*4=40 > 30, but height=3 => 3*4=12 < 15 => no label
      const cutList = createCutList({
        stockBoards: [
          createBoard({
            placements: [
              {
                partId: 'p1',
                partName: 'Narrow',
                x: 0,
                y: 0,
                width: 10,
                height: 3,
                rotated: false,
                color: '#c4a574'
              }
            ]
          })
        ]
      });
      const { container } = render(<CutListDiagramsTab {...defaultProps} cutList={cutList} />);
      const texts = container.querySelectorAll('svg text');
      const labelTexts = Array.from(texts).map((t) => t.textContent);
      expect(labelTexts).not.toContain('Narrow');
    });

    it('truncates long part names to 12 chars with ellipsis', () => {
      // Name > 15 chars should be truncated to 12 + '...'
      const longName = 'Very Long Part Name Here';
      const cutList = createCutList({
        stockBoards: [
          createBoard({
            placements: [
              {
                partId: 'p1',
                partName: longName,
                x: 0,
                y: 0,
                width: 24,
                height: 12,
                rotated: false,
                color: '#c4a574'
              }
            ]
          })
        ]
      });
      const { container } = render(<CutListDiagramsTab {...defaultProps} cutList={cutList} />);
      const texts = container.querySelectorAll('svg text');
      const labelTexts = Array.from(texts).map((t) => t.textContent);
      expect(labelTexts).toContain('Very Long Pa...');
    });

    it('does not truncate short part names', () => {
      const shortName = 'Side Panel'; // 10 chars, <= 15
      const cutList = createCutList({
        stockBoards: [
          createBoard({
            placements: [
              {
                partId: 'p1',
                partName: shortName,
                x: 0,
                y: 0,
                width: 24,
                height: 12,
                rotated: false,
                color: '#c4a574'
              }
            ]
          })
        ]
      });
      const { container } = render(<CutListDiagramsTab {...defaultProps} cutList={cutList} />);
      const texts = container.querySelectorAll('svg text');
      const labelTexts = Array.from(texts).map((t) => t.textContent);
      expect(labelTexts).toContain('Side Panel');
    });
  });

  describe('SVG rotation indicator', () => {
    it('shows rotation indicator for rotated parts that are wide enough', () => {
      // width=24 => 24*4=96 > 20 and rotated=true => shows "(rotated)"
      const cutList = createCutList({
        stockBoards: [
          createBoard({
            placements: [
              {
                partId: 'p1',
                partName: 'Top',
                x: 0,
                y: 0,
                width: 24,
                height: 12,
                rotated: true,
                color: '#c4a574'
              }
            ]
          })
        ]
      });
      const { container } = render(<CutListDiagramsTab {...defaultProps} cutList={cutList} />);
      const texts = container.querySelectorAll('svg text');
      const labelTexts = Array.from(texts).map((t) => t.textContent?.trim());
      expect(labelTexts).toContain('(rotated)');
    });

    it('does not show rotation indicator for non-rotated parts', () => {
      const { container } = render(<CutListDiagramsTab {...defaultProps} />);
      const texts = container.querySelectorAll('svg text');
      const labelTexts = Array.from(texts).map((t) => t.textContent?.trim());
      expect(labelTexts).not.toContain('(rotated)');
    });

    it('does not show rotation indicator when rotated part is too narrow', () => {
      // width=4 => 4*4=16 < 20, so no "(rotated)" even though rotated=true
      const cutList = createCutList({
        stockBoards: [
          createBoard({
            placements: [
              {
                partId: 'p1',
                partName: 'Tiny Rotated',
                x: 0,
                y: 0,
                width: 4,
                height: 4,
                rotated: true,
                color: '#c4a574'
              }
            ]
          })
        ]
      });
      const { container } = render(<CutListDiagramsTab {...defaultProps} cutList={cutList} />);
      const texts = container.querySelectorAll('svg text');
      const labelTexts = Array.from(texts).map((t) => t.textContent?.trim());
      expect(labelTexts).not.toContain('(rotated)');
    });
  });

  describe('handleExportPdf', () => {
    it('disables Download PDF item when canExportPDF is false', () => {
      render(<CutListDiagramsTab {...defaultProps} canExportPDF={false} />);

      // Open dropdown
      fireEvent.click(screen.getByText('Download'));

      // The Download PDF button should be disabled
      const pdfButton = screen.getByText('Download PDF').closest('button');
      expect(pdfButton).toBeDisabled();
    });

    it('does not call export when Download PDF is clicked while disabled', () => {
      render(<CutListDiagramsTab {...defaultProps} canExportPDF={false} />);

      fireEvent.click(screen.getByText('Download'));
      fireEvent.click(screen.getByText('Download PDF'));

      expect(mockExportDiagramsToPdf).not.toHaveBeenCalled();
    });

    it('shows success toast on successful PDF export', async () => {
      mockExportDiagramsToPdf.mockResolvedValueOnce({ success: true });

      render(<CutListDiagramsTab {...defaultProps} />);

      fireEvent.click(screen.getByText('Download'));
      fireEvent.click(screen.getByText('Download PDF'));

      await waitFor(() => {
        const toast = useUIStore.getState().toast;
        expect(toast?.message).toBe('Cutting diagrams saved to PDF');
      });
    });

    it('shows error toast on PDF export error result', async () => {
      mockExportDiagramsToPdf.mockResolvedValueOnce({ success: false, error: 'Save failed' });

      render(<CutListDiagramsTab {...defaultProps} />);

      fireEvent.click(screen.getByText('Download'));
      fireEvent.click(screen.getByText('Download PDF'));

      await waitFor(() => {
        const toast = useUIStore.getState().toast;
        expect(toast?.message).toBe('Failed to save PDF');
      });
    });

    it('does nothing when export is canceled (no error, no success)', async () => {
      mockExportDiagramsToPdf.mockResolvedValueOnce({ success: false });

      render(<CutListDiagramsTab {...defaultProps} />);

      fireEvent.click(screen.getByText('Download'));
      fireEvent.click(screen.getByText('Download PDF'));

      // Wait for the async handler to complete
      await waitFor(() => {
        expect(mockExportDiagramsToPdf).toHaveBeenCalled();
      });

      // Toast should still be null (no message shown for cancel)
      const toast = useUIStore.getState().toast;
      expect(toast).toBeNull();
    });

    it('shows error toast when PDF export throws', async () => {
      mockExportDiagramsToPdf.mockRejectedValueOnce(new Error('Unexpected error'));

      render(<CutListDiagramsTab {...defaultProps} />);

      fireEvent.click(screen.getByText('Download'));
      fireEvent.click(screen.getByText('Download PDF'));

      await waitFor(() => {
        const toast = useUIStore.getState().toast;
        expect(toast?.message).toBe('Failed to export PDF');
      });
    });

    it('passes correct options to exportDiagramsToPdf', async () => {
      mockExportDiagramsToPdf.mockResolvedValueOnce({ success: true });

      render(<CutListDiagramsTab {...defaultProps} />);

      fireEvent.click(screen.getByText('Download'));
      fireEvent.click(screen.getByText('Download PDF'));

      await waitFor(() => {
        expect(mockExportDiagramsToPdf).toHaveBeenCalledWith(
          defaultProps.cutList,
          expect.objectContaining({
            projectName: 'Test Project',
            units: 'imperial'
          })
        );
      });
    });
  });

  describe('download', () => {
    it('renders download button', () => {
      render(<CutListDiagramsTab {...defaultProps} />);
      expect(screen.getByText('Download')).toBeInTheDocument();
    });
  });
});
