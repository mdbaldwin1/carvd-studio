import { describe, it, expect } from 'vitest';
import {
  HANDLE_POSITIONS,
  HANDLE_SIZE,
  RESIZE_COLORS,
  ROTATION_HANDLE_SIZE,
  ROTATION_RING_THICKNESS,
  ROTATION_COLORS,
  GRAIN_ARROW_MAX_DISTANCE_SQ,
  snapToGrid
} from './partTypes';

// ============================================================
// Tests
// ============================================================

describe('partTypes', () => {
  describe('snapToGrid', () => {
    it('snaps exact grid values to themselves', () => {
      expect(snapToGrid(0)).toBe(0);
      expect(snapToGrid(1)).toBe(1);
      expect(snapToGrid(0.5)).toBe(0.5);
    });

    it('snaps to nearest 1/16 inch', () => {
      // GRID_SIZE = 1/16 = 0.0625
      // Math.round(0.03 / 0.0625) = Math.round(0.48) = 0
      expect(snapToGrid(0.03)).toBeCloseTo(0);
      // Math.round(0.04 / 0.0625) = Math.round(0.64) = 1 → 0.0625
      expect(snapToGrid(0.04)).toBeCloseTo(0.0625);
      // Math.round(0.09 / 0.0625) = Math.round(1.44) = 1 → 0.0625
      expect(snapToGrid(0.09)).toBeCloseTo(0.0625);
    });

    it('snaps negative values', () => {
      expect(snapToGrid(-0.03)).toBeCloseTo(0); // rounds toward 0
      expect(snapToGrid(-1)).toBe(-1);
      expect(snapToGrid(-0.5)).toBe(-0.5);
    });

    it('snaps to expected fractions', () => {
      // 1/4 inch = 4 grid units
      expect(snapToGrid(0.25)).toBeCloseTo(0.25);
      // 3/8 inch = 6 grid units
      expect(snapToGrid(0.375)).toBeCloseTo(0.375);
      // 3/4 inch = 12 grid units
      expect(snapToGrid(0.75)).toBeCloseTo(0.75);
    });

    it('handles large values', () => {
      expect(snapToGrid(100)).toBe(100);
      expect(snapToGrid(99.97)).toBeCloseTo(100); // 99.97 rounds to nearest 1/16
    });
  });

  describe('HANDLE_POSITIONS', () => {
    it('has 20 handle positions (8 corners + 12 edges)', () => {
      expect(HANDLE_POSITIONS).toHaveLength(20);
    });

    it('has 8 corners', () => {
      const corners = HANDLE_POSITIONS.filter((h) => h.type === 'corner');
      expect(corners).toHaveLength(8);
    });

    it('has 4 edge-x handles', () => {
      const edgeX = HANDLE_POSITIONS.filter((h) => h.type === 'edge-x');
      expect(edgeX).toHaveLength(4);
      // edge-x handles have x === 0
      edgeX.forEach((h) => expect(h.x).toBe(0));
    });

    it('has 4 edge-y handles', () => {
      const edgeY = HANDLE_POSITIONS.filter((h) => h.type === 'edge-y');
      expect(edgeY).toHaveLength(4);
      edgeY.forEach((h) => expect(h.y).toBe(0));
    });

    it('has 4 edge-z handles', () => {
      const edgeZ = HANDLE_POSITIONS.filter((h) => h.type === 'edge-z');
      expect(edgeZ).toHaveLength(4);
      edgeZ.forEach((h) => expect(h.z).toBe(0));
    });

    it('corner handles have all axes at ±1', () => {
      const corners = HANDLE_POSITIONS.filter((h) => h.type === 'corner');
      corners.forEach((c) => {
        expect(Math.abs(c.x)).toBe(1);
        expect(Math.abs(c.y)).toBe(1);
        expect(Math.abs(c.z)).toBe(1);
      });
    });
  });

  describe('constants', () => {
    it('HANDLE_SIZE is a positive number', () => {
      expect(HANDLE_SIZE).toBeGreaterThan(0);
    });

    it('ROTATION_HANDLE_SIZE is larger than HANDLE_SIZE', () => {
      expect(ROTATION_HANDLE_SIZE).toBeGreaterThan(HANDLE_SIZE);
    });

    it('ROTATION_RING_THICKNESS is positive', () => {
      expect(ROTATION_RING_THICKNESS).toBeGreaterThan(0);
    });

    it('GRAIN_ARROW_MAX_DISTANCE_SQ is the square of 150', () => {
      expect(GRAIN_ARROW_MAX_DISTANCE_SQ).toBe(150 * 150);
    });

    it('RESIZE_COLORS has corner, edge, and hover', () => {
      expect(RESIZE_COLORS.corner).toBeDefined();
      expect(RESIZE_COLORS.edge).toBeDefined();
      expect(RESIZE_COLORS.hover).toBeDefined();
    });

    it('ROTATION_COLORS has x, y, z, and hover', () => {
      expect(ROTATION_COLORS.x).toBeDefined();
      expect(ROTATION_COLORS.y).toBeDefined();
      expect(ROTATION_COLORS.z).toBeDefined();
      expect(ROTATION_COLORS.hover).toBeDefined();
    });
  });
});
