import type { SnapLine } from '../types';
import { tryApplyAxisSnap, type AxisSnapWinners, type SnapStage } from './snapPriority';

type Axis = 'x' | 'y' | 'z';
type Delta = { x: number; y: number; z: number };

export function applyGroupAxisCandidate(
  axis: Axis,
  stage: SnapStage,
  workingDelta: Delta,
  candidateDelta: number,
  winners: AxisSnapWinners,
  snapLines: SnapLine[],
  linesForAxis: SnapLine[]
): boolean {
  const previous = workingDelta[axis];
  workingDelta[axis] = candidateDelta;
  const applied = tryApplyAxisSnap(axis, stage, winners, snapLines, linesForAxis);
  if (!applied) {
    workingDelta[axis] = previous;
  }
  return applied;
}
