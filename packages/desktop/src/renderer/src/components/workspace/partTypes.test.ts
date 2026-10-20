import { describe, it, expect } from 'vitest';
import {
  HANDLE_POSITIONS,
  HANDLE_SIZE,
  RESIZE_COLORS,
  ROTATION_HANDLE_SIZE,
  ROTATION_RING_THICKNESS,
  ROTATION_COLORS,
  GRAIN_ARROW_MAX_DISTANCE_SQ,
  resolveLiveGridReleasePosition,
  snapToGrid
} from './partTypes';

// ============================================================
// Tests
// ============================================================

describe('partTypes', () => {
  describe('the project grid', () => {
    it('rounds to whatever increment the project carries', () => {
      // Grid Size used to govern only arrow-key nudging: dragging, resizing
      // and the drawn grid were all pinned to a sixteenth regardless.
      expect(snapToGrid(3.92, 1 / 4)).toBeCloseTo(4);
      expect(snapToGrid(3.92, 1 / 8)).toBeCloseTo(3.875);
      expect(snapToGrid(3.92, 1 / 32)).toBeCloseTo(3.90625);
    });

    it('falls back to the sixteenth for a caller with no project in hand', () => {
      expect(snapToGrid(3.92)).toBeCloseTo(snapToGrid(3.92, 1 / 16));
    });

    it('ignores a nonsensical increment rather than dividing by zero', () => {
      expect(snapToGrid(3.92, 0)).toBeCloseTo(snapToGrid(3.92, 1 / 16));
      expect(snapToGrid(3.92, -1)).toBeCloseTo(snapToGrid(3.92, 1 / 16));
    });

    it('carries the increment through to the release position', () => {
      const free = { x: false, y: false, z: false };
      expect(resolveLiveGridReleasePosition({ x: 3.92, y: 1.1, z: 0.3 }, free, true, 1 / 4)).toEqual({
        x: 4,
        y: 1,
        z: 0.25
      });
    });
  });

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

  describe('resolveLiveGridReleasePosition', () => {
    it('preserves part-snapped axes and rounds only unsnapped axes', () => {
      expect(
        resolveLiveGridReleasePosition({ x: 4.03, y: 2.41, z: 4.07 }, { x: true, y: false, z: true }, true)
      ).toEqual({ x: 4.03, y: 2.4375, z: 4.07 });
    });

    it('preserves every axis when live grid snapping is disabled', () => {
      expect(
        resolveLiveGridReleasePosition({ x: 4.03, y: 2.41, z: 4.07 }, { x: false, y: false, z: false }, false)
      ).toEqual({ x: 4.03, y: 2.41, z: 4.07 });
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

it('preserves coordinates outside the drag plane during grid release', () => {
  for (const fixed of ['x', 'y', 'z'] as const) {
    const axes = { x: true, y: true, z: true, [fixed]: false };
    const result = resolveLiveGridReleasePosition(
      { x: 0.375, y: 0.375, z: 0.375 },
      { x: false, y: false, z: false },
      true,
      1,
      axes
    );
    expect(result[fixed]).toBe(0.375);
    for (const axis of ['x', 'y', 'z'] as const) if (axis !== fixed) expect(result[axis]).toBe(0);
  }
});
