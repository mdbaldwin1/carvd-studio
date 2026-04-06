import type { SnapLine } from '../types';

export type SnapStage = 'guide' | 'origin' | 'face' | 'surface' | 'fraction' | 'feature' | 'axis';
type Axis = 'x' | 'y' | 'z';

export type AxisSnapWinners = Record<Axis, SnapStage | null>;

// Single source of truth for per-axis snap precedence.
export const SNAP_STAGE_PRIORITIES: Record<SnapStage, number> = {
  guide: 500,
  origin: 400,
  face: 300,
  surface: 250,
  fraction: 225,
  feature: 200,
  axis: 100
};

export function createAxisSnapWinners(): AxisSnapWinners {
  return { x: null, y: null, z: null };
}

export function shouldUseSnapStage(currentStage: SnapStage | null, candidateStage: SnapStage): boolean {
  if (!currentStage) return true;
  return SNAP_STAGE_PRIORITIES[candidateStage] > SNAP_STAGE_PRIORITIES[currentStage];
}

export function tryApplyAxisSnap(
  axis: Axis,
  stage: SnapStage,
  winners: AxisSnapWinners,
  snapLines: SnapLine[],
  linesForAxis: SnapLine[] = []
): boolean {
  if (!shouldUseSnapStage(winners[axis], stage)) return false;

  for (let i = snapLines.length - 1; i >= 0; i -= 1) {
    if (snapLines[i].axis === axis) snapLines.splice(i, 1);
  }

  if (linesForAxis.length > 0) {
    snapLines.push(...linesForAxis);
  }
  winners[axis] = stage;
  return true;
}
