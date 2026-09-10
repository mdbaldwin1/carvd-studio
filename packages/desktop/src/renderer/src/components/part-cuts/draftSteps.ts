import { isEdgeBevelTarget, type FeatureDraft } from '@renderer/components/part-features/partFeatureEditorState';

/** Wording for the cut inspector's current step. */
export function getDraftStepTitle(draft: FeatureDraft): string {
  if (draft.mode === 'end_cut')
    return isEdgeBevelTarget(draft.targetFace)
      ? 'Step 2: Pick the edge and set the bevel angle'
      : 'Step 2: Pick the end and set the angle';
  if (draft.mode === 'circular_cut') return 'Step 2: Pick a face and place the hole';
  if (draft.mode === 'rounded_cut') return 'Step 2: Pick a face and size the rounded opening';

  switch (draft.cutType) {
    case 'tenon':
      return 'Step 2: Pick the end and size the tongue';
    case 'corner_notch':
      return 'Step 2: Pick the corner and size the notch';
    case 'edge_notch':
      return 'Step 2: Pick the edge and size the notch';
    case 'cutout':
      return 'Step 2: Pick the face and place the cutout';
    case 'dado':
    case 'stopped_dado':
      return 'Step 2: Pick the face and lay out the dado';
    case 'rabbet':
      return 'Step 2: Pick the edge and size the rabbet';
    case 'groove':
    case 'stopped_groove':
      return 'Step 2: Pick the face and lay out the groove';
    case 'mortise':
      return 'Step 2: Pick the face and place the mortise';
  }
}

export function getDraftStepDescription(draft: FeatureDraft): string {
  if (draft.mode === 'end_cut') {
    return 'Choose the end first, then set the cut style, angle, and direction. The part length stays fixed for the cut list.';
  }
  if (draft.mode === 'circular_cut') {
    return 'Choose any face, then set diameter, depth, angle, placement, and an optional repeating pattern.';
  }
  if (draft.mode === 'rounded_cut') {
    return 'Choose any face, then set the profile size, corner shape, depth, placement, and rotation.';
  }

  switch (draft.cutType) {
    case 'corner_notch':
      return 'Choose the exact corner, then set the notch size and depth.';
    case 'edge_notch':
      return 'Choose the edge, then set the notch size, depth, and offsets.';
    case 'cutout':
      return 'Choose the face, then set the opening size, depth, and placement.';
    case 'dado':
      return 'Choose the face, then set the dado width and depth.';
    case 'stopped_dado':
      return 'Choose the face, then set the stopped run, width, start offset, and depth.';
    case 'rabbet':
      return 'Choose the edge, then set the shoulder width and depth.';
    case 'groove':
      return 'Choose the face, then set the groove width and depth.';
    case 'stopped_groove':
      return 'Choose the face, then set the groove run, width, offsets, and depth.';
    case 'mortise':
      return 'Choose the face, then set the pocket size, placement, and depth.';
  }
}
