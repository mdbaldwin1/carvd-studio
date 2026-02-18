import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { getCsvHeader, exportCutListToCsv, exportShoppingListToCsv } from './pdfExport';
import type { CutList, CutInstruction, CustomShoppingItem, StockSummary } from '../types';

// ============================================================
// Helper: minimal cut list for testing
// ============================================================

function createTestInstruction(overrides: Partial<CutInstruction> = {}): CutInstruction {
  return {
    partId: 'p1',
    partName: 'Test Part',
    cutLength: 24,
    cutWidth: 12,
    thickness: 0.75,
    stockId: 's1',
    stockName: '3/4" Plywood',
    grainSensitive: false,
    canRotate: true,
    isGlueUp: false,
    ...overrides
  };
}

function createTestStockSummary(overrides: Partial<StockSummary> = {}): StockSummary {
  return {
    stockId: 's1',
    stockName: '3/4" Plywood',
    boardsNeeded: 1,
    boardFeet: 8,
    cost: 45.0,
    stockLength: 96,
    stockWidth: 48,
    stockThickness: 0.75,
    pricingUnit: 'per_item',
    pricePerUnit: 45.0,
    linearFeet: 8,
    actualBoardsUsed: 1,
    averageUtilization: 75,
    wasteSquareInches: 1152,
    ...overrides
  };
}

function createTestCutList(overrides: Partial<CutList> = {}): CutList {
  return {
    id: 'cl-1',
    generatedAt: '2026-01-01T00:00:00.000Z',
    projectModifiedAt: '2026-01-01T00:00:00.000Z',
    isStale: false,
    instructions: [createTestInstruction()],
    stockBoards: [],
    statistics: {
      totalParts: 1,
      totalStockBoards: 1,
      totalBoardFeet: 8,
      totalWasteSquareInches: 1152,
      wastePercentage: 25,
      estimatedCost: 45.0,
      totalWasteCost: 11.25,
      byStock: [createTestStockSummary()]
    },
    bypassedIssues: [],
    skippedParts: [],
    kerfWidth: 0.125,
    overageFactor: 1.0,
    ...overrides
  };
}

// ============================================================
// getCsvHeader
// ============================================================

describe('getCsvHeader', () => {
  it('returns a string with Carvd Studio branding', () => {
    const header = getCsvHeader();
    expect(header).toContain('Carvd Studio');
    expect(header).toContain('carvd-studio.com');
  });

  it('includes date', () => {
    const header = getCsvHeader();
    expect(header).toContain('Date:');
  });

  it('starts with comment markers', () => {
    const header = getCsvHeader();
    expect(header.startsWith('#')).toBe(true);
  });
});

// ============================================================
// exportCutListToCsv
// ============================================================

describe('exportCutListToCsv', () => {
  it('generates CSV with header and instructions', () => {
    const cutList = createTestCutList();
    const csv = exportCutListToCsv(cutList, 'imperial');

    expect(csv).toContain('CUT LIST');
    expect(csv).toContain('Units: inches');
    expect(csv).toContain('Qty');
    expect(csv).toContain('Cut Length');
    expect(csv).toContain('Test Part');
  });

  it('groups identical parts', () => {
    const cutList = createTestCutList({
      instructions: [
        createTestInstruction({ partId: 'p1', partName: 'Shelf A' }),
        createTestInstruction({ partId: 'p2', partName: 'Shelf B' })
      ]
    });
    const csv = exportCutListToCsv(cutList, 'imperial');
    const dataLines = csv
      .split('\n')
      .filter((line) => !line.startsWith('#') && !line.startsWith('CUT') && line.includes(','));

    // Should have header row + 1 grouped row (both identical dimensions)
    const dataRows = dataLines.filter((line) => !line.startsWith('Qty'));
    expect(dataRows.length).toBe(1);
    expect(dataRows[0]).toContain('Shelf A; Shelf B');
  });

  it('marks grain sensitive parts', () => {
    const cutList = createTestCutList({
      instructions: [createTestInstruction({ grainSensitive: true })]
    });
    const csv = exportCutListToCsv(cutList, 'imperial');
    expect(csv).toContain('Yes');
  });

  it('marks glue-up parts', () => {
    const cutList = createTestCutList({
      instructions: [createTestInstruction({ isGlueUp: true })]
    });
    const csv = exportCutListToCsv(cutList, 'imperial');
    // The row should have Yes in the glue-up column
    const lines = csv.split('\n');
    const dataLine = lines.find((l) => l.includes('Test Part'));
    expect(dataLine).toContain('Yes');
  });

  it('uses metric units label', () => {
    const cutList = createTestCutList();
    const csv = exportCutListToCsv(cutList, 'metric');
    expect(csv).toContain('Units: mm');
  });

  it('separates different stock dimensions into different rows', () => {
    const cutList = createTestCutList({
      instructions: [
        createTestInstruction({ partName: 'Part A', cutLength: 24, cutWidth: 12 }),
        createTestInstruction({ partName: 'Part B', cutLength: 36, cutWidth: 12 })
      ]
    });
    const csv = exportCutListToCsv(cutList, 'imperial');
    expect(csv).toContain('Part A');
    expect(csv).toContain('Part B');
  });
});

// ============================================================
// exportShoppingListToCsv
// ============================================================

describe('exportShoppingListToCsv', () => {
  it('generates CSV with lumber section', () => {
    const cutList = createTestCutList();
    const csv = exportShoppingListToCsv(cutList, [], 'imperial');

    expect(csv).toContain('SHOPPING LIST');
    expect(csv).toContain('LUMBER & SHEET GOODS');
    // csvEscape doubles quotes: 3/4" Plywood → "3/4"" Plywood"
    expect(csv).toContain('Plywood');
    expect(csv).toContain('$45.00');
  });

  it('includes board_foot pricing unit', () => {
    const cutList = createTestCutList({
      statistics: {
        totalParts: 1,
        totalStockBoards: 1,
        totalBoardFeet: 8,
        totalWasteSquareInches: 0,
        wastePercentage: 0,
        estimatedCost: 28.0,
        totalWasteCost: 0,
        byStock: [
          createTestStockSummary({
            pricingUnit: 'board_foot',
            pricePerUnit: 3.5,
            cost: 28.0
          })
        ]
      }
    });
    const csv = exportShoppingListToCsv(cutList, [], 'imperial');
    expect(csv).toContain('/bf');
  });

  it('includes per_item pricing unit', () => {
    const cutList = createTestCutList();
    const csv = exportShoppingListToCsv(cutList, [], 'imperial');
    expect(csv).toContain('/ea');
  });

  it('includes custom shopping items section', () => {
    const cutList = createTestCutList();
    const customItems: CustomShoppingItem[] = [
      {
        id: 'ci-1',
        name: 'Wood Glue',
        description: 'Titebond III',
        quantity: 1,
        unitPrice: 12.99
      },
      {
        id: 'ci-2',
        name: 'Screws',
        description: '#8 x 1-1/4"',
        quantity: 2,
        unitPrice: 5.99
      }
    ];
    const csv = exportShoppingListToCsv(cutList, customItems, 'imperial');

    expect(csv).toContain('OTHER ITEMS');
    expect(csv).toContain('Wood Glue');
    expect(csv).toContain('Screws');
    expect(csv).toContain('Titebond III');
    expect(csv).toContain('$12.99');
  });

  it('calculates grand total with custom items', () => {
    const cutList = createTestCutList(); // $45.00 lumber
    const customItems: CustomShoppingItem[] = [{ id: 'ci-1', name: 'Glue', quantity: 1, unitPrice: 10.0 }];
    const csv = exportShoppingListToCsv(cutList, customItems, 'imperial');
    expect(csv).toContain('$55.00'); // 45 + 10
  });

  it('omits custom items section when none exist', () => {
    const cutList = createTestCutList();
    const csv = exportShoppingListToCsv(cutList, [], 'imperial');
    expect(csv).not.toContain('OTHER ITEMS');
  });

  it('includes lumber subtotal', () => {
    const cutList = createTestCutList();
    const csv = exportShoppingListToCsv(cutList, [], 'imperial');
    expect(csv).toContain('Lumber Subtotal');
  });

  it('includes grand total', () => {
    const cutList = createTestCutList();
    const csv = exportShoppingListToCsv(cutList, [], 'imperial');
    expect(csv).toContain('GRAND TOTAL');
  });
});

// ============================================================
// PDF export functions (dialog flow testing)
// ============================================================

// Mock jsPDF using a class so `new jsPDF()` works correctly
vi.mock('jspdf', () => {
  class MockJsPDF {
    internal = { pageSize: { getWidth: () => 612, getHeight: () => 792 } };
    setFontSize = vi.fn();
    setFont = vi.fn();
    setTextColor = vi.fn();
    setFillColor = vi.fn();
    setDrawColor = vi.fn();
    setLineWidth = vi.fn();
    text = vi.fn();
    rect = vi.fn();
    roundedRect = vi.fn();
    addPage = vi.fn();
    addImage = vi.fn();
    getTextWidth = vi.fn().mockReturnValue(50);
    splitTextToSize = vi.fn().mockReturnValue(['text']);
    output = vi.fn().mockReturnValue(new ArrayBuffer(10));
  }
  return { default: MockJsPDF };
});

// Import PDF functions after mock
import {
  exportCutListToPdf,
  exportShoppingListToPdf,
  exportDiagramsToPdf,
  exportProjectReportToPdf
} from './pdfExport';

describe('PDF export functions', () => {
  beforeAll(() => {
    window.electronAPI = {
      showSaveDialog: vi.fn(),
      writeBinaryFile: vi.fn(),
      showOpenDialog: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      addRecentProject: vi.fn(),
      getRecentProjects: vi.fn(),
      clearRecentProjects: vi.fn(),
      setWindowTitle: vi.fn(),
      getPreference: vi.fn(),
      setPreference: vi.fn()
    } as unknown as typeof window.electronAPI;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportCutListToPdf', () => {
    it('returns canceled when dialog is canceled', async () => {
      (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
        canceled: true,
        filePath: undefined
      });

      const result = await exportCutListToPdf(createTestCutList(), {
        projectName: 'Test',
        units: 'imperial'
      });

      expect(result.success).toBe(false);
      expect(result.canceled).toBe(true);
    });

    it('returns success with file path on successful export', async () => {
      (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
        canceled: false,
        filePath: '/path/to/test.pdf'
      });
      (window.electronAPI.writeBinaryFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await exportCutListToPdf(createTestCutList(), {
        projectName: 'Test',
        units: 'imperial'
      });

      expect(result.success).toBe(true);
      expect(result.filePath).toBe('/path/to/test.pdf');
    });

    it('returns error on write failure', async () => {
      (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
        canceled: false,
        filePath: '/path/to/test.pdf'
      });
      (window.electronAPI.writeBinaryFile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Write failed'));

      const result = await exportCutListToPdf(createTestCutList(), {
        projectName: 'Test',
        units: 'imperial'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Write failed');
    });
  });

  describe('exportShoppingListToPdf', () => {
    it('returns canceled when dialog is canceled', async () => {
      (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
        canceled: true
      });

      const result = await exportShoppingListToPdf(createTestCutList(), [], {
        projectName: 'Test',
        units: 'imperial'
      });

      expect(result.success).toBe(false);
      expect(result.canceled).toBe(true);
    });

    it('returns success on successful export', async () => {
      (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
        canceled: false,
        filePath: '/path/to/shopping.pdf'
      });
      (window.electronAPI.writeBinaryFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await exportShoppingListToPdf(createTestCutList(), [], {
        projectName: 'Test',
        units: 'imperial'
      });

      expect(result.success).toBe(true);
      expect(result.filePath).toBe('/path/to/shopping.pdf');
    });
  });

  describe('exportDiagramsToPdf', () => {
    it('returns canceled when dialog is canceled', async () => {
      (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
        canceled: true
      });

      const result = await exportDiagramsToPdf(createTestCutList(), {
        projectName: 'Test',
        units: 'imperial'
      });

      expect(result.success).toBe(false);
      expect(result.canceled).toBe(true);
    });

    it('returns success on successful export', async () => {
      (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
        canceled: false,
        filePath: '/path/to/diagrams.pdf'
      });
      (window.electronAPI.writeBinaryFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await exportDiagramsToPdf(createTestCutList(), {
        projectName: 'Test',
        units: 'imperial'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('exportProjectReportToPdf', () => {
    it('returns canceled when dialog is canceled', async () => {
      (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
        canceled: true
      });

      const result = await exportProjectReportToPdf(createTestCutList(), {
        projectName: 'Test',
        units: 'imperial',
        customShoppingItems: []
      });

      expect(result.success).toBe(false);
      expect(result.canceled).toBe(true);
    });

    it('returns success on successful export', async () => {
      (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
        canceled: false,
        filePath: '/path/to/report.pdf'
      });
      (window.electronAPI.writeBinaryFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await exportProjectReportToPdf(createTestCutList(), {
        projectName: 'Test',
        units: 'imperial',
        customShoppingItems: []
      });

      expect(result.success).toBe(true);
    });

    it('handles thumbnail data without error', async () => {
      (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
        canceled: false,
        filePath: '/path/to/report.pdf'
      });
      (window.electronAPI.writeBinaryFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await exportProjectReportToPdf(createTestCutList(), {
        projectName: 'Test',
        units: 'imperial',
        customShoppingItems: [],
        thumbnailData: 'data:image/png;base64,abc123',
        projectNotes: 'Some project notes here'
      });

      expect(result.success).toBe(true);
    });
  });
});
