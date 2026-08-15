import { describe, expect, it, vi } from 'vitest';
import {
  applyGuideSnapsToDelta,
  applyGuideSnapsToPosition,
  applyOriginSnapsToDelta,
  applyOriginSnapsToPosition,
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
    const line = {
      id: 'l1',
      axis: 'x',
      type: 'edge',
      start: { x: 0, y: 0, z: 0 },
      end: { x: 0, y: 0, z: 1 }
    } as SnapLine;

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
