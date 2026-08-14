import { describe, expect, it } from 'vitest';
import { mirrorFeature } from './partFeatureActions';

describe('partFeatureActions', () => {
  it('mirrors an end cut to the opposite end', () => {
    const mirrored = mirrorFeature(
      {
        id: 'feature-1',
        kind: 'end_cut',
        version: 1,
        enabled: true,
        label: 'Left mitre',
        target: { type: 'face', face: 'left_end' },
        reference: { primaryFrom: 'min' },
        cutType: 'mitre',
        lengthMode: 'long_point',
        parameters: { horizontalAngle: 45 }
      },
      'opposite_end'
    );

    expect(mirrored).toMatchObject({
      kind: 'end_cut',
      target: { type: 'face', face: 'right_end' },
      reference: { primaryFrom: 'max' }
    });
    expect(mirrored.id).not.toBe('feature-1');
    expect(mirrored.label).toContain('Opposite End');
  });

  it('mirrors a rectangular cut across length with target remap and x reflection', () => {
    const mirrored = mirrorFeature(
      {
        id: 'feature-2',
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        target: { type: 'face', face: 'top_face' },
        reference: { primaryFrom: 'min' },
        cutType: 'cutout',
        parameters: {
          size: { length: 4, width: 2 },
          depthMode: 'through'
        },
        placement: { x: 2, z: 1 }
      },
      'across_length',
      { length: 24, width: 8, thickness: 0.75 }
    );

    expect(mirrored).toMatchObject({
      target: { type: 'face', face: 'top_face' },
      placement: { x: 18, z: 1 }
    });
  });
});
