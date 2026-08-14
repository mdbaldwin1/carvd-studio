import type { Part, SnapGuide } from '../types';
import { isAxisAlignedRotation } from './rotation';
import {
  detectFaceSnaps,
  detectFeatureSnaps,
  detectFractionalFaceSnaps,
  detectGuideSnaps,
  detectOriginSnaps,
  detectSnaps,
  detectSurfaceAnchorSnaps,
  getPartBoundsAtPosition,
  type PartBounds,
  type SnapResult
} from './snapToPartsUtil';
import type { SnapStage } from './snapPriority';

type Position3D = { x: number; y: number; z: number };

export interface InteractionSnapContext {
  subjectPart: Part;
  facePosition: Position3D;
  featurePosition: Position3D;
  guideBounds: PartBounds;
  originBounds: PartBounds;
  guideSnaps?: ReturnType<typeof detectGuideSnaps>;
  originSnaps?: ReturnType<typeof detectOriginSnaps>;
  advancedDetectors: {
    surface: () => SnapResult;
    fraction: () => SnapResult;
    feature: () => SnapResult | { result: SnapResult; stage: SnapStage };
    axis?: () => SnapResult;
  };
}

function buildProxyPart(bounds: PartBounds, position: Position3D): Part {
  return {
    id: 'group-proxy',
    name: 'Group Proxy',
    length: bounds.maxX - bounds.minX,
    width: bounds.maxZ - bounds.minZ,
    thickness: bounds.maxY - bounds.minY,
    position,
    rotation: { x: 0, y: 0, z: 0 },
    stockId: null,
    grainSensitive: false,
    grainDirection: 'length',
    color: '#ffffff'
  };
}

export function createPartSnapContext(params: {
  part: Part;
  position: Position3D;
  referenceParts: Part[];
  movingPartIds: string[];
  snapGuides: SnapGuide[];
  snapThreshold: number;
  snapToOrigin: boolean;
  enableGoldenRatioAnchors: boolean;
  enableAxisLegacySnaps: boolean;
  resolveFeatureStage?: (result: SnapResult, currentPosition: Position3D) => SnapStage;
}): InteractionSnapContext {
  const {
    part,
    position,
    referenceParts,
    movingPartIds,
    snapGuides,
    snapThreshold,
    snapToOrigin,
    enableGoldenRatioAnchors,
    enableAxisLegacySnaps,
    resolveFeatureStage
  } = params;

  const guideBounds = getPartBoundsAtPosition(part, position);
  const axisAlignedContext =
    referenceParts.length > 0 &&
    isAxisAlignedRotation(part.rotation) &&
    referenceParts.every((candidate) =>
      movingPartIds.includes(candidate.id) ? true : isAxisAlignedRotation(candidate.rotation)
    );

  return {
    subjectPart: part,
    facePosition: position,
    featurePosition: position,
    guideBounds,
    originBounds: guideBounds,
    guideSnaps: snapGuides.length > 0 ? detectGuideSnaps(guideBounds, snapGuides, snapThreshold) : undefined,
    originSnaps: snapToOrigin ? detectOriginSnaps(guideBounds, snapThreshold) : undefined,
    advancedDetectors: {
      surface: () => detectSurfaceAnchorSnaps(part, position, referenceParts, movingPartIds, snapThreshold),
      fraction: () =>
        detectFractionalFaceSnaps(
          part,
          position,
          referenceParts,
          movingPartIds,
          snapThreshold,
          enableGoldenRatioAnchors
        ),
      feature: () => {
        const result = detectFeatureSnaps(part, position, referenceParts, movingPartIds, snapThreshold);
        if (!resolveFeatureStage) return result;
        return { result, stage: resolveFeatureStage(result, position) };
      },
      axis:
        enableAxisLegacySnaps && axisAlignedContext
          ? () => detectSnaps(part, position, referenceParts, movingPartIds, snapThreshold)
          : undefined
    }
  };
}

export function createGroupProxySnapContext(params: {
  initialBounds: PartBounds;
  anchorPosition: Position3D;
  delta: Position3D;
  referenceParts: Part[];
  movingPartIds: string[];
  movingParts: Part[];
  snapGuides: SnapGuide[];
  snapThreshold: number;
  snapToOrigin: boolean;
  enableGoldenRatioAnchors: boolean;
  enableAxisLegacySnaps: boolean;
}): InteractionSnapContext {
  const {
    initialBounds,
    anchorPosition,
    delta,
    referenceParts,
    movingPartIds,
    movingParts,
    snapGuides,
    snapThreshold,
    snapToOrigin,
    enableGoldenRatioAnchors,
    enableAxisLegacySnaps
  } = params;

  const facePosition = {
    x: anchorPosition.x + delta.x,
    y: anchorPosition.y + delta.y,
    z: anchorPosition.z + delta.z
  };
  const featurePosition = facePosition;
  const subjectPart = buildProxyPart(initialBounds, facePosition);
  const guideBounds = {
    ...initialBounds,
    minX: initialBounds.minX + delta.x,
    maxX: initialBounds.maxX + delta.x,
    minY: initialBounds.minY + delta.y,
    maxY: initialBounds.maxY + delta.y,
    minZ: initialBounds.minZ + delta.z,
    maxZ: initialBounds.maxZ + delta.z,
    centerX: initialBounds.centerX + delta.x,
    centerY: initialBounds.centerY + delta.y,
    centerZ: initialBounds.centerZ + delta.z
  };
  const axisAlignedContext =
    movingParts.every((part) => isAxisAlignedRotation(part.rotation)) &&
    referenceParts.every((candidate) =>
      movingPartIds.includes(candidate.id) ? true : isAxisAlignedRotation(candidate.rotation)
    );

  return {
    subjectPart,
    facePosition,
    featurePosition,
    guideBounds,
    originBounds: guideBounds,
    guideSnaps: snapGuides.length > 0 ? detectGuideSnaps(guideBounds, snapGuides, snapThreshold) : undefined,
    originSnaps: snapToOrigin ? detectOriginSnaps(guideBounds, snapThreshold) : undefined,
    advancedDetectors: {
      surface: () =>
        detectSurfaceAnchorSnaps(subjectPart, featurePosition, referenceParts, movingPartIds, snapThreshold),
      fraction: () =>
        detectFractionalFaceSnaps(
          subjectPart,
          featurePosition,
          referenceParts,
          movingPartIds,
          snapThreshold,
          enableGoldenRatioAnchors
        ),
      feature: () => detectFeatureSnaps(subjectPart, featurePosition, referenceParts, movingPartIds, snapThreshold),
      axis:
        enableAxisLegacySnaps && axisAlignedContext
          ? () => detectSnaps(subjectPart, featurePosition, referenceParts, movingPartIds, snapThreshold)
          : undefined
    }
  };
}

export function detectFaceSnapForContext(
  context: InteractionSnapContext,
  referenceParts: Part[],
  movingPartIds: string[],
  snapThreshold: number
) {
  return detectFaceSnaps(context.subjectPart, context.facePosition, referenceParts, movingPartIds, snapThreshold);
}
