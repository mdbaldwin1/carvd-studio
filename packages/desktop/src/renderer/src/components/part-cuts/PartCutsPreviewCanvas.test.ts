import { describe, expect, it } from 'vitest';
import { createTestPart } from '../../../../../tests/helpers/factories';
import { buildPreviewPart } from './PartCutsPreviewCanvas';

describe('buildPreviewPart', () => {
  it('includes a new unsaved end-cut draft in the preview part', () => {
    const part = createTestPart({ length: 24, width: 4, thickness: 0.75 });

    const previewPart = buildPreviewPart(part, [], {
      mode: 'end_cut',
      featureId: null,
      label: '',
      enabled: true,
      targetFace: 'left_end',
      cutType: 'mitre',
      horizontalAngle: 45,
      horizontalFlip: false,
      verticalAngle: 0
    });

    expect(previewPart.features).toHaveLength(1);
    expect(previewPart.features?.[0]).toMatchObject({
      kind: 'end_cut',
      target: { type: 'face', face: 'left_end' },
      parameters: {
        horizontalAngle: 45,
        horizontalFlip: false
      }
    });
  });

  it('replaces the matching saved feature with the current draft', () => {
    const part = createTestPart({
      features: [
        {
          id: 'feature-1',
          kind: 'end_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'left_end' },
          reference: { primaryFrom: 'min' },
          cutType: 'mitre',
          lengthMode: 'long_point',
          parameters: {
            horizontalAngle: 45,
            reference: { mode: 'long_point', value: 24 }
          }
        }
      ]
    });

    const previewPart = buildPreviewPart(part, part.features ?? [], {
      mode: 'end_cut',
      featureId: 'feature-1',
      label: '',
      enabled: true,
      targetFace: 'left_end',
      cutType: 'compound',
      horizontalAngle: 30,
      horizontalFlip: true,
      verticalAngle: 10
    });

    expect(previewPart.features).toHaveLength(1);
    expect(previewPart.features?.[0]).toMatchObject({
      id: 'feature-1',
      kind: 'end_cut',
      cutType: 'compound',
      parameters: {
        horizontalAngle: 30,
        horizontalFlip: true,
        verticalAngle: 10
      }
    });
  });
});
