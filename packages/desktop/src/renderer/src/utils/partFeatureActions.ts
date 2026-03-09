import { CornerTarget, EdgeTarget, EndCutFeature, FaceTarget, PartFeature, RectCutFeature } from '@renderer/types';
import { clonePartFeature } from '@renderer/utils/partFeatures';

export type WorkspacePreset =
  | 'mitre_both_ends'
  | 'bevel_both_ends'
  | 'square_both_ends'
  | 'compound_both_ends'
  | 'top_cutout'
  | 'bottom_cutout'
  | 'centered_dado'
  | 'top_front_rabbet'
  | 'top_back_rabbet'
  | 'top_front_edge_notch'
  | 'top_back_edge_notch'
  | 'top_front_left_corner_notch'
  | 'top_front_right_corner_notch'
  | 'top_front_corners'
  | 'bottom_front_corners';

export type MirrorAction = 'opposite_end' | 'across_length' | 'across_width';

function generateFeatureId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `feature_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildEndCut(
  face: 'left_end' | 'right_end',
  cutType: EndCutFeature['cutType'],
  parameters: EndCutFeature['parameters']
): EndCutFeature {
  return {
    id: generateFeatureId(),
    kind: 'end_cut',
    version: 1,
    enabled: true,
    target: { type: 'face', face },
    reference: { primaryFrom: face === 'left_end' ? 'min' : 'max' },
    cutType,
    lengthMode: 'long_point',
    parameters
  };
}

function buildRectCut(
  cutType: RectCutFeature['cutType'],
  target: RectCutFeature['target'],
  placement: RectCutFeature['placement'],
  size: RectCutFeature['parameters']['size'],
  depthMode: RectCutFeature['parameters']['depthMode'] = 'through',
  depth?: number
): RectCutFeature {
  return {
    id: generateFeatureId(),
    kind: 'rect_cut',
    version: 1,
    enabled: true,
    target,
    reference: {
      primaryFrom: 'min',
      secondaryFrom: cutType === 'corner_notch' ? 'min' : undefined
    },
    cutType,
    parameters: {
      size,
      depthMode,
      depth: depthMode === 'blind' ? (depth ?? 0.25) : undefined
    },
    placement
  };
}

export function buildFeaturesFromPreset(preset: WorkspacePreset, _defaults?: { partLength?: number }): PartFeature[] {
  switch (preset) {
    case 'mitre_both_ends':
      return [
        buildEndCut('left_end', 'mitre', { horizontalAngle: 45 }),
        buildEndCut('right_end', 'mitre', { horizontalAngle: 45 })
      ];
    case 'bevel_both_ends':
      return [
        buildEndCut('left_end', 'bevel', { horizontalAngle: 0, verticalAngle: 15 }),
        buildEndCut('right_end', 'bevel', { horizontalAngle: 0, verticalAngle: 15 })
      ];
    case 'square_both_ends':
      return [
        buildEndCut('left_end', 'square', { horizontalAngle: 0 }),
        buildEndCut('right_end', 'square', { horizontalAngle: 0 })
      ];
    case 'compound_both_ends':
      return [
        buildEndCut('left_end', 'compound', { horizontalAngle: 45, verticalAngle: 15 }),
        buildEndCut('right_end', 'compound', { horizontalAngle: 45, verticalAngle: 15 })
      ];
    case 'top_cutout':
      return [buildRectCut('cutout', { type: 'face', face: 'top_face' }, { x: 0, z: 0 }, { length: 3, width: 1.5 })];
    case 'bottom_cutout':
      return [buildRectCut('cutout', { type: 'face', face: 'bottom_face' }, { x: 0, z: 0 }, { length: 3, width: 1.5 })];
    case 'centered_dado':
      return [
        buildRectCut(
          'dado',
          { type: 'face', face: 'top_face' },
          { x: 6, z: 0 },
          { length: 0.75, width: 0 },
          'blind',
          0.375
        )
      ];
    case 'top_front_rabbet':
      return [
        buildRectCut(
          'rabbet',
          { type: 'edge', edge: 'top_front_edge' },
          { x: 0, z: 0 },
          { length: 0.5, width: 0.5 },
          'blind',
          0.25
        )
      ];
    case 'top_back_rabbet':
      return [
        buildRectCut(
          'rabbet',
          { type: 'edge', edge: 'top_back_edge' },
          { x: 0, z: 0 },
          { length: 0.5, width: 0.5 },
          'blind',
          0.25
        )
      ];
    case 'top_front_edge_notch':
      return [
        buildRectCut(
          'edge_notch',
          { type: 'edge', edge: 'top_front_edge' },
          { x: 0, z: 0 },
          { length: 1.5, width: 0.75 }
        )
      ];
    case 'top_back_edge_notch':
      return [
        buildRectCut(
          'edge_notch',
          { type: 'edge', edge: 'top_back_edge' },
          { x: 0, z: 0 },
          { length: 1.5, width: 0.75 }
        )
      ];
    case 'top_front_left_corner_notch':
      return [
        buildRectCut(
          'corner_notch',
          { type: 'corner', corner: 'front_top_left_corner' },
          { x: 0, z: 0 },
          { length: 0.75, width: 0.75 }
        )
      ];
    case 'top_front_right_corner_notch':
      return [
        buildRectCut(
          'corner_notch',
          { type: 'corner', corner: 'front_top_right_corner' },
          { x: 0, z: 0 },
          { length: 0.75, width: 0.75 }
        )
      ];
    case 'top_front_corners':
      return [
        buildRectCut(
          'corner_notch',
          { type: 'corner', corner: 'front_top_left_corner' },
          { x: 0, z: 0 },
          { length: 0.75, width: 0.75 }
        ),
        buildRectCut(
          'corner_notch',
          { type: 'corner', corner: 'front_top_right_corner' },
          { x: 0, z: 0 },
          { length: 0.75, width: 0.75 }
        )
      ];
    case 'bottom_front_corners':
      return [
        buildRectCut(
          'corner_notch',
          { type: 'corner', corner: 'front_bottom_left_corner' },
          { x: 0, z: 0 },
          { length: 0.75, width: 0.75 }
        ),
        buildRectCut(
          'corner_notch',
          { type: 'corner', corner: 'front_bottom_right_corner' },
          { x: 0, z: 0 },
          { length: 0.75, width: 0.75 }
        )
      ];
  }
}

const LENGTH_CORNER_MAP: Record<CornerTarget, CornerTarget> = {
  front_top_left_corner: 'front_top_right_corner',
  front_top_right_corner: 'front_top_left_corner',
  front_bottom_left_corner: 'front_bottom_right_corner',
  front_bottom_right_corner: 'front_bottom_left_corner',
  back_top_left_corner: 'back_top_right_corner',
  back_top_right_corner: 'back_top_left_corner',
  back_bottom_left_corner: 'back_bottom_right_corner',
  back_bottom_right_corner: 'back_bottom_left_corner'
};

const WIDTH_CORNER_MAP: Record<CornerTarget, CornerTarget> = {
  front_top_left_corner: 'back_top_left_corner',
  front_top_right_corner: 'back_top_right_corner',
  front_bottom_left_corner: 'back_bottom_left_corner',
  front_bottom_right_corner: 'back_bottom_right_corner',
  back_top_left_corner: 'front_top_left_corner',
  back_top_right_corner: 'front_top_right_corner',
  back_bottom_left_corner: 'front_bottom_left_corner',
  back_bottom_right_corner: 'front_bottom_right_corner'
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
  return ['across_length', 'across_width'];
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

export function mirrorFeature(feature: PartFeature, action: MirrorAction): PartFeature {
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

  mirrored.placement = {
    x: action === 'across_length' ? -feature.placement.x : feature.placement.x,
    z: action === 'across_width' ? -feature.placement.z : feature.placement.z
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

export function getWorkspacePresetLabel(preset: WorkspacePreset): string {
  switch (preset) {
    case 'mitre_both_ends':
      return 'Mitre Both Ends';
    case 'bevel_both_ends':
      return 'Bevel Both Ends';
    case 'square_both_ends':
      return 'Square Both Ends';
    case 'compound_both_ends':
      return 'Compound Both Ends';
    case 'top_cutout':
      return 'Top Cutout';
    case 'bottom_cutout':
      return 'Bottom Cutout';
    case 'centered_dado':
      return 'Centered Dado';
    case 'top_front_rabbet':
      return 'Top Front Rabbet';
    case 'top_back_rabbet':
      return 'Top Back Rabbet';
    case 'top_front_edge_notch':
      return 'Top Front Edge Notch';
    case 'top_back_edge_notch':
      return 'Top Back Edge Notch';
    case 'top_front_left_corner_notch':
      return 'Top Front Left Corner';
    case 'top_front_right_corner_notch':
      return 'Top Front Right Corner';
    case 'top_front_corners':
      return 'Top Front Corners';
    case 'bottom_front_corners':
      return 'Bottom Front Corners';
  }
}

export function getWorkspacePresetHint(preset: WorkspacePreset): string {
  switch (preset) {
    case 'mitre_both_ends':
      return 'Adds matching 45° mitres to both ends.';
    case 'bevel_both_ends':
      return 'Adds matching 15° bevels to both ends.';
    case 'square_both_ends':
      return 'Restores both ends as explicit square cuts.';
    case 'compound_both_ends':
      return 'Adds matching compound cuts to both ends.';
    case 'top_cutout':
      return 'Starts a centered top cutout you can resize and place.';
    case 'bottom_cutout':
      return 'Starts a centered bottom cutout you can resize and place.';
    case 'centered_dado':
      return 'Starts a centered top dado with blind depth.';
    case 'top_front_rabbet':
      return 'Starts a rabbet on the top front edge.';
    case 'top_back_rabbet':
      return 'Starts a rabbet on the top back edge.';
    case 'top_front_edge_notch':
      return 'Starts a notch from the top front edge.';
    case 'top_back_edge_notch':
      return 'Starts a notch from the top back edge.';
    case 'top_front_left_corner_notch':
      return 'Starts a top front left corner relief notch.';
    case 'top_front_right_corner_notch':
      return 'Starts a top front right corner relief notch.';
    case 'top_front_corners':
      return 'Adds matching relief notches to both top front corners.';
    case 'bottom_front_corners':
      return 'Adds matching relief notches to both bottom front corners.';
  }
}
