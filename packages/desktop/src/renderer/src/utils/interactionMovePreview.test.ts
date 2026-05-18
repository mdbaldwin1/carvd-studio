import { describe, expect, it } from 'vitest';
import type { AppSettings, Part, SnapGuide } from '../types';
import { solveGroupMoveSnapPreview, solvePartMoveSnapPreview } from './interactionMovePreview';

function part(overrides: Partial<Part> = {}): Part {
  return {
    id: overrides.id ?? 'part-1',
    name: overrides.name ?? 'Part',
    length: overrides.length ?? 10,
    width: overrides.width ?? 4,
    thickness: overrides.thickness ?? 1,
    position: overrides.position ?? { x: 0, y: 0, z: 0 },
    rotation: overrides.rotation ?? { x: 0, y: 0, z: 0 },
    stockId: overrides.stockId ?? null,
    grainSensitive: overrides.grainSensitive ?? false,
    grainDirection: overrides.grainDirection ?? 'length',
    color: overrides.color ?? '#fff'
  };
}

const settings: AppSettings = {
  defaultUnits: 'imperial',
  defaultGridSize: 1,
  theme: 'system',
  confirmBeforeDelete: true,
  showHotkeyHints: true,
  stockConstraints: {
    constrainDimensions: true,
    constrainGrain: true,
    constrainColor: true,
    preventOverlap: true
  },
  liveGridSnap: false,
  snapSensitivity: 'normal',
  snapToOrigin: true,
  dimensionSnapSameTypeOnly: false,
  enableSurfaceAnchors: true,
  enableFractionalAnchors: true,
  enableGoldenRatioAnchors: false,
  enableFeatureAnchors: true,
  enableAxisLegacySnaps: true
};

describe('interactionMovePreview', () => {
  it('solves part preview snaps and preserves floor constraints', () => {
    const movingPart = part({ position: { x: 0, y: 1, z: 0 } });
    const snapGuides: SnapGuide[] = [{ id: 'guide-x', axis: 'x', position: 2 }];

    const preview = solvePartMoveSnapPreview({
      part: movingPart,
      position: { x: 1.95, y: 0.5, z: 0 },
      axes: { x: true, y: true, z: true },
      worldHalfHeight: 0.5,
      referenceParts: [],
      movingPartIds: [movingPart.id],
      snapGuides,
      settings,
      snapThreshold: 0.1,
      latchedFaceSnap: null,
      resolveFeatureStage: () => 'feature'
    });

    expect(preview.position.x).toBeCloseTo(2, 5);
    expect(preview.position.y).toBe(0.5);
    expect(preview.snappedAxes.x).toBe(true);
  });

  it('solves group preview snaps against guides without hook-local state', () => {
    const movingParts = [part({ id: 'part-1' }), part({ id: 'part-2', position: { x: 10, y: 0, z: 0 } })];
    const guide: SnapGuide = { id: 'guide-z', axis: 'z', position: 4 };

    const preview = solveGroupMoveSnapPreview({
      initialBounds: {
        id: 'group',
        minX: -5,
        maxX: 15,
        minY: -0.5,
        maxY: 0.5,
        minZ: -2,
        maxZ: 2,
        centerX: 5,
        centerY: 0,
        centerZ: 0
      },
      anchorPosition: { x: 5, y: 0, z: 0 },
      delta: { x: 0, y: 0, z: 3.95 },
      axes: { x: true, y: true, z: true },
      referenceParts: movingParts,
      movingPartIds: movingParts.map((entry) => entry.id),
      movingParts,
      snapGuides: [guide],
      settings,
      snapThreshold: 0.1
    });

    expect(preview.delta.z).toBeCloseTo(4, 5);
    expect(preview.snappedAxes.z).toBe(true);
  });
});
