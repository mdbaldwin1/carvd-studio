import { describe, expect, it } from 'vitest';
import type { Part, SnapLine } from '../types';
import { detectFeatureSnaps, detectFractionalFaceSnaps, detectSurfaceAnchorSnaps, getPartOBB } from './snapToPartsUtil';
import { createAxisSnapWinners, tryApplyAxisSnap } from './snapPriority';

function createPart(overrides: Partial<Part> = {}): Part {
  return {
    id: overrides.id ?? 'part',
    name: overrides.name ?? 'Part',
    length: overrides.length ?? 6,
    width: overrides.width ?? 4,
    thickness: overrides.thickness ?? 1,
    position: overrides.position ?? { x: 0, y: 0, z: 0 },
    rotation: overrides.rotation ?? { x: 0, y: 0, z: 0 },
    stockId: overrides.stockId ?? null,
    grainSensitive: overrides.grainSensitive ?? false,
    grainDirection: overrides.grainDirection ?? 'length',
    color: overrides.color ?? '#ffffff',
    ignoreOverlap: overrides.ignoreOverlap
  };
}

describe('drag snap flow integration', () => {
  it('keeps face winner on contact axis while allowing tangential surface winner', () => {
    const winners = createAxisSnapWinners();
    const lines: SnapLine[] = [];
    const faceLine: SnapLine = {
      axis: 'x',
      type: 'face',
      family: 'face',
      state: 'winner',
      start: { x: 0, y: 0, z: 0 },
      end: { x: 0, y: 1, z: 0 },
      snapValue: 0
    };
    const surfaceLine: SnapLine = {
      axis: 'x',
      type: 'center',
      family: 'surface-anchor',
      state: 'winner',
      start: { x: 0, y: 0, z: 0 },
      end: { x: 0, y: 1, z: 0 },
      snapValue: 0
    };
    const tangentialSurfaceLine: SnapLine = {
      axis: 'z',
      type: 'center',
      family: 'surface-anchor',
      state: 'winner',
      start: { x: 0, y: 0, z: 0 },
      end: { x: 1, y: 0, z: 0 },
      snapValue: 0
    };

    expect(tryApplyAxisSnap('x', 'face', winners, lines, [faceLine])).toBe(true);
    expect(tryApplyAxisSnap('x', 'surface', winners, lines, [surfaceLine])).toBe(false);
    expect(tryApplyAxisSnap('z', 'surface', winners, lines, [tangentialSurfaceLine])).toBe(true);

    expect(winners.x).toBe('face');
    expect(winners.z).toBe('surface');
  });

  it('prefers explicit surface anchors over fractional anchors when both are valid', () => {
    const dragging = createPart({
      id: 'dragging',
      length: 2,
      width: 2,
      thickness: 1,
      position: { x: 0, y: 0.28, z: 0.24 }
    });
    const target = createPart({
      id: 'target',
      length: 8,
      width: 8,
      thickness: 1,
      position: { x: 5.1, y: 0, z: 0 }
    });
    const all = [dragging, target];
    const snapThreshold = 0.5;

    const surface = detectSurfaceAnchorSnaps(dragging, dragging.position, all, ['dragging'], snapThreshold);
    const fraction = detectFractionalFaceSnaps(dragging, dragging.position, all, ['dragging'], snapThreshold);

    const winners = createAxisSnapWinners();
    const lines: SnapLine[] = [];

    if (surface.snappedY) {
      tryApplyAxisSnap(
        'y',
        'surface',
        winners,
        lines,
        surface.snapLines.filter((l) => l.axis === 'y')
      );
    }
    if (surface.snappedZ) {
      tryApplyAxisSnap(
        'z',
        'surface',
        winners,
        lines,
        surface.snapLines.filter((l) => l.axis === 'z')
      );
    }
    if (fraction.snappedY) {
      tryApplyAxisSnap(
        'y',
        'fraction',
        winners,
        lines,
        fraction.snapLines.filter((l) => l.axis === 'y')
      );
    }
    if (fraction.snappedZ) {
      tryApplyAxisSnap(
        'z',
        'fraction',
        winners,
        lines,
        fraction.snapLines.filter((l) => l.axis === 'z')
      );
    }

    expect(winners.y === 'surface' || winners.z === 'surface').toBe(true);
  });

  it('falls back to feature snaps when face/surface/fraction are not available', () => {
    const dragging = createPart({
      id: 'dragging',
      length: 6,
      width: 2,
      thickness: 1,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 45, z: 0 }
    });
    const obb = getPartOBB(dragging);
    const normal = obb.axes[2];
    const target = createPart({
      id: 'target',
      length: 6,
      width: 2,
      thickness: 1,
      position: { x: normal.x * 2.2, y: 0, z: normal.z * 2.2 },
      rotation: { x: 0, y: 45, z: 0 }
    });

    const feature = detectFeatureSnaps(dragging, dragging.position, [dragging, target], ['dragging'], 0.5);
    expect(feature.snappedX || feature.snappedY || feature.snappedZ).toBe(true);
    expect(feature.snapLines.some((line) => line.family === 'feature')).toBe(true);
  });
});
