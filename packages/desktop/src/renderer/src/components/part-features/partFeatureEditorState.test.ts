import { describe, expect, it } from 'vitest';
import { buildDraftFromFeature, buildFeatureFromDraft } from './partFeatureEditorState';

describe('partFeatureEditorState', () => {
  it('preserves end-cut length semantics when round-tripping through the draft model', () => {
    const feature = {
      id: 'feature-1',
      kind: 'end_cut' as const,
      version: 1 as const,
      enabled: true,
      target: { type: 'face' as const, face: 'left_end' as const },
      reference: { primaryFrom: 'min' as const },
      cutType: 'mitre' as const,
      lengthMode: 'centerline' as const,
      parameters: {
        horizontalAngle: 45,
        reference: {
          mode: 'centerline' as const,
          value: 23.5
        }
      }
    };

    const draft = buildDraftFromFeature(feature);
    const rebuilt = buildFeatureFromDraft(draft);

    expect(draft).toMatchObject({
      lengthMode: 'centerline',
      referenceMode: 'centerline',
      referenceValue: 23.5
    });
    expect(rebuilt).toMatchObject({
      lengthMode: 'centerline',
      parameters: {
        reference: {
          mode: 'centerline',
          value: 23.5
        }
      }
    });
  });
});
