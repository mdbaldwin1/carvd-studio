import { describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import jsPDF from 'jspdf';
import type { CutList, RoundedCutFeature } from '../types';
import { createTestPart, createTestStock } from '../../../../tests/helpers/factories';
import { generateOptimizedCutList } from './cutListOptimizer';
import { exportCutListToCsv, exportCutListToPdf, exportProjectReportToPdf } from './pdfExport';
import { groupCutInstructions } from './cutListInstructions';

vi.unmock('jspdf');
const slot: RoundedCutFeature = {
  id: 'panel-slot',
  label: 'Centered handhold',
  kind: 'rounded_cut',
  version: 1 as const,
  enabled: true,
  cutType: 'rounded_slot',
  target: { type: 'face', face: 'top_face' },
  reference: { primaryFrom: 'center', secondaryFrom: 'center' },
  placement: { primary: 0, secondary: 0, rotation: 0 },
  parameters: { length: 4, width: 2, cornerRadius: 1, depthMode: 'through' }
};
function fixture(panel: boolean): CutList {
  const stock = createTestStock({ length: 48, width: 4, thickness: 1 });
  const part = createTestPart({
    id: 'panel-original',
    name: panel ? 'Glue-up panel' : 'Precise rail',
    stockId: stock.id,
    length: panel ? 20 : 10.005,
    width: panel ? 12 : 2.74,
    thickness: panel ? 1 : 0.74,
    glueUpPanel: panel,
    features: panel ? [slot] : []
  });
  return generateOptimizedCutList([part], [stock], 0.125, 0, '', []);
}
async function exportActual(
  cutList: CutList,
  kind: 'cut-list' | 'project-report',
  name: string,
  units: 'imperial' | 'metric' = 'imperial'
) {
  let bytes: number[] = [];
  window.electronAPI.showSaveDialog = vi.fn().mockResolvedValue({ canceled: false, filePath: '/tmp/carvd-round6.pdf' });
  window.electronAPI.writeBinaryFile = vi.fn(async (_path, data) => {
    bytes = data;
  });
  const result =
    kind === 'cut-list'
      ? await exportCutListToPdf(cutList, { projectName: 'Fabrication review', units })
      : await exportProjectReportToPdf(cutList, { projectName: 'Fabrication review', units, customShoppingItems: [] });
  expect(result.success).toBe(true);
  if (process.env.CARVD_PDF_QA_DIR)
    writeFileSync(join(process.env.CARVD_PDF_QA_DIR, `${name}-${kind}.pdf`), new Uint8Array(bytes));
  return new globalThis.TextDecoder('latin1').decode(new Uint8Array(bytes));
}
describe('round 6 fabrication boundaries', () => {
  it('K4 leaves panel machining off every optimized strip', () => {
    const cuts = fixture(true);
    expect(cuts.instructions).toHaveLength(3);
    expect(cuts.instructions.map((instruction) => instruction.cutWidth)).toEqual([4, 4, 4]);
    expect(cuts.instructions.flatMap((instruction) => instruction.features ?? [])).toEqual([]);
    expect(cuts.postGlueUpInstructions).toHaveLength(1);
    expect(cuts.postGlueUpInstructions![0]).toMatchObject({
      partId: 'panel-original',
      cutLength: 20,
      cutWidth: 12,
      stage: 'post_glue_up',
      features: [slot]
    });
    expect(
      cuts.stockBoards.flatMap((board) => board.placements).every((placement) => placement.partId.includes('-strip-'))
    ).toBe(true);
  });
  it.each(['cut-list', 'project-report'] as const)(
    'K4 prints panel operations once after glue-up in actual %s',
    async (kind) => {
      const pdf = await exportActual(fixture(true), kind, 'glue-up');
      const section = pdf.slice(pdf.indexOf('(Fabrication Operations)'));
      expect.soft(section).toContain('After glue-up');
      expect(section.match(/Centered handhold/g)).toHaveLength(1);
    }
  );
  it('K4 exports panel machining once with an explicit post-glue-up sequence in CSV', () => {
    const csv = exportCutListToCsv(fixture(true), 'imperial');
    expect.soft(csv).toContain('After glue-up');
    expect(csv.match(/Centered handhold/g)).toHaveLength(1);
  });
  it.each(['cut-list', 'project-report'] as const)(
    'K8 preserves authored blank precision in actual %s',
    async (kind) => {
      const pdf = await exportActual(fixture(false), kind, 'precision');
      expect.soft(pdf).toContain('(10.005")');
      expect.soft(pdf).toContain('(2.74")');
      expect(pdf).toContain('(0.74")');
    }
  );
  it('K8 preserves precision in CSV and keeps distinct blank sizes separate', () => {
    const cuts = fixture(false);
    cuts.instructions.push({
      ...cuts.instructions[0],
      partId: 'fraction',
      partName: 'Fraction rail',
      cutLength: 10,
      cutWidth: 2.75,
      thickness: 0.75
    });
    expect(groupCutInstructions(cuts.instructions)).toHaveLength(2);
    const csv = exportCutListToCsv(cuts, 'imperial');
    expect.soft(csv).toContain('10.005');
    expect.soft(csv).toContain('2.74');
    expect(csv).toContain('0.74');
    expect(csv).toContain('2 3/4');
    expect(csv).toContain('3/4');
  });
  it.each(['cut-list', 'project-report'] as const)('K8 preserves metric precision in actual %s', async (kind) => {
    const pdf = await exportActual(fixture(false), kind, 'precision-metric', 'metric');
    for (const dimension of ['254.127mm', '69.596mm', '18.796mm']) {
      expect(pdf).toContain(`(${dimension})`);
      expect(exportCutListToCsv(fixture(false), 'metric')).toContain(dimension);
    }
    const blocks = pdf.match(/BT\n[\s\S]*?\nET/g)!;
    const dimensionIndex = blocks.findIndex((block) => block.includes('(18.796mm) Tj'));
    const block = blocks[dimensionIndex];
    const fontSize = Number(block.match(/\/F\d+ ([\d.]+) Tf/)![1]);
    const x = Number(block.match(/([\d.]+) [\d.]+ Td/)![1]);
    const stockX = Number(blocks[dimensionIndex + 1].match(/([\d.]+) [\d.]+ Td/)![1]);
    const measurement = new jsPDF({ unit: 'pt' });
    measurement.setFontSize(fontSize);
    expect(x + measurement.getTextWidth('18.796mm')).toBeLessThanOrEqual(stockX - 4);
  });
});
