import { CornerTarget, EdgeTarget, FaceTarget, PartFeature } from '@renderer/types';
import { clonePartFeature } from '@renderer/utils/partFeatures';
import { getResolvedRectCutFeature } from '@renderer/utils/rectCutUtils';
import { getFaceFrame } from '@renderer/utils/roundCutUtils';

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

function normalizeAngle(angle: number): number {
  const normalized = angle % 360;
  return normalized > 180 ? normalized - 360 : normalized <= -180 ? normalized + 360 : normalized;
}

function mirrorReferencedCoordinate(value: number, size: number, from: 'min' | 'center' | 'max' | undefined): number {
  return from === 'center' || from === undefined ? -value : size - value;
}

function mirrorPlanarAngle(angle: number, action: Extract<MirrorAction, 'across_length' | 'across_width'>): number {
  return normalizeAngle(action === 'across_length' ? 180 - angle : -angle);
}

export function getAvailableMirrorActions(feature: PartFeature): MirrorAction[] {
  if (feature.kind === 'end_cut')
    return feature.target.face === 'front_face' || feature.target.face === 'back_face'
      ? ['across_width']
      : ['opposite_end'];
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
  if (mirrored.metadata?.dowelJoint) {
    delete mirrored.metadata.dowelJoint;
    if (Object.keys(mirrored.metadata).length === 0) mirrored.metadata = undefined;
  }

  if (feature.kind === 'end_cut') {
    if (feature.target.face === 'front_face' || feature.target.face === 'back_face') {
      if (action !== 'across_width') throw new Error('Edge bevels mirror across width.');
      mirrored.target = { type: 'face', face: feature.target.face === 'front_face' ? 'back_face' : 'front_face' };
      return mirrored;
    }
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
    throw new Error('Part dimensions are required to mirror removal operations');
  }

  if (feature.kind === 'circular_cut' || feature.kind === 'rounded_cut') {
    const face = feature.target.face;
    const targetFace =
      action === 'across_length'
        ? face === 'left_end'
          ? 'right_end'
          : face === 'right_end'
            ? 'left_end'
            : face
        : face === 'front_face'
          ? 'back_face'
          : face === 'back_face'
            ? 'front_face'
            : face;
    mirrored.target = { type: 'face', face: targetFace };
    const sourceFrame = getFaceFrame(part, face);
    const targetFrame = getFaceFrame(part, targetFace);
    const reflectionSign = (source: typeof sourceFrame.primaryAxis, target: typeof sourceFrame.primaryAxis) =>
      source.x * target.x * (action === 'across_length' ? -1 : 1) +
      source.y * target.y +
      source.z * target.z * (action === 'across_width' ? -1 : 1);
    const reflectPrimary = reflectionSign(sourceFrame.primaryAxis, targetFrame.primaryAxis) < 0;
    const reflectSecondary = reflectionSign(sourceFrame.secondaryAxis, targetFrame.secondaryAxis) < 0;
    const { primarySize, secondarySize } = sourceFrame;

    mirrored.placement = {
      ...mirrored.placement,
      primary: reflectPrimary
        ? mirrorReferencedCoordinate(feature.placement.primary, primarySize, feature.reference.primaryFrom)
        : feature.placement.primary,
      secondary: reflectSecondary
        ? mirrorReferencedCoordinate(feature.placement.secondary, secondarySize, feature.reference.secondaryFrom)
        : feature.placement.secondary,
      rotation:
        reflectPrimary || reflectSecondary
          ? mirrorPlanarAngle(feature.placement.rotation, reflectPrimary ? 'across_length' : 'across_width')
          : feature.placement.rotation
    };

    if (feature.kind === 'circular_cut') {
      const angleAction = reflectPrimary ? 'across_length' : reflectSecondary ? 'across_width' : null;
      if (angleAction) {
        mirrored.parameters.direction = mirrorPlanarAngle(feature.parameters.direction, angleAction);
        if (mirrored.pattern?.type === 'linear') {
          mirrored.pattern.direction = mirrorPlanarAngle(mirrored.pattern.direction, angleAction);
        } else if (mirrored.pattern?.type === 'grid') {
          // A reflection reverses handedness. Rebase at the reflected final
          // row so the positive row spacing traverses the same set of holes.
          const radians = (mirrored.pattern.rotation * Math.PI) / 180;
          const rowRun = (mirrored.pattern.rows - 1) * mirrored.pattern.rowSpacing;
          const shiftPrimary = -Math.sin(radians) * rowRun * (reflectPrimary ? -1 : 1);
          const shiftSecondary = Math.cos(radians) * rowRun * (reflectSecondary ? -1 : 1);
          mirrored.placement.primary += shiftPrimary * (feature.reference.primaryFrom === 'max' ? -1 : 1);
          mirrored.placement.secondary += shiftSecondary * (feature.reference.secondaryFrom === 'max' ? -1 : 1);
          mirrored.pattern.rotation = mirrorPlanarAngle(mirrored.pattern.rotation, angleAction);
        } else if (mirrored.pattern?.type === 'circular') {
          mirrored.pattern.startAngle = mirrorPlanarAngle(mirrored.pattern.startAngle, angleAction);
        }
      }
    }
    return mirrored;
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
    face:
      action === 'across_length' && feature.target.face === 'right_end'
        ? 'left_end'
        : action === 'across_length' && feature.target.face === 'left_end'
          ? 'right_end'
          : (feature.target.face as FaceTarget)
  };
  return mirrored;
}
