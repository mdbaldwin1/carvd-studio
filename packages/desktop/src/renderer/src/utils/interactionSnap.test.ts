import { describe, expect, it, vi } from 'vitest';
import {
  applyGuideSnapsToDelta,
  applyGuideSnapsToPosition,
  applyOriginSnapsToDelta,
  applyOriginSnapsToPosition,
  getFaceLockAxis,
  normalizeFaceSnapToLockedAxis,
  resolveLatchedFaceSnap,
  tryApplyPositionStageForAxis
} from './interactionSnap';
import { createAxisSnapWinners } from './snapPriority';
import type { SnapLine } from '../types';

const axesAll = { x: true, y: true, z: true };

describe('interactionSnap appliers', () => {
  it('applies guide snap deltas per enabled axis', () => {
    const apply = vi.fn(() => true);
    applyGuideSnapsToDelta(
      { x: { delta: 0.2, guideId: 'gx' }, y: { delta: -0.1, guideId: 'gy' }, z: { delta: 0.05, guideId: 'gz' } },
      { x: true, y: false, z: true },
      createAxisSnapWinners(),
      [],
      apply
    );

    expect(apply).toHaveBeenCalledTimes(2);
    expect(apply).toHaveBeenCalledWith('x', 0.2, 'gx');
    expect(apply).toHaveBeenCalledWith('z', 0.05, 'gz');
  });

  it('applies origin snap deltas per enabled axis', () => {
    const apply = vi.fn(() => true);
    applyOriginSnapsToDelta(
      { x: { delta: 1, snapType: 'min' }, y: { delta: 2, snapType: 'center' }, z: { delta: 3, snapType: 'max' } },
      axesAll,
      createAxisSnapWinners(),
      [],
      apply
    );

    expect(apply).toHaveBeenCalledTimes(3);
    expect(apply).toHaveBeenCalledWith('y', 2, 'center');
  });

  it('records winners and snap lines for accepted position-stage snaps', () => {
    const winners = createAxisSnapWinners();
    const snapLines: SnapLine[] = [];
    const line: SnapLine = {
      axis: 'x',
      type: 'edge',
      start: { x: 0, y: 0, z: 0 },
      end: { x: 0, y: 0, z: 1 },
      snapValue: 0
    };

    const applied = tryApplyPositionStageForAxis('x', 'guide', winners, snapLines, () => ({
      accepted: true,
      lines: [line]
    }));

    expect(applied).toBe(true);
    expect(winners.x).toBe('guide');
    expect(snapLines).toHaveLength(1);

    // A lower-priority stage cannot displace the guide winner.
    const displaced = tryApplyPositionStageForAxis('x', 'axis', winners, snapLines, () => ({
      accepted: true,
      lines: []
    }));
    expect(displaced).toBe(false);
  });

  it('routes guide and origin position snaps through the stage arbiter', () => {
    const winners = createAxisSnapWinners();
    const snapLines: SnapLine[] = [];
    const applyGuide = vi.fn(() => ({ accepted: true, lines: [] }));
    applyGuideSnapsToPosition({ y: { delta: 0.4, guideId: 'gy' } }, axesAll, winners, snapLines, applyGuide);
    expect(applyGuide).toHaveBeenCalledWith('y', 0.4, 'gy');
    expect(winners.y).toBe('guide');

    const applyOrigin = vi.fn(() => ({ accepted: true, lines: [] }));
    applyOriginSnapsToPosition({ z: { delta: -0.3, snapType: 'min' } }, axesAll, winners, snapLines, applyOrigin);
    expect(applyOrigin).toHaveBeenCalledWith('z', -0.3, 'min');
    expect(winners.z).toBe('origin');
  });
});

describe('staying snapped to a face until you pull away', () => {
  const result = (overrides: Record<string, unknown> = {}) =>
    ({
      adjustedPosition: { x: 4, y: 0, z: 0 },
      snappedX: true,
      snappedY: false,
      snappedZ: false,
      snapLines: [],
      ...overrides
    }) as Parameters<typeof resolveLatchedFaceSnap>[0];

  const base = { x: 4.02, y: 0, z: 0 };

  it('takes hold the moment a face snaps, remembering which way it locked', () => {
    const { nextLatchedFaceSnap } = resolveLatchedFaceSnap(result(), base, null, 0.25);
    expect(nextLatchedFaceSnap).toMatchObject({ lockAxis: 'x', snappedX: true });
  });

  it('reads the locked axis off the face line when there is one', () => {
    // The line says which face was met; the distances are only a fallback.
    const withLine = result({ snapLines: [{ type: 'face', axis: 'z' }] });
    expect(getFaceLockAxis(withLine, base)).toBe('z');
  });

  it('falls back to whichever way the part actually moved', () => {
    const moved = result({ adjustedPosition: { x: 0, y: 3, z: 0 }, snappedX: false, snappedY: true });
    expect(getFaceLockAxis(moved, { x: 0, y: 0, z: 0 })).toBe('y');
  });

  it('locks only the axis the face belongs to', () => {
    // Snapping to one face must not silently pin the other two axes.
    const everything = result({ snappedX: true, snappedY: true, snappedZ: true });
    const normalized = normalizeFaceSnapToLockedAxis(everything, base);
    expect(normalized.snappedX).toBe(true);
    expect(normalized.snappedY).toBe(false);
    expect(normalized.snappedZ).toBe(false);
  });

  it('holds the part on the face while it is still near it', () => {
    const latched = {
      adjustedPosition: { x: 4, y: 0, z: 0 },
      lockAxis: 'x' as const,
      snappedX: true,
      snappedY: false,
      snappedZ: false,
      snapLines: []
    };
    const drifted = result({ snappedX: false, adjustedPosition: { x: 4.05, y: 0, z: 0 }, closestDistance: 0.05 });
    const { result: held, nextLatchedFaceSnap } = resolveLatchedFaceSnap(
      drifted,
      { x: 4.05, y: 0, z: 0 },
      latched,
      0.25
    );

    expect(held.adjustedPosition).toEqual({ x: 4, y: 0, z: 0 });
    expect(held.snappedX).toBe(true);
    expect(nextLatchedFaceSnap).toBe(latched);
  });

  it('lets go once the part is dragged clear of it', () => {
    // Otherwise a part could never be taken off a face it once touched.
    const latched = {
      adjustedPosition: { x: 4, y: 0, z: 0 },
      lockAxis: 'x' as const,
      snappedX: true,
      snappedY: false,
      snappedZ: false,
      snapLines: []
    };
    const pulled = result({ snappedX: false, adjustedPosition: { x: 9, y: 0, z: 0 }, closestDistance: 0.05 });
    const { result: freed, nextLatchedFaceSnap } = resolveLatchedFaceSnap(pulled, { x: 9, y: 0, z: 0 }, latched, 0.25);

    expect(freed.adjustedPosition).toEqual({ x: 9, y: 0, z: 0 });
    expect(nextLatchedFaceSnap).toBeNull();
  });

  it.each([
    ['y', { x: 0, y: 4, z: 0 }, { x: 0, y: 9, z: 0 }],
    ['z', { x: 0, y: 0, z: 4 }, { x: 0, y: 0, z: 9 }]
  ])('holds and releases on the %s axis in the same way', (axis, held, pulled) => {
    const latched = {
      adjustedPosition: held,
      lockAxis: axis as 'y' | 'z',
      snappedX: false,
      snappedY: axis === 'y',
      snappedZ: axis === 'z',
      snapLines: []
    };
    const near = result({ snappedX: false, snappedY: false, snappedZ: false, closestDistance: 0.05 });

    expect(resolveLatchedFaceSnap(near, held, latched, 0.25).result.adjustedPosition).toEqual(held);
    expect(resolveLatchedFaceSnap(near, pulled, latched, 0.25).nextLatchedFaceSnap).toBeNull();
  });

  it('lets go once nothing is near enough to hold on to', () => {
    const latched = {
      adjustedPosition: { x: 4, y: 0, z: 0 },
      lockAxis: 'x' as const,
      snappedX: true,
      snappedY: false,
      snappedZ: false,
      snapLines: []
    };
    const farAway = result({ snappedX: false, closestDistance: 5 });
    expect(resolveLatchedFaceSnap(farAway, base, latched, 0.25).nextLatchedFaceSnap).toBeNull();
  });
});
