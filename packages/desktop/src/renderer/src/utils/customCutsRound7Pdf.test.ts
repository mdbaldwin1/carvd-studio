import { describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import jsPDF from 'jspdf';
import { createTestPart, createTestStock } from '../../../../tests/helpers/factories';
import { generateOptimizedCutList } from './cutListOptimizer';
import { exportCutListToPdf, exportProjectReportToPdf } from './pdfExport';
import { formatFabricationMeasurement } from './fractions';

vi.unmock('jspdf');
describe('L3 actual PDF blank-table geometry', () => {
  for (const kind of ['cut-list', 'project-report'] as const)
    for (const units of ['imperial', 'metric'] as const)
      it.each([false, true])(
        `${kind} ${units}, long grouped names=%s preserves precision without overlapping`,
        async (long) => {
          const stock = createTestStock({ length: 48, width: 4, thickness: 1 });
          const parts = [0, 1, 2].map((index) =>
            createTestPart({
              id: `rail-${index}`,
              name: long
                ? `Precisely dimensioned cabinet door rail number ${index === 2 ? 2 : 1}`
                : `Rail ${index === 2 ? 2 : 1}`,
              stockId: stock.id,
              length: 10 + 1 / 3 + (index === 2 ? 1 : 0),
              width: 2 + 2 / 3,
              thickness: 2 / 3
            })
          );
          const cuts = generateOptimizedCutList(parts, [stock], 0.125, 0, '', []);
          let bytes: number[] = [];
          window.electronAPI.showSaveDialog = vi
            .fn()
            .mockResolvedValue({ canceled: false, filePath: '/tmp/carvd-round7.pdf' });
          window.electronAPI.writeBinaryFile = vi.fn(async (_path, data) => {
            bytes = data;
          });
          const options = { projectName: 'Precise blank dimensions', units, customShoppingItems: [] };
          const result =
            kind === 'cut-list'
              ? await exportCutListToPdf(cuts, options)
              : await exportProjectReportToPdf(cuts, options);
          expect(result.success).toBe(true);
          if (process.env.CARVD_PDF_QA_DIR)
            writeFileSync(
              join(process.env.CARVD_PDF_QA_DIR, `round7-${kind}-${units}-${long ? 'long' : 'short'}.pdf`),
              new Uint8Array(bytes)
            );
          const pdf = new globalThis.TextDecoder('latin1').decode(new Uint8Array(bytes));
          const blocks = [...pdf.matchAll(/BT\n([\s\S]*?)\nET/g)].map((match) => {
            const block = match[1];
            const position = block.match(/([\d.]+) ([\d.]+) Td/)!;
            const font = block.match(/\/F(\d+) ([\d.]+) Tf/)!;
            return {
              stream: pdf.slice(0, match.index).split('endstream').length,
              text: block.match(/\((.*)\) Tj/)?.[1] ?? '',
              x: Number(position?.[1]),
              y: Number(position?.[2]),
              font: Number(font?.[1]),
              size: Number(font?.[2])
            };
          });
          const headerIndex = blocks.findIndex((block) => block.text === 'Part IDs + Names');
          expect(headerIndex).toBeGreaterThan(0);
          const header = blocks
            .slice(headerIndex - 1, headerIndex + 6)
            .filter((block) => block.y === blocks[headerIndex].y);
          const measurement = new jsPDF({ unit: 'pt' });
          const assertRow = (row: typeof blocks) => {
            for (let index = 0; index < row.length; index++) {
              const item = row[index];
              measurement.setFont('helvetica', item.font === 2 ? 'bold' : 'normal');
              measurement.setFontSize(item.size);
              const right = item.x + measurement.getTextWidth(item.text);
              expect.soft(right, `right edge of ${item.text}`).toBeLessThanOrEqual(572);
              if (index < row.length - 1)
                expect
                  .soft(right + 4, `${item.text} must not touch ${row[index + 1].text}`)
                  .toBeLessThanOrEqual(row[index + 1].x);
            }
          };
          assertRow(header);
          const table = blocks.filter((block) => block.stream === blocks[headerIndex].stream);
          const names = table.filter((block) => block.text.startsWith('#') && block.x === blocks[headerIndex].x);
          expect(names).toHaveLength(2);
          for (const name of names) assertRow(table.filter((block) => block.y === name.y && block.x >= name.x));
          for (const detail of table.filter((block) => block.text.startsWith('Blank L:'))) {
            assertRow(table.filter((block) => block.y === detail.y && block.x >= detail.x));
          }
          for (const value of [10 + 1 / 3, 11 + 1 / 3, 2 + 2 / 3, 2 / 3]) {
            const exact = formatFabricationMeasurement(value, units);
            expect(pdf).toContain(exact);
          }
        }
      );
});
