import type { SnapLine } from '../types';
import { applyGroupAxisCandidate } from './groupDragSnapArbitration';
import { shouldUseSnapStage, tryApplyAxisSnap, type AxisSnapWinners, type SnapStage } from './snapPriority';

type Axis = 'x' | 'y' | 'z';
type Position3D = { x: number; y: number; z: number };
type SnapApplyResult = { accepted: boolean; lines?: SnapLine[] };
type SnapPositionResult = {
  adjustedPosition: Position3D;
  snappedX: boolean;
  snappedY: boolean;
  snappedZ: boolean;
  snapLines: SnapLine[];
};

type GuideSnapCandidate = {
  delta: number;
  guideId: string;
};

type GuideSnapSet = Partial<Record<Axis, GuideSnapCandidate | null>>;
type OriginSnapCandidate = {
  delta: number;
  snapType: string;
};
type OriginSnapSet = Partial<Record<Axis, OriginSnapCandidate | null>>;
type AdvancedPositionDetectors = {
  mate?: () => SnapPositionResult;
  surface?: () => SnapPositionResult;
  fraction?: () => SnapPositionResult;
  feature?: () => { result: SnapPositionResult; stage: SnapStage };
  axis?: () => SnapPositionResult;
};
type AdvancedDeltaDetectors = {
  mate?: () => SnapPositionResult;
  surface?: () => SnapPositionResult;
  fraction?: () => SnapPositionResult;
  feature?: () => SnapPositionResult;
  axis?: () => SnapPositionResult;
};

export interface LatchedFaceSnapState {
  adjustedPosition: Position3D;
  lockAxis: Axis;
  snappedX: boolean;
  snappedY: boolean;
  snappedZ: boolean;
  snapLines: SnapLine[];
}

export function getFaceLockAxis(
  faceResult: { adjustedPosition: Position3D; snapLines: SnapLine[] },
  basePosition: Position3D
): Axis {
  const faceLineAxis = faceResult.snapLines.find((line) => line.type === 'face')?.axis;
  if (faceLineAxis === 'x' || faceLineAxis === 'y' || faceLineAxis === 'z') return faceLineAxis;

  const dx = Math.abs(faceResult.adjustedPosition.x - basePosition.x);
  const dy = Math.abs(faceResult.adjustedPosition.y - basePosition.y);
  const dz = Math.abs(faceResult.adjustedPosition.z - basePosition.z);
  return dx >= dy && dx >= dz ? 'x' : dy >= dz ? 'y' : 'z';
}

export function normalizeFaceSnapToLockedAxis(
  faceResult: SnapPositionResult,
  basePosition: Position3D
): SnapPositionResult {
  const faceLockAxis = getFaceLockAxis(faceResult, basePosition);
  return {
    ...faceResult,
    snappedX: faceLockAxis === 'x' && faceResult.snappedX,
    snappedY: faceLockAxis === 'y' && faceResult.snappedY,
    snappedZ: faceLockAxis === 'z' && faceResult.snappedZ
  };
}

export function resolveLatchedFaceSnap(
  currentResult: SnapPositionResult,
  basePosition: Position3D,
  latchedFaceSnap: LatchedFaceSnapState | null,
  snapThreshold: number
): { result: SnapPositionResult; nextLatchedFaceSnap: LatchedFaceSnapState | null } {
  const hasFaceSnap = currentResult.snappedX || currentResult.snappedY || currentResult.snappedZ;
  if (hasFaceSnap) {
    const lockAxis = getFaceLockAxis(currentResult, basePosition);
    return {
      result: currentResult,
      nextLatchedFaceSnap: {
        adjustedPosition: currentResult.adjustedPosition,
        lockAxis,
        snappedX: currentResult.snappedX,
        snappedY: currentResult.snappedY,
        snappedZ: currentResult.snappedZ,
        snapLines: currentResult.snapLines
      }
    };
  }

  if (
    latchedFaceSnap &&
    currentResult.closestDistance !== undefined &&
    currentResult.closestDistance < snapThreshold * 1.1
  ) {
    const breakoutDistance = Math.max(0.12, snapThreshold * 0.6);
    const breakX =
      latchedFaceSnap.lockAxis === 'x' &&
      latchedFaceSnap.snappedX &&
      Math.abs(basePosition.x - latchedFaceSnap.adjustedPosition.x) > breakoutDistance;
    const breakY =
      latchedFaceSnap.lockAxis === 'y' &&
      latchedFaceSnap.snappedY &&
      Math.abs(basePosition.y - latchedFaceSnap.adjustedPosition.y) > breakoutDistance;
    const breakZ =
      latchedFaceSnap.lockAxis === 'z' &&
      latchedFaceSnap.snappedZ &&
      Math.abs(basePosition.z - latchedFaceSnap.adjustedPosition.z) > breakoutDistance;

    if (!(breakX || breakY || breakZ)) {
      return {
        result: {
          ...currentResult,
          adjustedPosition: latchedFaceSnap.adjustedPosition,
          snappedX: latchedFaceSnap.lockAxis === 'x' && latchedFaceSnap.snappedX,
          snappedY: latchedFaceSnap.lockAxis === 'y' && latchedFaceSnap.snappedY,
          snappedZ: latchedFaceSnap.lockAxis === 'z' && latchedFaceSnap.snappedZ,
          snapLines: latchedFaceSnap.snapLines
        },
        nextLatchedFaceSnap: latchedFaceSnap
      };
    }
  }

  return {
    result: currentResult,
    nextLatchedFaceSnap: null
  };
}

export function solvePositionSnapStages(params: {
  axes: Record<Axis, boolean>;
  winners: AxisSnapWinners;
  snapLines: SnapLine[];
  guideSnaps?: GuideSnapSet;
  applyGuideDelta?: (axis: Axis, delta: number, guideId: string) => SnapApplyResult;
  originSnaps?: OriginSnapSet;
  applyOriginDelta?: (axis: Axis, delta: number, snapType: string) => SnapApplyResult;
  face?: {
    detect: () => SnapPositionResult;
    basePosition: Position3D;
    latchedFaceSnap?: LatchedFaceSnapState | null;
    snapThreshold?: number;
    applyAxisPosition: (axis: Axis, nextValue: number) => boolean;
    onLatchedFaceSnapChange?: (next: LatchedFaceSnapState | null) => void;
  };
  advanced?: {
    enableSurfaceAnchors: boolean;
    enableFractionalAnchors: boolean;
    enableGoldenRatioAnchors: boolean;
    enableFeatureAnchors: boolean;
    applyAxisPosition: (axis: Axis, nextValue: number) => boolean;
    detectors: AdvancedPositionDetectors;
  };
}): void {
  const { axes, winners, snapLines, guideSnaps, applyGuideDelta, originSnaps, applyOriginDelta, face, advanced } =
    params;

  if (guideSnaps && applyGuideDelta) {
    applyGuideSnapsToPosition(guideSnaps, axes, winners, snapLines, applyGuideDelta);
  }

  if (originSnaps && applyOriginDelta) {
    applyOriginSnapsToPosition(originSnaps, axes, winners, snapLines, applyOriginDelta);
  }

  if (face) {
    const faceResult = face.detect();
    const latchedFaceResolution =
      face.latchedFaceSnap !== undefined && face.snapThreshold !== undefined
        ? resolveLatchedFaceSnap(faceResult, face.basePosition, face.latchedFaceSnap, face.snapThreshold)
        : { result: faceResult, nextLatchedFaceSnap: null };
    face.onLatchedFaceSnapChange?.(latchedFaceResolution.nextLatchedFaceSnap);
    applyFacePositionSnapResult(
      latchedFaceResolution.result,
      face.basePosition,
      axes,
      winners,
      snapLines,
      face.applyAxisPosition
    );
  }

  if (advanced) {
    runPositionAdvancedSnapFamilies(
      {
        axes,
        winners,
        snapLines,
        enableSurfaceAnchors: advanced.enableSurfaceAnchors,
        enableFractionalAnchors: advanced.enableFractionalAnchors,
        enableGoldenRatioAnchors: advanced.enableGoldenRatioAnchors,
        enableFeatureAnchors: advanced.enableFeatureAnchors,
        applyAxisPosition: advanced.applyAxisPosition
      },
      advanced.detectors
    );
  }
}

export function solveDeltaSnapStages(params: {
  axes: Record<Axis, boolean>;
  winners: AxisSnapWinners;
  snapLines: SnapLine[];
  workingDelta: Position3D;
  anchorPosition: Position3D;
  guideSnaps?: GuideSnapSet;
  applyGuideDelta?: (axis: Axis, delta: number, guideId: string) => boolean;
  originSnaps?: OriginSnapSet;
  applyOriginDelta?: (axis: Axis, delta: number, snapType: string) => boolean;
  face?: {
    detect: () => SnapPositionResult;
    basePosition: Position3D;
  };
  advanced?: {
    enableSurfaceAnchors: boolean;
    enableFractionalAnchors: boolean;
    enableGoldenRatioAnchors: boolean;
    enableFeatureAnchors: boolean;
    detectors: AdvancedDeltaDetectors;
  };
}): void {
  const {
    axes,
    winners,
    snapLines,
    workingDelta,
    anchorPosition,
    guideSnaps,
    applyGuideDelta,
    originSnaps,
    applyOriginDelta,
    face,
    advanced
  } = params;

  if (guideSnaps && applyGuideDelta) {
    applyGuideSnapsToDelta(guideSnaps, axes, winners, snapLines, applyGuideDelta);
  }

  if (originSnaps && applyOriginDelta) {
    applyOriginSnapsToDelta(originSnaps, axes, winners, snapLines, applyOriginDelta);
  }

  if (face) {
    applyFaceDeltaSnapResult(face.detect(), face.basePosition, axes, winners, snapLines, workingDelta, anchorPosition);
  }

  if (advanced) {
    runDeltaAdvancedSnapFamilies(
      {
        axes,
        winners,
        snapLines,
        workingDelta,
        anchorPosition,
        enableSurfaceAnchors: advanced.enableSurfaceAnchors,
        enableFractionalAnchors: advanced.enableFractionalAnchors,
        enableGoldenRatioAnchors: advanced.enableGoldenRatioAnchors,
        enableFeatureAnchors: advanced.enableFeatureAnchors
      },
      advanced.detectors
    );
  }
}

export function applyFacePositionSnapResult(
  faceResult: SnapPositionResult,
  basePosition: Position3D,
  axes: Record<Axis, boolean>,
  winners: AxisSnapWinners,
  snapLines: SnapLine[],
  applyAxisPosition: (axis: Axis, nextValue: number) => boolean
): SnapPositionResult {
  const lockedFaceSnapResult = normalizeFaceSnapToLockedAxis(faceResult, basePosition);
  applyAdvancedPositionSnapResult(lockedFaceSnapResult, 'face', axes, winners, snapLines, applyAxisPosition);
  return lockedFaceSnapResult;
}

export function applyFaceDeltaSnapResult(
  faceResult: SnapPositionResult,
  basePosition: Position3D,
  axes: Record<Axis, boolean>,
  winners: AxisSnapWinners,
  snapLines: SnapLine[],
  workingDelta: Position3D,
  anchorPosition: Position3D
): SnapPositionResult {
  const lockedFaceSnapResult = normalizeFaceSnapToLockedAxis(faceResult, basePosition);
  applyAdvancedDeltaSnapResult(lockedFaceSnapResult, 'face', axes, winners, snapLines, workingDelta, anchorPosition);
  return lockedFaceSnapResult;
}

export function tryApplyPositionStageForAxis(
  axis: Axis,
  stage: SnapStage,
  winners: AxisSnapWinners,
  snapLines: SnapLine[],
  apply: () => SnapApplyResult
): boolean {
  if (!shouldUseSnapStage(winners[axis], stage)) return false;
  const result = apply();
  if (!result.accepted) return false;
  return tryApplyAxisSnap(axis, stage, winners, snapLines, result.lines ?? []);
}

export function applyAdvancedPositionSnapResult(
  snapResult: SnapPositionResult,
  stage: SnapStage,
  axes: Record<Axis, boolean>,
  winners: AxisSnapWinners,
  snapLines: SnapLine[],
  applyAxisPosition: (axis: Axis, nextValue: number) => boolean
): void {
  if (!(snapResult.snappedX || snapResult.snappedY || snapResult.snappedZ)) return;

  if (axes.x && snapResult.snappedX) {
    tryApplyPositionStageForAxis('x', stage, winners, snapLines, () => ({
      accepted: applyAxisPosition('x', snapResult.adjustedPosition.x),
      lines: snapResult.snapLines.filter((line) => line.axis === 'x')
    }));
  }
  if (axes.y && snapResult.snappedY) {
    tryApplyPositionStageForAxis('y', stage, winners, snapLines, () => ({
      accepted: applyAxisPosition('y', snapResult.adjustedPosition.y),
      lines: snapResult.snapLines.filter((line) => line.axis === 'y')
    }));
  }
  if (axes.z && snapResult.snappedZ) {
    tryApplyPositionStageForAxis('z', stage, winners, snapLines, () => ({
      accepted: applyAxisPosition('z', snapResult.adjustedPosition.z),
      lines: snapResult.snapLines.filter((line) => line.axis === 'z')
    }));
  }
}

export function applyAdvancedDeltaSnapResult(
  snapResult: SnapPositionResult,
  stage: 'mate' | 'surface' | 'fraction' | 'feature' | 'face' | 'axis',
  axes: Record<Axis, boolean>,
  winners: AxisSnapWinners,
  snapLines: SnapLine[],
  workingDelta: Position3D,
  anchorPosition: Position3D
): void {
  if (axes.x && snapResult.snappedX) {
    applyGroupAxisCandidate(
      'x',
      stage,
      workingDelta,
      snapResult.adjustedPosition.x - anchorPosition.x,
      winners,
      snapLines,
      snapResult.snapLines.filter((line) => line.axis === 'x')
    );
  }
  if (axes.y && snapResult.snappedY) {
    applyGroupAxisCandidate(
      'y',
      stage,
      workingDelta,
      snapResult.adjustedPosition.y - anchorPosition.y,
      winners,
      snapLines,
      snapResult.snapLines.filter((line) => line.axis === 'y')
    );
  }
  if (axes.z && snapResult.snappedZ) {
    applyGroupAxisCandidate(
      'z',
      stage,
      workingDelta,
      snapResult.adjustedPosition.z - anchorPosition.z,
      winners,
      snapLines,
      snapResult.snapLines.filter((line) => line.axis === 'z')
    );
  }
}

export function applyGuideSnapsToPosition(
  guideSnaps: GuideSnapSet,
  axes: Record<Axis, boolean>,
  winners: AxisSnapWinners,
  snapLines: SnapLine[],
  applyAxisDelta: (axis: Axis, delta: number, guideId: string) => SnapApplyResult
): void {
  if (guideSnaps.x && axes.x) {
    tryApplyPositionStageForAxis('x', 'guide', winners, snapLines, () =>
      applyAxisDelta('x', guideSnaps.x!.delta, guideSnaps.x!.guideId)
    );
  }
  if (guideSnaps.y && axes.y) {
    tryApplyPositionStageForAxis('y', 'guide', winners, snapLines, () =>
      applyAxisDelta('y', guideSnaps.y!.delta, guideSnaps.y!.guideId)
    );
  }
  if (guideSnaps.z && axes.z) {
    tryApplyPositionStageForAxis('z', 'guide', winners, snapLines, () =>
      applyAxisDelta('z', guideSnaps.z!.delta, guideSnaps.z!.guideId)
    );
  }
}

export function applyOriginSnapsToPosition(
  originSnaps: OriginSnapSet,
  axes: Record<Axis, boolean>,
  winners: AxisSnapWinners,
  snapLines: SnapLine[],
  applyAxisDelta: (axis: Axis, delta: number, snapType: string) => SnapApplyResult
): void {
  if (originSnaps.x && axes.x) {
    tryApplyPositionStageForAxis('x', 'origin', winners, snapLines, () =>
      applyAxisDelta('x', originSnaps.x!.delta, originSnaps.x!.snapType)
    );
  }
  if (originSnaps.y && axes.y) {
    tryApplyPositionStageForAxis('y', 'origin', winners, snapLines, () =>
      applyAxisDelta('y', originSnaps.y!.delta, originSnaps.y!.snapType)
    );
  }
  if (originSnaps.z && axes.z) {
    tryApplyPositionStageForAxis('z', 'origin', winners, snapLines, () =>
      applyAxisDelta('z', originSnaps.z!.delta, originSnaps.z!.snapType)
    );
  }
}

export function applyGuideSnapsToDelta(
  guideSnaps: GuideSnapSet,
  axes: Record<Axis, boolean>,
  winners: AxisSnapWinners,
  snapLines: SnapLine[],
  applyAxisDelta: (axis: Axis, delta: number, guideId: string) => boolean
): void {
  if (guideSnaps.x && axes.x) {
    applyAxisDelta('x', guideSnaps.x.delta, guideSnaps.x.guideId);
  }
  if (guideSnaps.y && axes.y) {
    applyAxisDelta('y', guideSnaps.y.delta, guideSnaps.y.guideId);
  }
  if (guideSnaps.z && axes.z) {
    applyAxisDelta('z', guideSnaps.z.delta, guideSnaps.z.guideId);
  }
  void winners;
  void snapLines;
}

export function applyOriginSnapsToDelta(
  originSnaps: OriginSnapSet,
  axes: Record<Axis, boolean>,
  winners: AxisSnapWinners,
  snapLines: SnapLine[],
  applyAxisDelta: (axis: Axis, delta: number, snapType: string) => boolean
): void {
  if (originSnaps.x && axes.x) {
    applyAxisDelta('x', originSnaps.x.delta, originSnaps.x.snapType);
  }
  if (originSnaps.y && axes.y) {
    applyAxisDelta('y', originSnaps.y.delta, originSnaps.y.snapType);
  }
  if (originSnaps.z && axes.z) {
    applyAxisDelta('z', originSnaps.z.delta, originSnaps.z.snapType);
  }
  void winners;
  void snapLines;
}

export function runPositionAdvancedSnapFamilies(
  params: {
    axes: Record<Axis, boolean>;
    winners: AxisSnapWinners;
    snapLines: SnapLine[];
    enableSurfaceAnchors: boolean;
    enableFractionalAnchors: boolean;
    enableGoldenRatioAnchors: boolean;
    enableFeatureAnchors: boolean;
    applyAxisPosition: (axis: Axis, nextValue: number) => boolean;
  },
  detectors: {
    mate?: () => SnapPositionResult;
    surface?: () => SnapPositionResult;
    fraction?: () => SnapPositionResult;
    feature?: () => { result: SnapPositionResult; stage: SnapStage };
    axis?: () => SnapPositionResult;
  }
): void {
  const { axes, winners, snapLines, applyAxisPosition } = params;

  if (params.enableFeatureAnchors && detectors.mate) {
    // Feature-mating snaps (part fits a dado/groove/mortise socket) outrank
    // face alignment via the 'mate' stage priority.
    applyAdvancedPositionSnapResult(detectors.mate(), 'mate', axes, winners, snapLines, applyAxisPosition);
  }
  if (params.enableSurfaceAnchors && detectors.surface) {
    applyAdvancedPositionSnapResult(detectors.surface(), 'surface', axes, winners, snapLines, applyAxisPosition);
  }
  if ((params.enableFractionalAnchors || params.enableGoldenRatioAnchors) && detectors.fraction) {
    applyAdvancedPositionSnapResult(detectors.fraction(), 'fraction', axes, winners, snapLines, applyAxisPosition);
  }
  if (params.enableFeatureAnchors && detectors.feature) {
    const feature = detectors.feature();
    applyAdvancedPositionSnapResult(feature.result, feature.stage, axes, winners, snapLines, applyAxisPosition);
  }
  if (detectors.axis) {
    applyAdvancedPositionSnapResult(detectors.axis(), 'axis', axes, winners, snapLines, applyAxisPosition);
  }
}

export function runDeltaAdvancedSnapFamilies(
  params: {
    axes: Record<Axis, boolean>;
    winners: AxisSnapWinners;
    snapLines: SnapLine[];
    workingDelta: Position3D;
    anchorPosition: Position3D;
    enableSurfaceAnchors: boolean;
    enableFractionalAnchors: boolean;
    enableGoldenRatioAnchors: boolean;
    enableFeatureAnchors: boolean;
  },
  detectors: {
    mate?: () => SnapPositionResult;
    surface?: () => SnapPositionResult;
    fraction?: () => SnapPositionResult;
    feature?: () => SnapPositionResult;
    axis?: () => SnapPositionResult;
  }
): void {
  const { axes, winners, snapLines, workingDelta, anchorPosition } = params;

  if (params.enableFeatureAnchors && detectors.mate) {
    applyAdvancedDeltaSnapResult(detectors.mate(), 'mate', axes, winners, snapLines, workingDelta, anchorPosition);
  }
  if (params.enableSurfaceAnchors && detectors.surface) {
    applyAdvancedDeltaSnapResult(
      detectors.surface(),
      'surface',
      axes,
      winners,
      snapLines,
      workingDelta,
      anchorPosition
    );
  }
  if ((params.enableFractionalAnchors || params.enableGoldenRatioAnchors) && detectors.fraction) {
    applyAdvancedDeltaSnapResult(
      detectors.fraction(),
      'fraction',
      axes,
      winners,
      snapLines,
      workingDelta,
      anchorPosition
    );
  }
  if (params.enableFeatureAnchors && detectors.feature) {
    applyAdvancedDeltaSnapResult(
      detectors.feature(),
      'feature',
      axes,
      winners,
      snapLines,
      workingDelta,
      anchorPosition
    );
  }
  if (detectors.axis) {
    applyAdvancedDeltaSnapResult(detectors.axis(), 'axis', axes, winners, snapLines, workingDelta, anchorPosition);
  }
}
