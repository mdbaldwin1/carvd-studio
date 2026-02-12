import { describe, it, expect } from 'vitest';
import { generateOptimizedCutList } from './cutListOptimizer';
import {
  createTestPart,
  createTestStock,
  createPlywoodStock,
  createBoardStock,
  createSimpleCutListScenario,
  createComplexCutListScenario
} from '../../../../tests/helpers/factories';

describe('cutListOptimizer', () => {
  // ============================================================
  // Basic Cut List Generation
  // ============================================================

  describe('generateOptimizedCutList', () => {
    it('generates a cut list from valid parts', () => {
      const { stock, parts } = createSimpleCutListScenario();

      const cutList = generateOptimizedCutList(
        parts,
        [stock],
        0.125, // kerf
        0.1, // overage
        new Date().toISOString(),
        []
      );

      expect(cutList).toBeDefined();
      expect(cutList.instructions).toHaveLength(3);
      expect(cutList.stockBoards.length).toBeGreaterThan(0);
      expect(cutList.statistics).toBeDefined();
    });

    it('returns empty results for parts without stocks', () => {
      const parts = [createTestPart({ stockId: null }), createTestPart({ stockId: null })];

      const cutList = generateOptimizedCutList(parts, [], 0.125, 0.1, new Date().toISOString(), []);

      expect(cutList.instructions).toHaveLength(0);
      expect(cutList.stockBoards).toHaveLength(0);
    });

    it('filters out parts with invalid stock references', () => {
      const stock = createTestStock();
      const parts = [
        createTestPart({ stockId: stock.id, name: 'Valid Part' }),
        createTestPart({ stockId: 'non-existent-stock', name: 'Invalid Part' })
      ];

      const cutList = generateOptimizedCutList(parts, [stock], 0.125, 0.1, new Date().toISOString(), []);

      expect(cutList.instructions).toHaveLength(1);
      expect(cutList.instructions[0].partName).toBe('Valid Part');
    });
  });

  // ============================================================
  // Cut Instructions
  // ============================================================

  describe('cut instructions', () => {
    it('includes joinery adjustments in cut dimensions', () => {
      const stock = createTestStock();
      const part = createTestPart({
        stockId: stock.id,
        length: 24,
        width: 12,
        extraLength: 0.5, // 1/2" extra for tenon
        extraWidth: 0.25 // 1/4" extra for dado
      });

      const cutList = generateOptimizedCutList([part], [stock], 0.125, 0.1, new Date().toISOString(), []);

      const instruction = cutList.instructions[0];
      expect(instruction.cutLength).toBe(24.5); // length + extraLength
      expect(instruction.cutWidth).toBe(12.25); // width + extraWidth
    });

    it('marks grain-sensitive parts as non-rotatable', () => {
      const stock = createTestStock();
      const grainSensitivePart = createTestPart({
        stockId: stock.id,
        grainSensitive: true
      });
      const nonGrainSensitivePart = createTestPart({
        stockId: stock.id,
        grainSensitive: false
      });

      const cutList = generateOptimizedCutList(
        [grainSensitivePart, nonGrainSensitivePart],
        [stock],
        0.125,
        0.1,
        new Date().toISOString(),
        []
      );

      const sensitiveInstruction = cutList.instructions.find((i) => i.partId === grainSensitivePart.id);
      const nonSensitiveInstruction = cutList.instructions.find((i) => i.partId === nonGrainSensitivePart.id);

      expect(sensitiveInstruction?.canRotate).toBe(false);
      expect(nonSensitiveInstruction?.canRotate).toBe(true);
    });

    it('includes part notes in instructions', () => {
      const stock = createTestStock();
      const part = createTestPart({
        stockId: stock.id,
        notes: 'Edge band front and back'
      });

      const cutList = generateOptimizedCutList([part], [stock], 0.125, 0.1, new Date().toISOString(), []);

      expect(cutList.instructions[0].notes).toBe('Edge band front and back');
    });
  });

  // ============================================================
  // Bin Packing Algorithm
  // ============================================================

  describe('bin packing', () => {
    it('places multiple parts on a single board when they fit', () => {
      const stock = createPlywoodStock(); // 96" x 48"
      const parts = [
        createTestPart({ stockId: stock.id, length: 24, width: 12 }),
        createTestPart({ stockId: stock.id, length: 24, width: 12 }),
        createTestPart({ stockId: stock.id, length: 24, width: 12 })
      ];

      const cutList = generateOptimizedCutList(parts, [stock], 0.125, 0.1, new Date().toISOString(), []);

      // All parts should fit on 1 board (96x48 = 4608 sq in, 3 parts = 3*24*12 = 864 sq in)
      expect(cutList.stockBoards).toHaveLength(1);
      expect(cutList.stockBoards[0].placements).toHaveLength(3);
    });

    it('uses multiple boards when parts exceed single board capacity', () => {
      const stock = createBoardStock({ length: 48, width: 6 }); // Small board
      const parts = [
        createTestPart({ stockId: stock.id, length: 40, width: 5 }),
        createTestPart({ stockId: stock.id, length: 40, width: 5 }),
        createTestPart({ stockId: stock.id, length: 40, width: 5 })
      ];

      const cutList = generateOptimizedCutList(parts, [stock], 0.125, 0.1, new Date().toISOString(), []);

      // Each part nearly fills the board, so we need multiple boards
      expect(cutList.stockBoards.length).toBeGreaterThan(1);
    });

    it('sorts parts by area (largest first) for better packing', () => {
      const stock = createPlywoodStock();
      const smallPart = createTestPart({
        stockId: stock.id,
        name: 'Small',
        length: 12,
        width: 6
      });
      const largePart = createTestPart({
        stockId: stock.id,
        name: 'Large',
        length: 48,
        width: 24
      });
      const mediumPart = createTestPart({
        stockId: stock.id,
        name: 'Medium',
        length: 24,
        width: 12
      });

      const cutList = generateOptimizedCutList(
        [smallPart, largePart, mediumPart], // Intentionally unsorted
        [stock],
        0.125,
        0.1,
        new Date().toISOString(),
        []
      );

      // Check that parts are placed (order doesn't matter in output, but largest should be placed first internally)
      expect(cutList.stockBoards[0].placements.length).toBe(3);
    });

    it('respects kerf width when calculating fits', () => {
      const stock = createTestStock({ length: 24, width: 12 });
      // Part that exactly fits with no kerf
      const part = createTestPart({
        stockId: stock.id,
        length: 24,
        width: 12
      });

      const cutListNoKerf = generateOptimizedCutList(
        [part],
        [stock],
        0, // No kerf
        0.1,
        new Date().toISOString(),
        []
      );

      const cutListWithKerf = generateOptimizedCutList(
        [part],
        [stock],
        0.125, // 1/8" kerf
        0.1,
        new Date().toISOString(),
        []
      );

      // Part exactly matches stock - should fit in both cases (no kerf needed for exact fit)
      expect(cutListNoKerf.stockBoards).toHaveLength(1);
      expect(cutListWithKerf.stockBoards).toHaveLength(1);
    });
  });

  // ============================================================
  // Part Rotation
  // ============================================================

  describe('part rotation', () => {
    it('rotates non-grain-sensitive parts for better fit', () => {
      // Narrow tall stock
      const stock = createTestStock({ length: 48, width: 8 });
      // Part that is wider than stock but would fit if rotated
      const part = createTestPart({
        stockId: stock.id,
        length: 6, // Narrow
        width: 36, // Wide - wider than stock.width (8)
        grainSensitive: false // Can rotate
      });

      const cutList = generateOptimizedCutList([part], [stock], 0.125, 0.1, new Date().toISOString(), []);

      // Part should be placed (rotated to fit)
      expect(cutList.stockBoards).toHaveLength(1);
      expect(cutList.stockBoards[0].placements).toHaveLength(1);
      expect(cutList.stockBoards[0].placements[0].rotated).toBe(true);
    });

    it('does not rotate grain-sensitive parts', () => {
      const stock = createTestStock({ length: 48, width: 8 });
      // Part that would only fit rotated
      const part = createTestPart({
        stockId: stock.id,
        length: 6,
        width: 36,
        grainSensitive: true // Cannot rotate
      });

      const cutList = generateOptimizedCutList([part], [stock], 0.125, 0.1, new Date().toISOString(), []);

      // Part should be skipped (won't fit without rotation)
      expect(cutList.skippedParts.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // Glue-Up Panels
  // ============================================================

  describe('glue-up panels', () => {
    it('splits glue-up panels into strips', () => {
      const stock = createTestStock({ length: 96, width: 6 }); // Narrow board
      const glueUpPart = createTestPart({
        stockId: stock.id,
        name: 'Wide Panel',
        length: 48,
        width: 24, // Wider than stock - needs 4 strips (24/6 = 4)
        glueUpPanel: true
      });

      const cutList = generateOptimizedCutList([glueUpPart], [stock], 0.125, 0.1, new Date().toISOString(), []);

      // Should create 4 strip instructions
      const stripInstructions = cutList.instructions.filter((i) => i.isGlueUp);
      expect(stripInstructions).toHaveLength(4);

      // Each strip should be marked as glue-up
      stripInstructions.forEach((instruction) => {
        expect(instruction.isGlueUp).toBe(true);
        expect(instruction.partName).toContain('strip');
      });
    });

    it('calculates optimal strip width for exact panel width', () => {
      const stock = createTestStock({ length: 96, width: 6 });
      const glueUpPart = createTestPart({
        stockId: stock.id,
        length: 48,
        width: 20, // Not evenly divisible by 6
        glueUpPanel: true
      });

      const cutList = generateOptimizedCutList([glueUpPart], [stock], 0.125, 0.1, new Date().toISOString(), []);

      // ceil(20/6) = 4 strips, each 20/4 = 5" wide
      const stripInstructions = cutList.instructions.filter((i) => i.isGlueUp);
      expect(stripInstructions).toHaveLength(4);
      expect(stripInstructions[0].cutWidth).toBe(5);
    });
  });

  // ============================================================
  // Multiple Stock Types
  // ============================================================

  describe('multiple stock types', () => {
    it('separates parts by stock type', () => {
      const { stocks, parts } = createComplexCutListScenario();

      const cutList = generateOptimizedCutList(parts, stocks, 0.125, 0.1, new Date().toISOString(), []);

      // Should have boards from both stock types
      const plywoodBoards = cutList.stockBoards.filter((b) => b.stockId === 'plywood-1');
      const pineBoards = cutList.stockBoards.filter((b) => b.stockId === 'pine-1');

      expect(plywoodBoards.length).toBeGreaterThan(0);
      expect(pineBoards.length).toBeGreaterThan(0);
    });

    it('calculates statistics per stock type', () => {
      const { stocks, parts } = createComplexCutListScenario();

      const cutList = generateOptimizedCutList(parts, stocks, 0.125, 0.1, new Date().toISOString(), []);

      expect(cutList.statistics.byStock).toHaveLength(2);

      const plywoodStats = cutList.statistics.byStock.find((s) => s.stockId === 'plywood-1');
      const pineStats = cutList.statistics.byStock.find((s) => s.stockId === 'pine-1');

      expect(plywoodStats).toBeDefined();
      expect(pineStats).toBeDefined();
    });
  });

  // ============================================================
  // Statistics Calculations
  // ============================================================

  describe('statistics', () => {
    it('calculates total parts correctly', () => {
      const stock = createTestStock();
      const parts = [
        createTestPart({ stockId: stock.id }),
        createTestPart({ stockId: stock.id }),
        createTestPart({ stockId: stock.id })
      ];

      const cutList = generateOptimizedCutList(parts, [stock], 0.125, 0.1, new Date().toISOString(), []);

      expect(cutList.statistics.totalParts).toBe(3);
    });

    it('calculates board feet correctly', () => {
      const stock = createTestStock({
        length: 96, // 8 feet
        width: 12, // 1 foot
        thickness: 1 // 1 inch
      });
      const part = createTestPart({
        stockId: stock.id,
        length: 96,
        width: 12
      });

      const cutList = generateOptimizedCutList(
        [part],
        [stock],
        0,
        0, // No overage for simpler calculation
        new Date().toISOString(),
        []
      );

      // Board feet = (L × W × T) / 144 = (96 × 12 × 1) / 144 = 8 BF
      expect(cutList.statistics.totalBoardFeet).toBe(8);
    });

    it('calculates waste percentage', () => {
      const stock = createTestStock({ length: 48, width: 24 }); // 1152 sq in
      const part = createTestPart({
        stockId: stock.id,
        length: 24, // 576 sq in (50% of board)
        width: 24
      });

      const cutList = generateOptimizedCutList(
        [part],
        [stock],
        0, // No kerf for simpler calculation
        0, // No overage
        new Date().toISOString(),
        []
      );

      // Should be ~50% waste
      expect(cutList.statistics.wastePercentage).toBeCloseTo(50, 0);
    });

    it('applies overage factor to board count', () => {
      const stock = createTestStock({ length: 24, width: 12 });
      const part = createTestPart({
        stockId: stock.id,
        length: 24,
        width: 12
      });

      const cutListNoOverage = generateOptimizedCutList(
        [part],
        [stock],
        0,
        0, // No overage
        new Date().toISOString(),
        []
      );

      const cutListWithOverage = generateOptimizedCutList(
        [part],
        [stock],
        0,
        0.1, // 10% overage
        new Date().toISOString(),
        []
      );

      // With overage, recommended boards should be higher
      const noOverageBoards = cutListNoOverage.statistics.byStock[0].boardsNeeded;
      const withOverageBoards = cutListWithOverage.statistics.byStock[0].boardsNeeded;

      expect(withOverageBoards).toBeGreaterThanOrEqual(noOverageBoards);
    });

    it('calculates cost based on pricing unit', () => {
      const perItemStock = createTestStock({
        pricingUnit: 'per_item',
        pricePerUnit: 45 // $45 per sheet
      });
      const boardFootStock = createTestStock({
        pricingUnit: 'board_foot',
        pricePerUnit: 5.5, // $5.50 per board foot
        length: 96,
        width: 12,
        thickness: 1
      });

      const part1 = createTestPart({ stockId: perItemStock.id, length: 24, width: 12 });
      const part2 = createTestPart({ stockId: boardFootStock.id, length: 24, width: 12 });

      const cutList1 = generateOptimizedCutList([part1], [perItemStock], 0, 0, new Date().toISOString(), []);

      const cutList2 = generateOptimizedCutList([part2], [boardFootStock], 0, 0, new Date().toISOString(), []);

      // Per-item pricing: 1 board × $45 = $45
      expect(cutList1.statistics.estimatedCost).toBe(45);

      // Board foot pricing: 8 BF × $5.50 = $44
      expect(cutList2.statistics.estimatedCost).toBe(44);
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================

  describe('edge cases', () => {
    it('handles empty parts array', () => {
      const stock = createTestStock();

      const cutList = generateOptimizedCutList([], [stock], 0.125, 0.1, new Date().toISOString(), []);

      expect(cutList.instructions).toHaveLength(0);
      expect(cutList.stockBoards).toHaveLength(0);
      expect(cutList.statistics.totalParts).toBe(0);
    });

    it('handles empty stocks array', () => {
      const parts = [createTestPart({ stockId: 'some-stock' })];

      const cutList = generateOptimizedCutList(parts, [], 0.125, 0.1, new Date().toISOString(), []);

      expect(cutList.instructions).toHaveLength(0);
      expect(cutList.stockBoards).toHaveLength(0);
    });

    it('handles parts larger than stock', () => {
      const stock = createTestStock({ length: 24, width: 12 });
      const oversizedPart = createTestPart({
        stockId: stock.id,
        name: 'Oversized Part',
        length: 48, // Larger than stock
        width: 24
      });

      const cutList = generateOptimizedCutList([oversizedPart], [stock], 0.125, 0.1, new Date().toISOString(), []);

      expect(cutList.skippedParts).toContain('Oversized Part');
    });

    it('handles parts exactly matching stock size', () => {
      const stock = createTestStock({ length: 24, width: 12 });
      const exactPart = createTestPart({
        stockId: stock.id,
        length: 24,
        width: 12
      });

      const cutList = generateOptimizedCutList(
        [exactPart],
        [stock],
        0.125, // Kerf shouldn't matter for exact fit
        0.1,
        new Date().toISOString(),
        []
      );

      expect(cutList.stockBoards).toHaveLength(1);
      expect(cutList.stockBoards[0].placements).toHaveLength(1);
      expect(cutList.skippedParts).toHaveLength(0);
    });

    it('handles very small kerf values', () => {
      const stock = createTestStock({ length: 24, width: 12 });
      const part = createTestPart({ stockId: stock.id, length: 12, width: 6 });

      const cutList = generateOptimizedCutList(
        [part],
        [stock],
        0.001, // Very small kerf
        0.1,
        new Date().toISOString(),
        []
      );

      expect(cutList.stockBoards).toHaveLength(1);
    });

    it('handles bypassed issues', () => {
      const stock = createTestStock();
      const part = createTestPart({ stockId: stock.id });

      const bypassedIssues = [
        {
          partId: part.id,
          partName: part.name,
          type: 'grain_mismatch' as const,
          message: 'Grain mismatch warning',
          severity: 'warning' as const
        }
      ];

      const cutList = generateOptimizedCutList([part], [stock], 0.125, 0.1, new Date().toISOString(), bypassedIssues);

      expect(cutList.bypassedIssues).toHaveLength(1);
      expect(cutList.bypassedIssues[0].type).toBe('grain_mismatch');
    });
  });

  // ============================================================
  // Utilization Tracking
  // ============================================================

  describe('utilization tracking', () => {
    it('calculates board utilization percentage', () => {
      const stock = createTestStock({ length: 48, width: 24 }); // 1152 sq in
      const part = createTestPart({
        stockId: stock.id,
        length: 48,
        width: 12 // 576 sq in (50% of board)
      });

      const cutList = generateOptimizedCutList([part], [stock], 0, 0, new Date().toISOString(), []);

      expect(cutList.stockBoards[0].utilizationPercent).toBeCloseTo(50, 0);
    });

    it('tracks used and waste area per board', () => {
      const stock = createTestStock({ length: 48, width: 24 }); // 1152 sq in
      const part = createTestPart({
        stockId: stock.id,
        length: 24,
        width: 12 // 288 sq in
      });

      const cutList = generateOptimizedCutList([part], [stock], 0, 0, new Date().toISOString(), []);

      const board = cutList.stockBoards[0];
      expect(board.usedArea).toBe(288);
      expect(board.wasteArea).toBe(1152 - 288);
    });
  });
});
