import { isEdgeBevelTarget, type FeatureDraft } from '@renderer/components/part-features/partFeatureEditorState';

/**
 * One line describing what the inspector's fields control for this cut type.
 *
 * These used to be two lines reading "Step 2: pick the end, then set the
 * angle" — wording from when choosing a type staged a cut that a Save button
 * committed. Picking a type creates the cut now and every field edits it in
 * place, so there is no first step to be second to, and nothing has to be
 * chosen before anything else.
 */
export function getCutHint(draft: FeatureDraft): string {
  if (draft.mode === 'end_cut') {
    return isEdgeBevelTarget(draft.targetFace)
      ? 'Set the edge and the bevel angle. The part length stays fixed for the cut list.'
      : 'Set the end, cut style, angle, and direction. The part length stays fixed for the cut list.';
  }
  if (draft.mode === 'circular_cut') {
    return 'Set the face, diameter, depth, angle, placement, and an optional repeating pattern.';
  }
  if (draft.mode === 'rounded_cut') {
    return 'Set the face, profile size, corner shape, depth, placement, and rotation.';
  }

  switch (draft.cutType) {
    case 'tenon':
      return 'Set the end and the size of the tongue.';
    case 'corner_notch':
      return 'Set the corner, the notch size, and the depth.';
    case 'edge_notch':
      return 'Set the edge, the notch size, the depth, and the offsets.';
    case 'cutout':
      return 'Set the face, the opening size, the depth, and the placement.';
    case 'dado':
      return 'Set the face, the dado width, and the depth.';
    case 'stopped_dado':
      return 'Set the face, the stopped run, the width, the start offset, and the depth.';
    case 'rabbet':
      return 'Set the edge, the shoulder width, and the depth.';
    case 'groove':
      return 'Set the face, the groove width, and the depth.';
    case 'stopped_groove':
      return 'Set the face, the groove run, the width, the offsets, and the depth.';
    case 'mortise':
      return 'Set the face, the pocket size, the placement, and the depth.';
  }
}
