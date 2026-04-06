import { describe, expect, it } from 'vitest';
import type { SnapLine } from '../types';
import { createAxisSnapWinners } from './snapPriority';
import { applyGroupAxisCandidate } from './groupDragSnapArbitration';

describe('groupDragSnapArbitration', () => {
  function line(axis: 'x' | 'y' | 'z', snapValue: number): SnapLine {
    return {
      axis,
      type: 'edge',
      start: { x: 0, y: 0, z: 0 },
      end: { x: 1, y: 1, z: 1 },
      snapValue
    };
  }

  it('applies higher-priority face and blocks lower-priority feature on same axis', () => {
    const winners = createAxisSnapWinners();
    const snapLines: SnapLine[] = [];
    const delta = { x: 1, y: 0, z: 0 };

    const faceApplied = applyGroupAxisCandidate('x', 'face', delta, 3, winners, snapLines, [line('x', 3)]);
    expect(faceApplied).toBe(true);
    expect(delta.x).toBe(3);

    const featureApplied = applyGroupAxisCandidate('x', 'feature', delta, 7, winners, snapLines, [line('x', 7)]);
    expect(featureApplied).toBe(false);
    expect(delta.x).toBe(3);
    expect(snapLines[0].snapValue).toBe(3);
  });

  it('allows feature to replace axis on the same axis', () => {
    const winners = createAxisSnapWinners();
    const snapLines: SnapLine[] = [];
    const delta = { x: 0, y: 0, z: 0 };

    expect(applyGroupAxisCandidate('z', 'axis', delta, 2, winners, snapLines, [line('z', 2)])).toBe(true);
    expect(delta.z).toBe(2);

    expect(applyGroupAxisCandidate('z', 'feature', delta, 5, winners, snapLines, [line('z', 5)])).toBe(true);
    expect(delta.z).toBe(5);
    expect(snapLines).toHaveLength(1);
    expect(snapLines[0].snapValue).toBe(5);
  });

  it('keeps candidates isolated per axis', () => {
    const winners = createAxisSnapWinners();
    const snapLines: SnapLine[] = [];
    const delta = { x: 0, y: 0, z: 0 };

    expect(applyGroupAxisCandidate('x', 'face', delta, 4, winners, snapLines, [line('x', 4)])).toBe(true);
    expect(applyGroupAxisCandidate('y', 'feature', delta, 6, winners, snapLines, [line('y', 6)])).toBe(true);

    expect(delta.x).toBe(4);
    expect(delta.y).toBe(6);
    expect(snapLines.map((l) => l.axis).sort()).toEqual(['x', 'y']);
  });
});
