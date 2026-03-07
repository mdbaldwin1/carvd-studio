import { CornerTarget, EdgeTarget, FaceTarget, Part, RectCutFeature } from '../types';

export type RectCutPreviewSupport =
  | { supported: true }
  | {
      supported: false;
      reason: string;
    };

export const TOP_BOTTOM_FACE_TARGETS: FaceTarget[] = ['top_face', 'bottom_face'];
export const TOP_BOTTOM_EDGE_TARGETS: EdgeTarget[] = [
  'top_front_edge',
  'top_back_edge',
  'top_left_edge',
  'top_right_edge',
  'bottom_front_edge',
  'bottom_back_edge',
  'bottom_left_edge',
  'bottom_right_edge'
];
export const TOP_BOTTOM_CORNER_TARGETS: CornerTarget[] = [
  'front_top_left_corner',
  'front_top_right_corner',
  'front_bottom_left_corner',
  'front_bottom_right_corner',
  'back_top_left_corner',
  'back_top_right_corner',
  'back_bottom_left_corner',
  'back_bottom_right_corner'
];

function cloneRectCutFeature(feature: RectCutFeature): RectCutFeature {
  return {
    ...feature,
    target:
      feature.target.type === 'face'
        ? { type: 'face', face: feature.target.face }
        : feature.target.type === 'edge'
          ? { type: 'edge', edge: feature.target.edge }
          : { type: 'corner', corner: feature.target.corner },
    reference: { ...feature.reference },
    parameters: {
      ...feature.parameters,
      size: { ...feature.parameters.size }
    },
    placement: { ...feature.placement }
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getRectCutDepth(feature: RectCutFeature, thickness: number): number {
  if (feature.parameters.depthMode === 'through') return thickness;
  return clamp(feature.parameters.depth ?? 0, 0, Math.max(0, thickness - 0.001));
}

export function isTopOrBottomFace(face: FaceTarget): boolean {
  return face === 'top_face' || face === 'bottom_face';
}

function getRabbetRunLength(edge: EdgeTarget, part: Pick<Part, 'length' | 'width'>): number {
  return edge.includes('front') || edge.includes('back') ? part.length : part.width;
}

export function getResolvedRectCutFeature(
  feature: RectCutFeature,
  part: Pick<Part, 'length' | 'width' | 'thickness'>
): RectCutFeature {
  if (feature.cutType === 'dado') {
    const targetFace = feature.target.type === 'face' ? feature.target.face : 'top_face';
    return {
      ...cloneRectCutFeature(feature),
      target: { type: 'face', face: targetFace },
      parameters: {
        ...feature.parameters,
        size: {
          length: feature.parameters.size.length,
          width: part.width
        },
        depthMode: 'blind',
        depth: feature.parameters.depth
      },
      placement: {
        x: feature.placement.x,
        z: 0
      }
    };
  }

  if (feature.cutType === 'rabbet') {
    const targetEdge = feature.target.type === 'edge' ? feature.target.edge : 'top_front_edge';
    const runLength = getRabbetRunLength(targetEdge, part);
    const alongLength = targetEdge.includes('front') || targetEdge.includes('back');
    return {
      ...cloneRectCutFeature(feature),
      target: { type: 'edge', edge: targetEdge },
      parameters: {
        ...feature.parameters,
        size: {
          length: alongLength ? runLength : feature.parameters.size.length,
          width: alongLength ? feature.parameters.size.width : runLength
        },
        depthMode: 'blind',
        depth: feature.parameters.depth
      },
      placement: {
        x: alongLength ? 0 : feature.placement.x,
        z: alongLength ? feature.placement.z : 0
      }
    };
  }

  return cloneRectCutFeature(feature);
}

export function isTopTarget(feature: RectCutFeature): boolean {
  if (feature.target.type === 'face') return feature.target.face === 'top_face';
  if (feature.target.type === 'edge') return feature.target.edge.startsWith('top_');
  return feature.target.corner.includes('_top_');
}

export function isBottomTarget(feature: RectCutFeature): boolean {
  if (feature.target.type === 'face') return feature.target.face === 'bottom_face';
  if (feature.target.type === 'edge') return feature.target.edge.startsWith('bottom_');
  return feature.target.corner.includes('_bottom_');
}

export function getRectCutPreviewSupport(feature: RectCutFeature): RectCutPreviewSupport {
  if (feature.cutType === 'cutout' || feature.cutType === 'dado') {
    if (feature.target.type !== 'face' || !isTopOrBottomFace(feature.target.face)) {
      return {
        supported: false,
        reason:
          feature.cutType === 'dado'
            ? 'POC dado previews currently support only top and bottom face targets.'
            : 'POC cutout previews currently support only top and bottom face targets.'
      };
    }
    return { supported: true };
  }

  if (feature.cutType !== 'rabbet' && feature.parameters.depthMode === 'through') {
    return { supported: true };
  }

  if (
    (feature.cutType === 'edge_notch' || feature.cutType === 'rabbet') &&
    feature.target.type === 'edge' &&
    TOP_BOTTOM_EDGE_TARGETS.includes(feature.target.edge)
  ) {
    return { supported: true };
  }

  if (
    feature.cutType === 'corner_notch' &&
    feature.target.type === 'corner' &&
    TOP_BOTTOM_CORNER_TARGETS.includes(feature.target.corner)
  ) {
    return { supported: true };
  }

  return {
    supported: false,
    reason: 'Blind notch previews currently support only top or bottom edge/corner targets in this POC.'
  };
}

export function validateRectCutFeature(
  feature: RectCutFeature,
  part: Pick<Part, 'length' | 'width' | 'thickness'>
): string | null {
  const resolvedFeature = getResolvedRectCutFeature(feature, part);
  const sizeLength = resolvedFeature.parameters.size.length;
  const sizeWidth = resolvedFeature.parameters.size.width;

  if (!Number.isFinite(sizeLength) || !Number.isFinite(sizeWidth) || sizeLength <= 0 || sizeWidth <= 0) {
    return 'Removal size must be greater than zero.';
  }

  if (resolvedFeature.parameters.depthMode === 'blind') {
    const depth = resolvedFeature.parameters.depth ?? 0;
    if (!Number.isFinite(depth) || depth <= 0) return 'Blind depth must be greater than zero.';
    if (depth >= part.thickness) return 'Blind depth must stay less than part thickness.';
  }

  if (resolvedFeature.cutType === 'dado') {
    if (resolvedFeature.target.type !== 'face' || !isTopOrBottomFace(resolvedFeature.target.face)) {
      return 'Dado must target the top or bottom face.';
    }
    if (resolvedFeature.parameters.depthMode !== 'blind') return 'Dado must use blind depth in this POC.';
    if (resolvedFeature.placement.x < 0) return 'Dado offset cannot be negative.';
    if (resolvedFeature.placement.x + sizeLength > part.length) return 'Dado width runs past the blank.';
  }

  if (resolvedFeature.cutType === 'cutout') {
    if (resolvedFeature.placement.x < 0 || resolvedFeature.placement.z < 0) return 'Cutout offsets cannot be negative.';
    if (resolvedFeature.placement.x + sizeLength > part.length) return 'Cutout length runs past the blank.';
    if (resolvedFeature.placement.z + sizeWidth > part.width) return 'Cutout width runs past the blank.';
  }

  if (resolvedFeature.cutType === 'rabbet') {
    if (resolvedFeature.target.type !== 'edge' || !TOP_BOTTOM_EDGE_TARGETS.includes(resolvedFeature.target.edge)) {
      return 'Rabbet must target a supported top or bottom edge.';
    }
    if (resolvedFeature.parameters.depthMode !== 'blind') return 'Rabbet must use blind depth in this POC.';
  }

  if (resolvedFeature.cutType === 'edge_notch' || resolvedFeature.cutType === 'rabbet') {
    if (resolvedFeature.placement.x < 0 || resolvedFeature.placement.z < 0) return 'Notch offsets cannot be negative.';

    const edge = resolvedFeature.target.type === 'edge' ? resolvedFeature.target.edge : 'top_front_edge';
    if (edge.includes('front') || edge.includes('back')) {
      if (resolvedFeature.placement.x + sizeLength > part.length) return 'Edge notch length runs past the blank.';
      if (sizeWidth > part.width) return 'Edge notch width runs past the blank.';
    } else {
      if (resolvedFeature.placement.z + sizeWidth > part.width) return 'Edge notch width runs past the blank.';
      if (sizeLength > part.length) return 'Edge notch length runs past the blank.';
    }
  }

  if (resolvedFeature.cutType === 'corner_notch') {
    if (sizeLength > part.length || sizeWidth > part.width) return 'Corner notch size runs past the blank.';
  }

  const support = getRectCutPreviewSupport(resolvedFeature);
  if (!support.supported) return support.reason;

  return null;
}
