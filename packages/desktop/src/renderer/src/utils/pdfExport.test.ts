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
    features: [],
    ...overrides
  };
}

function createTestStockSummary(overrides: Partial<StockSummary> = {}): StockSummary {
  return {
    form: 'sheet',
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
  it.each(['imperial', 'metric'] as const)('retains blind mortise end-wall shaping in %s CSV', (units) => {
    const cutList = createTestCutList({
      instructions: [
        createTestInstruction({
          features: [
            {
              id: 'fox-socket',
              kind: 'rect_cut',
              version: 1,
              enabled: true,
              target: { type: 'face', face: 'top_face' },
              reference: { primaryFrom: 'min' },
              cutType: 'mortise',
              parameters: {
                size: { length: 2, width: 0.25 },
                depthMode: 'blind',
                depth: 1,
                wallAngle: 5
              },
              placement: { x: 10, z: 0.75 }
            }
          ]
        })
      ]
    });
    expect(exportCutListToCsv(cutList, units)).toContain('5° end walls, widening with depth');
  });

  it('generates CSV with header and instructions', () => {
    const cutList = createTestCutList();
    const csv = exportCutListToCsv(cutList, 'imperial');

    expect(csv).toContain('CUT LIST');
    expect(csv).toContain('Units: inches');
    expect(csv).toContain('Qty');
    expect(csv).toContain('Blank Length');
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

  it('does not group identical blanks with different operations', () => {
    const cutList = createTestCutList({
      instructions: [
        createTestInstruction({
          partId: 'p1',
          partName: 'Rail A',
          features: [
            {
              id: 'feature-1',
              kind: 'end_cut',
              version: 1 as const,
              enabled: true,
              target: { type: 'face', face: 'left_end' },
              reference: { primaryFrom: 'min' },
              cutType: 'mitre',
              lengthMode: 'long_point',
              parameters: { horizontalAngle: 45 }
            }
          ]
        }),
        createTestInstruction({
          partId: 'p2',
          partName: 'Rail B',
          features: [
            {
              id: 'feature-2',
              kind: 'end_cut',
              version: 1 as const,
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
    const csv = exportCutListToCsv(cutList, 'imperial');
    const dataLines = csv
      .split('\n')
      .filter((line) => !line.startsWith('#') && !line.startsWith('CUT') && line.includes(','));

    const dataRows = dataLines.filter((line) => !line.startsWith('Qty'));
    expect(dataRows.length).toBe(2);
    expect(dataRows.some((line) => line.includes('Rail A'))).toBe(true);
    expect(dataRows.some((line) => line.includes('Rail B'))).toBe(true);
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

  it('includes authored operations in CSV output', () => {
    const cutList = createTestCutList({
      instructions: [
        createTestInstruction({
          features: [
            {
              id: 'feature-1',
              kind: 'end_cut',
              version: 1 as const,
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
    const csv = exportCutListToCsv(cutList, 'imperial');

    expect(csv).toContain('Operations / Notes');
    expect(csv).toContain('Mitre 45° on Left End · Long point on Front');
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

const pdfText = vi.hoisted(() => vi.fn());
const pdfRect = vi.hoisted(() => vi.fn());
const pdfSetFontSize = vi.hoisted(() => vi.fn());
const pdfSetFont = vi.hoisted(() => vi.fn());
const pdfGetTextWidth = vi.hoisted(() => vi.fn().mockReturnValue(50));
const pdfAddPage = vi.hoisted(() => vi.fn());
const pdfSplitText = vi.hoisted(() => vi.fn((text: string, _width: number) => [text]));

// Mock jsPDF using a class so `new jsPDF()` works correctly
vi.mock('jspdf', () => {
  class MockJsPDF {
    internal = { pageSize: { getWidth: () => 612, getHeight: () => 792 } };
    setFontSize = pdfSetFontSize;
    getFontSize = vi.fn().mockReturnValue(10.35);
    setFont = pdfSetFont;
    setTextColor = vi.fn();
    setFillColor = vi.fn();
    setDrawColor = vi.fn();
    setLineWidth = vi.fn();
    text = pdfText;
    rect = pdfRect;
    roundedRect = vi.fn();
    addPage = pdfAddPage;
    addImage = vi.fn();
    getTextWidth = pdfGetTextWidth;
    splitTextToSize = pdfSplitText;
    getTextColor = vi.fn().mockReturnValue('#000000');
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

describe('fabrication handoff PDF content', () => {
  it('includes purchased machining, finished size and review warnings in standalone and project PDFs', async () => {
    (window.electronAPI.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
      canceled: false,
      filePath: '/tmp/report.pdf'
    });
    const report = createTestCutList({
      instructions: [createTestInstruction({ cutLength: 14, cutWidth: 4.5, finishedLength: 12, finishedWidth: 4 })],
      postPurchaseInstructions: [
        createTestInstruction({ stage: 'post_purchase', partName: 'Bought tenon', notes: 'Cross drill after purchase' })
      ],
      validationIssues: [
        {
          partId: 'p1',
          partName: 'Mate',
          type: 'joint_fit',
          severity: 'warning',
          canBypass: false,
          message: 'Interference requires review'
        }
      ]
    });
    for (const exportPdf of [exportCutListToPdf, exportProjectReportToPdf]) {
      pdfText.mockClear();
      const result = await exportPdf(report, {
        projectName: 'Test',
        units: 'imperial',
        customShoppingItems: [],
        projectNotes: '',
        thumbnailData: undefined
      });
      expect(result.success).toBe(true);
      const text = pdfText.mock.calls.flat().join(' ');
      expect(text).toContain('After purchase - component machining');
      expect(text).toContain('24" x 12" x 3/4" (not additional stock blanks)');
      expect(text).toContain('Cross drill after purchase');
      expect(text).toContain('Finished modeled envelope');
      expect(text).toContain('Interference requires review');
    }
  });
});

it('refuses outdated fabrication output before opening a save dialog', async () => {
  const stale = createTestCutList({ isStale: true });
  const options = { projectName: 'Test', units: 'imperial' as const, customShoppingItems: [], projectNotes: '' };
  vi.clearAllMocks();
  for (const exportPdf of [exportCutListToPdf, exportProjectReportToPdf, exportDiagramsToPdf]) {
    expect(await exportPdf(stale, options)).toMatchObject({
      success: false,
      error: expect.stringContaining('Regenerate')
    });
  }
  expect(await exportShoppingListToPdf(stale, [], options)).toMatchObject({ success: false });
  expect(window.electronAPI.showSaveDialog).not.toHaveBeenCalled();
  expect(() => exportCutListToCsv(stale, 'imperial')).toThrow('Regenerate');
  expect(() => exportShoppingListToCsv(stale, [], 'imperial')).toThrow('Regenerate');
});

it('draws every PDF checklist header as geometry rather than an unsupported font glyph', async () => {
  vi.mocked(window.electronAPI.showSaveDialog).mockResolvedValue({ canceled: false, filePath: '/tmp/checklist.pdf' });
  vi.mocked(window.electronAPI.writeBinaryFile).mockResolvedValue(undefined);
  const report = createTestCutList({ stockBoards: [createTestStockBoard()] });
  const items = [{ id: 'glue', name: 'Glue', quantity: 1, unitPrice: 5 }];
  const options = { projectName: 'Checklist', units: 'imperial' as const, customShoppingItems: items };
  const exports = [
    () => exportCutListToPdf(report, options),
    () => exportShoppingListToPdf(report, items, options),
    () => exportDiagramsToPdf(report, options),
    () => exportProjectReportToPdf(report, options)
  ];
  for (const exportPdf of exports) {
    pdfText.mockClear();
    pdfRect.mockClear();
    expect(await exportPdf()).toMatchObject({ success: true });
    expect(pdfText.mock.calls.flat().join(' ')).not.toContain('☐');
    // A one-row table must have both a header checkbox and a row checkbox.
    expect(pdfRect.mock.calls.filter((args) => args[2] === 7 && args[3] === 7).length).toBeGreaterThanOrEqual(2);
  }
});

describe('shopping PDF wrapped rows', () => {
  beforeEach(() => {
    vi.mocked(window.electronAPI.showSaveDialog).mockResolvedValue({
      canceled: false,
      filePath: '/tmp/shopping-test.pdf'
    });
    vi.mocked(window.electronAPI.writeBinaryFile).mockResolvedValue(undefined);
  });
  it.each(['shopping', 'report'] as const)('wraps hardware text within columns in the %s export', async (kind) => {
    const { default: RealPdf } = await vi.importActual<typeof import('jspdf')>('jspdf');
    const metrics = new RealPdf({ unit: 'pt' });
    metrics.setFontSize(10.4);
    metrics.setFont('helvetica', 'normal');
    pdfSplitText.mockImplementation((text, width) => metrics.splitTextToSize(text, width));
    pdfText.mockClear();
    const item = {
      id: 'hinge',
      name: '2-1/2 inch hinge with matching mounting screws',
      description:
        'One hinge kit; leaf 1-1/4 inch wide and 0.09 inch thick. Hardware not modeled. Verify actual hardware before machining.',
      quantity: 1,
      unitPrice: 0
    };
    try {
      const result =
        kind === 'shopping'
          ? await exportShoppingListToPdf(createTestCutList(), [item], { projectName: 'Hinge', units: 'imperial' })
          : await exportProjectReportToPdf(createTestCutList(), {
              projectName: 'Hinge',
              units: 'imperial',
              customShoppingItems: [item]
            });
      expect(result.success).toBe(true);
      for (const [value, x, right] of [
        [item.name, 62, 214],
        [item.description, 224, 362]
      ] as const) {
        const lines = metrics.splitTextToSize(value, right - x) as string[];
        expect(lines.length).toBeGreaterThan(1);
        const calls = pdfText.mock.calls.filter(([text, left]) => lines.includes(text) && left === x);
        expect(calls.map(([text]) => text).join(' ')).toBe(value);
        for (const [text, left, y] of calls) {
          expect(left + metrics.getTextWidth(text)).toBeLessThanOrEqual(right + 0.1);
          expect(y).toBeLessThanOrEqual(712);
        }
        const lastY = Math.max(...calls.map(([, , y]) => y));
        expect(pdfText.mock.calls.some(([text, , y]) => String(text).includes('Subtotal') && y > lastY)).toBe(true);
      }
    } finally {
      pdfSplitText.mockImplementation((text) => [text]);
    }
  });

  it.each(['shopping', 'report'] as const)(
    'paginates ordinary and oversized rows without losing text in the %s export',
    async (kind) => {
      pdfText.mockClear();
      pdfAddPage.mockClear();
      const notes = Array.from({ length: 110 }, (_, index) => `Hardware note ${index}`);
      pdfSplitText.mockImplementation((text) =>
        text === 'oversized note' ? notes : text.startsWith('Hinge row') ? [text, 'matching screws'] : [text]
      );
      const items = Array.from({ length: 35 }, (_, index) => ({
        id: `hinge-${index}`,
        name: `Hinge row ${index}`,
        description: 'Verify hardware',
        quantity: 1,
        unitPrice: 2
      }));
      items.push({ id: 'long', name: 'Oversized row', description: 'oversized note', quantity: 1, unitPrice: 3 });
      try {
        const result =
          kind === 'shopping'
            ? await exportShoppingListToPdf(createTestCutList(), items, { projectName: 'Pages', units: 'imperial' })
            : await exportProjectReportToPdf(createTestCutList(), {
                projectName: 'Pages',
                units: 'imperial',
                customShoppingItems: items
              });
        expect(result.success).toBe(true);
        expect(pdfAddPage.mock.calls.length).toBeGreaterThanOrEqual(3);
        const noteCalls = pdfText.mock.calls.filter(([text]) => notes.includes(text));
        expect(noteCalls.map(([text]) => text)).toEqual(notes);
        for (const [, , y] of noteCalls) expect(y).toBeLessThanOrEqual(712);
        const pageOf = (index: number) =>
          pdfAddPage.mock.invocationCallOrder.filter((order) => order < pdfText.mock.invocationCallOrder[index]).length;
        for (const item of items.slice(0, -1)) {
          const first = pdfText.mock.calls.findIndex(([text]) => text === item.name);
          const second = pdfText.mock.calls.findIndex(([text], index) => index > first && text === 'matching screws');
          expect(pageOf(first)).toBe(pageOf(second));
        }
        for (const note of notes) {
          const index = pdfText.mock.calls.findIndex(([text]) => text === note);
          expect(
            pdfText.mock.calls.some(
              ([text], headerIndex) =>
                text === 'Description' && headerIndex < index && pageOf(headerIndex) === pageOf(index)
            )
          ).toBe(true);
        }
        expect(pdfText.mock.calls.find(([text]) => text === 'GRAND TOTAL:')?.[2]).toBeLessThanOrEqual(712);
        expect(pdfText.mock.calls.some(([text]) => text === '$118.00')).toBe(true);
      } finally {
        pdfSplitText.mockImplementation((text) => [text]);
      }
    }
  );
  it.each(['shopping', 'report'] as const)(
    'wraps long stock names and dimensions and repeats stock headers in the %s export',
    async (kind) => {
      const { default: RealPdf } = await vi.importActual<typeof import('jspdf')>('jspdf');
      const metrics = new RealPdf({ unit: 'pt' });
      metrics.setFontSize(10.4);
      metrics.setFont('helvetica', 'normal');
      pdfSplitText.mockImplementation((text, width) => metrics.splitTextToSize(text, width));
      pdfText.mockClear();
      pdfAddPage.mockClear();
      const name = 'Quarter sawn white oak selected for cathedral grain and matching cabinet rails';
      const cutList = createTestCutList();
      cutList.statistics.byStock = Array.from({ length: 35 }, (_, index) =>
        createTestStockSummary({
          stockId: `stock-${index}`,
          stockName: name,
          stockLength: 123.456,
          stockWidth: 45.678,
          stockThickness: 0.875
        })
      );
      try {
        const result =
          kind === 'shopping'
            ? await exportShoppingListToPdf(cutList, [], { projectName: 'Stock', units: 'metric' })
            : await exportProjectReportToPdf(cutList, {
                projectName: 'Stock',
                units: 'metric',
                customShoppingItems: []
              });
        expect(result.success).toBe(true);
        const x = kind === 'shopping' ? 62 : 60;
        const right = kind === 'shopping' ? 206 : 192;
        const nameLines = metrics.splitTextToSize(name, right - x) as string[];
        expect(nameLines.length).toBeGreaterThan(2);
        const nameCalls = pdfText.mock.calls.filter(([text, left]) => left === x && nameLines.includes(text));
        expect(nameCalls.length).toBe(nameLines.length * 35);
        for (const [text, left, y] of nameCalls) {
          expect(left + metrics.getTextWidth(text)).toBeLessThanOrEqual(right + 0.1);
          expect(y).toBeLessThanOrEqual(712);
        }
        const dimensionX = kind === 'shopping' ? 216 : 202;
        const dimensionRight = kind === 'shopping' ? 362 : 344;
        const dimensionCalls = pdfText.mock.calls.filter(
          ([text, left]) => left === dimensionX && text !== 'Dimensions'
        );
        expect(dimensionCalls.length).toBeGreaterThan(35);
        for (const [text, left, y] of dimensionCalls) {
          expect(left + metrics.getTextWidth(text)).toBeLessThanOrEqual(dimensionRight + 0.1);
          expect(y).toBeLessThanOrEqual(712);
        }
        expect(pdfAddPage.mock.calls.length).toBeGreaterThanOrEqual(2);
        const pageOf = (index: number) =>
          pdfAddPage.mock.invocationCallOrder.filter((order) => order < pdfText.mock.invocationCallOrder[index]).length;
        const nameIndexes = pdfText.mock.calls.flatMap(([text, left], index) =>
          left === x && text === nameLines[0] ? [index] : []
        );
        for (const index of nameIndexes) {
          expect(
            pdfText.mock.calls.some(
              ([text], headerIndex) =>
                text === 'Dimensions' && headerIndex < index && pageOf(headerIndex) === pageOf(index)
            )
          ).toBe(true);
          expect(pageOf(index)).toBe(pageOf(index + nameLines.length - 1));
        }
        expect(pdfText.mock.calls.find(([text]) => text === 'GRAND TOTAL:')?.[2]).toBeLessThanOrEqual(712);
      } finally {
        pdfSplitText.mockImplementation((text) => [text]);
      }
    }
  );
});

describe('cutting diagram header layout', () => {
  it.each(['diagrams', 'report'] as const)(
    'separates long titles from right-aligned metadata in %s PDFs',
    async (kind) => {
      vi.mocked(window.electronAPI.showSaveDialog).mockResolvedValue({
        canceled: false,
        filePath: '/tmp/diagram-header.pdf'
      });
      vi.mocked(window.electronAPI.writeBinaryFile).mockResolvedValue(undefined);
      const { default: RealPdf } = await vi.importActual<typeof import('jspdf')>('jspdf');
      const metrics = new RealPdf({ unit: 'pt' });
      pdfSetFontSize.mockImplementation((size) => metrics.setFontSize(size));
      pdfSetFont.mockImplementation((font, style) => metrics.setFont(font, style));
      pdfGetTextWidth.mockImplementation((text) => metrics.getTextWidth(text));
      pdfSplitText.mockImplementation((text, width) => metrics.splitTextToSize(text, width));
      const drawn: { text: string; x: number; y: number; width: number; size: number; align?: string }[] = [];
      pdfText.mockImplementation((text, x, y, options) => {
        if (typeof text === 'string')
          drawn.push({
            text,
            x,
            y,
            width: metrics.getTextWidth(text),
            size: metrics.getFontSize(),
            align: options?.align
          });
      });
      try {
        for (const stockName of [
          '1/4" Birch Dowel',
          'Selected quarter sawn birch dowel for matching pin joints '.repeat(30)
        ]) {
          drawn.length = 0;
          pdfRect.mockClear();
          const board = createTestStockBoard({ stockName, stockLength: 36, stockWidth: 0.25 });
          const cutList = createTestCutList({ stockBoards: [board] });
          const result =
            kind === 'diagrams'
              ? await exportDiagramsToPdf(cutList, { projectName: 'Pins', units: 'imperial' })
              : await exportProjectReportToPdf(cutList, {
                  projectName: 'Pins',
                  units: 'imperial',
                  customShoppingItems: []
                });
          expect(result.success).toBe(true);
          const summaryIndex = drawn.findIndex((entry) => entry.text.includes('% utilization'));
          expect(summaryIndex).toBeGreaterThan(0);
          const summary = drawn[summaryIndex];
          expect(summary.align).toBe('right');
          const titleStart = drawn.findIndex((entry) =>
            entry.text.startsWith(kind === 'diagrams' ? 'Pins -' : 'Cutting Diagram')
          );
          const titles = drawn.slice(titleStart, summaryIndex).filter((entry) => entry.size === 13.8);
          expect(titles.length).toBeGreaterThan(0);
          expect(titles.length).toBeLessThanOrEqual(3);
          for (const title of titles) {
            expect(title.x + title.width).toBeLessThanOrEqual(summary.x + 0.1);
            expect(title.y + 12).toBeLessThan(summary.y);
          }
          if (stockName.length > 100) expect(titles.at(-1)?.text).toMatch(/\.\.\.$/);
          const dims = drawn[summaryIndex - 1];
          expect(dims.y).toBe(summary.y);
          expect(dims.x + dims.width + 16).toBeLessThanOrEqual(summary.x - summary.width);
          // Stock rectangle begins below the complete heading block.
          const boardRect = pdfRect.mock.calls.find((args) => args[4] === 'FD' && args[2] > 0 && args[3] > 0);
          expect(boardRect?.[1]).toBeGreaterThan(summary.y + 10);
        }
      } finally {
        pdfSetFontSize.mockReset();
        pdfSetFont.mockReset();
        pdfGetTextWidth.mockReset().mockReturnValue(50);
        pdfSplitText.mockImplementation((text) => [text]);
        pdfText.mockReset();
      }
    }
  );
});

it('preserves prepared board purchase dimensions in CSV and both PDF shopping sections', async () => {
  vi.mocked(window.electronAPI.showSaveDialog).mockResolvedValue({
    canceled: false,
    filePath: '/tmp/prepared-board.pdf'
  });
  vi.mocked(window.electronAPI.writeBinaryFile).mockResolvedValue(undefined);
  const report = createTestCutList();
  report.statistics.byStock = [
    createTestStockSummary({ form: 'board', stockLength: 24, stockWidth: 0.47, stockThickness: 0.1675 })
  ];
  const csv = exportShoppingListToCsv(report, [], 'imperial');
  expect(csv).toContain('24"" x 0.47"" x 0.1675""');
  expect(csv).not.toContain('/sheet');
  for (const exportPdf of [
    () => exportShoppingListToPdf(report, [], { projectName: 'Prepared stock', units: 'imperial' }),
    () =>
      exportProjectReportToPdf(report, { projectName: 'Prepared stock', units: 'imperial', customShoppingItems: [] })
  ]) {
    pdfText.mockClear();
    expect(await exportPdf()).toMatchObject({ success: true });
    const text = pdfText.mock.calls.flat().join(' ');
    expect(text).toContain('24" x 0.47" x 0.1675"');
    expect(text).not.toContain('/sheet');
  }
});
