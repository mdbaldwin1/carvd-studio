import type { AppSettings, Part, SnapGuide, SnapLine } from '../types';
import { createAxisSnapWinners } from './snapPriority';
import { applyGroupAxisCandidate } from './groupDragSnapArbitration';
import { createPartSnapContext, createGroupProxySnapContext, detectFaceSnapForContext } from './interactionSnapContext';
import { solveDeltaSnapStages, solvePositionSnapStages, type LatchedFaceSnapState } from './interactionSnap';
import {
  createGuideSnapLine,
  createOriginSnapLine,
  getPartBoundsAtPosition,
  type PartBounds,
  type SnapResult
} from './snapToPartsUtil';

type Position3D = { x: number; y: number; z: number };
type Axis = 'x' | 'y' | 'z';
type Axes = Record<Axis, boolean>;

export interface MovePreviewResult {
  snapLines: SnapLine[];
  snappedAxes: { x: boolean; y: boolean; z: boolean };
}

export interface PartMovePreviewResult extends MovePreviewResult {
  position: Position3D;
  nextLatchedFaceSnap: LatchedFaceSnapState | null;
}

export interface GroupMovePreviewResult extends MovePreviewResult {
  delta: Position3D;
}

function getSnappedAxes(snapLines: SnapLine[]) {
  return {
    x: snapLines.some((line) => line.axis === 'x'),
    y: snapLines.some((line) => line.axis === 'y'),
    z: snapLines.some((line) => line.axis === 'z')
  };
}

export function solvePartMoveSnapPreview(params: {
  part: Part;
  position: Position3D;
  axes: Axes;
  worldHalfHeight: number;
  referenceParts: Part[];
  movingPartIds: string[];
  snapGuides: SnapGuide[];
  settings: AppSettings;
  snapThreshold: number;
  latchedFaceSnap: LatchedFaceSnapState | null;
  resolveFeatureStage: (featureSnapResult: SnapResult, currentPosition: Position3D) => 'face' | 'feature';
}): PartMovePreviewResult {
  const {
    part,
    position,
    axes,
    worldHalfHeight,
    referenceParts,
    movingPartIds,
    snapGuides,
    settings,
    snapThreshold,
    latchedFaceSnap,
    resolveFeatureStage
  } = params;

  let nextPosition = { ...position };
  let nextLatchedFaceSnap = latchedFaceSnap;
  const snapLines: SnapLine[] = [];
  const winners = createAxisSnapWinners();

  const applyAxisPosition = (axis: Axis, nextValue: number) => {
    if (axis === 'y' && nextValue < worldHalfHeight) return false;
    nextPosition = { ...nextPosition, [axis]: nextValue };
    return true;
  };

  const getSnapContext = () =>
    createPartSnapContext({
      part,
      position: nextPosition,
      referenceParts,
      movingPartIds,
      snapGuides,
      snapThreshold,
      snapToOrigin: settings.snapToOrigin,
      enableGoldenRatioAnchors: settings.enableGoldenRatioAnchors ?? false,
      enableAxisLegacySnaps: settings.enableAxisLegacySnaps ?? true,
      resolveFeatureStage
    });
  const initialContext = getSnapContext();

  solvePositionSnapStages({
    axes,
    winners,
    snapLines,
    guideSnaps: initialContext.guideSnaps,
    applyGuideDelta: (axis, delta, guideId) => {
      const candidate = { ...nextPosition, [axis]: nextPosition[axis] + delta };
      if (axis === 'y' && candidate.y < worldHalfHeight) return { accepted: false };
      nextPosition = candidate;
      const guide = snapGuides.find((entry) => entry.id === guideId);
      if (!guide) return { accepted: false };
      return {
        accepted: true,
        lines: [createGuideSnapLine(guide, getPartBoundsAtPosition(part, nextPosition))]
      };
    },
    originSnaps: initialContext.originSnaps,
    applyOriginDelta: (axis, delta, snapType) => {
      const candidate = { ...nextPosition, [axis]: nextPosition[axis] + delta };
      if (axis === 'y' && candidate.y < worldHalfHeight) return { accepted: false };
      nextPosition = candidate;
      return {
        accepted: true,
        lines: [
          createOriginSnapLine(axis, snapType as 'min' | 'center' | 'max', getPartBoundsAtPosition(part, nextPosition))
        ]
      };
    },
    face:
      referenceParts.length > 0
        ? {
            detect: () => detectFaceSnapForContext(getSnapContext(), referenceParts, movingPartIds, snapThreshold),
            basePosition: nextPosition,
            latchedFaceSnap,
            snapThreshold,
            applyAxisPosition,
            onLatchedFaceSnapChange: (next) => {
              nextLatchedFaceSnap = next;
            }
          }
        : undefined,
    advanced:
      referenceParts.length > 0
        ? {
            enableSurfaceAnchors: settings.enableSurfaceAnchors ?? true,
            enableFractionalAnchors: settings.enableFractionalAnchors ?? true,
            enableGoldenRatioAnchors: settings.enableGoldenRatioAnchors ?? false,
            enableFeatureAnchors: settings.enableFeatureAnchors ?? true,
            applyAxisPosition,
            detectors: {
              surface: () => getSnapContext().advancedDetectors.surface(),
              fraction: () => getSnapContext().advancedDetectors.fraction(),
              feature: () => getSnapContext().advancedDetectors.feature(),
              axis: getSnapContext().advancedDetectors.axis
                ? () => getSnapContext().advancedDetectors.axis!()
                : undefined
            }
          }
        : undefined
  });

  return {
    position: nextPosition,
    nextLatchedFaceSnap,
    snapLines,
    snappedAxes: getSnappedAxes(snapLines)
  };
}

function offsetBounds(bounds: PartBounds, delta: Position3D): PartBounds {
  return {
    ...bounds,
    minX: bounds.minX + delta.x,
    maxX: bounds.maxX + delta.x,
    minY: bounds.minY + delta.y,
    maxY: bounds.maxY + delta.y,
    minZ: bounds.minZ + delta.z,
    maxZ: bounds.maxZ + delta.z,
    centerX: bounds.centerX + delta.x,
    centerY: bounds.centerY + delta.y,
    centerZ: bounds.centerZ + delta.z
  };
}

export function solveGroupMoveSnapPreview(params: {
  initialBounds: PartBounds;
  anchorPosition: Position3D;
  delta: Position3D;
  axes: Axes;
  referenceParts: Part[];
  movingPartIds: string[];
  movingParts: Part[];
  snapGuides: SnapGuide[];
  settings: AppSettings;
  snapThreshold: number;
}): GroupMovePreviewResult {
  const {
    initialBounds,
    anchorPosition,
    delta,
    axes,
    referenceParts,
    movingPartIds,
    movingParts,
    snapGuides,
    settings,
    snapThreshold
  } = params;

  const snapLines: SnapLine[] = [];
  const winners = createAxisSnapWinners();
  let workingDelta = { ...delta };
  let movingBounds = offsetBounds(initialBounds, workingDelta);
  const getSnapContext = () =>
    createGroupProxySnapContext({
      initialBounds,
      anchorPosition,
      delta: workingDelta,
      referenceParts,
      movingPartIds,
      movingParts,
      snapGuides,
      snapThreshold,
      snapToOrigin: settings.snapToOrigin,
      enableGoldenRatioAnchors: settings.enableGoldenRatioAnchors ?? false,
      enableAxisLegacySnaps: settings.enableAxisLegacySnaps ?? true
    });
  const initialContext = getSnapContext();

  solveDeltaSnapStages({
    axes,
    winners,
    snapLines,
    workingDelta,
    anchorPosition,
    guideSnaps: initialContext.guideSnaps,
    applyGuideDelta: (axis, deltaValue, guideId) => {
      workingDelta[axis] += deltaValue;
      const guide = snapGuides.find((entry) => entry.id === guideId);
      if (!guide) return false;
      movingBounds = offsetBounds(initialBounds, workingDelta);
      const applied = applyGroupAxisCandidate(axis, 'guide', workingDelta, workingDelta[axis], winners, snapLines, [
        createGuideSnapLine(guide, movingBounds)
      ]);
      if (!applied) {
        movingBounds = offsetBounds(initialBounds, workingDelta);
      }
      return applied;
    },
    originSnaps: initialContext.originSnaps,
    applyOriginDelta: (axis, deltaValue, snapType) => {
      workingDelta[axis] += deltaValue;
      movingBounds = offsetBounds(initialBounds, workingDelta);
      const applied = applyGroupAxisCandidate(axis, 'origin', workingDelta, workingDelta[axis], winners, snapLines, [
        createOriginSnapLine(axis, snapType as 'min' | 'center' | 'max', movingBounds)
      ]);
      if (!applied) {
        movingBounds = offsetBounds(initialBounds, workingDelta);
      }
      return applied;
    },
    face: {
      detect: () => detectFaceSnapForContext(getSnapContext(), referenceParts, movingPartIds, snapThreshold),
      basePosition: {
        x: anchorPosition.x + workingDelta.x,
        y: anchorPosition.y + workingDelta.y,
        z: anchorPosition.z + workingDelta.z
      }
    },
    advanced: {
      enableSurfaceAnchors: settings.enableSurfaceAnchors ?? true,
      enableFractionalAnchors: settings.enableFractionalAnchors ?? true,
      enableGoldenRatioAnchors: settings.enableGoldenRatioAnchors ?? false,
      enableFeatureAnchors: settings.enableFeatureAnchors ?? true,
      detectors: {
        surface: () => getSnapContext().advancedDetectors.surface(),
        fraction: () => getSnapContext().advancedDetectors.fraction(),
        feature: () => getSnapContext().advancedDetectors.feature() as SnapResult,
        axis: getSnapContext().advancedDetectors.axis ? () => getSnapContext().advancedDetectors.axis!() : undefined
      }
    }
  });

  return {
    delta: workingDelta,
    snapLines,
    snappedAxes: getSnappedAxes(snapLines)
  };
}
