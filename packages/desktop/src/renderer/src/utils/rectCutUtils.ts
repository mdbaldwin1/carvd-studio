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
  'front_left_corner',
  'front_right_corner',
  'back_left_corner',
  'back_right_corner'
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
  const depth = clamp(feature.parameters.depth ?? 0, 0, thickness);
  // Treat as full thickness when within tolerance to avoid a paper-thin residual layer
  return thickness - depth < 0.001 ? thickness : depth;
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

  if (feature.cutType === 'stopped_dado') {
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

  if (feature.cutType === 'groove') {
    const target =
      feature.target.type === 'face' ? { type: 'face' as const, face: feature.target.face } : feature.target;
    return {
      ...cloneRectCutFeature(feature),
      target,
      parameters: {
        ...feature.parameters,
        size: {
          length: part.length,
          width: feature.parameters.size.width
        },
        depthMode: 'blind',
        depth: feature.parameters.depth
      },
      placement: {
        x: 0,
        z: feature.placement.z
      }
    };
  }

  if (feature.cutType === 'stopped_groove') {
    const target =
      feature.target.type === 'face' ? { type: 'face' as const, face: feature.target.face } : feature.target;
    return {
      ...cloneRectCutFeature(feature),
      target,
      parameters: {
        ...feature.parameters,
        depthMode: 'blind',
        depth: feature.parameters.depth
      }
    };
  }

  if (feature.cutType === 'tenon') {
    const targetFace =
      feature.target.type === 'face' && (feature.target.face === 'left_end' || feature.target.face === 'right_end')
        ? feature.target.face
        : 'right_end';
    const tenonLength = Math.max(0, Math.min(feature.parameters.size.length, part.length));
    const tongueWidth = Math.max(0, Math.min(feature.parameters.size.width, part.width));
    const tongueThickness = Math.max(0, Math.min(feature.parameters.depth ?? 0, part.thickness));
    // Keep the tongue inside the blank across the width.
    const maxOffset = Math.max(0, part.width - tongueWidth);
    return {
      ...cloneRectCutFeature(feature),
      target: { type: 'face', face: targetFace },
      parameters: {
        ...feature.parameters,
        size: { length: tenonLength, width: tongueWidth },
        depthMode: 'blind',
        depth: tongueThickness
      },
      placement: {
        x: 0,
        z: Math.max(0, Math.min(feature.placement.z, maxOffset))
      }
    };
  }

  if (feature.cutType === 'mortise') {
    const target =
      feature.target.type === 'face' ? { type: 'face' as const, face: feature.target.face } : feature.target;
    return {
      ...cloneRectCutFeature(feature),
      target,
      parameters: {
        ...feature.parameters,
        depthMode: 'blind',
        depth: feature.parameters.depth
      }
    };
  }

  return cloneRectCutFeature(feature);
}

export function isSideFaceTarget(feature: RectCutFeature): boolean {
  return (
    feature.target.type === 'face' && (feature.target.face === 'front_face' || feature.target.face === 'back_face')
  );
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
  if (feature.cutType === 'tenon') {
    if (feature.target.type !== 'face' || (feature.target.face !== 'left_end' && feature.target.face !== 'right_end')) {
      return { supported: false, reason: 'Tenons must be cut on the left or right end.' };
    }
    return { supported: true };
  }

  if (
    feature.cutType === 'cutout' ||
    feature.cutType === 'dado' ||
    feature.cutType === 'stopped_dado' ||
    feature.cutType === 'groove' ||
    feature.cutType === 'stopped_groove' ||
    feature.cutType === 'mortise'
  ) {
    const isSideFacePocket =
      (feature.cutType === 'mortise' || feature.cutType === 'cutout') &&
      feature.target.type === 'face' &&
      (feature.target.face === 'front_face' || feature.target.face === 'back_face');
    if (isSideFacePocket) {
      return { supported: true };
    }
    if (feature.target.type !== 'face' || !isTopOrBottomFace(feature.target.face)) {
      return {
        supported: false,
        reason:
          feature.cutType === 'dado'
            ? 'Dado previews currently support only top and bottom face targets.'
            : feature.cutType === 'stopped_dado'
              ? 'Stopped dado previews currently support only top and bottom face targets.'
              : feature.cutType === 'groove'
                ? 'Groove previews currently support only top and bottom face targets.'
                : feature.cutType === 'stopped_groove'
                  ? 'Stopped groove previews currently support only top and bottom face targets.'
                  : feature.cutType === 'mortise'
                    ? 'Mortise previews currently support only top and bottom face targets.'
                    : 'Cutout previews currently support only top and bottom face targets.'
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
    reason: 'Blind notch previews currently support only top or bottom edge and corner targets.'
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
    if (isSideFaceTarget(resolvedFeature)) {
      // Side-face pockets recess into the board width instead of thickness.
      if (depth >= part.width) return 'Blind depth must stay less than part width.';
    } else if (depth >= part.thickness) {
      return 'Blind depth must stay less than part thickness.';
    }
  }

  if (resolvedFeature.cutType === 'dado') {
    if (resolvedFeature.target.type !== 'face' || !isTopOrBottomFace(resolvedFeature.target.face)) {
      return 'Dado must target the top or bottom face.';
    }
    if (resolvedFeature.parameters.depthMode !== 'blind') return 'Dado currently uses blind depth only.';
    if (resolvedFeature.placement.x < 0) return 'Dado offset cannot be negative.';
    if (resolvedFeature.placement.x + sizeLength > part.length) return 'Dado width runs past the blank.';
  }

  if (resolvedFeature.cutType === 'stopped_dado') {
    if (resolvedFeature.target.type !== 'face' || !isTopOrBottomFace(resolvedFeature.target.face)) {
      return 'Stopped dado must target the top or bottom face.';
    }
    if (resolvedFeature.parameters.depthMode !== 'blind') return 'Stopped dado currently uses blind depth only.';
    if (resolvedFeature.placement.x < 0) return 'Stopped dado offset cannot be negative.';
    if (resolvedFeature.placement.x + sizeLength > part.length) return 'Stopped dado run extends past the blank.';
  }

  if (resolvedFeature.cutType === 'groove') {
    if (resolvedFeature.target.type !== 'face' || !isTopOrBottomFace(resolvedFeature.target.face)) {
      return 'Groove must target the top or bottom face.';
    }
    if (resolvedFeature.parameters.depthMode !== 'blind') return 'Groove currently uses blind depth only.';
    if (resolvedFeature.placement.z < 0) return 'Groove offset cannot be negative.';
    if (resolvedFeature.placement.z + sizeWidth > part.width) return 'Groove width runs past the blank.';
  }

  if (resolvedFeature.cutType === 'stopped_groove') {
    if (resolvedFeature.target.type !== 'face' || !isTopOrBottomFace(resolvedFeature.target.face)) {
      return 'Stopped groove must target the top or bottom face.';
    }
    if (resolvedFeature.parameters.depthMode !== 'blind') return 'Stopped groove currently uses blind depth only.';
    if (resolvedFeature.placement.x < 0 || resolvedFeature.placement.z < 0) {
      return 'Stopped groove offsets cannot be negative.';
    }
    if (resolvedFeature.placement.x + sizeLength > part.length) return 'Stopped groove run extends past the blank.';
    if (resolvedFeature.placement.z + sizeWidth > part.width) return 'Stopped groove width runs past the blank.';
  }

  if (resolvedFeature.cutType === 'tenon') {
    if (
      resolvedFeature.target.type !== 'face' ||
      (resolvedFeature.target.face !== 'left_end' && resolvedFeature.target.face !== 'right_end')
    ) {
      return 'Tenon must be cut on the left or right end.';
    }
    const tongueThickness = resolvedFeature.parameters.depth ?? 0;
    if (tongueThickness <= 0) return 'Tenon thickness must be greater than zero.';
    if (tongueThickness >= part.thickness) return 'Tenon thickness must stay less than part thickness.';
    if (sizeLength <= 0) return 'Tenon length must be greater than zero.';
    if (sizeLength >= part.length) return 'Tenon length must stay less than part length.';
    if (sizeWidth <= 0) return 'Tenon width must be greater than zero.';
    if (sizeWidth > part.width) return 'Tenon width runs past the blank.';
    if (resolvedFeature.placement.z < 0) return 'Tenon offset cannot be negative.';
    if (resolvedFeature.placement.z + sizeWidth > part.width) return 'Tenon offset pushes the tongue past the blank.';
    return null;
  }

  if (resolvedFeature.cutType === 'mortise') {
    if (
      resolvedFeature.target.type !== 'face' ||
      (!isTopOrBottomFace(resolvedFeature.target.face) && !isSideFaceTarget(resolvedFeature))
    ) {
      return 'Mortise must target the top, bottom, front, or back face.';
    }
    if (resolvedFeature.parameters.depthMode !== 'blind') return 'Mortise currently uses blind depth only.';
  }

  if (
    resolvedFeature.cutType === 'cutout' ||
    resolvedFeature.cutType === 'stopped_groove' ||
    resolvedFeature.cutType === 'mortise'
  ) {
    if (resolvedFeature.placement.x < 0 || resolvedFeature.placement.z < 0) return 'Cutout offsets cannot be negative.';
    if (resolvedFeature.placement.x + sizeLength > part.length) return 'Cutout length runs past the blank.';
    if (isSideFaceTarget(resolvedFeature)) {
      // On front/back faces, the cross measurement and offset run across the
      // board thickness rather than its width.
      if (resolvedFeature.parameters.depthMode !== 'blind') return 'Side-face pockets use blind depth only.';
      if (resolvedFeature.placement.z + sizeWidth > part.thickness) {
        return 'Pocket height runs past the board thickness.';
      }
    } else if (resolvedFeature.placement.z + sizeWidth > part.width) {
      return 'Cutout width runs past the blank.';
    }
  }

  if (resolvedFeature.cutType === 'rabbet') {
    if (resolvedFeature.target.type !== 'edge' || !TOP_BOTTOM_EDGE_TARGETS.includes(resolvedFeature.target.edge)) {
      return 'Rabbet must target a supported top or bottom edge.';
    }
    if (resolvedFeature.parameters.depthMode !== 'blind') return 'Rabbet currently uses blind depth only.';
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
