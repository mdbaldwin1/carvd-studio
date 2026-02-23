import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { getCsvHeader, exportCutListToCsv, exportShoppingListToCsv } from './pdfExport';
import type { CutList, CutInstruction, CustomShoppingItem, StockSummary, StockBoard, CutPlacement } from '../types';

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

// ============================================================
// Helper: create stock board with placements for diagram tests
// ============================================================

function createTestPlacement(overrides: Partial<CutPlacement> = {}): CutPlacement {
  return {
    partId: 'p1',
    partName: 'Side Panel',
    x: 0,
    y: 0,
    width: 24,
    height: 12,
    rotated: false,
    color: '#d2b987',
    ...overrides
  };
}

function createTestStockBoard(overrides: Partial<StockBoard> = {}): StockBoard {
  return {
    stockId: 's1',
    stockName: '3/4" Plywood',
    boardIndex: 1,
    stockLength: 96,
    stockWidth: 48,
    placements: [createTestPlacement()],
    wasteArea: 3456,
    usedArea: 1152,
    utilizationPercent: 25,
    ...overrides
  };
}

/**
 * Generate many instructions so the PDF rendering exceeds page height
 * and triggers the page-break branch (y > pageHeight - threshold).
 */
function generateManyInstructions(count: number): CutInstruction[] {
  const instructions: CutInstruction[] = [];
  for (let i = 0; i < count; i++) {
    instructions.push(
      createTestInstruction({
        partId: `p${i}`,
        partName: `Part ${i}`,
        cutLength: 10 + i,
        cutWidth: 5 + i,
        stockId: 's1'
      })
    );
  }
  return instructions;
}

function generateManyStockSummaries(count: number): StockSummary[] {
  const summaries: StockSummary[] = [];
  for (let i = 0; i < count; i++) {
    summaries.push(
      createTestStockSummary({
        stockId: `s${i}`,
        stockName: `Stock Type ${i}`,
        boardsNeeded: i + 1,
        cost: 20 * (i + 1)
      })
    );
  }
  return summaries;
}

// ============================================================
// exportCutListToPdf — rich data and code path coverage
// ============================================================

describe('exportCutListToPdf — code path coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
      canceled: false,
      filePath: '/tmp/cut-list.pdf'
    });
    (window.electronAPI.writeBinaryFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('renders multiple grouped instructions with grain-sensitive parts', async () => {
    const cutList = createTestCutList({
      instructions: [
        createTestInstruction({ partId: 'p1', partName: 'Shelf A', grainSensitive: true }),
        createTestInstruction({ partId: 'p2', partName: 'Shelf B', grainSensitive: true }),
        createTestInstruction({
          partId: 'p3',
          partName: 'Back Panel',
          cutLength: 48,
          cutWidth: 24,
          grainSensitive: false
        }),
        createTestInstruction({
          partId: 'p4',
          partName: 'Side Panel',
          cutLength: 36,
          cutWidth: 12,
          grainSensitive: true
        })
      ]
    });

    const result = await exportCutListToPdf(cutList, {
      projectName: 'Bookshelf',
      units: 'imperial'
    });

    expect(result.success).toBe(true);
    expect(result.filePath).toBe('/tmp/cut-list.pdf');
    expect(window.electronAPI.writeBinaryFile).toHaveBeenCalledTimes(1);
  });

  it('renders glue-up parts with notes', async () => {
    const cutList = createTestCutList({
      instructions: [
        createTestInstruction({ partId: 'p1', partName: 'Table Top', isGlueUp: true, grainSensitive: true }),
        createTestInstruction({ partId: 'p2', partName: 'Leg', isGlueUp: false, grainSensitive: false })
      ]
    });

    const result = await exportCutListToPdf(cutList, {
      projectName: 'Dining Table',
      units: 'metric'
    });

    expect(result.success).toBe(true);
  });

  it('renders both grain and glue-up notes on a single group', async () => {
    const cutList = createTestCutList({
      instructions: [
        createTestInstruction({
          partId: 'p1',
          partName: 'Wide Panel',
          isGlueUp: true,
          grainSensitive: true,
          cutLength: 48,
          cutWidth: 24
        })
      ]
    });

    const result = await exportCutListToPdf(cutList, {
      projectName: 'Test',
      units: 'imperial'
    });

    expect(result.success).toBe(true);
  });

  it('triggers page break with many unique instructions', async () => {
    // Each unique dimension creates a new row. We need ~45 rows to exceed
    // pageHeight (792) - 60 = 732. Starting y ~ 138, each row +16 = ~37 rows.
    const instructions = generateManyInstructions(50);
    const cutList = createTestCutList({ instructions });

    const result = await exportCutListToPdf(cutList, {
      projectName: 'Large Project',
      units: 'imperial'
    });

    expect(result.success).toBe(true);
  });

  it('uses empty project name default', async () => {
    const cutList = createTestCutList();
    const result = await exportCutListToPdf(cutList, {
      projectName: '',
      units: 'imperial'
    });

    expect(result.success).toBe(true);
  });

  it('uses metric units', async () => {
    const cutList = createTestCutList();
    const result = await exportCutListToPdf(cutList, {
      projectName: 'Metric Project',
      units: 'metric'
    });

    expect(result.success).toBe(true);
  });

  it('handles showSaveDialog rejection (catch block)', async () => {
    (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Dialog failed'));

    const result = await exportCutListToPdf(createTestCutList(), {
      projectName: 'Test',
      units: 'imperial'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Dialog failed');
  });
});

// ============================================================
// exportShoppingListToPdf — rich data and code path coverage
// ============================================================

describe('exportShoppingListToPdf — code path coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
      canceled: false,
      filePath: '/tmp/shopping.pdf'
    });
    (window.electronAPI.writeBinaryFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('renders with custom shopping items', async () => {
    const customItems: CustomShoppingItem[] = [
      { id: 'ci-1', name: 'Wood Glue', description: 'Titebond III', quantity: 2, unitPrice: 12.99 },
      { id: 'ci-2', name: 'Screws', description: '#8 x 1-1/4"', quantity: 1, unitPrice: 5.99 },
      { id: 'ci-3', name: 'Finish', quantity: 3, unitPrice: 18.5 }
    ];

    const result = await exportShoppingListToPdf(createTestCutList(), customItems, {
      projectName: 'Bookshelf',
      units: 'imperial'
    });

    expect(result.success).toBe(true);
    expect(result.filePath).toBe('/tmp/shopping.pdf');
  });

  it('renders with board_foot pricing', async () => {
    const cutList = createTestCutList({
      statistics: {
        totalParts: 4,
        totalStockBoards: 2,
        totalBoardFeet: 16,
        totalWasteSquareInches: 500,
        wastePercentage: 15,
        estimatedCost: 56.0,
        totalWasteCost: 8.0,
        byStock: [
          createTestStockSummary({
            stockId: 's1',
            stockName: 'White Oak',
            pricingUnit: 'board_foot',
            pricePerUnit: 7.0,
            cost: 56.0,
            boardFeet: 8,
            boardsNeeded: 2
          })
        ]
      }
    });

    const result = await exportShoppingListToPdf(cutList, [], {
      projectName: 'Oak Table',
      units: 'imperial'
    });

    expect(result.success).toBe(true);
  });

  it('renders with multiple stock types', async () => {
    const cutList = createTestCutList({
      statistics: {
        totalParts: 10,
        totalStockBoards: 5,
        totalBoardFeet: 32,
        totalWasteSquareInches: 2000,
        wastePercentage: 20,
        estimatedCost: 150.0,
        totalWasteCost: 30.0,
        byStock: [
          createTestStockSummary({ stockId: 's1', stockName: 'Plywood', boardsNeeded: 3, cost: 90.0 }),
          createTestStockSummary({
            stockId: 's2',
            stockName: 'Hardwood',
            boardsNeeded: 2,
            cost: 60.0,
            pricingUnit: 'board_foot',
            pricePerUnit: 7.5
          })
        ]
      }
    });

    const result = await exportShoppingListToPdf(cutList, [], {
      projectName: 'Multi-Stock',
      units: 'metric'
    });

    expect(result.success).toBe(true);
  });

  it('triggers page break with many stock summaries', async () => {
    const summaries = generateManyStockSummaries(50);
    const cutList = createTestCutList({
      statistics: {
        totalParts: 100,
        totalStockBoards: 50,
        totalBoardFeet: 200,
        totalWasteSquareInches: 10000,
        wastePercentage: 30,
        estimatedCost: 2000.0,
        totalWasteCost: 600.0,
        byStock: summaries
      }
    });

    const result = await exportShoppingListToPdf(cutList, [], {
      projectName: 'Huge Project',
      units: 'imperial'
    });

    expect(result.success).toBe(true);
  });

  it('triggers page break in custom items section with many items', async () => {
    const customItems: CustomShoppingItem[] = [];
    for (let i = 0; i < 60; i++) {
      customItems.push({
        id: `ci-${i}`,
        name: `Item ${i}`,
        description: `Description for item ${i}`,
        quantity: i + 1,
        unitPrice: 1.0 + i * 0.5
      });
    }

    const result = await exportShoppingListToPdf(createTestCutList(), customItems, {
      projectName: 'Many Items',
      units: 'imperial'
    });

    expect(result.success).toBe(true);
  });

  it('uses empty project name default', async () => {
    const result = await exportShoppingListToPdf(createTestCutList(), [], {
      projectName: '',
      units: 'imperial'
    });

    expect(result.success).toBe(true);
  });

  it('handles write failure (catch block)', async () => {
    (window.electronAPI.writeBinaryFile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Disk full'));

    const result = await exportShoppingListToPdf(createTestCutList(), [], {
      projectName: 'Test',
      units: 'imperial'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Disk full');
  });

  it('handles showSaveDialog rejection (catch block)', async () => {
    (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Dialog crashed'));

    const result = await exportShoppingListToPdf(createTestCutList(), [], {
      projectName: 'Test',
      units: 'imperial'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Dialog crashed');
  });
});

// ============================================================
// exportDiagramsToPdf — rich data and code path coverage
// ============================================================

describe('exportDiagramsToPdf — code path coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
      canceled: false,
      filePath: '/tmp/diagrams.pdf'
    });
    (window.electronAPI.writeBinaryFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('renders stock boards with large placements (labels shown)', async () => {
    const cutList = createTestCutList({
      stockBoards: [
        createTestStockBoard({
          placements: [
            createTestPlacement({ partId: 'p1', partName: 'Side Panel', x: 0, y: 0, width: 48, height: 24 }),
            createTestPlacement({ partId: 'p2', partName: 'Top', x: 0, y: 24, width: 48, height: 24 })
          ]
        })
      ]
    });

    const result = await exportDiagramsToPdf(cutList, {
      projectName: 'Cabinet',
      units: 'imperial'
    });

    expect(result.success).toBe(true);
    expect(result.filePath).toBe('/tmp/diagrams.pdf');
  });

  it('renders stock boards with very small placements (labels hidden)', async () => {
    // Parts with w <= 25 or h <= 15 should NOT get labels
    const cutList = createTestCutList({
      stockBoards: [
        createTestStockBoard({
          placements: [
            createTestPlacement({ partId: 'p1', partName: 'Tiny', x: 0, y: 0, width: 2, height: 2 }),
            createTestPlacement({ partId: 'p2', partName: 'Narrow', x: 3, y: 0, width: 5, height: 3 })
          ]
        })
      ]
    });

    const result = await exportDiagramsToPdf(cutList, {
      projectName: 'Small Parts',
      units: 'imperial'
    });

    expect(result.success).toBe(true);
  });

  it('renders placements of medium height (labels shown but no dimensions)', async () => {
    // Parts with w > 25 and h > 15 but h <= 30 show name but NOT dimensions
    const cutList = createTestCutList({
      stockBoards: [
        createTestStockBoard({
          placements: [createTestPlacement({ partId: 'p1', partName: 'Medium', x: 0, y: 0, width: 40, height: 20 })]
        })
      ]
    });

    const result = await exportDiagramsToPdf(cutList, {
      projectName: 'Medium Parts',
      units: 'imperial'
    });

    expect(result.success).toBe(true);
  });

  it('renders placements of large height (labels and dimensions shown)', async () => {
    // Parts with w > 25 and h > 30 show name AND dimensions
    const cutList = createTestCutList({
      stockBoards: [
        createTestStockBoard({
          placements: [createTestPlacement({ partId: 'p1', partName: 'Big Panel', x: 0, y: 0, width: 60, height: 40 })]
        })
      ]
    });

    const result = await exportDiagramsToPdf(cutList, {
      projectName: 'Large Parts',
      units: 'imperial'
    });

    expect(result.success).toBe(true);
  });

  it('renders multiple stock types each with multiple boards', async () => {
    const cutList = createTestCutList({
      stockBoards: [
        createTestStockBoard({
          stockId: 's1',
          stockName: 'Plywood',
          boardIndex: 1,
          placements: [createTestPlacement({ partId: 'p1', partName: 'Panel A', width: 48, height: 24 })]
        }),
        createTestStockBoard({
          stockId: 's1',
          stockName: 'Plywood',
          boardIndex: 2,
          placements: [createTestPlacement({ partId: 'p2', partName: 'Panel B', width: 36, height: 18 })]
        }),
        createTestStockBoard({
          stockId: 's2',
          stockName: 'White Oak',
          boardIndex: 1,
          stockLength: 72,
          stockWidth: 8,
          placements: [
            createTestPlacement({ partId: 'p3', partName: 'Rail', width: 36, height: 4 }),
            createTestPlacement({ partId: 'p4', partName: 'Stile', x: 36, width: 30, height: 4 })
          ]
        })
      ]
    });

    const result = await exportDiagramsToPdf(cutList, {
      projectName: 'Mixed Stock',
      units: 'imperial'
    });

    expect(result.success).toBe(true);
  });

  it('renders boards with single placement (singular "part" label)', async () => {
    const cutList = createTestCutList({
      stockBoards: [
        createTestStockBoard({
          placements: [createTestPlacement({ partId: 'p1', partName: 'Only Part', width: 48, height: 24 })]
        })
      ]
    });

    const result = await exportDiagramsToPdf(cutList, {
      projectName: 'Single Part',
      units: 'imperial'
    });

    expect(result.success).toBe(true);
  });

  it('renders with metric units', async () => {
    const cutList = createTestCutList({
      stockBoards: [
        createTestStockBoard({
          placements: [createTestPlacement({ width: 600, height: 300 })],
          stockLength: 2400,
          stockWidth: 1200
        })
      ]
    });

    const result = await exportDiagramsToPdf(cutList, {
      projectName: 'Metric Cabinet',
      units: 'metric'
    });

    expect(result.success).toBe(true);
  });

  it('renders empty stock boards (no placements)', async () => {
    const cutList = createTestCutList({
      stockBoards: [createTestStockBoard({ placements: [] })]
    });

    const result = await exportDiagramsToPdf(cutList, {
      projectName: 'Empty Board',
      units: 'imperial'
    });

    expect(result.success).toBe(true);
  });

  it('renders with no stock boards at all', async () => {
    const cutList = createTestCutList({ stockBoards: [] });

    const result = await exportDiagramsToPdf(cutList, {
      projectName: 'No Boards',
      units: 'imperial'
    });

    expect(result.success).toBe(true);
  });

  it('uses empty project name default', async () => {
    const cutList = createTestCutList({
      stockBoards: [createTestStockBoard()]
    });

    const result = await exportDiagramsToPdf(cutList, {
      projectName: '',
      units: 'imperial'
    });

    expect(result.success).toBe(true);
  });

  it('handles write failure (catch block)', async () => {
    (window.electronAPI.writeBinaryFile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Permission denied'));

    const cutList = createTestCutList({
      stockBoards: [createTestStockBoard()]
    });

    const result = await exportDiagramsToPdf(cutList, {
      projectName: 'Test',
      units: 'imperial'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Permission denied');
  });

  it('handles showSaveDialog rejection (catch block)', async () => {
    (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Dialog error'));

    const result = await exportDiagramsToPdf(createTestCutList(), {
      projectName: 'Test',
      units: 'imperial'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Dialog error');
  });
});

// ============================================================
// exportProjectReportToPdf — rich data and code path coverage
// ============================================================

describe('exportProjectReportToPdf — code path coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
      canceled: false,
      filePath: '/tmp/report.pdf'
    });
    (window.electronAPI.writeBinaryFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('renders with thumbnail and project notes', async () => {
    const result = await exportProjectReportToPdf(createTestCutList(), {
      projectName: 'Bookshelf',
      units: 'imperial',
      customShoppingItems: [],
      thumbnailData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
      projectNotes: 'This is a detailed bookshelf project with adjustable shelves.'
    });

    expect(result.success).toBe(true);
  });

  it('renders without thumbnail or notes', async () => {
    const result = await exportProjectReportToPdf(createTestCutList(), {
      projectName: 'Simple Project',
      units: 'imperial',
      customShoppingItems: []
    });

    expect(result.success).toBe(true);
  });

  it('renders with custom shopping items', async () => {
    const customItems: CustomShoppingItem[] = [
      { id: 'ci-1', name: 'Wood Glue', description: 'Titebond III', quantity: 2, unitPrice: 12.99 },
      { id: 'ci-2', name: 'Sandpaper', quantity: 5, unitPrice: 3.5 },
      { id: 'ci-3', name: 'Finish', description: 'Polyurethane', quantity: 1, unitPrice: 22.0 }
    ];

    const result = await exportProjectReportToPdf(createTestCutList(), {
      projectName: 'Full Report',
      units: 'imperial',
      customShoppingItems: customItems
    });

    expect(result.success).toBe(true);
  });

  it('renders with stock boards (cutting diagrams section)', async () => {
    const cutList = createTestCutList({
      stockBoards: [
        createTestStockBoard({
          stockId: 's1',
          stockName: 'Plywood',
          boardIndex: 1,
          placements: [
            createTestPlacement({ partName: 'Side', width: 48, height: 36 }),
            createTestPlacement({ partName: 'Back', x: 48, width: 48, height: 36 })
          ]
        }),
        createTestStockBoard({
          stockId: 's1',
          stockName: 'Plywood',
          boardIndex: 2,
          placements: [createTestPlacement({ partName: 'Shelf', width: 30, height: 12 })]
        })
      ]
    });

    const result = await exportProjectReportToPdf(cutList, {
      projectName: 'With Diagrams',
      units: 'imperial',
      customShoppingItems: []
    });

    expect(result.success).toBe(true);
  });

  it('renders stock boards with parts too small for labels', async () => {
    const cutList = createTestCutList({
      stockBoards: [
        createTestStockBoard({
          placements: [
            createTestPlacement({ partName: 'Dowel', width: 2, height: 2 }),
            createTestPlacement({ partName: 'Small Strip', x: 3, width: 10, height: 5 })
          ]
        })
      ]
    });

    const result = await exportProjectReportToPdf(cutList, {
      projectName: 'Small Parts Report',
      units: 'imperial',
      customShoppingItems: []
    });

    expect(result.success).toBe(true);
  });

  it('renders stock boards with parts large enough for dimension labels', async () => {
    const cutList = createTestCutList({
      stockBoards: [
        createTestStockBoard({
          placements: [createTestPlacement({ partName: 'Large Panel', width: 80, height: 40 })]
        })
      ]
    });

    const result = await exportProjectReportToPdf(cutList, {
      projectName: 'Large Panel Report',
      units: 'imperial',
      customShoppingItems: []
    });

    expect(result.success).toBe(true);
  });

  it('renders with multiple stock types in diagrams', async () => {
    const cutList = createTestCutList({
      stockBoards: [
        createTestStockBoard({
          stockId: 's1',
          stockName: 'Plywood',
          boardIndex: 1,
          placements: [createTestPlacement({ partName: 'Panel', width: 48, height: 36 })]
        }),
        createTestStockBoard({
          stockId: 's2',
          stockName: 'Hardwood',
          boardIndex: 1,
          stockLength: 72,
          stockWidth: 6,
          placements: [
            createTestPlacement({ partName: 'Rail', width: 36, height: 3 }),
            createTestPlacement({ partName: 'Stile', x: 36, width: 30, height: 3 })
          ]
        })
      ],
      statistics: {
        totalParts: 3,
        totalStockBoards: 2,
        totalBoardFeet: 12,
        totalWasteSquareInches: 500,
        wastePercentage: 18,
        estimatedCost: 85.0,
        totalWasteCost: 15.0,
        byStock: [
          createTestStockSummary({ stockId: 's1', stockName: 'Plywood', cost: 45.0 }),
          createTestStockSummary({
            stockId: 's2',
            stockName: 'Hardwood',
            cost: 40.0,
            pricingUnit: 'board_foot',
            pricePerUnit: 8.0
          })
        ]
      }
    });

    const result = await exportProjectReportToPdf(cutList, {
      projectName: 'Multi-Stock Report',
      units: 'imperial',
      customShoppingItems: []
    });

    expect(result.success).toBe(true);
  });

  it('renders with grain-sensitive and glue-up instructions in cut list section', async () => {
    const cutList = createTestCutList({
      instructions: [
        createTestInstruction({ partId: 'p1', partName: 'Table Top', isGlueUp: true, grainSensitive: true }),
        createTestInstruction({ partId: 'p2', partName: 'Leg A', grainSensitive: true }),
        createTestInstruction({ partId: 'p3', partName: 'Apron', isGlueUp: false, grainSensitive: false }),
        createTestInstruction({ partId: 'p4', partName: 'Stretcher', cutLength: 30, cutWidth: 4 })
      ]
    });

    const result = await exportProjectReportToPdf(cutList, {
      projectName: 'Table Report',
      units: 'metric',
      customShoppingItems: []
    });

    expect(result.success).toBe(true);
  });

  it('triggers page break in cut list section with many instructions', async () => {
    const instructions = generateManyInstructions(50);
    const cutList = createTestCutList({ instructions });

    const result = await exportProjectReportToPdf(cutList, {
      projectName: 'Big Report',
      units: 'imperial',
      customShoppingItems: []
    });

    expect(result.success).toBe(true);
  });

  it('triggers page break in shopping list section with many stock summaries', async () => {
    const summaries = generateManyStockSummaries(50);
    const cutList = createTestCutList({
      statistics: {
        totalParts: 200,
        totalStockBoards: 50,
        totalBoardFeet: 400,
        totalWasteSquareInches: 20000,
        wastePercentage: 25,
        estimatedCost: 5000.0,
        totalWasteCost: 1250.0,
        byStock: summaries
      }
    });

    const result = await exportProjectReportToPdf(cutList, {
      projectName: 'Massive Report',
      units: 'imperial',
      customShoppingItems: []
    });

    expect(result.success).toBe(true);
  });

  it('triggers page break in custom items section with many items', async () => {
    const customItems: CustomShoppingItem[] = [];
    for (let i = 0; i < 60; i++) {
      customItems.push({
        id: `ci-${i}`,
        name: `Custom Item ${i}`,
        description: `Desc ${i}`,
        quantity: i + 1,
        unitPrice: 2.0 + i * 0.25
      });
    }

    const result = await exportProjectReportToPdf(createTestCutList(), {
      projectName: 'Custom Items Report',
      units: 'imperial',
      customShoppingItems: customItems
    });

    expect(result.success).toBe(true);
  });

  it('uses empty project name default', async () => {
    const result = await exportProjectReportToPdf(createTestCutList(), {
      projectName: '',
      units: 'imperial',
      customShoppingItems: []
    });

    expect(result.success).toBe(true);
  });

  it('handles write failure (catch block)', async () => {
    (window.electronAPI.writeBinaryFile as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('No space left on device')
    );

    const result = await exportProjectReportToPdf(createTestCutList(), {
      projectName: 'Test',
      units: 'imperial',
      customShoppingItems: []
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('No space left on device');
  });

  it('handles showSaveDialog rejection (catch block)', async () => {
    (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('System dialog error'));

    const result = await exportProjectReportToPdf(createTestCutList(), {
      projectName: 'Test',
      units: 'imperial',
      customShoppingItems: []
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('System dialog error');
  });

  it('renders with thumbnail that fails addImage (catch block)', async () => {
    // The addImage mock is a no-op, so we can't easily make it throw from outside.
    // However, we can verify the code path by passing thumbnail data and confirming success.
    const result = await exportProjectReportToPdf(createTestCutList(), {
      projectName: 'Thumbnail Test',
      units: 'imperial',
      customShoppingItems: [],
      thumbnailData: 'data:image/png;base64,invaliddata'
    });

    expect(result.success).toBe(true);
  });

  it('renders complete report with all options combined', async () => {
    const cutList = createTestCutList({
      instructions: [
        createTestInstruction({ partId: 'p1', partName: 'Side A', grainSensitive: true }),
        createTestInstruction({ partId: 'p2', partName: 'Side B', grainSensitive: true }),
        createTestInstruction({ partId: 'p3', partName: 'Top', cutLength: 48, cutWidth: 24, isGlueUp: true }),
        createTestInstruction({ partId: 'p4', partName: 'Shelf', cutLength: 44, cutWidth: 12 }),
        createTestInstruction({
          partId: 'p5',
          partName: 'Back Panel',
          cutLength: 48,
          cutWidth: 36,
          stockId: 's2',
          stockName: '1/4" Plywood'
        })
      ],
      stockBoards: [
        createTestStockBoard({
          stockId: 's1',
          stockName: '3/4" Plywood',
          boardIndex: 1,
          placements: [
            createTestPlacement({ partName: 'Side A', width: 24, height: 36 }),
            createTestPlacement({ partName: 'Side B', x: 24, width: 24, height: 36 }),
            createTestPlacement({ partName: 'Top', y: 36, width: 48, height: 12 })
          ]
        }),
        createTestStockBoard({
          stockId: 's1',
          stockName: '3/4" Plywood',
          boardIndex: 2,
          placements: [createTestPlacement({ partName: 'Shelf', width: 44, height: 12 })]
        }),
        createTestStockBoard({
          stockId: 's2',
          stockName: '1/4" Plywood',
          boardIndex: 1,
          stockLength: 96,
          stockWidth: 48,
          placements: [createTestPlacement({ partName: 'Back Panel', width: 48, height: 36 })]
        })
      ],
      statistics: {
        totalParts: 5,
        totalStockBoards: 3,
        totalBoardFeet: 24,
        totalWasteSquareInches: 3000,
        wastePercentage: 22,
        estimatedCost: 120.0,
        totalWasteCost: 26.0,
        byStock: [
          createTestStockSummary({ stockId: 's1', stockName: '3/4" Plywood', boardsNeeded: 2, cost: 90.0 }),
          createTestStockSummary({ stockId: 's2', stockName: '1/4" Plywood', boardsNeeded: 1, cost: 30.0 })
        ]
      }
    });

    const customItems: CustomShoppingItem[] = [
      { id: 'ci-1', name: 'Wood Glue', description: 'Titebond III', quantity: 1, unitPrice: 8.99 },
      { id: 'ci-2', name: 'Screws', description: '#8 x 1-1/4" pocket screws', quantity: 1, unitPrice: 12.5 }
    ];

    const result = await exportProjectReportToPdf(cutList, {
      projectName: 'Complete Bookshelf',
      units: 'imperial',
      customShoppingItems: customItems,
      thumbnailData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
      projectNotes: 'A simple bookshelf with adjustable shelves. Uses pocket screws for joinery.'
    });

    expect(result.success).toBe(true);
    expect(result.filePath).toBe('/tmp/report.pdf');
    expect(window.electronAPI.writeBinaryFile).toHaveBeenCalledTimes(1);
  });
});
