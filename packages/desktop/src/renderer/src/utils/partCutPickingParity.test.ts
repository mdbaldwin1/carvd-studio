import { describe, expect, it } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import {
  applyTargetToFeatureDraft,
  buildDraftFromPreset,
  normalizeRectCutDraft,
  type FeatureDraft,
  type OperationPreset
} from '@renderer/components/part-features/partFeatureEditorState';
import { getValidPickableTargets, isTargetValidForDraft } from '@renderer/utils/partCutPicking';

const PRESETS: OperationPreset[] = [
  'end_cut',
  'edge_bevel',
  'tenon',
  'half_lap',
  'corner_notch',
  'edge_notch',
  'cutout',
  'dado',
  'stopped_dado',
  'rabbet',
  'groove',
  'stopped_groove',
  'mortise',
  'round_hole',
  'countersink',
  'counterbore',
  'rounded_slot',
  'rounded_rectangle'
];

const PART = createTestPart({ length: 24, width: 8, thickness: 0.75 });
const DIMS = { partLength: 24, partWidth: 8, partThickness: 0.75 };

function targetName(target: { type: string; face?: string; edge?: string; corner?: string }): string {
  return target.face ?? target.edge ?? target.corner ?? target.type;
}

/** The draft the editor actually holds: rect drafts pass through normalization. */
function settledDraft(preset: OperationPreset): FeatureDraft {
  const draft = buildDraftFromPreset(preset, DIMS);
  return draft.mode === 'rect_cut' ? normalizeRectCutDraft(draft, DIMS) : draft;
}

describe('pick pane parity', () => {
  /**
   * A pane the canvas offers has to survive being clicked. The failure this
   * guards is specific and has happened three times: the pane is offered,
   * applyTargetToFeatureDraft ignores that target shape, and the click does
   * nothing at all -- or normalizeRectCutDraft immediately reverts it, which
   * looks identical to the user.
   */
  it.each(PRESETS)('every pane offered for %s changes the draft when clicked', (preset) => {
    const draft = settledDraft(preset);
    const offered = getValidPickableTargets(PART, draft);

    expect(offered.length).toBeGreaterThan(0);

    for (const pick of offered) {
      const applied = applyTargetToFeatureDraft(draft, pick.target);
      expect(applied, `${preset}: clicking ${targetName(pick.target)} returned the same draft object`).not.toBe(draft);

      const settled = applied.mode === 'rect_cut' ? normalizeRectCutDraft(applied, DIMS) : applied;
      const current =
        settled.mode === 'end_cut'
          ? settled.targetFace
          : settled.mode === 'rect_cut' && settled.cutType === 'corner_notch'
            ? settled.cornerTarget
            : settled.mode === 'rect_cut' && (settled.cutType === 'edge_notch' || settled.cutType === 'rabbet')
              ? settled.edgeTarget
              : settled.faceTarget;

      expect(current, `${preset}: ${targetName(pick.target)} did not survive normalization`).toBe(
        targetName(pick.target)
      );
    }
  });

  it('offers a tenon its two ends, never the faces it would be snapped off', () => {
    const draft = settledDraft('tenon');

    expect(getValidPickableTargets(PART, draft).map((pick) => targetName(pick.target))).toEqual([
      'left_end',
      'right_end'
    ]);
    expect(isTargetValidForDraft({ type: 'face', face: 'top_face' }, draft)).toBe(false);
  });

  it('offers an end cut both ends and both long edges, as the inspector does', () => {
    const draft = settledDraft('end_cut');

    expect(
      getValidPickableTargets(PART, draft)
        .map((pick) => targetName(pick.target))
        .sort()
    ).toEqual(['back_face', 'front_face', 'left_end', 'right_end']);
  });

  it('keeps a rounded cut on the two faces it can be edited on', () => {
    const draft = settledDraft('rounded_slot');

    expect(getValidPickableTargets(PART, draft).map((pick) => targetName(pick.target))).toEqual([
      'top_face',
      'bottom_face'
    ]);
    // A hole is different: an end-face dowel hole is real work, and the
    // inspector offers all six faces for it.
    expect(isTargetValidForDraft({ type: 'face', face: 'left_end' }, settledDraft('round_hole'))).toBe(true);
  });
});
