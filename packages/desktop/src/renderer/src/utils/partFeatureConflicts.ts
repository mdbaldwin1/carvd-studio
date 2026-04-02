import { Part, PartFeature, RectCutFeature } from '@renderer/types';
import { getFeatureTargetLabel } from '@renderer/utils/partFeatureSummary';
import { getResolvedRectCutFeature, isBottomTarget, isTopTarget } from '@renderer/utils/rectCutUtils';

export interface PartFeatureConflict {
  featureId: string;
  featureIndex: number;
  relatedFeatureId?: string;
  relatedFeatureIndex?: number;
  code: 'duplicate_end_cut' | 'rect_overlap' | 'rect_consumed' | 'rect_anchor_removed' | 'rect_depth_intersection';
  severity: 'warning' | 'error';
  message: string;
}

interface RectBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

type ReachableSurface = 'top' | 'bottom';
type DepthInterval = { min: number; max: number };

function overlaps(a: RectBounds, b: RectBounds): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

function contains(container: RectBounds, candidate: RectBounds): boolean {
  return (
    container.minX <= candidate.minX &&
    container.maxX >= candidate.maxX &&
    container.minZ <= candidate.minZ &&
    container.maxZ >= candidate.maxZ
  );
}

function getRectFeatureBounds(feature: RectCutFeature, part: Pick<Part, 'length' | 'width'>): RectBounds | null {
  const resolvedFeature = getResolvedRectCutFeature(feature, { ...part, thickness: 1 });
  const sizeLength = resolvedFeature.parameters.size.length;
  const sizeWidth = resolvedFeature.parameters.size.width;

  if (
    resolvedFeature.cutType === 'cutout' ||
    resolvedFeature.cutType === 'dado' ||
    resolvedFeature.cutType === 'stopped_dado' ||
    resolvedFeature.cutType === 'groove' ||
    resolvedFeature.cutType === 'stopped_groove' ||
    resolvedFeature.cutType === 'mortise'
  ) {
    return {
      minX: resolvedFeature.placement.x,
      maxX: resolvedFeature.placement.x + sizeLength,
      minZ: resolvedFeature.placement.z,
      maxZ: resolvedFeature.placement.z + sizeWidth
    };
  }

  if (resolvedFeature.cutType === 'corner_notch') {
    if (resolvedFeature.target.type !== 'corner') return null;
    const right = resolvedFeature.target.corner.includes('right');
    const back = resolvedFeature.target.corner.startsWith('back_');
    return {
      minX: right ? part.length - sizeLength : 0,
      maxX: right ? part.length : sizeLength,
      minZ: back ? part.width - sizeWidth : 0,
      maxZ: back ? part.width : sizeWidth
    };
  }

  if (resolvedFeature.target.type !== 'edge') return null;

  if (resolvedFeature.target.edge.includes('front') || resolvedFeature.target.edge.includes('back')) {
    const back = resolvedFeature.target.edge.includes('back');
    return {
      minX: resolvedFeature.placement.x,
      maxX: resolvedFeature.placement.x + sizeLength,
      minZ: back ? part.width - sizeWidth : 0,
      maxZ: back ? part.width : sizeWidth
    };
  }

  const right = resolvedFeature.target.edge.includes('right');
  return {
    minX: right ? part.length - sizeLength : 0,
    maxX: right ? part.length : sizeLength,
    minZ: resolvedFeature.placement.z,
    maxZ: resolvedFeature.placement.z + sizeWidth
  };
}

function getReachableSurfaces(feature: RectCutFeature, resolvedFeature: RectCutFeature): Set<ReachableSurface> {
  if (resolvedFeature.cutType === 'cutout' && resolvedFeature.parameters.depthMode === 'through') {
    return new Set<ReachableSurface>(['top', 'bottom']);
  }

  if (isTopTarget(resolvedFeature)) return new Set<ReachableSurface>(['top']);
  if (isBottomTarget(resolvedFeature)) return new Set<ReachableSurface>(['bottom']);

  if (feature.target.type === 'face') {
    if (feature.target.face === 'top_face') return new Set<ReachableSurface>(['top']);
    if (feature.target.face === 'bottom_face') return new Set<ReachableSurface>(['bottom']);
  }

  return new Set<ReachableSurface>();
}

function sharesReachableSurface(
  priorFeature: RectCutFeature,
  currentFeature: RectCutFeature,
  part: Pick<Part, 'length' | 'width' | 'thickness'>
): boolean {
  const priorResolved = getResolvedRectCutFeature(priorFeature, { ...part, thickness: 1 });
  const currentResolved = getResolvedRectCutFeature(currentFeature, { ...part, thickness: 1 });
  const priorSurfaces = getReachableSurfaces(priorFeature, priorResolved);
  const currentSurfaces = getReachableSurfaces(currentFeature, currentResolved);

  for (const surface of currentSurfaces) {
    if (priorSurfaces.has(surface)) return true;
  }
  return false;
}

function getDepthInterval(feature: RectCutFeature, part: Pick<Part, 'thickness'>): DepthInterval {
  const depth =
    getResolvedRectCutFeature(feature, { length: 1, width: 1, thickness: part.thickness }).parameters.depthMode ===
    'through'
      ? part.thickness
      : (feature.parameters.depth ?? 0);
  const clampedDepth = Math.max(0, Math.min(part.thickness, depth));

  if (feature.parameters.depthMode === 'through') {
    return { min: 0, max: part.thickness };
  }

  if (isTopTarget(feature)) {
    return { min: Math.max(0, part.thickness - clampedDepth), max: part.thickness };
  }

  if (isBottomTarget(feature)) {
    return { min: 0, max: clampedDepth };
  }

  return { min: 0, max: part.thickness };
}

function intervalsOverlap(a: DepthInterval, b: DepthInterval): boolean {
  return a.min < b.max && a.max > b.min;
}

function isOpposingBlindIntersection(
  priorFeature: RectCutFeature,
  currentFeature: RectCutFeature,
  part: Pick<Part, 'length' | 'width' | 'thickness'>
): boolean {
  if (priorFeature.parameters.depthMode !== 'blind' || currentFeature.parameters.depthMode !== 'blind') return false;

  const priorResolved = getResolvedRectCutFeature(priorFeature, part);
  const currentResolved = getResolvedRectCutFeature(currentFeature, part);
  const priorSurfaces = getReachableSurfaces(priorFeature, priorResolved);
  const currentSurfaces = getReachableSurfaces(currentFeature, currentResolved);

  const isOpposed =
    (priorSurfaces.has('top') && currentSurfaces.has('bottom')) ||
    (priorSurfaces.has('bottom') && currentSurfaces.has('top'));
  if (!isOpposed) return false;

  return intervalsOverlap(getDepthInterval(priorResolved, part), getDepthInterval(currentResolved, part));
}

function isAnchorDependent(feature: RectCutFeature): boolean {
  return feature.cutType === 'rabbet' || feature.cutType === 'edge_notch' || feature.cutType === 'corner_notch';
}

export function getPartFeatureConflicts(
  features: PartFeature[],
  part: Pick<Part, 'length' | 'width' | 'thickness'>
): PartFeatureConflict[] {
  const conflicts: PartFeatureConflict[] = [];
  const enabledFeatures = features
    .map((feature, index) => ({ feature, index }))
    .filter(({ feature }) => feature.enabled);
  const endCutsByFace = new Map<'left_end' | 'right_end', { featureId: string; featureIndex: number; label: string }>();
  const priorRectCuts: Array<{ feature: RectCutFeature; index: number }> = [];

  for (const { feature, index } of enabledFeatures) {
    if (feature.kind === 'end_cut') {
      const face = feature.target.face;
      const prior = endCutsByFace.get(face);
      if (prior) {
        const message = `Operation ${index + 1} and Operation ${prior.featureIndex + 1} both use ${getFeatureTargetLabel(feature)}. Only one enabled end cut per end is currently supported.`;
        conflicts.push({
          featureId: feature.id,
          featureIndex: index,
          relatedFeatureId: prior.featureId,
          relatedFeatureIndex: prior.featureIndex,
          code: 'duplicate_end_cut',
          severity: 'error',
          message
        });
        conflicts.push({
          featureId: prior.featureId,
          featureIndex: prior.featureIndex,
          relatedFeatureId: feature.id,
          relatedFeatureIndex: index,
          code: 'duplicate_end_cut',
          severity: 'error',
          message
        });
        continue;
      }

      endCutsByFace.set(face, {
        featureId: feature.id,
        featureIndex: index,
        label: getFeatureTargetLabel(feature)
      });
      continue;
    }

    const currentBounds = getRectFeatureBounds(feature, part);
    if (!currentBounds) {
      priorRectCuts.push({ feature, index });
      continue;
    }

    for (const prior of priorRectCuts) {
      const priorBounds = getRectFeatureBounds(prior.feature, part);
      const a = priorBounds;
      const b = currentBounds;
      if (!a || !b || !overlaps(a, b)) continue;

      let code: PartFeatureConflict['code'] = 'rect_overlap';
      let severity: PartFeatureConflict['severity'] = 'warning';
      let message = `Operation ${index + 1} overlaps Operation ${prior.index + 1}. The resulting removal stack is allowed, but order now matters.`;

      if (sharesReachableSurface(prior.feature, feature, part)) {
        if (isAnchorDependent(feature)) {
          code = 'rect_anchor_removed';
          severity = 'error';
          message = `Operation ${index + 1} depends on ${getFeatureTargetLabel(feature)}, but Operation ${prior.index + 1} already removes that anchor material.`;
        } else if (contains(a, b)) {
          code = 'rect_consumed';
          severity = 'error';
          message = `Operation ${index + 1} starts inside material already removed by Operation ${prior.index + 1}.`;
        }
      } else if (isOpposingBlindIntersection(prior.feature, feature, part)) {
        code = 'rect_depth_intersection';
        severity = 'error';
        message = `Operation ${index + 1} intersects Operation ${prior.index + 1} from the opposite face. Combined depths remove the same interior material.`;
      }

      conflicts.push({
        featureId: prior.feature.id,
        featureIndex: prior.index,
        relatedFeatureId: feature.id,
        relatedFeatureIndex: index,
        code,
        severity,
        message
      });
      conflicts.push({
        featureId: feature.id,
        featureIndex: index,
        relatedFeatureId: prior.feature.id,
        relatedFeatureIndex: prior.index,
        code,
        severity,
        message
      });
    }

    priorRectCuts.push({ feature, index });
  }

  return conflicts;
}
