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
  if (feature.cutType === 'cutout') {
    if (feature.target.type !== 'face' || !isTopOrBottomFace(feature.target.face)) {
      return {
        supported: false,
        reason: 'POC cutout previews currently support only top and bottom face targets.'
      };
    }
    return { supported: true };
  }

  if (feature.parameters.depthMode === 'through') {
    return { supported: true };
  }

  if (
    feature.cutType === 'edge_notch' &&
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
  const sizeLength = feature.parameters.size.length;
  const sizeWidth = feature.parameters.size.width;

  if (!Number.isFinite(sizeLength) || !Number.isFinite(sizeWidth) || sizeLength <= 0 || sizeWidth <= 0) {
    return 'Removal size must be greater than zero.';
  }

  if (feature.parameters.depthMode === 'blind') {
    const depth = feature.parameters.depth ?? 0;
    if (!Number.isFinite(depth) || depth <= 0) return 'Blind depth must be greater than zero.';
    if (depth >= part.thickness) return 'Blind depth must stay less than part thickness.';
  }

  if (feature.cutType === 'cutout') {
    if (feature.placement.x < 0 || feature.placement.z < 0) return 'Cutout offsets cannot be negative.';
    if (feature.placement.x + sizeLength > part.length) return 'Cutout length runs past the blank.';
    if (feature.placement.z + sizeWidth > part.width) return 'Cutout width runs past the blank.';
  }

  if (feature.cutType === 'edge_notch') {
    if (feature.placement.x < 0 || feature.placement.z < 0) return 'Notch offsets cannot be negative.';

    const edge = feature.target.type === 'edge' ? feature.target.edge : 'top_front_edge';
    if (edge.includes('front') || edge.includes('back')) {
      if (feature.placement.x + sizeLength > part.length) return 'Edge notch length runs past the blank.';
      if (sizeWidth > part.width) return 'Edge notch width runs past the blank.';
    } else {
      if (feature.placement.z + sizeWidth > part.width) return 'Edge notch width runs past the blank.';
      if (sizeLength > part.length) return 'Edge notch length runs past the blank.';
    }
  }

  if (feature.cutType === 'corner_notch') {
    if (sizeLength > part.length || sizeWidth > part.width) return 'Corner notch size runs past the blank.';
  }

  const support = getRectCutPreviewSupport(feature);
  if (!support.supported) return support.reason;

  return null;
}
