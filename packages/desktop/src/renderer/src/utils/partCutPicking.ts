import { FeatureDraft } from '@renderer/components/part-features/partFeatureEditorState';
import { Part, PartFeatureTarget } from '@renderer/types';
import { getPartLocalBoundingBox } from '@renderer/utils/partFeatureGeometry';
import { CORNER_LABELS, EDGE_LABELS, FACE_LABELS } from '@renderer/utils/partFeatureSummary';
import { CornerTarget, EdgeTarget, FaceTarget } from '../types';

export type PickableTargetFamily = 'face' | 'edge' | 'corner';

export interface PickableTargetDefinition {
  key: string;
  target: PartFeatureTarget;
  family: PickableTargetFamily;
  label: string;
  priority: number;
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number, number];
  color: string;
}

const FACE_COLOR = '#0f766e';
const EDGE_COLOR = '#b45309';
const CORNER_COLOR = '#9f1239';

function toKey(target: PartFeatureTarget): string {
  if (target.type === 'face') return `face:${target.face}`;
  if (target.type === 'edge') return `edge:${target.edge}`;
  return `corner:${target.corner}`;
}

export function getPartFeatureTargetKey(target: PartFeatureTarget | null | undefined): string | null {
  return target ? toKey(target) : null;
}

export function partFeatureTargetEquals(
  a: PartFeatureTarget | null | undefined,
  b: PartFeatureTarget | null | undefined
): boolean {
  return getPartFeatureTargetKey(a) === getPartFeatureTargetKey(b);
}

function getTargetLabel(target: PartFeatureTarget): string {
  if (target.type === 'face') return FACE_LABELS[target.face];
  if (target.type === 'edge') return EDGE_LABELS[target.edge];
  return CORNER_LABELS[target.corner];
}

function faceTarget(face: FaceTarget): PartFeatureTarget {
  return { type: 'face', face };
}

function edgeTarget(edge: EdgeTarget): PartFeatureTarget {
  return { type: 'edge', edge };
}

function cornerTarget(corner: CornerTarget): PartFeatureTarget {
  return { type: 'corner', corner };
}

export function getPickableTargetDefinitions(part: Part): PickableTargetDefinition[] {
  const { min, max } = getPartLocalBoundingBox(part);
  const centerX = (min.x + max.x) / 2;
  const centerY = (min.y + max.y) / 2;
  const centerZ = (min.z + max.z) / 2;
  const length = Math.max(0.001, max.x - min.x);
  const thickness = Math.max(0.001, max.y - min.y);
  const width = Math.max(0.001, max.z - min.z);
  const faceDepth = Math.max(Math.min(Math.min(length, thickness, width) * 0.04, 0.18), 0.06);
  const edgeThickness = Math.max(Math.min(Math.min(length, thickness, width) * 0.14, 0.35), 0.16);
  const cornerSize = Math.max(edgeThickness * 1.3, 0.22);

  return [
    {
      key: toKey(faceTarget('left_end')),
      target: faceTarget('left_end'),
      family: 'face',
      label: FACE_LABELS.left_end,
      priority: 1,
      position: [min.x - faceDepth / 3, centerY, centerZ],
      rotation: [0, 0, 0],
      size: [faceDepth, thickness, width],
      color: FACE_COLOR
    },
    {
      key: toKey(faceTarget('right_end')),
      target: faceTarget('right_end'),
      family: 'face',
      label: FACE_LABELS.right_end,
      priority: 1,
      position: [max.x + faceDepth / 3, centerY, centerZ],
      rotation: [0, 0, 0],
      size: [faceDepth, thickness, width],
      color: FACE_COLOR
    },
    {
      key: toKey(faceTarget('top_face')),
      target: faceTarget('top_face'),
      family: 'face',
      label: FACE_LABELS.top_face,
      priority: 1,
      position: [centerX, max.y + faceDepth / 3, centerZ],
      rotation: [0, 0, 0],
      size: [length, faceDepth, width],
      color: FACE_COLOR
    },
    {
      key: toKey(faceTarget('bottom_face')),
      target: faceTarget('bottom_face'),
      family: 'face',
      label: FACE_LABELS.bottom_face,
      priority: 1,
      position: [centerX, min.y - faceDepth / 3, centerZ],
      rotation: [0, 0, 0],
      size: [length, faceDepth, width],
      color: FACE_COLOR
    },
    {
      key: toKey(faceTarget('front_face')),
      target: faceTarget('front_face'),
      family: 'face',
      label: FACE_LABELS.front_face,
      priority: 1,
      position: [centerX, centerY, min.z - faceDepth / 3],
      rotation: [0, 0, 0],
      size: [length, thickness, faceDepth],
      color: FACE_COLOR
    },
    {
      key: toKey(faceTarget('back_face')),
      target: faceTarget('back_face'),
      family: 'face',
      label: FACE_LABELS.back_face,
      priority: 1,
      position: [centerX, centerY, max.z + faceDepth / 3],
      rotation: [0, 0, 0],
      size: [length, thickness, faceDepth],
      color: FACE_COLOR
    },
    {
      key: toKey(edgeTarget('top_front_edge')),
      target: edgeTarget('top_front_edge'),
      family: 'edge',
      label: EDGE_LABELS.top_front_edge,
      priority: 2,
      position: [centerX, max.y + edgeThickness / 3, min.z - edgeThickness / 3],
      rotation: [0, 0, 0],
      size: [length, edgeThickness, edgeThickness],
      color: EDGE_COLOR
    },
    {
      key: toKey(edgeTarget('top_back_edge')),
      target: edgeTarget('top_back_edge'),
      family: 'edge',
      label: EDGE_LABELS.top_back_edge,
      priority: 2,
      position: [centerX, max.y + edgeThickness / 3, max.z + edgeThickness / 3],
      rotation: [0, 0, 0],
      size: [length, edgeThickness, edgeThickness],
      color: EDGE_COLOR
    },
    {
      key: toKey(edgeTarget('bottom_front_edge')),
      target: edgeTarget('bottom_front_edge'),
      family: 'edge',
      label: EDGE_LABELS.bottom_front_edge,
      priority: 2,
      position: [centerX, min.y - edgeThickness / 3, min.z - edgeThickness / 3],
      rotation: [0, 0, 0],
      size: [length, edgeThickness, edgeThickness],
      color: EDGE_COLOR
    },
    {
      key: toKey(edgeTarget('bottom_back_edge')),
      target: edgeTarget('bottom_back_edge'),
      family: 'edge',
      label: EDGE_LABELS.bottom_back_edge,
      priority: 2,
      position: [centerX, min.y - edgeThickness / 3, max.z + edgeThickness / 3],
      rotation: [0, 0, 0],
      size: [length, edgeThickness, edgeThickness],
      color: EDGE_COLOR
    },
    {
      key: toKey(edgeTarget('top_left_edge')),
      target: edgeTarget('top_left_edge'),
      family: 'edge',
      label: EDGE_LABELS.top_left_edge,
      priority: 2,
      position: [min.x - edgeThickness / 3, max.y + edgeThickness / 3, centerZ],
      rotation: [0, 0, 0],
      size: [edgeThickness, edgeThickness, width],
      color: EDGE_COLOR
    },
    {
      key: toKey(edgeTarget('top_right_edge')),
      target: edgeTarget('top_right_edge'),
      family: 'edge',
      label: EDGE_LABELS.top_right_edge,
      priority: 2,
      position: [max.x + edgeThickness / 3, max.y + edgeThickness / 3, centerZ],
      rotation: [0, 0, 0],
      size: [edgeThickness, edgeThickness, width],
      color: EDGE_COLOR
    },
    {
      key: toKey(edgeTarget('bottom_left_edge')),
      target: edgeTarget('bottom_left_edge'),
      family: 'edge',
      label: EDGE_LABELS.bottom_left_edge,
      priority: 2,
      position: [min.x - edgeThickness / 3, min.y - edgeThickness / 3, centerZ],
      rotation: [0, 0, 0],
      size: [edgeThickness, edgeThickness, width],
      color: EDGE_COLOR
    },
    {
      key: toKey(edgeTarget('bottom_right_edge')),
      target: edgeTarget('bottom_right_edge'),
      family: 'edge',
      label: EDGE_LABELS.bottom_right_edge,
      priority: 2,
      position: [max.x + edgeThickness / 3, min.y - edgeThickness / 3, centerZ],
      rotation: [0, 0, 0],
      size: [edgeThickness, edgeThickness, width],
      color: EDGE_COLOR
    },
    {
      key: toKey(edgeTarget('front_left_edge')),
      target: edgeTarget('front_left_edge'),
      family: 'edge',
      label: EDGE_LABELS.front_left_edge,
      priority: 2,
      position: [min.x - edgeThickness / 3, centerY, min.z - edgeThickness / 3],
      rotation: [0, 0, 0],
      size: [edgeThickness, thickness, edgeThickness],
      color: EDGE_COLOR
    },
    {
      key: toKey(edgeTarget('front_right_edge')),
      target: edgeTarget('front_right_edge'),
      family: 'edge',
      label: EDGE_LABELS.front_right_edge,
      priority: 2,
      position: [max.x + edgeThickness / 3, centerY, min.z - edgeThickness / 3],
      rotation: [0, 0, 0],
      size: [edgeThickness, thickness, edgeThickness],
      color: EDGE_COLOR
    },
    {
      key: toKey(edgeTarget('back_left_edge')),
      target: edgeTarget('back_left_edge'),
      family: 'edge',
      label: EDGE_LABELS.back_left_edge,
      priority: 2,
      position: [min.x - edgeThickness / 3, centerY, max.z + edgeThickness / 3],
      rotation: [0, 0, 0],
      size: [edgeThickness, thickness, edgeThickness],
      color: EDGE_COLOR
    },
    {
      key: toKey(edgeTarget('back_right_edge')),
      target: edgeTarget('back_right_edge'),
      family: 'edge',
      label: EDGE_LABELS.back_right_edge,
      priority: 2,
      position: [max.x + edgeThickness / 3, centerY, max.z + edgeThickness / 3],
      rotation: [0, 0, 0],
      size: [edgeThickness, thickness, edgeThickness],
      color: EDGE_COLOR
    },
    {
      key: toKey(cornerTarget('front_top_left_corner')),
      target: cornerTarget('front_top_left_corner'),
      family: 'corner',
      label: CORNER_LABELS.front_top_left_corner,
      priority: 3,
      position: [min.x - cornerSize / 4, max.y + cornerSize / 4, min.z - cornerSize / 4],
      rotation: [0, 0, 0],
      size: [cornerSize, cornerSize, cornerSize],
      color: CORNER_COLOR
    },
    {
      key: toKey(cornerTarget('front_top_right_corner')),
      target: cornerTarget('front_top_right_corner'),
      family: 'corner',
      label: CORNER_LABELS.front_top_right_corner,
      priority: 3,
      position: [max.x + cornerSize / 4, max.y + cornerSize / 4, min.z - cornerSize / 4],
      rotation: [0, 0, 0],
      size: [cornerSize, cornerSize, cornerSize],
      color: CORNER_COLOR
    },
    {
      key: toKey(cornerTarget('front_bottom_left_corner')),
      target: cornerTarget('front_bottom_left_corner'),
      family: 'corner',
      label: CORNER_LABELS.front_bottom_left_corner,
      priority: 3,
      position: [min.x - cornerSize / 4, min.y - cornerSize / 4, min.z - cornerSize / 4],
      rotation: [0, 0, 0],
      size: [cornerSize, cornerSize, cornerSize],
      color: CORNER_COLOR
    },
    {
      key: toKey(cornerTarget('front_bottom_right_corner')),
      target: cornerTarget('front_bottom_right_corner'),
      family: 'corner',
      label: CORNER_LABELS.front_bottom_right_corner,
      priority: 3,
      position: [max.x + cornerSize / 4, min.y - cornerSize / 4, min.z - cornerSize / 4],
      rotation: [0, 0, 0],
      size: [cornerSize, cornerSize, cornerSize],
      color: CORNER_COLOR
    },
    {
      key: toKey(cornerTarget('back_top_left_corner')),
      target: cornerTarget('back_top_left_corner'),
      family: 'corner',
      label: CORNER_LABELS.back_top_left_corner,
      priority: 3,
      position: [min.x - cornerSize / 4, max.y + cornerSize / 4, max.z + cornerSize / 4],
      rotation: [0, 0, 0],
      size: [cornerSize, cornerSize, cornerSize],
      color: CORNER_COLOR
    },
    {
      key: toKey(cornerTarget('back_top_right_corner')),
      target: cornerTarget('back_top_right_corner'),
      family: 'corner',
      label: CORNER_LABELS.back_top_right_corner,
      priority: 3,
      position: [max.x + cornerSize / 4, max.y + cornerSize / 4, max.z + cornerSize / 4],
      rotation: [0, 0, 0],
      size: [cornerSize, cornerSize, cornerSize],
      color: CORNER_COLOR
    },
    {
      key: toKey(cornerTarget('back_bottom_left_corner')),
      target: cornerTarget('back_bottom_left_corner'),
      family: 'corner',
      label: CORNER_LABELS.back_bottom_left_corner,
      priority: 3,
      position: [min.x - cornerSize / 4, min.y - cornerSize / 4, max.z + cornerSize / 4],
      rotation: [0, 0, 0],
      size: [cornerSize, cornerSize, cornerSize],
      color: CORNER_COLOR
    },
    {
      key: toKey(cornerTarget('back_bottom_right_corner')),
      target: cornerTarget('back_bottom_right_corner'),
      family: 'corner',
      label: CORNER_LABELS.back_bottom_right_corner,
      priority: 3,
      position: [max.x + cornerSize / 4, min.y - cornerSize / 4, max.z + cornerSize / 4],
      rotation: [0, 0, 0],
      size: [cornerSize, cornerSize, cornerSize],
      color: CORNER_COLOR
    }
  ];
}

export function isTargetValidForDraft(target: PartFeatureTarget, draft: FeatureDraft | null): boolean {
  if (!draft) return false;

  if (draft.mode === 'end_cut') {
    return target.type === 'face' && (target.face === 'left_end' || target.face === 'right_end');
  }

  if (draft.cutType === 'corner_notch') {
    if (target.type !== 'corner') return false;
    if (draft.depthMode === 'through') return true;
    return target.corner.includes('top') || target.corner.includes('bottom');
  }

  if (draft.cutType === 'edge_notch') {
    if (target.type !== 'edge') return false;
    if (draft.depthMode === 'through') return true;
    return target.edge.includes('top') || target.edge.includes('bottom');
  }

  return target.type === 'face' && (target.face === 'top_face' || target.face === 'bottom_face');
}

export function getValidPickableTargets(part: Part, draft: FeatureDraft | null): PickableTargetDefinition[] {
  const allTargets = getPickableTargetDefinitions(part);
  if (!draft) return [];
  return allTargets.filter((target) => isTargetValidForDraft(target.target, draft));
}

export function getPickableTargetLabel(target: PartFeatureTarget | null | undefined): string | null {
  return target ? getTargetLabel(target) : null;
}
