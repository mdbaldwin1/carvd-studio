import { describe, expect, it } from 'vitest';
import { buildFeaturesFromPreset, mirrorFeature } from './partFeatureActions';

describe('partFeatureActions', () => {
  it('builds paired end cuts from the mitre-both-ends preset', () => {
    const features = buildFeaturesFromPreset('mitre_both_ends');

    expect(features).toHaveLength(2);
    expect(features[0]).toMatchObject({
      kind: 'end_cut',
      target: { type: 'face', face: 'left_end' },
      cutType: 'mitre'
    });
    expect(features[1]).toMatchObject({
      kind: 'end_cut',
      target: { type: 'face', face: 'right_end' },
      cutType: 'mitre'
    });
  });

  it('builds paired corner reliefs and constrained joinery presets', () => {
    const cornerPair = buildFeaturesFromPreset('top_front_corners');
    const dado = buildFeaturesFromPreset('centered_dado');
    const rabbet = buildFeaturesFromPreset('top_front_rabbet');

    expect(cornerPair).toHaveLength(2);
    expect(cornerPair[0]).toMatchObject({
      kind: 'rect_cut',
      cutType: 'corner_notch',
      target: { type: 'corner', corner: 'front_top_left_corner' }
    });
    expect(cornerPair[1]).toMatchObject({
      kind: 'rect_cut',
      cutType: 'corner_notch',
      target: { type: 'corner', corner: 'front_top_right_corner' }
    });
    expect(dado[0]).toMatchObject({
      kind: 'rect_cut',
      cutType: 'dado',
      target: { type: 'face', face: 'top_face' }
    });
    expect(rabbet[0]).toMatchObject({
      kind: 'rect_cut',
      cutType: 'rabbet',
      target: { type: 'edge', edge: 'top_front_edge' }
    });
  });

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
        target: { type: 'corner', corner: 'front_top_left_corner' },
        reference: { primaryFrom: 'min', secondaryFrom: 'min' },
        cutType: 'corner_notch',
        parameters: {
          size: { length: 0.75, width: 0.75 },
          depthMode: 'through'
        },
        placement: { x: 2, z: 0 }
      },
      'across_length'
    );

    expect(mirrored).toMatchObject({
      target: { type: 'corner', corner: 'front_top_right_corner' },
      placement: { x: -2, z: 0 }
    });
  });
});
