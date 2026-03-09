import {
  CornerTarget,
  EdgeTarget,
  EndCutFeature,
  FaceTarget,
  PartFeature,
  PartFeatureTarget,
  RectCutFeature
} from '@renderer/types';
import { clonePartFeature } from '@renderer/utils/partFeatures';

export const END_TARGETS: FaceTarget[] = ['left_end', 'right_end'];
export const FACE_TARGETS: FaceTarget[] = [
  'left_end',
  'right_end',
  'top_face',
  'bottom_face',
  'front_face',
  'back_face'
];
export const EDGE_TARGETS: EdgeTarget[] = [
  'top_front_edge',
  'top_back_edge',
  'top_left_edge',
  'top_right_edge',
  'bottom_front_edge',
  'bottom_back_edge',
  'bottom_left_edge',
  'bottom_right_edge',
  'front_left_edge',
  'front_right_edge',
  'back_left_edge',
  'back_right_edge'
];
export const CORNER_TARGETS: CornerTarget[] = [
  'front_top_left_corner',
  'front_top_right_corner',
  'front_bottom_left_corner',
  'front_bottom_right_corner',
  'back_top_left_corner',
  'back_top_right_corner',
  'back_bottom_left_corner',
  'back_bottom_right_corner'
];

export type OperationPreset =
  | 'end_cut'
  | 'corner_notch'
  | 'edge_notch'
  | 'cutout'
  | 'dado'
  | 'stopped_dado'
  | 'rabbet'
  | 'groove'
  | 'stopped_groove'
  | 'mortise';

export type FeatureDraft =
  | {
      mode: 'end_cut';
      featureId: string | null;
      label: string;
      enabled: boolean;
      targetFace: 'left_end' | 'right_end';
      cutType: EndCutFeature['cutType'];
      horizontalAngle: number;
      horizontalFlip: boolean;
      verticalAngle: number;
    }
  | {
      mode: 'rect_cut';
      featureId: string | null;
      label: string;
      enabled: boolean;
      cutType: RectCutFeature['cutType'];
      faceTarget: FaceTarget;
      edgeTarget: EdgeTarget;
      cornerTarget: CornerTarget;
      sizeLength: number;
      sizeWidth: number;
      depthMode: RectCutFeature['parameters']['depthMode'];
      depth: number;
      placementX: number;
      placementZ: number;
    };

export function generateFeatureId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `feature_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildDraftFromPreset(
  preset: OperationPreset,
  _defaults?: { partLength?: number; partWidth?: number; partThickness?: number }
): FeatureDraft {
  if (preset === 'end_cut') {
    return {
      mode: 'end_cut',
      featureId: null,
      label: '',
      enabled: true,
      targetFace: 'left_end',
      cutType: 'mitre',
      horizontalAngle: 45,
      horizontalFlip: false,
      verticalAngle: 0
    };
  }

  return {
    mode: 'rect_cut',
    featureId: null,
    label: '',
    enabled: true,
    cutType: preset,
    faceTarget: preset === 'dado' ? 'top_face' : 'top_face',
    edgeTarget: preset === 'rabbet' ? 'top_front_edge' : 'top_front_edge',
    cornerTarget: 'front_bottom_left_corner',
    sizeLength:
      preset === 'dado'
        ? 0.75
        : preset === 'stopped_dado'
          ? 3
          : preset === 'rabbet'
            ? 0.5
            : preset === 'mortise'
              ? 2
              : preset === 'stopped_groove'
                ? 4
                : 0.75,
    sizeWidth:
      preset === 'rabbet' || preset === 'groove' || preset === 'stopped_groove'
        ? 0.5
        : preset === 'stopped_dado'
          ? 0
          : 0.75,
    depthMode:
      preset === 'dado' ||
      preset === 'stopped_dado' ||
      preset === 'rabbet' ||
      preset === 'groove' ||
      preset === 'stopped_groove' ||
      preset === 'mortise'
        ? 'blind'
        : 'through',
    depth: 0.25,
    placementX: 0,
    placementZ: 0
  };
}

export function buildDraftFromFeature(
  feature: PartFeature,
  _part?: Pick<{ length: number; width: number; thickness: number }, 'length' | 'width' | 'thickness'>
): FeatureDraft {
  if (feature.kind === 'end_cut') {
    return {
      mode: 'end_cut',
      featureId: feature.id,
      label: feature.label ?? '',
      enabled: feature.enabled,
      targetFace: feature.target.face,
      cutType: feature.cutType,
      horizontalAngle: feature.parameters.horizontalAngle,
      horizontalFlip: feature.parameters.horizontalFlip ?? false,
      verticalAngle: feature.parameters.verticalAngle ?? 0
    };
  }

  return {
    mode: 'rect_cut',
    featureId: feature.id,
    label: feature.label ?? '',
    enabled: feature.enabled,
    cutType: feature.cutType,
    faceTarget: feature.target.type === 'face' ? feature.target.face : 'top_face',
    edgeTarget: feature.target.type === 'edge' ? feature.target.edge : 'top_front_edge',
    cornerTarget: feature.target.type === 'corner' ? feature.target.corner : 'front_bottom_left_corner',
    sizeLength: feature.parameters.size.length,
    sizeWidth: feature.parameters.size.width,
    depthMode: feature.parameters.depthMode,
    depth: feature.parameters.depth ?? 0.25,
    placementX: feature.placement.x,
    placementZ: feature.placement.z
  };
}

export function buildFeatureFromDraft(draft: FeatureDraft): PartFeature {
  if (draft.mode === 'end_cut') {
    return {
      id: draft.featureId ?? generateFeatureId(),
      kind: 'end_cut',
      version: 1,
      enabled: draft.enabled,
      label: draft.label || undefined,
      target: { type: 'face', face: draft.targetFace },
      reference: { primaryFrom: draft.targetFace === 'left_end' ? 'min' : 'max' },
      cutType: draft.cutType,
      lengthMode: 'long_point',
      parameters: {
        horizontalAngle: draft.cutType === 'bevel' ? 0 : draft.horizontalAngle,
        horizontalFlip: draft.horizontalFlip,
        verticalAngle:
          draft.cutType === 'mitre' || draft.cutType === 'square' ? undefined : draft.verticalAngle || undefined
      }
    };
  }

  const target =
    draft.cutType === 'corner_notch'
      ? { type: 'corner' as const, corner: draft.cornerTarget }
      : draft.cutType === 'edge_notch' || draft.cutType === 'rabbet'
        ? { type: 'edge' as const, edge: draft.edgeTarget }
        : { type: 'face' as const, face: draft.faceTarget };

  return {
    id: draft.featureId ?? generateFeatureId(),
    kind: 'rect_cut',
    version: 1,
    enabled: draft.enabled,
    label: draft.label || undefined,
    target,
    reference: {
      primaryFrom: 'min',
      secondaryFrom: draft.cutType === 'corner_notch' ? 'min' : undefined
    },
    cutType: draft.cutType,
    parameters: {
      size: {
        length: draft.sizeLength,
        width: draft.sizeWidth
      },
      depthMode: draft.depthMode,
      depth: draft.depthMode === 'blind' ? draft.depth : undefined
    },
    placement: {
      x: draft.cutType === 'corner_notch' ? 0 : draft.placementX,
      z:
        draft.cutType === 'corner_notch' || draft.cutType === 'dado' || draft.cutType === 'stopped_dado'
          ? 0
          : draft.placementZ
    }
  };
}

export function getFeatureDraftTarget(draft: FeatureDraft): PartFeatureTarget {
  if (draft.mode === 'end_cut') {
    return { type: 'face', face: draft.targetFace };
  }

  if (draft.cutType === 'corner_notch') {
    return { type: 'corner', corner: draft.cornerTarget };
  }

  if (draft.cutType === 'edge_notch' || draft.cutType === 'rabbet') {
    return { type: 'edge', edge: draft.edgeTarget };
  }

  return { type: 'face', face: draft.faceTarget };
}

export function applyTargetToFeatureDraft(draft: FeatureDraft, target: PartFeatureTarget): FeatureDraft {
  if (draft.mode === 'end_cut') {
    return target.type === 'face' && (target.face === 'left_end' || target.face === 'right_end')
      ? { ...draft, targetFace: target.face }
      : draft;
  }

  if (draft.cutType === 'corner_notch') {
    return target.type === 'corner' ? { ...draft, cornerTarget: target.corner } : draft;
  }

  if (draft.cutType === 'edge_notch' || draft.cutType === 'rabbet') {
    return target.type === 'edge' ? { ...draft, edgeTarget: target.edge } : draft;
  }

  return target.type === 'face' && (target.face === 'top_face' || target.face === 'bottom_face')
    ? { ...draft, faceTarget: target.face }
    : draft;
}

export function duplicateFeature(feature: PartFeature): PartFeature {
  const duplicate = clonePartFeature(feature);
  duplicate.id = generateFeatureId();
  return duplicate;
}

export function getPresetLabel(preset: OperationPreset): string {
  switch (preset) {
    case 'end_cut':
      return 'End Cut';
    case 'corner_notch':
      return 'Corner Notch';
    case 'edge_notch':
      return 'Edge Notch';
    case 'cutout':
      return 'Cutout';
    case 'dado':
      return 'Dado';
    case 'stopped_dado':
      return 'Stopped Dado';
    case 'rabbet':
      return 'Rabbet';
    case 'groove':
      return 'Groove';
    case 'stopped_groove':
      return 'Stopped Groove';
    case 'mortise':
      return 'Mortise';
  }
}

export function getPresetHint(preset: OperationPreset): string {
  switch (preset) {
    case 'end_cut':
      return 'Mitres, bevels, and compound cuts on either end.';
    case 'corner_notch':
      return 'Remove a rectangular chunk from one exact corner.';
    case 'edge_notch':
      return 'Notch into a specific edge while keeping the blank rectangular.';
    case 'cutout':
      return 'Place a rectangular pocket or opening on one face.';
    case 'dado':
      return 'Cut a full-width channel across the top or bottom face.';
    case 'stopped_dado':
      return 'Cut a blind channel across the board width with a limited run along the blank.';
    case 'rabbet':
      return 'Cut a full-run edge recess along one supported edge.';
    case 'groove':
      return 'Cut a full-length face groove with blind depth.';
    case 'stopped_groove':
      return 'Cut a blind face groove with a limited run and explicit placement.';
    case 'mortise':
      return 'Cut a blind face pocket for loose-tenon or joinery layout.';
  }
}
