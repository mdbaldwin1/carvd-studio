import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import type { CarvdFile } from '../types';
import { generateOptimizedCutList } from './cutListOptimizer';
import { getInstructionFabricationLines } from './cutListInstructions';
import { exportCutListToCsv, exportShoppingListToCsv } from './pdfExport';
import { validatePartsForCutList } from '../store/projectStore';
import { validateCarvdFile } from './fileFormat';
vi.unmock('three');
const directory = mkdtempSync(join(tmpdir(), 'carvd-bench-purchases-'));
const filename = join(directory, 'bench.carvd');
execFileSync(process.execPath, ['scripts/make-joinery-test-project.cjs', filename], { stdio: 'pipe' });
const bench = JSON.parse(readFileSync(filename, 'utf8')) as CarvdFile;
afterAll(() => rmSync(directory, { recursive: true, force: true }));
const report = generateOptimizedCutList(bench.parts, bench.stocks, 0.125, 0.1, bench.project.modifiedAt, []);

describe('joinery bench purchasing and fabrication', () => {
  it('keeps every station valid with purchased hardware outside the lumber pipeline', () => {
    expect(bench.groups).toHaveLength(51);
    expect(validateCarvdFile(bench).errors).toEqual([]);
    expect(validatePartsForCutList(bench.parts, bench.stocks)).toEqual([]);
    expect(bench.stocks.some((stock) => /Steel|Shelf Pin|canvas/i.test(stock.name))).toBe(false);
    expect(
      bench.parts.some((part) => /Cross Dowel — (Bolt|Barrel)|Shelf Pins — Pin|Tambour — Canvas/.test(part.name))
    ).toBe(false);
    expect(report.instructions.some((cut) => /Steel|Shelf Pin|canvas/i.test(cut.stockName))).toBe(false);
    expect(report.stockBoards.some((stock) => /Steel|Shelf Pin|canvas/i.test(stock.stockName))).toBe(false);
    const bolt = bench.customShoppingItems!.filter((item) => /joint bolt/.test(item.name));
    expect(bolt).toHaveLength(1);
    expect(bolt[0].quantity).toBe(1);
    expect(bolt[0].description).toContain('head included');
    expect(bench.customShoppingItems!.find((item) => /shelf support pin/.test(item.name))!.quantity).toBe(2);
  });

  it('includes every omitted hardware and supply requirement in shopping exports', () => {
    const csv = exportShoppingListToCsv(report, bench.customShoppingItems!, 'imperial');
    for (const station of [
      '29 Cross Dowel',
      '53 Shelf Pins',
      '34 Pocket Hole',
      '47 Screwed Cleat',
      '46 Rule Joint',
      '49 Hinge Mortise',
      '17 Tambour'
    ]) {
      expect(csv).toContain(station);
    }
    expect(csv).toContain('Woodworking glue');
    expect(csv).toContain('canvas backing piece');
    expect(csv).toContain('Price not entered');
    const cuts = exportCutListToCsv(report, 'imperial');
    expect(cuts).not.toContain('Steel joint bolt shank');
    expect(cuts).not.toContain('Tambour — Canvas');
  });

  it('uses actual thin plywood and describes preparation for every thinner solid-wood blank', () => {
    const spline = bench.parts.find((part) => part.name === 'Splined Mitre — Spline')!;
    const stock = bench.stocks.find((stock) => stock.id === spline.stockId)!;
    expect(stock.form).toBe('sheet');
    expect(stock.thickness).toBe(0.125);
    expect(spline.thickness).toBe(stock.thickness);
    const thinParts = bench.parts.filter((part) => {
      const stock = bench.stocks.find((stock) => stock.id === part.stockId)!;
      return stock.form === 'board' && part.thickness < stock.thickness;
    });
    expect(thinParts).toHaveLength(16);
    for (const part of thinParts) {
      const instruction = report.instructions.find((cut) => cut.partId === part.id)!;
      expect(getInstructionFabricationLines(instruction, 'imperial').join('\n')).toContain('Stock preparation:');
      expect(instruction.notes).toContain('additional pieces recovered by resawing are not counted');
    }
    expect(exportCutListToCsv(report, 'imperial')).toContain('Stock preparation:');
  });

  it('preserves genuine wood dowels, bought inserts, factory shapes and runner grain', () => {
    expect(report.instructions.some((cut) => cut.partName === 'Dowel — Pin 1')).toBe(true);
    for (const name of ['Biscuit — #20', 'Domino — 6 × 20 × 40']) {
      const part = bench.parts.find((part) => part.name === name)!;
      expect(part.blankShape).toBe(name.startsWith('Biscuit') ? 'biscuit' : 'domino');
      expect(part.features).toEqual([]);
      expect(report.instructions.some((cut) => cut.partId === part.id)).toBe(false);
      expect(report.statistics.byStock.find((stock) => stock.stockId === part.stockId)!.insertsNeeded).toBe(1);
    }
    expect(report.instructions.find((cut) => cut.partName === 'T-Slot — Bar')!.canRotate).toBe(false);
  });
});
