import { describe, expect, it } from 'vitest';
import type { AppSettings, Part, SnapGuide } from '../../types';
import { getPartBounds } from '../../utils/snapToPartsUtil';
import { groupMoveTool, type GroupMoveToolInput } from './groupMoveTool';

function makePart(overrides?: Partial<Part>): Part {
  return {
    id: 'p1',
    name: 'p1',
    length: 12,
    width: 8,
    thickness: 0.75,
    position: { x: 0, y: 0.375, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    stockId: null,
    grainSensitive: false,
    grainDirection: 'length',
    color: '#fff',
    ...overrides
  };
}

const SETTINGS: AppSettings = {
  units: 'imperial',
  defaultStock: 'plywood',
  theme: 'dark',
  gridSize: 0.0625,
  snapDistance: 0.125,
  snapEnabled: false,
  snapSensitivity: 1.0,
  showGrid: true,
  enableAxisLegacySnaps: false,
  enableSurfaceAnchors: false,
  enableFractionalAnchors: false,
  enableGoldenRatioAnchors: false,
  enableFeatureAnchors: false,
  snapToOrigin: false,
  displayMode: 'solid',
  lightingMode: 'default',
  brightnessMultiplier: 1.0
} as AppSettings;

const NO_GUIDES: SnapGuide[] = [];

function makeInput(overrides?: Partial<GroupMoveToolInput>): GroupMoveToolInput {
  const partA = makePart({ id: 'a', position: { x: 0, y: 0.375, z: 0 } });
  const partB = makePart({ id: 'b', position: { x: 14, y: 0.375, z: 0 } });
  const movingParts = overrides?.movingParts ?? [partA, partB];

  let combinedMinX = Infinity,
    combinedMaxX = -Infinity,
    combinedMinY = Infinity,
    combinedMaxY = -Infinity,
    combinedMinZ = Infinity,
    combinedMaxZ = -Infinity;
  for (const p of movingParts) {
    const b = getPartBounds(p);
    combinedMinX = Math.min(combinedMinX, b.minX);
    combinedMaxX = Math.max(combinedMaxX, b.maxX);
    combinedMinY = Math.min(combinedMinY, b.minY);
    combinedMaxY = Math.max(combinedMaxY, b.maxY);
    combinedMinZ = Math.min(combinedMinZ, b.minZ);
    combinedMaxZ = Math.max(combinedMaxZ, b.maxZ);
  }
  const initialBounds = {
    minX: combinedMinX,
    maxX: combinedMaxX,
    minY: combinedMinY,
    maxY: combinedMaxY,
    minZ: combinedMinZ,
    maxZ: combinedMaxZ,
    centerX: (combinedMinX + combinedMaxX) / 2,
    centerY: (combinedMinY + combinedMaxY) / 2,
    centerZ: (combinedMinZ + combinedMaxZ) / 2,
    minXObb: 0,
    maxXObb: 0,
    minYObb: 0,
    maxYObb: 0,
    minZObb: 0,
    maxZObb: 0
  };

  return {
    initialBounds,
    anchorPosition: { x: 0, y: 0.375, z: 0 },
    delta: { x: 0, y: 0, z: 0 },
    axes: { x: true, y: false, z: true },
    movingParts,
    referenceParts: [],
    snapGuides: NO_GUIDES,
    settings: SETTINGS,
    snapThreshold: 0.1,
    ...overrides
  };
}

describe('groupMoveTool', () => {
  describe('lifecycle', () => {
    it('begin records initial positions of every moving part', () => {
      const a = makePart({ id: 'a', position: { x: 0, y: 0.375, z: 0 } });
      const b = makePart({ id: 'b', position: { x: 14, y: 0.375, z: 0 } });
      const state = groupMoveTool.begin(makeInput({ movingParts: [a, b] }));
      expect(state.initialPositions.size).toBe(2);
      expect(state.initialPositions.get('a')).toEqual({ x: 0, y: 0.375, z: 0 });
      expect(state.initialPositions.get('b')).toEqual({ x: 14, y: 0.375, z: 0 });
    });

    it('update with zero delta returns the original positions', () => {
      const input = makeInput();
      const state = groupMoveTool.begin(input);
      const { preview } = groupMoveTool.update(input, state);
      expect(preview.delta).toEqual({ x: 0, y: 0, z: 0 });
      expect(preview.positions.get('a')).toEqual({ x: 0, y: 0.375, z: 0 });
      expect(preview.positions.get('b')).toEqual({ x: 14, y: 0.375, z: 0 });
    });

    it('update with non-zero delta moves every part by the same amount', () => {
      const baseInput = makeInput();
      const state = groupMoveTool.begin(baseInput);
      const moved = { ...baseInput, delta: { x: 5, y: 0, z: 3 } };
      const { preview } = groupMoveTool.update(moved, state);
      // Without snap engaged, delta equals input delta.
      expect(preview.delta).toEqual({ x: 5, y: 0, z: 3 });
      expect(preview.positions.get('a')).toEqual({ x: 5, y: 0.375, z: 3 });
      expect(preview.positions.get('b')).toEqual({ x: 19, y: 0.375, z: 3 });
    });

    it('commit produces a single updateGroupPositions with all members', () => {
      const baseInput = makeInput();
      const state = groupMoveTool.begin(baseInput);
      const moved = { ...baseInput, delta: { x: 5, y: 0, z: 0 } };
      const { preview } = groupMoveTool.update(moved, state);
      const instructions = groupMoveTool.commit(state, preview);
      expect(instructions).toHaveLength(1);
      expect(instructions[0]).toMatchObject({
        kind: 'updateGroupPositions'
      });
      if (instructions[0].kind === 'updateGroupPositions') {
        expect(instructions[0].updates).toHaveLength(2);
        expect(instructions[0].updates.find((u) => u.partId === 'a')).toEqual({
          partId: 'a',
          position: { x: 5, y: 0.375, z: 0 }
        });
      }
    });

    it('cancel does not throw', () => {
      const state = groupMoveTool.begin(makeInput());
      expect(() => groupMoveTool.cancel(state)).not.toThrow();
    });
  });
});
