import { describe, it, expect } from 'vitest';
import {
  getPartBounds,
  getPartBoundsAtPosition,
  getNearestParts,
  calculateSnapThreshold,
  type PartBounds
} from './snapToPartsUtil';
import type { Part } from '../types';

// Helper to create a test part
function createTestPart(overrides: Partial<Part> = {}): Part {
  return {
    id: 'test-part',
    name: 'Test Part',
    length: 10,
    width: 5,
    thickness: 1,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    stockId: null,
    grainSensitive: false,
    grainDirection: 'length',
    color: '#ff0000',
    ...overrides
  };
}

describe('snapToPartsUtil', () => {
  describe('getPartBounds', () => {
    it('calculates bounds for unrotated part', () => {
      const part = createTestPart({
        length: 10,
        width: 6,
        thickness: 2,
        position: { x: 0, y: 0, z: 0 }
      });

      const bounds = getPartBounds(part);

      expect(bounds.minX).toBeCloseTo(-5, 5);
      expect(bounds.maxX).toBeCloseTo(5, 5);
      expect(bounds.minY).toBeCloseTo(-1, 5);
      expect(bounds.maxY).toBeCloseTo(1, 5);
      expect(bounds.minZ).toBeCloseTo(-3, 5);
      expect(bounds.maxZ).toBeCloseTo(3, 5);
      expect(bounds.centerX).toBeCloseTo(0, 5);
      expect(bounds.centerY).toBeCloseTo(0, 5);
      expect(bounds.centerZ).toBeCloseTo(0, 5);
    });

    it('calculates bounds for part at offset position', () => {
      const part = createTestPart({
        length: 10,
        width: 6,
        thickness: 2,
        position: { x: 20, y: 5, z: -10 }
      });

      const bounds = getPartBounds(part);

      expect(bounds.centerX).toBeCloseTo(20, 5);
      expect(bounds.centerY).toBeCloseTo(5, 5);
      expect(bounds.centerZ).toBeCloseTo(-10, 5);
      expect(bounds.minX).toBeCloseTo(15, 5);
      expect(bounds.maxX).toBeCloseTo(25, 5);
    });

    it('handles rotated parts (90° around Y)', () => {
      const part = createTestPart({
        length: 10,
        width: 6,
        thickness: 2,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 90, z: 0 } // 90° rotation around Y axis
      });

      const bounds = getPartBounds(part);

      // After 90° rotation around Y, length becomes depth
      expect(bounds.id).toBe('test-part');
      // Bounds should still contain the part
      expect(bounds.maxX - bounds.minX).toBeGreaterThan(0);
      expect(bounds.maxY - bounds.minY).toBeGreaterThan(0);
      expect(bounds.maxZ - bounds.minZ).toBeGreaterThan(0);
    });

    it('handles parts with zero position', () => {
      const part = createTestPart({
        position: { x: 0, y: 0, z: 0 }
      });

      const bounds = getPartBounds(part);

      expect(bounds.centerX).toBe(0);
      expect(bounds.centerY).toBe(0);
      expect(bounds.centerZ).toBe(0);
    });
  });

  describe('getPartBoundsAtPosition', () => {
    it('calculates bounds at hypothetical position', () => {
      const part = createTestPart({
        position: { x: 0, y: 0, z: 0 }
      });

      const bounds = getPartBoundsAtPosition(part, { x: 10, y: 5, z: -3 });

      expect(bounds.centerX).toBeCloseTo(10, 5);
      expect(bounds.centerY).toBeCloseTo(5, 5);
      expect(bounds.centerZ).toBeCloseTo(-3, 5);
    });

    it('does not modify original part', () => {
      const part = createTestPart({
        position: { x: 0, y: 0, z: 0 }
      });

      getPartBoundsAtPosition(part, { x: 100, y: 100, z: 100 });

      expect(part.position.x).toBe(0);
      expect(part.position.y).toBe(0);
      expect(part.position.z).toBe(0);
    });
  });

  describe('getNearestParts', () => {
    it('returns nearest parts sorted by distance', () => {
      const draggingPart = createTestPart({
        id: 'dragging',
        position: { x: 0, y: 0, z: 0 }
      });

      const allParts = [
        createTestPart({ id: 'far', position: { x: 100, y: 0, z: 0 } }),
        createTestPart({ id: 'near', position: { x: 5, y: 0, z: 0 } }),
        createTestPart({ id: 'medium', position: { x: 20, y: 0, z: 0 } })
      ];

      const draggingBounds = getPartBounds(draggingPart);
      const nearest = getNearestParts(draggingBounds, allParts, ['dragging'], 10);

      // Should be sorted by distance
      expect(nearest[0].id).toBe('near');
      expect(nearest[1].id).toBe('medium');
      expect(nearest[2].id).toBe('far');
    });

    it('excludes dragging parts from results', () => {
      const draggingPart = createTestPart({
        id: 'dragging',
        position: { x: 0, y: 0, z: 0 }
      });

      const allParts = [
        createTestPart({ id: 'dragging', position: { x: 0, y: 0, z: 0 } }),
        createTestPart({ id: 'other', position: { x: 5, y: 0, z: 0 } })
      ];

      const draggingBounds = getPartBounds(draggingPart);
      const nearest = getNearestParts(draggingBounds, allParts, ['dragging'], 10);

      expect(nearest).toHaveLength(1);
      expect(nearest[0].id).toBe('other');
    });

    it('respects maxParts limit', () => {
      const draggingPart = createTestPart({
        id: 'dragging',
        position: { x: 0, y: 0, z: 0 }
      });

      const allParts = Array.from({ length: 20 }, (_, i) =>
        createTestPart({ id: `part-${i}`, position: { x: i * 10, y: 0, z: 0 } })
      );

      const draggingBounds = getPartBounds(draggingPart);
      const nearest = getNearestParts(draggingBounds, allParts, ['dragging'], 5);

      expect(nearest).toHaveLength(5);
    });

    it('calculates 3D distance correctly', () => {
      const draggingPart = createTestPart({
        id: 'dragging',
        position: { x: 0, y: 0, z: 0 }
      });

      const allParts = [
        // Distance = sqrt(3^2 + 4^2 + 0^2) = 5
        createTestPart({ id: 'diagonal-xy', position: { x: 3, y: 4, z: 0 } }),
        // Distance = sqrt(1^2 + 1^2 + 1^2) = 1.73
        createTestPart({ id: 'diagonal-xyz', position: { x: 1, y: 1, z: 1 } }),
        // Distance = 10
        createTestPart({ id: 'far-x', position: { x: 10, y: 0, z: 0 } })
      ];

      const draggingBounds = getPartBounds(draggingPart);
      const nearest = getNearestParts(draggingBounds, allParts, ['dragging'], 10);

      // Should be sorted: diagonal-xyz (1.73), diagonal-xy (5), far-x (10)
      expect(nearest[0].id).toBe('diagonal-xyz');
      expect(nearest[1].id).toBe('diagonal-xy');
      expect(nearest[2].id).toBe('far-x');
    });

    it('handles empty part list', () => {
      const draggingPart = createTestPart({
        id: 'dragging',
        position: { x: 0, y: 0, z: 0 }
      });

      const draggingBounds = getPartBounds(draggingPart);
      const nearest = getNearestParts(draggingBounds, [], ['dragging'], 10);

      expect(nearest).toHaveLength(0);
    });
  });

  describe('calculateSnapThreshold', () => {
    it('returns base threshold at normal distance', () => {
      const threshold = calculateSnapThreshold(50); // BASE_DISTANCE
      expect(threshold).toBeCloseTo(0.5, 2); // BASE_THRESHOLD
    });

    it('returns smaller threshold when zoomed in', () => {
      const threshold = calculateSnapThreshold(25); // Half the base distance
      expect(threshold).toBeCloseTo(0.25, 2); // Half the base threshold
    });

    it('returns larger threshold when zoomed out', () => {
      const threshold = calculateSnapThreshold(100); // Double the base distance
      expect(threshold).toBeCloseTo(1.0, 2); // Double the base threshold
    });

    it('clamps to minimum threshold', () => {
      const threshold = calculateSnapThreshold(1); // Very close
      expect(threshold).toBeGreaterThanOrEqual(0.125); // MIN_THRESHOLD
    });

    it('clamps to maximum threshold', () => {
      const threshold = calculateSnapThreshold(1000); // Very far
      expect(threshold).toBeLessThanOrEqual(2); // MAX_THRESHOLD
    });

    it('scales proportionally in mid-range', () => {
      const threshold1 = calculateSnapThreshold(50);
      const threshold2 = calculateSnapThreshold(100);

      // Threshold should double when distance doubles
      expect(threshold2).toBeCloseTo(threshold1 * 2, 1);
    });

    it('handles zero distance gracefully', () => {
      const threshold = calculateSnapThreshold(0);
      expect(threshold).toBeGreaterThan(0);
      expect(threshold).toBeLessThanOrEqual(2);
    });
  });

  describe('integration: bounds and nearest parts', () => {
    it('works together for snap detection scenario', () => {
      // Create a scenario with multiple parts
      const draggingPart = createTestPart({
        id: 'dragging',
        length: 10,
        width: 5,
        thickness: 1,
        position: { x: 0, y: 0, z: 0 }
      });

      const allParts = [
        // Close part that should snap
        createTestPart({
          id: 'snap-target',
          length: 10,
          width: 5,
          thickness: 1,
          position: { x: 10.3, y: 0, z: 0 } // Within snap threshold
        }),
        // Far part that shouldn't affect snapping
        createTestPart({
          id: 'far-part',
          length: 10,
          width: 5,
          thickness: 1,
          position: { x: 100, y: 0, z: 0 }
        })
      ];

      const draggingBounds = getPartBounds(draggingPart);
      const nearest = getNearestParts(draggingBounds, allParts, ['dragging'], 10);

      // Should find the snap target first
      expect(nearest[0].id).toBe('snap-target');

      // Calculate snap threshold at normal viewing distance
      const threshold = calculateSnapThreshold(50);
      expect(threshold).toBeGreaterThan(0);
    });
  });
});
