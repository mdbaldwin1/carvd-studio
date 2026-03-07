import { Part, PartFeature, RectCutFeature } from '@renderer/types';
import { getFeatureTargetLabel } from '@renderer/utils/partFeatureSummary';

export interface PartFeatureConflict {
  featureId: string;
  relatedFeatureId?: string;
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
  const enabledFeatures = features.filter((feature) => feature.enabled);

  const endCuts = enabledFeatures.filter((feature) => feature.kind === 'end_cut');
  for (const feature of endCuts) {
    const duplicates = endCuts.filter(
      (candidate) => candidate.id !== feature.id && candidate.target.face === feature.target.face
    );
    for (const duplicate of duplicates) {
      conflicts.push({
        featureId: feature.id,
        relatedFeatureId: duplicate.id,
        severity: 'error',
        message: `Another enabled end cut already uses ${getFeatureTargetLabel(feature)}.`
      });
    }
  }

  const rectCuts = enabledFeatures.filter((feature): feature is RectCutFeature => feature.kind === 'rect_cut');
  for (let i = 0; i < rectCuts.length; i += 1) {
    for (let j = i + 1; j < rectCuts.length; j += 1) {
      const a = getRectFeatureBounds(rectCuts[i], part);
      const b = getRectFeatureBounds(rectCuts[j], part);
      if (!a || !b || !overlaps(a, b)) continue;

      const message = `${getFeatureTargetLabel(rectCuts[i])} overlaps ${getFeatureTargetLabel(rectCuts[j])}.`;
      conflicts.push({
        featureId: rectCuts[i].id,
        relatedFeatureId: rectCuts[j].id,
        severity: 'warning',
        message
      });
      conflicts.push({
        featureId: rectCuts[j].id,
        relatedFeatureId: rectCuts[i].id,
        severity: 'warning',
        message
      });
    }
  }

  return conflicts;
}
