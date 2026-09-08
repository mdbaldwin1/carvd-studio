import { describe, expect, it, vi } from 'vitest';
import type { CutInstruction, CutList, RectCutFeature } from '../types';
import { exportCutListToPdf, exportProjectReportToPdf } from './pdfExport';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

vi.unmock('jspdf');

describe('R13 complete identified fabrication in actual PDF bytes', () => {
  it.each(['cut list', 'project report'])(
    'identifies every part and preserves a long operation list in the %s',
    async (kind) => {
      let bytes: number[] = [];
      window.electronAPI.showSaveDialog = vi
        .fn()
        .mockResolvedValue({ canceled: false, filePath: '/tmp/carvd-review.pdf' });
      window.electronAPI.writeBinaryFile = vi.fn(async (_path, data) => {
        bytes = data;
      });
      const instructions: CutInstruction[] = ['Left cabinet panel', 'Right cabinet panel'].map((name, panel) => ({
        partId: panel === 0 ? 'left1234-panel' : 'right567-panel',
        partName: name,
        cutLength: 100,
        cutWidth: 20,
        thickness: 1,
        stockId: 'stock',
        stockName: 'Plywood',
        grainSensitive: false,
        canRotate: true,
        isGlueUp: false,
        features: Array.from(
          { length: 35 },
          (_, index): RectCutFeature => ({
            id: `${panel}-${index}`,
            label: `Panel ${panel + 1} operation ${index + 1} full detail`,
            kind: 'rect_cut',
            version: 1,
            enabled: true,
            cutType: 'cutout',
            target: { type: 'face', face: 'top_face' },
            reference: { primaryFrom: 'min', secondaryFrom: 'min' },
            placement: { x: index * 2, z: 2 },
            parameters: { size: { length: 1, width: 1 }, depthMode: 'blind', depth: 0.25 }
          })
        )
      }));
      const cutList: CutList = {
        id: 'cuts',
        generatedAt: '',
        projectModifiedAt: '',
        isStale: false,
        instructions,
        stockBoards: [],
        statistics: {
          totalParts: 2,
          totalStockBoards: 0,
          totalBoardFeet: 0,
          totalWasteSquareInches: 0,
          wastePercentage: 0,
          estimatedCost: 0,
          totalWasteCost: 0,
          byStock: []
        },
        bypassedIssues: [],
        skippedParts: [],
        kerfWidth: 0.125,
        overageFactor: 1
      };
      const result =
        kind === 'cut list'
          ? await exportCutListToPdf(cutList, { projectName: 'Cabinet', units: 'imperial' })
          : await exportProjectReportToPdf(cutList, {
              projectName: 'Cabinet',
              units: 'imperial',
              customShoppingItems: []
            });
      expect(result.success).toBe(true);
      // Optional diagnostic artifacts for visual QA; normal test runs stay in memory.
      if (process.env.CARVD_PDF_QA_DIR) {
        writeFileSync(join(process.env.CARVD_PDF_QA_DIR, `${kind.replaceAll(' ', '-')}.pdf`), new Uint8Array(bytes));
      }
      const pdf = new globalThis.TextDecoder('latin1').decode(new Uint8Array(bytes));
      const section = pdf.slice(pdf.indexOf('(Fabrication Operations)'));
      expect.soft(pdf).toContain('(Fabrication Operations)');
      expect.soft(section).toContain('Left cabinet panel');
      expect.soft(section).toContain('Right cabinet panel');
      for (let panel = 1; panel <= 2; panel++) {
        for (let operation = 1; operation <= 35; operation++) {
          expect.soft(section).toContain(`Panel ${panel} operation ${operation} full detail`);
        }
      }
    }
  );
});
