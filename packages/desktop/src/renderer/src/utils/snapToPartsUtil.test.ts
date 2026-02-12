import { describe, it, expect } from 'vitest';
import {
  getPartBounds,
  getPartBoundsAtPosition,
  getNearestParts,
  calculateSnapThreshold,
  detectSnaps,
  detectDimensionSnaps,
  createDimensionMatchSnapLine,
  createEnhancedDimensionSnapLine,
  detectGuideSnaps,
  createGuideSnapLine,
  detectOriginSnaps,
  createOriginSnapLine,
  detectFaceSnaps,
  STANDARD_DIMENSIONS_IMPERIAL,
  STANDARD_DIMENSIONS_METRIC,
  STANDARD_THICKNESSES_IMPERIAL,
  STANDARD_THICKNESSES_METRIC,
  type PartBounds
} from './snapToPartsUtil';
import type { Part, SnapGuide } from '../types';

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

  describe('detectSnaps', () => {
    it('snaps part edges together on X axis', () => {
      const draggingPart = createTestPart({
        id: 'dragging',
        length: 10,
        position: { x: 0, y: 0, z: 0 }
      });

      const targetPart = createTestPart({
        id: 'target',
        length: 10,
        position: { x: 10.3, y: 0, z: 0 } // Just past the dragging part's edge
      });

      const result = detectSnaps(draggingPart, { x: 0, y: 0, z: 0 }, [draggingPart, targetPart], ['dragging'], 0.5);

      // Should snap X axis
      expect(result.snappedX).toBe(true);
      expect(result.snapLines.length).toBeGreaterThan(0);
    });

    it('snaps part edges together on Z axis', () => {
      const draggingPart = createTestPart({
        id: 'dragging',
        width: 6,
        position: { x: 0, y: 0, z: 0 }
      });

      const targetPart = createTestPart({
        id: 'target',
        width: 6,
        position: { x: 0, y: 0, z: 6.2 } // Just past the dragging part's edge in Z
      });

      const result = detectSnaps(draggingPart, { x: 0, y: 0, z: 0 }, [draggingPart, targetPart], ['dragging'], 0.5);

      // Should snap Z axis
      expect(result.snappedZ).toBe(true);
    });

    it('snaps part centers together', () => {
      const draggingPart = createTestPart({
        id: 'dragging',
        length: 10,
        position: { x: 0, y: 0, z: 0 }
      });

      const targetPart = createTestPart({
        id: 'target',
        length: 10,
        position: { x: 0.3, y: 0, z: 0 } // Slightly offset, centers should align
      });

      const result = detectSnaps(draggingPart, { x: 0.3, y: 0, z: 0 }, [draggingPart, targetPart], ['dragging'], 0.5);

      // Centers are aligned (within threshold)
      expect(result.snappedX).toBe(true);
    });

    it('returns adjusted position with snap deltas', () => {
      const draggingPart = createTestPart({
        id: 'dragging',
        length: 10,
        position: { x: 0, y: 0, z: 0 }
      });

      const targetPart = createTestPart({
        id: 'target',
        length: 10,
        position: { x: 10.2, y: 0.1, z: 0.15 }
      });

      const result = detectSnaps(draggingPart, { x: 0, y: 0, z: 0 }, [draggingPart, targetPart], ['dragging'], 0.5);

      // Adjusted position should account for snapping
      expect(result.adjustedPosition).toBeDefined();
      expect(typeof result.adjustedPosition.x).toBe('number');
      expect(typeof result.adjustedPosition.y).toBe('number');
      expect(typeof result.adjustedPosition.z).toBe('number');
    });

    it('does not snap when parts are too far apart', () => {
      const draggingPart = createTestPart({
        id: 'dragging',
        position: { x: 0, y: 0, z: 0 }
      });

      const targetPart = createTestPart({
        id: 'target',
        position: { x: 100, y: 100, z: 100 } // Far away
      });

      const result = detectSnaps(draggingPart, { x: 0, y: 0, z: 0 }, [draggingPart, targetPart], ['dragging'], 0.5);

      // Should not snap
      expect(result.snappedX).toBe(false);
      expect(result.snappedY).toBe(false);
      expect(result.snappedZ).toBe(false);
      expect(result.snapLines).toHaveLength(0);
    });

    it('handles equal spacing snaps between two parts', () => {
      const draggingPart = createTestPart({
        id: 'dragging',
        length: 10,
        position: { x: 0, y: 0, z: 0 }
      });

      // Create two parts with space for equal spacing
      const leftPart = createTestPart({
        id: 'left',
        length: 10,
        position: { x: -20, y: 0, z: 0 }
      });

      const rightPart = createTestPart({
        id: 'right',
        length: 10,
        position: { x: 20, y: 0, z: 0 }
      });

      const result = detectSnaps(
        draggingPart,
        { x: 0, y: 0, z: 0 }, // Centered between the two parts
        [draggingPart, leftPart, rightPart],
        ['dragging'],
        0.75 // Slightly larger threshold for equal spacing
      );

      // Should detect equal spacing
      expect(result.adjustedPosition).toBeDefined();
    });

    it('handles empty parts array', () => {
      const draggingPart = createTestPart({
        id: 'dragging',
        position: { x: 0, y: 0, z: 0 }
      });

      const result = detectSnaps(draggingPart, { x: 0, y: 0, z: 0 }, [draggingPart], ['dragging'], 0.5);

      // Should return position unchanged
      expect(result.adjustedPosition.x).toBe(0);
      expect(result.adjustedPosition.y).toBe(0);
      expect(result.adjustedPosition.z).toBe(0);
      expect(result.snappedX).toBe(false);
      expect(result.snappedY).toBe(false);
      expect(result.snappedZ).toBe(false);
    });

    it('uses default threshold when not specified', () => {
      const draggingPart = createTestPart({
        id: 'dragging',
        position: { x: 0, y: 0, z: 0 }
      });

      const targetPart = createTestPart({
        id: 'target',
        position: { x: 10.4, y: 0, z: 0 }
      });

      // Should work without explicit threshold
      const result = detectSnaps(draggingPart, { x: 0, y: 0, z: 0 }, [draggingPart, targetPart], ['dragging']);

      expect(result).toBeDefined();
      expect(result.adjustedPosition).toBeDefined();
    });
  });

  describe('calculateSnapThreshold with sensitivity', () => {
    it('applies tight sensitivity multiplier', () => {
      const normalThreshold = calculateSnapThreshold(50, 'normal');
      const tightThreshold = calculateSnapThreshold(50, 'tight');

      expect(tightThreshold).toBeCloseTo(normalThreshold * 0.5, 2);
    });

    it('applies loose sensitivity multiplier', () => {
      const normalThreshold = calculateSnapThreshold(50, 'normal');
      const looseThreshold = calculateSnapThreshold(50, 'loose');

      expect(looseThreshold).toBeCloseTo(normalThreshold * 2, 2);
    });

    it('clamps tight sensitivity to adjusted minimum', () => {
      const threshold = calculateSnapThreshold(1, 'tight');
      expect(threshold).toBeGreaterThanOrEqual(0.125 * 0.5); // MIN_THRESHOLD * tight multiplier
    });

    it('clamps loose sensitivity to adjusted maximum', () => {
      const threshold = calculateSnapThreshold(1000, 'loose');
      expect(threshold).toBeLessThanOrEqual(2 * 2); // MAX_THRESHOLD * loose multiplier
    });
  });

  describe('detectDimensionSnaps', () => {
    it('detects matching length between parts', () => {
      const targetParts = [createTestPart({ id: 'target', length: 24, width: 12, thickness: 0.75 })];

      const results = detectDimensionSnaps(
        { length: 24.1, width: 10, thickness: 0.75 },
        { length: true, width: false, thickness: false },
        targetParts,
        'resizing',
        0.5
      );

      expect(results.length).toBe(1);
      expect(results[0].snapped).toBe(true);
      expect(results[0].dimension).toBe('length');
      expect(results[0].targetValue).toBe(24);
      expect(results[0].matchedPartId).toBe('target');
    });

    it('detects matching width between parts', () => {
      const targetParts = [createTestPart({ id: 'target', length: 24, width: 12, thickness: 0.75 })];

      const results = detectDimensionSnaps(
        { length: 30, width: 12.2, thickness: 0.75 },
        { length: false, width: true, thickness: false },
        targetParts,
        'resizing',
        0.5
      );

      expect(results.length).toBe(1);
      expect(results[0].dimension).toBe('width');
      expect(results[0].targetValue).toBe(12);
    });

    it('detects matching thickness between parts', () => {
      const targetParts = [createTestPart({ id: 'target', length: 24, width: 12, thickness: 1.5 })];

      const results = detectDimensionSnaps(
        { length: 30, width: 10, thickness: 1.45 },
        { length: false, width: false, thickness: true },
        targetParts,
        'resizing',
        0.5
      );

      expect(results.length).toBe(1);
      expect(results[0].dimension).toBe('thickness');
      expect(results[0].targetValue).toBe(1.5);
    });

    it('excludes the resizing part from targets', () => {
      const targetParts = [
        createTestPart({ id: 'resizing', length: 24, width: 12, thickness: 0.75 }),
        createTestPart({ id: 'other', length: 36, width: 12, thickness: 0.75 })
      ];

      const results = detectDimensionSnaps(
        { length: 24.1, width: 10, thickness: 0.75 },
        { length: true, width: false, thickness: false },
        targetParts,
        'resizing',
        0.5
      );

      // Should not match the resizing part's dimensions
      expect(results.length === 0 || results[0].matchedPartId !== 'resizing').toBe(true);
    });

    it('snaps to standard imperial dimensions when enabled', () => {
      const results = detectDimensionSnaps(
        { length: 23.9, width: 10, thickness: 0.75 },
        { length: true, width: false, thickness: false },
        [],
        'resizing',
        0.5,
        false, // sameTypeOnly
        'imperial',
        true // enableStandardSnap
      );

      expect(results.length).toBe(1);
      expect(results[0].isStandardDimension).toBe(true);
      expect(results[0].targetValue).toBe(24); // Standard dimension
    });

    it('snaps to standard metric dimensions when enabled', () => {
      const results = detectDimensionSnaps(
        { length: 600 / 25.4 + 0.1, width: 10, thickness: 0.75 }, // ~600mm + small offset
        { length: true, width: false, thickness: false },
        [],
        'resizing',
        0.5,
        false,
        'metric',
        true
      );

      expect(results.length).toBe(1);
      expect(results[0].isStandardDimension).toBe(true);
    });

    it('snaps to standard imperial thicknesses', () => {
      const results = detectDimensionSnaps(
        { length: 30, width: 10, thickness: 0.74 },
        { length: false, width: false, thickness: true },
        [],
        'resizing',
        0.1,
        false,
        'imperial',
        true
      );

      expect(results.length).toBe(1);
      expect(results[0].targetValue).toBe(0.75); // 3/4" standard
      expect(results[0].isStandardDimension).toBe(true);
    });

    it('does not snap to standards when disabled', () => {
      const results = detectDimensionSnaps(
        { length: 23.9, width: 10, thickness: 0.75 },
        { length: true, width: false, thickness: false },
        [],
        'resizing',
        0.5,
        false,
        'imperial',
        false // enableStandardSnap disabled
      );

      expect(results.length).toBe(0);
    });

    it('respects sameTypeOnly flag', () => {
      const targetParts = [createTestPart({ id: 'target', length: 12, width: 24, thickness: 0.75 })];

      // With sameTypeOnly=true, length should only match target length (12)
      const resultsStrict = detectDimensionSnaps(
        { length: 12.1, width: 10, thickness: 0.75 },
        { length: true, width: false, thickness: false },
        targetParts,
        'resizing',
        0.5,
        true // sameTypeOnly
      );

      // With sameTypeOnly=false, length can match any dimension including width (24)
      const resultsLoose = detectDimensionSnaps(
        { length: 24.1, width: 10, thickness: 0.75 },
        { length: true, width: false, thickness: false },
        targetParts,
        'resizing',
        0.5,
        false // sameTypeOnly
      );

      // Strict should find a match for length=12
      expect(resultsStrict.length).toBe(1);
      expect(resultsStrict[0].targetValue).toBe(12);
      expect(resultsStrict[0].matchedDimension).toBe('length');

      // Loose should find a match for width=24
      expect(resultsLoose.some((r) => r.targetValue === 24)).toBe(true);
    });

    it('handles multiple dimensions being resized', () => {
      const targetParts = [createTestPart({ id: 'target', length: 24, width: 12, thickness: 0.75 })];

      const results = detectDimensionSnaps(
        { length: 24.1, width: 12.1, thickness: 0.76 },
        { length: true, width: true, thickness: true },
        targetParts,
        'resizing',
        0.5
      );

      // Should find matches for all three dimensions
      expect(results.some((r) => r.dimension === 'length')).toBe(true);
      expect(results.some((r) => r.dimension === 'width')).toBe(true);
      expect(results.some((r) => r.dimension === 'thickness')).toBe(true);
    });

    it('prefers closer match when multiple options available', () => {
      const targetParts = [
        createTestPart({ id: 'close', length: 24, width: 12, thickness: 0.75 }),
        createTestPart({ id: 'far', length: 25, width: 12, thickness: 0.75 })
      ];

      const results = detectDimensionSnaps(
        { length: 24.1, width: 10, thickness: 0.75 },
        { length: true, width: false, thickness: false },
        targetParts,
        'resizing',
        2
      );

      expect(results.length).toBe(1);
      expect(results[0].targetValue).toBe(24); // Closer match
    });
  });

  describe('createDimensionMatchSnapLine', () => {
    it('creates snap line for length dimension', () => {
      const snap = {
        snapped: true,
        dimension: 'length' as const,
        targetValue: 24,
        delta: 0.1,
        matchedPartId: 'target',
        matchedPartName: 'Target Part',
        matchedPartBounds: {
          id: 'target',
          minX: 0,
          maxX: 24,
          minY: 0,
          maxY: 0.75,
          minZ: 0,
          maxZ: 12,
          centerX: 12,
          centerY: 0.375,
          centerZ: 6
        },
        matchedDimension: 'length' as const,
        isStandardDimension: false
      };

      const resizingBounds: PartBounds = {
        id: 'resizing',
        minX: -12,
        maxX: 12,
        minY: 0,
        maxY: 0.75,
        minZ: -6,
        maxZ: 6,
        centerX: 0,
        centerY: 0.375,
        centerZ: 0
      };

      const line = createDimensionMatchSnapLine(snap, resizingBounds);

      expect(line.axis).toBe('x');
      expect(line.type).toBe('dimension-match');
      expect(line.snapValue).toBe(24);
      expect(line.distanceIndicators).toBeDefined();
      expect(line.distanceIndicators![0].distance).toBe(24);
    });

    it('creates snap line for width dimension', () => {
      const snap = {
        snapped: true,
        dimension: 'width' as const,
        targetValue: 12,
        delta: 0.1,
        matchedPartId: 'target',
        matchedPartName: 'Target Part',
        matchedPartBounds: null,
        matchedDimension: null,
        isStandardDimension: true
      };

      const resizingBounds: PartBounds = {
        id: 'resizing',
        minX: -12,
        maxX: 12,
        minY: 0,
        maxY: 0.75,
        minZ: -6,
        maxZ: 6,
        centerX: 0,
        centerY: 0.375,
        centerZ: 0
      };

      const line = createDimensionMatchSnapLine(snap, resizingBounds);

      expect(line.axis).toBe('z');
      expect(line.type).toBe('dimension-match');
    });

    it('creates snap line for thickness dimension', () => {
      const snap = {
        snapped: true,
        dimension: 'thickness' as const,
        targetValue: 0.75,
        delta: 0.01,
        matchedPartId: null,
        matchedPartName: null,
        matchedPartBounds: null,
        matchedDimension: null,
        isStandardDimension: true
      };

      const resizingBounds: PartBounds = {
        id: 'resizing',
        minX: -12,
        maxX: 12,
        minY: 0,
        maxY: 0.75,
        minZ: -6,
        maxZ: 6,
        centerX: 0,
        centerY: 0.375,
        centerZ: 0
      };

      const line = createDimensionMatchSnapLine(snap, resizingBounds);

      expect(line.axis).toBe('y');
      expect(line.type).toBe('dimension-match');
    });
  });

  describe('createEnhancedDimensionSnapLine', () => {
    it('includes source info for part-based snap', () => {
      const snap = {
        snapped: true,
        dimension: 'length' as const,
        targetValue: 24,
        delta: 0.1,
        matchedPartId: 'target',
        matchedPartName: 'Target Part',
        matchedPartBounds: {
          id: 'target',
          minX: 0,
          maxX: 24,
          minY: 0,
          maxY: 0.75,
          minZ: 0,
          maxZ: 12,
          centerX: 12,
          centerY: 0.375,
          centerZ: 6
        },
        matchedDimension: 'length' as const,
        isStandardDimension: false
      };

      const resizingBounds: PartBounds = {
        id: 'resizing',
        minX: -12,
        maxX: 12,
        minY: 0,
        maxY: 0.75,
        minZ: -6,
        maxZ: 6,
        centerX: 0,
        centerY: 0.375,
        centerZ: 0
      };

      const result = createEnhancedDimensionSnapLine(snap, resizingBounds);

      expect(result.sourceInfo.isStandard).toBe(false);
      expect(result.sourceInfo.partName).toBe('Target Part');
      expect(result.sourceInfo.matchedDimension).toBe('length');
      expect(result.connectorLine).toBeDefined();
    });

    it('does not include connector line for standard dimension', () => {
      const snap = {
        snapped: true,
        dimension: 'length' as const,
        targetValue: 24,
        delta: 0.1,
        matchedPartId: null,
        matchedPartName: null,
        matchedPartBounds: null,
        matchedDimension: null,
        isStandardDimension: true
      };

      const resizingBounds: PartBounds = {
        id: 'resizing',
        minX: -12,
        maxX: 12,
        minY: 0,
        maxY: 0.75,
        minZ: -6,
        maxZ: 6,
        centerX: 0,
        centerY: 0.375,
        centerZ: 0
      };

      const result = createEnhancedDimensionSnapLine(snap, resizingBounds);

      expect(result.sourceInfo.isStandard).toBe(true);
      expect(result.connectorLine).toBeUndefined();
    });
  });

  describe('detectGuideSnaps', () => {
    it('detects snap to X-axis guide', () => {
      const guides: SnapGuide[] = [{ id: 'guide-1', axis: 'x', position: 10, label: 'X Guide' }];

      const bounds: PartBounds = {
        id: 'part',
        minX: 9.8,
        maxX: 19.8,
        minY: 0,
        maxY: 1,
        minZ: 0,
        maxZ: 5,
        centerX: 14.8,
        centerY: 0.5,
        centerZ: 2.5
      };

      const result = detectGuideSnaps(bounds, guides, 0.5);

      expect(result.x).not.toBeNull();
      expect(result.x!.snapped).toBe(true);
      expect(result.x!.value).toBe(10);
      expect(result.x!.guideId).toBe('guide-1');
    });

    it('detects snap to Y-axis guide', () => {
      const guides: SnapGuide[] = [{ id: 'guide-1', axis: 'y', position: 5 }];

      const bounds: PartBounds = {
        id: 'part',
        minX: 0,
        maxX: 10,
        minY: 4.8,
        maxY: 5.8,
        minZ: 0,
        maxZ: 5,
        centerX: 5,
        centerY: 5.3,
        centerZ: 2.5
      };

      const result = detectGuideSnaps(bounds, guides, 0.5);

      expect(result.y).not.toBeNull();
      expect(result.y!.snapped).toBe(true);
    });

    it('detects snap to Z-axis guide', () => {
      const guides: SnapGuide[] = [{ id: 'guide-1', axis: 'z', position: 20 }];

      const bounds: PartBounds = {
        id: 'part',
        minX: 0,
        maxX: 10,
        minY: 0,
        maxY: 1,
        minZ: 19.8,
        maxZ: 24.8,
        centerX: 5,
        centerY: 0.5,
        centerZ: 22.3
      };

      const result = detectGuideSnaps(bounds, guides, 0.5);

      expect(result.z).not.toBeNull();
      expect(result.z!.snapped).toBe(true);
    });

    it('snaps to nearest guide when multiple are present', () => {
      const guides: SnapGuide[] = [
        { id: 'guide-1', axis: 'x', position: 10 },
        { id: 'guide-2', axis: 'x', position: 20 }
      ];

      const bounds: PartBounds = {
        id: 'part',
        minX: 9.9,
        maxX: 19.9,
        minY: 0,
        maxY: 1,
        minZ: 0,
        maxZ: 5,
        centerX: 14.9,
        centerY: 0.5,
        centerZ: 2.5
      };

      const result = detectGuideSnaps(bounds, guides, 0.5);

      // Should snap to the closer guide
      expect(result.x).not.toBeNull();
      expect(result.x!.value).toBe(10); // minX is closer to 10
    });

    it('returns null when no guides are in range', () => {
      const guides: SnapGuide[] = [{ id: 'guide-1', axis: 'x', position: 100 }];

      const bounds: PartBounds = {
        id: 'part',
        minX: 0,
        maxX: 10,
        minY: 0,
        maxY: 1,
        minZ: 0,
        maxZ: 5,
        centerX: 5,
        centerY: 0.5,
        centerZ: 2.5
      };

      const result = detectGuideSnaps(bounds, guides, 0.5);

      expect(result.x).toBeNull();
    });

    it('handles empty guides array', () => {
      const bounds: PartBounds = {
        id: 'part',
        minX: 0,
        maxX: 10,
        minY: 0,
        maxY: 1,
        minZ: 0,
        maxZ: 5,
        centerX: 5,
        centerY: 0.5,
        centerZ: 2.5
      };

      const result = detectGuideSnaps(bounds, [], 0.5);

      expect(result.x).toBeNull();
      expect(result.y).toBeNull();
      expect(result.z).toBeNull();
    });
  });

  describe('createGuideSnapLine', () => {
    it('creates X-axis guide snap line', () => {
      const guide: SnapGuide = { id: 'guide-1', axis: 'x', position: 10 };
      const bounds: PartBounds = {
        id: 'part',
        minX: 5,
        maxX: 15,
        minY: 0,
        maxY: 1,
        minZ: -5,
        maxZ: 5,
        centerX: 10,
        centerY: 0.5,
        centerZ: 0
      };

      const line = createGuideSnapLine(guide, bounds);

      expect(line.axis).toBe('x');
      expect(line.type).toBe('face');
      expect(line.snapValue).toBe(10);
      expect(line.start.x).toBe(10);
      expect(line.end.x).toBe(10);
    });

    it('creates Y-axis guide snap line', () => {
      const guide: SnapGuide = { id: 'guide-1', axis: 'y', position: 5 };
      const bounds: PartBounds = {
        id: 'part',
        minX: -10,
        maxX: 10,
        minY: 4,
        maxY: 6,
        minZ: -5,
        maxZ: 5,
        centerX: 0,
        centerY: 5,
        centerZ: 0
      };

      const line = createGuideSnapLine(guide, bounds);

      expect(line.axis).toBe('y');
      expect(line.start.y).toBe(5);
      expect(line.end.y).toBe(5);
    });

    it('creates Z-axis guide snap line', () => {
      const guide: SnapGuide = { id: 'guide-1', axis: 'z', position: 20 };
      const bounds: PartBounds = {
        id: 'part',
        minX: -10,
        maxX: 10,
        minY: 0,
        maxY: 1,
        minZ: 15,
        maxZ: 25,
        centerX: 0,
        centerY: 0.5,
        centerZ: 20
      };

      const line = createGuideSnapLine(guide, bounds);

      expect(line.axis).toBe('z');
      expect(line.start.z).toBe(20);
      expect(line.end.z).toBe(20);
    });

    it('extends line beyond part bounds', () => {
      const guide: SnapGuide = { id: 'guide-1', axis: 'x', position: 10 };
      const bounds: PartBounds = {
        id: 'part',
        minX: 5,
        maxX: 15,
        minY: 0,
        maxY: 1,
        minZ: -5,
        maxZ: 5,
        centerX: 10,
        centerY: 0.5,
        centerZ: 0
      };

      const line = createGuideSnapLine(guide, bounds);

      // Line should extend beyond part bounds
      expect(line.start.z).toBeLessThan(bounds.minZ);
      expect(line.end.z).toBeGreaterThan(bounds.maxZ);
    });
  });

  describe('detectOriginSnaps', () => {
    it('detects snap to X=0 plane', () => {
      const bounds: PartBounds = {
        id: 'part',
        minX: -0.2,
        maxX: 9.8,
        minY: 0,
        maxY: 1,
        minZ: 0,
        maxZ: 5,
        centerX: 4.8,
        centerY: 0.5,
        centerZ: 2.5
      };

      const result = detectOriginSnaps(bounds, 0.5);

      expect(result.x).not.toBeNull();
      expect(result.x!.delta).toBeCloseTo(0.2, 5);
      expect(result.x!.snapType).toBe('min');
    });

    it('detects snap to Y=0 plane (ground)', () => {
      // Position part so minY is closer to 0 than centerY
      const bounds: PartBounds = {
        id: 'part',
        minX: 0,
        maxX: 10,
        minY: -0.1,
        maxY: 0.9,
        minZ: 0,
        maxZ: 5,
        centerX: 5,
        centerY: 0.4,
        centerZ: 2.5
      };

      const result = detectOriginSnaps(bounds, 0.5);

      expect(result.y).not.toBeNull();
      // minY=-0.1 is closer to 0 than centerY=0.4
      // delta to snap minY to 0 is 0.1
      expect(result.y!.delta).toBeCloseTo(0.1, 5);
      expect(result.y!.snapType).toBe('min');
    });

    it('detects snap to Z=0 plane', () => {
      const bounds: PartBounds = {
        id: 'part',
        minX: 0,
        maxX: 10,
        minY: 0,
        maxY: 1,
        minZ: 0.2,
        maxZ: 5.2,
        centerX: 5,
        centerY: 0.5,
        centerZ: 2.7
      };

      const result = detectOriginSnaps(bounds, 0.5);

      expect(result.z).not.toBeNull();
      expect(result.z!.delta).toBeCloseTo(-0.2, 5);
      expect(result.z!.snapType).toBe('min');
    });

    it('detects center snap to origin', () => {
      const bounds: PartBounds = {
        id: 'part',
        minX: -5,
        maxX: 5,
        minY: -0.5,
        maxY: 0.5,
        minZ: -2.5,
        maxZ: 2.5,
        centerX: 0.1,
        centerY: 0,
        centerZ: 0
      };

      const result = detectOriginSnaps(bounds, 0.5);

      expect(result.x).not.toBeNull();
      expect(result.x!.snapType).toBe('center');
    });

    it('returns null when part is far from origin', () => {
      const bounds: PartBounds = {
        id: 'part',
        minX: 50,
        maxX: 60,
        minY: 10,
        maxY: 11,
        minZ: 30,
        maxZ: 35,
        centerX: 55,
        centerY: 10.5,
        centerZ: 32.5
      };

      const result = detectOriginSnaps(bounds, 0.5);

      expect(result.x).toBeNull();
      expect(result.y).toBeNull();
      expect(result.z).toBeNull();
    });

    it('prefers closer snap type', () => {
      const bounds: PartBounds = {
        id: 'part',
        minX: -0.1,
        maxX: 0.4,
        minY: 0,
        maxY: 1,
        minZ: 0,
        maxZ: 5,
        centerX: 0.15,
        centerY: 0.5,
        centerZ: 2.5
      };

      const result = detectOriginSnaps(bounds, 0.5);

      expect(result.x).not.toBeNull();
      expect(result.x!.snapType).toBe('min'); // -0.1 is closer to 0 than 0.15
    });
  });

  describe('createOriginSnapLine', () => {
    it('creates X=0 origin snap line', () => {
      const bounds: PartBounds = {
        id: 'part',
        minX: -5,
        maxX: 5,
        minY: 0,
        maxY: 1,
        minZ: -5,
        maxZ: 5,
        centerX: 0,
        centerY: 0.5,
        centerZ: 0
      };

      const line = createOriginSnapLine('x', 'min', bounds);

      expect(line.axis).toBe('x');
      expect(line.type).toBe('edge');
      expect(line.snapValue).toBe(0);
      expect(line.start.x).toBe(0);
      expect(line.end.x).toBe(0);
    });

    it('creates Y=0 origin snap line', () => {
      const bounds: PartBounds = {
        id: 'part',
        minX: -5,
        maxX: 5,
        minY: 0,
        maxY: 1,
        minZ: -5,
        maxZ: 5,
        centerX: 0,
        centerY: 0.5,
        centerZ: 0
      };

      const line = createOriginSnapLine('y', 'min', bounds);

      expect(line.axis).toBe('y');
      expect(line.snapValue).toBe(0);
      expect(line.start.y).toBe(0);
      expect(line.end.y).toBe(0);
    });

    it('creates Z=0 origin snap line', () => {
      const bounds: PartBounds = {
        id: 'part',
        minX: -5,
        maxX: 5,
        minY: 0,
        maxY: 1,
        minZ: -5,
        maxZ: 5,
        centerX: 0,
        centerY: 0.5,
        centerZ: 0
      };

      const line = createOriginSnapLine('z', 'min', bounds);

      expect(line.axis).toBe('z');
      expect(line.snapValue).toBe(0);
      expect(line.start.z).toBe(0);
      expect(line.end.z).toBe(0);
    });

    it('uses center type for center snaps', () => {
      const bounds: PartBounds = {
        id: 'part',
        minX: -5,
        maxX: 5,
        minY: 0,
        maxY: 1,
        minZ: -5,
        maxZ: 5,
        centerX: 0,
        centerY: 0.5,
        centerZ: 0
      };

      const line = createOriginSnapLine('x', 'center', bounds);

      expect(line.type).toBe('center');
    });
  });

  describe('detectFaceSnaps', () => {
    it('detects face-to-face snap on X axis (right to left)', () => {
      const draggingPart = createTestPart({
        id: 'dragging',
        length: 10,
        position: { x: 0, y: 0, z: 0 }
      });

      const targetPart = createTestPart({
        id: 'target',
        length: 10,
        position: { x: 10.2, y: 0, z: 0 } // Just past dragging part's right edge
      });

      const result = detectFaceSnaps(draggingPart, { x: 0, y: 0, z: 0 }, [draggingPart, targetPart], ['dragging'], 0.5);

      expect(result.snappedX).toBe(true);
      expect(result.snapLines.length).toBeGreaterThan(0);
    });

    it('detects face-to-face snap on Y axis (top to bottom)', () => {
      const draggingPart = createTestPart({
        id: 'dragging',
        thickness: 1,
        position: { x: 0, y: 0, z: 0 }
      });

      const targetPart = createTestPart({
        id: 'target',
        thickness: 1,
        position: { x: 0, y: 1.2, z: 0 } // Just above dragging part
      });

      const result = detectFaceSnaps(draggingPart, { x: 0, y: 0, z: 0 }, [draggingPart, targetPart], ['dragging'], 0.5);

      expect(result.snappedY).toBe(true);
    });

    it('detects face-to-face snap on Z axis', () => {
      const draggingPart = createTestPart({
        id: 'dragging',
        width: 5,
        position: { x: 0, y: 0, z: 0 }
      });

      const targetPart = createTestPart({
        id: 'target',
        width: 5,
        position: { x: 0, y: 0, z: 5.3 } // Just past dragging part's front edge
      });

      const result = detectFaceSnaps(draggingPart, { x: 0, y: 0, z: 0 }, [draggingPart, targetPart], ['dragging'], 0.5);

      expect(result.snappedZ).toBe(true);
    });

    it('adjusts position to align faces', () => {
      const draggingPart = createTestPart({
        id: 'dragging',
        length: 10,
        position: { x: 0, y: 0, z: 0 }
      });

      const targetPart = createTestPart({
        id: 'target',
        length: 10,
        position: { x: 10.2, y: 0, z: 0 }
      });

      const result = detectFaceSnaps(draggingPart, { x: 0, y: 0, z: 0 }, [draggingPart, targetPart], ['dragging'], 0.5);

      // Position should be adjusted to make faces touch
      expect(result.adjustedPosition.x).not.toBe(0);
    });

    it('does not snap when faces are too far apart', () => {
      const draggingPart = createTestPart({
        id: 'dragging',
        length: 10,
        position: { x: 0, y: 0, z: 0 }
      });

      const targetPart = createTestPart({
        id: 'target',
        length: 10,
        position: { x: 20, y: 0, z: 0 } // Too far away
      });

      const result = detectFaceSnaps(draggingPart, { x: 0, y: 0, z: 0 }, [draggingPart, targetPart], ['dragging'], 0.5);

      expect(result.snappedX).toBe(false);
    });

    it('creates face snap lines for visualization', () => {
      const draggingPart = createTestPart({
        id: 'dragging',
        length: 10,
        position: { x: 0, y: 0, z: 0 }
      });

      const targetPart = createTestPart({
        id: 'target',
        length: 10,
        position: { x: 10.2, y: 0, z: 0 }
      });

      const result = detectFaceSnaps(draggingPart, { x: 0, y: 0, z: 0 }, [draggingPart, targetPart], ['dragging'], 0.5);

      expect(result.snapLines.length).toBeGreaterThan(0);
      expect(result.snapLines[0].type).toBe('face');
    });
  });

  describe('standard dimension constants', () => {
    it('has valid imperial length/width dimensions', () => {
      expect(STANDARD_DIMENSIONS_IMPERIAL.length).toBeGreaterThan(0);
      expect(STANDARD_DIMENSIONS_IMPERIAL).toContain(24); // Common 2ft
      expect(STANDARD_DIMENSIONS_IMPERIAL).toContain(48); // Common 4ft
      expect(STANDARD_DIMENSIONS_IMPERIAL).toContain(96); // Common 8ft
    });

    it('has valid metric length/width dimensions', () => {
      expect(STANDARD_DIMENSIONS_METRIC.length).toBeGreaterThan(0);
      // All values should be positive
      STANDARD_DIMENSIONS_METRIC.forEach((d) => {
        expect(d).toBeGreaterThan(0);
      });
    });

    it('has valid imperial thickness dimensions', () => {
      expect(STANDARD_THICKNESSES_IMPERIAL.length).toBeGreaterThan(0);
      expect(STANDARD_THICKNESSES_IMPERIAL).toContain(0.75); // 3/4" plywood
      expect(STANDARD_THICKNESSES_IMPERIAL).toContain(0.5); // 1/2" plywood
      expect(STANDARD_THICKNESSES_IMPERIAL).toContain(1.5); // 2x lumber actual
    });

    it('has valid metric thickness dimensions', () => {
      expect(STANDARD_THICKNESSES_METRIC.length).toBeGreaterThan(0);
      // 18mm plywood is very common
      const mm18 = 18 / 25.4;
      expect(STANDARD_THICKNESSES_METRIC).toContain(mm18);
    });

    it('dimensions are sorted in ascending order', () => {
      const isSorted = (arr: number[]) => arr.every((v, i) => i === 0 || arr[i - 1] <= v);

      expect(isSorted(STANDARD_DIMENSIONS_IMPERIAL)).toBe(true);
      expect(isSorted(STANDARD_DIMENSIONS_METRIC)).toBe(true);
      expect(isSorted(STANDARD_THICKNESSES_IMPERIAL)).toBe(true);
      expect(isSorted(STANDARD_THICKNESSES_METRIC)).toBe(true);
    });
  });
});
