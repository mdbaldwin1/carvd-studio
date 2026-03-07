import { Part, PartFeature, RectCutFeature } from '@renderer/types';
import { getFeatureTargetLabel } from '@renderer/utils/partFeatureSummary';

export interface PartFeatureConflict {
  featureId: string;
  featureIndex: number;
  relatedFeatureId?: string;
  relatedFeatureIndex?: number;
  code: 'duplicate_end_cut' | 'rect_overlap';
  severity: 'warning' | 'error';
  message: string;
}

interface RectBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function overlaps(a: RectBounds, b: RectBounds): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

function getRectFeatureBounds(feature: RectCutFeature, part: Pick<Part, 'length' | 'width'>): RectBounds | null {
  const sizeLength = feature.parameters.size.length;
  const sizeWidth = feature.parameters.size.width;

  if (feature.cutType === 'cutout') {
    return {
      minX: feature.placement.x,
      maxX: feature.placement.x + sizeLength,
      minZ: feature.placement.z,
      maxZ: feature.placement.z + sizeWidth
    };
  }

  if (feature.cutType === 'corner_notch') {
    if (feature.target.type !== 'corner') return null;
    const right = feature.target.corner.includes('_right_');
    const back = feature.target.corner.startsWith('back_');
    return {
      minX: right ? part.length - sizeLength : 0,
      maxX: right ? part.length : sizeLength,
      minZ: back ? part.width - sizeWidth : 0,
      maxZ: back ? part.width : sizeWidth
    };
  }

  if (feature.target.type !== 'edge') return null;

  if (feature.target.edge.includes('front') || feature.target.edge.includes('back')) {
    const back = feature.target.edge.includes('back');
    return {
      minX: feature.placement.x,
      maxX: feature.placement.x + sizeLength,
      minZ: back ? part.width - sizeWidth : 0,
      maxZ: back ? part.width : sizeWidth
    };
  }

  const right = feature.target.edge.includes('right');
  return {
    minX: right ? part.length - sizeLength : 0,
    maxX: right ? part.length : sizeLength,
    minZ: feature.placement.z,
    maxZ: feature.placement.z + sizeWidth
  };
}

export function getPartFeatureConflicts(
  features: PartFeature[],
  part: Pick<Part, 'length' | 'width'>
): PartFeatureConflict[] {
  const conflicts: PartFeatureConflict[] = [];
  const enabledFeatures = features.filter((feature) => feature.enabled).map((feature, index) => ({ feature, index }));
  const endCutsByFace = new Map<'left_end' | 'right_end', { featureId: string; featureIndex: number; label: string }>();
  const priorRectCuts: Array<{ feature: RectCutFeature; index: number }> = [];

  for (const { feature, index } of enabledFeatures) {
    if (feature.kind === 'end_cut') {
      const face = feature.target.face;
      const prior = endCutsByFace.get(face);
      if (prior) {
        const message = `Operation ${index + 1} and Operation ${prior.featureIndex + 1} both use ${getFeatureTargetLabel(feature)}. Only one enabled end cut per end is supported in this POC.`;
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

      const message = `Operation ${index + 1} overlaps Operation ${prior.index + 1}. The resulting removal stack is allowed, but order now matters.`;
      conflicts.push({
        featureId: prior.feature.id,
        featureIndex: prior.index,
        relatedFeatureId: feature.id,
        relatedFeatureIndex: index,
        code: 'rect_overlap',
        severity: 'warning',
        message
      });
      conflicts.push({
        featureId: feature.id,
        featureIndex: index,
        relatedFeatureId: prior.feature.id,
        relatedFeatureIndex: prior.index,
        code: 'rect_overlap',
        severity: 'warning',
        message
      });
    }

    priorRectCuts.push({ feature, index });
  }

  return conflicts;
}
