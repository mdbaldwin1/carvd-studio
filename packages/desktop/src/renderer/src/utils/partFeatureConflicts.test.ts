import { describe, expect, it } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import { getPartFeatureConflicts } from './partFeatureConflicts';

describe('getPartFeatureConflicts', () => {
  it('flags duplicate enabled end cuts on the same end', () => {
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
          parameters: { horizontalAngle: 45 }
        },
        {
          id: 'feature-2',
          kind: 'end_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'left_end' },
          reference: { primaryFrom: 'min' },
          cutType: 'bevel',
          lengthMode: 'centerline',
          parameters: { horizontalAngle: 0, verticalAngle: 15 }
        }
      ]
    });

    const conflicts = getPartFeatureConflicts(part.features ?? [], part);
    expect(conflicts.some((conflict) => conflict.featureId === 'feature-1' && conflict.severity === 'error')).toBe(
      true
    );
  });

  it('flags overlapping rectangular removals', () => {
    const part = createTestPart({
      features: [
        {
          id: 'feature-1',
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'min' },
          cutType: 'cutout',
          parameters: {
            size: { length: 4, width: 4 },
            depthMode: 'through'
          },
          placement: { x: 1, z: 1 }
        },
        {
          id: 'feature-2',
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'min' },
          cutType: 'cutout',
          parameters: {
            size: { length: 4, width: 4 },
            depthMode: 'through'
          },
          placement: { x: 3, z: 3 }
        }
      ]
    });

    const conflicts = getPartFeatureConflicts(part.features ?? [], part);
    expect(conflicts.some((conflict) => conflict.featureId === 'feature-1' && conflict.severity === 'warning')).toBe(
      true
    );
  });
});
