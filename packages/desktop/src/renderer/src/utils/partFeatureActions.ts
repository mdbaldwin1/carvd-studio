import { CornerTarget, EdgeTarget, FaceTarget, PartFeature } from '@renderer/types';
import { clonePartFeature } from '@renderer/utils/partFeatures';
import { getResolvedRectCutFeature } from '@renderer/utils/rectCutUtils';

export type MirrorAction = 'opposite_end' | 'across_length' | 'across_width';

function generateFeatureId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `feature_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const LENGTH_CORNER_MAP: Record<CornerTarget, CornerTarget> = {
  front_left_corner: 'front_right_corner',
  front_right_corner: 'front_left_corner',
  back_left_corner: 'back_right_corner',
  back_right_corner: 'back_left_corner'
};

const WIDTH_CORNER_MAP: Record<CornerTarget, CornerTarget> = {
  front_left_corner: 'back_left_corner',
  front_right_corner: 'back_right_corner',
  back_left_corner: 'front_left_corner',
  back_right_corner: 'front_right_corner'
};

const LENGTH_EDGE_MAP: Partial<Record<EdgeTarget, EdgeTarget>> = {
  top_left_edge: 'top_right_edge',
  top_right_edge: 'top_left_edge',
  bottom_left_edge: 'bottom_right_edge',
  bottom_right_edge: 'bottom_left_edge',
  front_left_edge: 'front_right_edge',
  front_right_edge: 'front_left_edge',
  back_left_edge: 'back_right_edge',
  back_right_edge: 'back_left_edge'
};

const WIDTH_EDGE_MAP: Partial<Record<EdgeTarget, EdgeTarget>> = {
  top_front_edge: 'top_back_edge',
  top_back_edge: 'top_front_edge',
  bottom_front_edge: 'bottom_back_edge',
  bottom_back_edge: 'bottom_front_edge',
  front_left_edge: 'back_left_edge',
  back_left_edge: 'front_left_edge',
  front_right_edge: 'back_right_edge',
  back_right_edge: 'front_right_edge'
};

function getMirroredLabel(label: string | undefined, action: MirrorAction): string | undefined {
  const trimmed = label?.trim();
  if (!trimmed) return undefined;
  switch (action) {
    case 'opposite_end':
      return `${trimmed} (Opposite End)`;
    case 'across_length':
      return `${trimmed} (Mirrored Length)`;
    case 'across_width':
      return `${trimmed} (Mirrored Width)`;
  }
}

function mirrorEdgeTarget(
  edge: EdgeTarget,
  action: Extract<MirrorAction, 'across_length' | 'across_width'>
): EdgeTarget {
  return action === 'across_length' ? (LENGTH_EDGE_MAP[edge] ?? edge) : (WIDTH_EDGE_MAP[edge] ?? edge);
}

function mirrorCornerTarget(
  corner: CornerTarget,
  action: Extract<MirrorAction, 'across_length' | 'across_width'>
): CornerTarget {
  return action === 'across_length' ? LENGTH_CORNER_MAP[corner] : WIDTH_CORNER_MAP[corner];
}

export function getAvailableMirrorActions(feature: PartFeature): MirrorAction[] {
  if (feature.kind === 'end_cut') return ['opposite_end'];
  switch (feature.cutType) {
    case 'dado':
    case 'stopped_dado':
      return ['across_length'];
    case 'groove':
      return ['across_width'];
    case 'rabbet':
      if (feature.target.type !== 'edge') return [];
      return feature.target.edge.includes('front') || feature.target.edge.includes('back')
        ? ['across_width']
        : ['across_length'];
    default:
      return ['across_length', 'across_width'];
  }
}

export function getMirrorActionLabel(action: MirrorAction): string {
  switch (action) {
    case 'opposite_end':
      return 'Mirror to Opposite End';
    case 'across_length':
      return 'Mirror Across Length';
    case 'across_width':
      return 'Mirror Across Width';
  }
}

export function mirrorFeature(
  feature: PartFeature,
  action: MirrorAction,
  part?: Pick<{ length: number; width: number; thickness: number }, 'length' | 'width' | 'thickness'>
): PartFeature {
  const mirrored = clonePartFeature(feature);
  mirrored.id = generateFeatureId();
  mirrored.label = getMirroredLabel(feature.label, action);

  if (feature.kind === 'end_cut') {
    if (action !== 'opposite_end') {
      throw new Error(`Unsupported mirror action for end cut: ${action}`);
    }
    mirrored.target = {
      type: 'face',
      face: feature.target.face === 'left_end' ? 'right_end' : 'left_end'
    };
    mirrored.reference = {
      ...mirrored.reference,
      primaryFrom: feature.target.face === 'left_end' ? 'max' : 'min'
    };
    return mirrored;
  }

  if (action === 'opposite_end') {
    throw new Error('Rectangular removals do not support opposite-end mirroring');
  }

  if (!part) {
    throw new Error('Part dimensions are required to mirror rectangular removals');
  }

  const resolved = getResolvedRectCutFeature(feature, part);
  const alongLength =
    feature.target.type === 'edge' && (feature.target.edge.includes('front') || feature.target.edge.includes('back'));
  const mirroredX =
    action === 'across_length'
      ? Math.max(0, part.length - resolved.placement.x - resolved.parameters.size.length)
      : resolved.placement.x;
  const mirroredZ =
    action === 'across_width'
      ? Math.max(0, part.width - resolved.placement.z - resolved.parameters.size.width)
      : resolved.placement.z;

  mirrored.placement = {
    x:
      feature.target.type === 'edge' && !alongLength
        ? 0
        : feature.cutType === 'corner_notch' || feature.cutType === 'groove'
          ? 0
          : mirroredX,
    z:
      feature.cutType === 'corner_notch' || feature.cutType === 'dado' || feature.cutType === 'stopped_dado'
        ? 0
        : feature.target.type === 'edge' && alongLength
          ? 0
          : mirroredZ
  };

  if (feature.target.type === 'edge') {
    mirrored.target = {
      type: 'edge',
      edge: mirrorEdgeTarget(feature.target.edge, action)
    };
    return mirrored;
  }

  if (feature.target.type === 'corner') {
    mirrored.target = {
      type: 'corner',
      corner: mirrorCornerTarget(feature.target.corner, action)
    };
    return mirrored;
  }

  mirrored.target = {
    type: 'face',
    face: feature.target.face as FaceTarget
  };
  return mirrored;
}
