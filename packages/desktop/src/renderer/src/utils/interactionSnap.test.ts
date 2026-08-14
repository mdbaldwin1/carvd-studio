import { describe, expect, it } from 'vitest';
import type { SnapLine } from '../types';
import { createAxisSnapWinners } from './snapPriority';
import {
  resolveLatchedFaceSnap,
  normalizeFaceSnapToLockedAxis,
  solveDeltaSnapStages,
  solvePositionSnapStages,
  runDeltaAdvancedSnapFamilies,
  runPositionAdvancedSnapFamilies
} from './interactionSnap';

function line(axis: 'x' | 'y' | 'z', type: SnapLine['type'], snapValue: number): SnapLine {
  return {
    axis,
    type,
    start: { x: 0, y: 0, z: 0 },
    end: { x: 1, y: 1, z: 1 },
    snapValue
  };
}

describe('interactionSnap', () => {
  it('locks face snaps to the dominant snapped axis', () => {
    const result = normalizeFaceSnapToLockedAxis(
      {
        adjustedPosition: { x: 5, y: 1, z: 0.2 },
        snappedX: true,
        snappedY: true,
        snappedZ: false,
        snapLines: [line('x', 'face', 5)]
      },
      { x: 0, y: 0, z: 0 }
    );

    expect(result.snappedX).toBe(true);
    expect(result.snappedY).toBe(false);
    expect(result.snappedZ).toBe(false);
  });

  it('reuses a latched face snap while the pointer stays within breakout distance', () => {
    const latched = {
      adjustedPosition: { x: 5, y: 0, z: 0 },
      lockAxis: 'x' as const,
      snappedX: true,
      snappedY: false,
      snappedZ: false,
      snapLines: [line('x', 'face', 5)]
    };

    const resolved = resolveLatchedFaceSnap(
      {
        adjustedPosition: { x: 5.01, y: 2, z: 0 },
        snappedX: false,
        snappedY: false,
        snappedZ: false,
        snapLines: [],
        closestDistance: 0.05
      },
      { x: 5.02, y: 2, z: 0 },
      latched,
      1
    );

    expect(resolved.nextLatchedFaceSnap).toEqual(latched);
    expect(resolved.result.adjustedPosition).toEqual(latched.adjustedPosition);
    expect(resolved.result.snappedX).toBe(true);
  });

  it('releases a latched face snap once breakout distance is exceeded', () => {
    const latched = {
      adjustedPosition: { x: 5, y: 0, z: 0 },
      lockAxis: 'x' as const,
      snappedX: true,
      snappedY: false,
      snappedZ: false,
      snapLines: [line('x', 'face', 5)]
    };

    const resolved = resolveLatchedFaceSnap(
      {
        adjustedPosition: { x: 6, y: 0, z: 0 },
        snappedX: false,
        snappedY: false,
        snappedZ: false,
        snapLines: [],
        closestDistance: 0.05
      },
      { x: 6, y: 0, z: 0 },
      latched,
      1
    );

    expect(resolved.nextLatchedFaceSnap).toBeNull();
    expect(resolved.result.adjustedPosition).toEqual({ x: 6, y: 0, z: 0 });
  });

  it('prefers higher-priority position snap families over axis snaps on the same axis', () => {
    const winners = createAxisSnapWinners();
    const snapLines: SnapLine[] = [];
    const applied: Array<{ axis: 'x' | 'y' | 'z'; value: number }> = [];

    runPositionAdvancedSnapFamilies(
      {
        axes: { x: true, y: true, z: true },
        winners,
        snapLines,
        enableSurfaceAnchors: true,
        enableFractionalAnchors: true,
        enableGoldenRatioAnchors: false,
        enableFeatureAnchors: true,
        applyAxisPosition: (axis, nextValue) => {
          applied.push({ axis, value: nextValue });
          return true;
        }
      },
      {
        surface: () => ({
          adjustedPosition: { x: 10, y: 0, z: 0 },
          snappedX: true,
          snappedY: false,
          snappedZ: false,
          snapLines: [line('x', 'face', 10)]
        }),
        axis: () => ({
          adjustedPosition: { x: 20, y: 0, z: 0 },
          snappedX: true,
          snappedY: false,
          snappedZ: false,
          snapLines: [line('x', 'edge', 20)]
        })
      }
    );

    expect(winners.x).toBe('surface');
    expect(snapLines).toHaveLength(1);
    expect(snapLines[0].snapValue).toBe(10);
    expect(applied.some((entry) => entry.value === 10)).toBe(true);
  });

  it('applies delta snap families using the same stage precedence', () => {
    const winners = createAxisSnapWinners();
    const snapLines: SnapLine[] = [];
    const workingDelta = { x: 0, y: 0, z: 0 };

    runDeltaAdvancedSnapFamilies(
      {
        axes: { x: true, y: true, z: true },
        winners,
        snapLines,
        workingDelta,
        anchorPosition: { x: 0, y: 0, z: 0 },
        enableSurfaceAnchors: true,
        enableFractionalAnchors: false,
        enableGoldenRatioAnchors: false,
        enableFeatureAnchors: false
      },
      {
        surface: () => ({
          adjustedPosition: { x: 3, y: 0, z: 0 },
          snappedX: true,
          snappedY: false,
          snappedZ: false,
          snapLines: [line('x', 'face', 3)]
        }),
        axis: () => ({
          adjustedPosition: { x: 9, y: 0, z: 0 },
          snappedX: true,
          snappedY: false,
          snappedZ: false,
          snapLines: [line('x', 'edge', 9)]
        })
      }
    );

    expect(workingDelta.x).toBe(3);
    expect(winners.x).toBe('surface');
    expect(snapLines).toHaveLength(1);
    expect(snapLines[0].snapValue).toBe(3);
  });

  it('runs position snap stages through one shared orchestration path', () => {
    const winners = createAxisSnapWinners();
    const snapLines: SnapLine[] = [];
    const applied: Array<{ axis: 'x' | 'y' | 'z'; value: number }> = [];

    solvePositionSnapStages({
      axes: { x: true, y: true, z: true },
      winners,
      snapLines,
      guideSnaps: { z: { delta: 1, guideId: 'guide-1' } },
      applyGuideDelta: () => ({
        accepted: true,
        lines: [line('z', 'guide', 1)]
      }),
      originSnaps: { y: { delta: 2, snapType: 'center' } },
      applyOriginDelta: () => ({
        accepted: true,
        lines: [line('y', 'origin', 2)]
      }),
      face: {
        detect: () => ({
          adjustedPosition: { x: 3, y: 2, z: 0 },
          snappedX: true,
          snappedY: false,
          snappedZ: false,
          snapLines: [line('x', 'face', 3)]
        }),
        basePosition: { x: 0, y: 0, z: 0 },
        applyAxisPosition: (axis, nextValue) => {
          applied.push({ axis, value: nextValue });
          return true;
        }
      },
      advanced: {
        enableSurfaceAnchors: true,
        enableFractionalAnchors: false,
        enableGoldenRatioAnchors: false,
        enableFeatureAnchors: false,
        applyAxisPosition: (axis, nextValue) => {
          applied.push({ axis, value: nextValue });
          return true;
        },
        detectors: {
          surface: () => ({
            adjustedPosition: { x: 4, y: 0, z: 0 },
            snappedX: true,
            snappedY: false,
            snappedZ: false,
            snapLines: [line('x', 'face', 4)]
          })
        }
      }
    });

    expect(snapLines.map((entry) => entry.type)).toEqual(['guide', 'origin', 'face']);
    expect(applied.some((entry) => entry.value === 3)).toBe(true);
    expect(winners.x).toBe('face');
    expect(winners.y).toBe('origin');
    expect(winners.z).toBe('guide');
  });

  it('runs delta snap stages through one shared orchestration path', () => {
    const winners = createAxisSnapWinners();
    const snapLines: SnapLine[] = [];
    const workingDelta = { x: 0, y: 0, z: 0 };

    solveDeltaSnapStages({
      axes: { x: true, y: true, z: true },
      winners,
      snapLines,
      workingDelta,
      anchorPosition: { x: 0, y: 0, z: 0 },
      guideSnaps: { z: { delta: 1, guideId: 'guide-1' } },
      applyGuideDelta: (axis, delta) => {
        workingDelta[axis] += delta;
        return true;
      },
      originSnaps: { y: { delta: 2, snapType: 'center' } },
      applyOriginDelta: (axis, delta) => {
        workingDelta[axis] += delta;
        return true;
      },
      face: {
        detect: () => ({
          adjustedPosition: { x: 3, y: 2, z: 0 },
          snappedX: true,
          snappedY: false,
          snappedZ: false,
          snapLines: [line('x', 'face', 3)]
        }),
        basePosition: { x: 0, y: 0, z: 0 }
      },
      advanced: {
        enableSurfaceAnchors: true,
        enableFractionalAnchors: false,
        enableGoldenRatioAnchors: false,
        enableFeatureAnchors: false,
        detectors: {
          surface: () => ({
            adjustedPosition: { x: 4, y: 0, z: 0 },
            snappedX: true,
            snappedY: false,
            snappedZ: false,
            snapLines: [line('x', 'face', 4)]
          })
        }
      }
    });

    expect(workingDelta.x).toBe(3);
    expect(workingDelta.y).toBe(2);
    expect(workingDelta.z).toBe(1);
    expect(winners.x).toBe('face');
  });
});
