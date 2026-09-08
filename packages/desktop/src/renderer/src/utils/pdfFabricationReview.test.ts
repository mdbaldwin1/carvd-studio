import { describe, expect, it, vi } from 'vitest';
import type { CircularCutFeature, CutInstruction, CutList, RectCutFeature } from '../types';
import { exportCutListToPdf, exportProjectReportToPdf } from './pdfExport';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { groupCutInstructions, getInstructionFabricationLines } from './cutListInstructions';

vi.unmock('jspdf');

function reviewInstruction(partName: string, features: CutInstruction['features']): CutInstruction {
  return {
    partId: partName,
    partName,
    cutLength: 10,
    cutWidth: 4,
    thickness: 1,
    stockId: 'stock',
    stockName: 'Maple',
    grainSensitive: false,
    canRotate: true,
    isGlueUp: false,
    features
  };
}
function reviewDowel(length: number, jointId: string): CircularCutFeature {
  return {
    id: jointId,
    kind: 'circular_cut',
    version: 1,
    enabled: true,
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'center', secondaryFrom: 'center' },
    cutType: 'round_hole',
    placement: { primary: 0, secondary: 0, rotation: 0 },
    parameters: { diameter: 0.25, depthMode: 'blind', depth: 0.25, tilt: 0, direction: 0 },
    metadata: {
      dowelJoint: {
        jointId,
        matePartId: 'mate-' + jointId,
        memberIndex: 0,
        dowelDiameter: 0.25,
        dowelLength: length,
        embedmentDepth: 0.25
      }
    }
  };
}
async function exportReviewPdf(instructions: CutInstruction[], kind: 'cut list' | 'project report'): Promise<string> {
  let bytes: number[] = [];
  window.electronAPI.showSaveDialog = vi.fn().mockResolvedValue({ canceled: false, filePath: '/tmp/carvd-review.pdf' });
  window.electronAPI.writeBinaryFile = vi.fn(async (_path, data) => {
    bytes = data;
  });
  const cutList: CutList = {
    id: 'cuts',
    generatedAt: '',
    projectModifiedAt: '',
    isStale: false,
    instructions,
    stockBoards: [],
    statistics: {
      totalParts: instructions.length,
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
      ? await exportCutListToPdf(cutList, { projectName: 'Review joints', units: 'imperial' })
      : await exportProjectReportToPdf(cutList, {
          projectName: 'Review joints',
          units: 'imperial',
          customShoppingItems: []
        });
  expect(result.success).toBe(true);
  if (process.env.CARVD_PDF_QA_DIR) {
    const prefix = instructions[0].partName.startsWith('Short') ? 'dowels' : 'notches';
    writeFileSync(
      join(process.env.CARVD_PDF_QA_DIR, `${prefix}-${kind.replaceAll(' ', '-')}.pdf`),
      new Uint8Array(bytes)
    );
  }
  const pdf = new globalThis.TextDecoder('latin1').decode(new Uint8Array(bytes));
  return pdf.slice(pdf.indexOf('(Fabrication Operations)'));
}

describe('scoped review fabrication regressions', () => {
  it.each(['cut list', 'project report'] as const)(
    'D identifies Top and Bottom entry for blind edge notches in fabrication and the actual %s',
    async (kind) => {
      const cuts = (['top_front_edge', 'bottom_front_edge'] as const).map(
        (edge, index): RectCutFeature => ({
          id: `notch-${index}`,
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          target: { type: 'edge', edge },
          reference: { primaryFrom: 'min', secondaryFrom: 'min' },
          cutType: 'edge_notch',
          placement: { x: 2, z: 0 },
          parameters: { size: { length: 1, width: 1 }, depthMode: 'blind', depth: 0.25 }
        })
      );
      const instructions = cuts.map((cut, index) =>
        reviewInstruction(index ? 'Bottom notch rail' : 'Top notch rail', [cut])
      );
      expect
        .soft(getInstructionFabricationLines(instructions[0], 'imperial'))
        .toEqual(['1. Edge Notch on Top-Front Edge · 1" × 1" × 1/4" deep · 2" from Left along the selected edge']);
      expect
        .soft(getInstructionFabricationLines(instructions[1], 'imperial'))
        .toEqual(['1. Edge Notch on Bottom-Front Edge · 1" × 1" × 1/4" deep · 2" from Left along the selected edge']);
      const section = await exportReviewPdf(instructions, kind);
      expect.soft(section).toContain('Edge Notch on Top-Front Edge');
      expect.soft(section).toContain('Edge Notch on Bottom-Front Edge');
      for (const cut of cuts) cut.parameters = { size: { length: 1, width: 1 }, depthMode: 'through' };
      expect(getInstructionFabricationLines(instructions[0], 'imperial')).toEqual([
        '1. Edge Notch on Front Side · 1" × 1" · Through · 2" from Left along the selected edge'
      ]);
      expect(getInstructionFabricationLines(instructions[1], 'imperial')).toEqual(
        getInstructionFabricationLines(instructions[0], 'imperial')
      );
    }
  );
  it('C groups by physical dowel dimensions and joint structure, not UUIDs', () => {
    const first = reviewInstruction('Short dowel rail', [reviewDowel(0.375, 'joint-a')]);
    const second = reviewInstruction('Long dowel rail', [reviewDowel(0.5, 'joint-b')]);
    const copied = reviewInstruction('Copied short rail', [reviewDowel(0.375, 'copied-joint')]);
    expect.soft(groupCutInstructions([first, second, copied]).map((group) => group.quantity)).toEqual([2, 1]);
    const shared = [reviewDowel(0.375, 'shared'), reviewDowel(0.375, 'shared')];
    shared[1].id = 'shared-member-1';
    shared[1].metadata!.dowelJoint!.memberIndex = 1;
    const separate = globalThis.structuredClone(shared);
    separate[1].metadata!.dowelJoint!.jointId = 'separate';
    expect(
      groupCutInstructions([reviewInstruction('One joint', shared), reviewInstruction('Two joints', separate)])
    ).toHaveLength(2);
  });
  it.each(['cut list', 'project report'] as const)(
    'C preserves different valid dowel lengths and part names in the actual %s',
    async (kind) => {
      const section = await exportReviewPdf(
        [
          reviewInstruction('Short dowel rail', [reviewDowel(0.375, 'joint-a')]),
          reviewInstruction('Long dowel rail', [reviewDowel(0.5, 'joint-b')])
        ],
        kind
      );
      expect.soft(section).toContain('Short dowel rail');
      expect.soft(section).toContain('Long dowel rail');
      expect.soft(section).toContain('3/8" long');
      expect(section).toContain('1/2" long');
    }
  );
});

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
