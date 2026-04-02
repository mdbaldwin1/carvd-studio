import { describe, expect, it } from 'vitest';
import type { SnapLine } from '../types';
import { createAxisSnapWinners, shouldUseSnapStage, SNAP_STAGE_PRIORITIES, tryApplyAxisSnap } from './snapPriority';

describe('snapPriority', () => {
  it('uses descending precedence order from guide to axis', () => {
    expect(SNAP_STAGE_PRIORITIES.guide).toBeGreaterThan(SNAP_STAGE_PRIORITIES.origin);
    expect(SNAP_STAGE_PRIORITIES.origin).toBeGreaterThan(SNAP_STAGE_PRIORITIES.mate);
    expect(SNAP_STAGE_PRIORITIES.mate).toBeGreaterThan(SNAP_STAGE_PRIORITIES.face);
    expect(SNAP_STAGE_PRIORITIES.face).toBeGreaterThan(SNAP_STAGE_PRIORITIES.feature);
    expect(SNAP_STAGE_PRIORITIES.feature).toBeGreaterThan(SNAP_STAGE_PRIORITIES.axis);
  });

  it('blocks lower-priority stages once an axis winner exists', () => {
    expect(shouldUseSnapStage('guide', 'axis')).toBe(false);
    expect(shouldUseSnapStage('origin', 'face')).toBe(false);
    expect(shouldUseSnapStage('axis', 'guide')).toBe(true);
    // mate beats face but not origin
    expect(shouldUseSnapStage('face', 'mate')).toBe(true);
    expect(shouldUseSnapStage('mate', 'face')).toBe(false);
    expect(shouldUseSnapStage('origin', 'mate')).toBe(false);
  });

  it('replaces axis lines only when candidate stage wins', () => {
    const winners = createAxisSnapWinners();
    const lines: SnapLine[] = [];

    const guideLine: SnapLine = {
      axis: 'x',
      type: 'edge',
      start: { x: 0, y: 0, z: 0 },
      end: { x: 1, y: 0, z: 0 },
      snapValue: 0
    };
    const axisLine: SnapLine = {
      axis: 'x',
      type: 'center',
      start: { x: 2, y: 0, z: 0 },
      end: { x: 3, y: 0, z: 0 },
      snapValue: 2
    };

    expect(tryApplyAxisSnap('x', 'guide', winners, lines, [guideLine])).toBe(true);
    expect(lines).toHaveLength(1);
    expect(lines[0].start.x).toBe(0);

    expect(tryApplyAxisSnap('x', 'axis', winners, lines, [axisLine])).toBe(false);
    expect(lines).toHaveLength(1);
    expect(lines[0].start.x).toBe(0);
  });
});
