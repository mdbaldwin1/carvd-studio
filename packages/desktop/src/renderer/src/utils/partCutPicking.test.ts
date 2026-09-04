import { buildDraftFromPreset } from '@renderer/components/part-features/partFeatureEditorState';
import { describe, expect, it } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import {
  getPartFeatureTargetKey,
  getPickableTargetDefinitions,
  getValidPickableTargets,
  isTargetValidForDraft
} from './partCutPicking';

describe('partCutPicking', () => {
  it('builds canonical pick targets for all faces, edges, and corners', () => {
    const part = createTestPart({ length: 24, width: 6, thickness: 0.75 });

    const targets = getPickableTargetDefinitions(part);

    expect(targets).toHaveLength(22);
    expect(new Set(targets.map((target) => target.key)).size).toBe(22);
  });

  it('limits end cuts to the two end faces', () => {
    const draft = buildDraftFromPreset('end_cut');

    expect(isTargetValidForDraft({ type: 'face', face: 'left_end' }, draft)).toBe(true);
    expect(isTargetValidForDraft({ type: 'face', face: 'right_end' }, draft)).toBe(true);
    expect(isTargetValidForDraft({ type: 'face', face: 'top_face' }, draft)).toBe(false);
    expect(isTargetValidForDraft({ type: 'edge', edge: 'top_front_edge' }, draft)).toBe(false);
  });

  it('limits edge notches to the four canonical side targets', () => {
    const draft = buildDraftFromPreset('edge_notch');

    expect(isTargetValidForDraft({ type: 'edge', edge: 'top_front_edge' }, draft)).toBe(true);
    expect(isTargetValidForDraft({ type: 'edge', edge: 'top_back_edge' }, draft)).toBe(true);
    expect(isTargetValidForDraft({ type: 'edge', edge: 'top_left_edge' }, draft)).toBe(true);
    expect(isTargetValidForDraft({ type: 'edge', edge: 'top_right_edge' }, draft)).toBe(true);
    expect(isTargetValidForDraft({ type: 'edge', edge: 'bottom_front_edge' }, draft)).toBe(false);
    expect(isTargetValidForDraft({ type: 'edge', edge: 'front_left_edge' }, draft)).toBe(false);
    expect(isTargetValidForDraft({ type: 'face', face: 'top_face' }, draft)).toBe(false);
  });

  it('limits cutouts to top and bottom faces', () => {
    const draft = buildDraftFromPreset('cutout');
    const part = createTestPart();

    const targets = getValidPickableTargets(part, draft);

    expect(targets.map((target) => getPartFeatureTargetKey(target.target))).toEqual([
      'face:top_face',
      'face:bottom_face'
    ]);
  });
});
