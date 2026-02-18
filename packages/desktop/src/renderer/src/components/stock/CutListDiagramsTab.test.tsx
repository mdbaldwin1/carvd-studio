import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
vi.mock('../../utils/pdfExport', () => ({
  exportDiagramsToPdf: vi.fn().mockResolvedValue({ success: true })
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

  describe('download', () => {
    it('renders download button', () => {
      render(<CutListDiagramsTab {...defaultProps} />);
      expect(screen.getByText('Download')).toBeInTheDocument();
    });
  });
});
