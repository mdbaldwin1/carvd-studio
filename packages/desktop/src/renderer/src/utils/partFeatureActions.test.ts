import { describe, expect, it } from 'vitest';
import { getAvailableMirrorActions, getMirrorActionLabel, mirrorFeature } from './partFeatureActions';

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
  const rectCut = (overrides: Record<string, unknown>) =>
    ({
      id: 'rc-1',
      kind: 'rect_cut',
      version: 1,
      enabled: true,
      reference: { primaryFrom: 'min', secondaryFrom: 'min' },
      parameters: { size: { length: 4, width: 2 }, depthMode: 'through' },
      placement: { x: 2, z: 1 },
      ...overrides
    }) as never;

  describe('getAvailableMirrorActions', () => {
    it('maps every cut type to its legal mirror axes', () => {
      expect(
        getAvailableMirrorActions({
          id: 'e',
          kind: 'end_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'left_end' },
          reference: { primaryFrom: 'min' },
          cutType: 'mitre',
          lengthMode: 'long_point',
          parameters: { horizontalAngle: 45 }
        })
      ).toEqual(['opposite_end']);

      expect(
        getAvailableMirrorActions(rectCut({ cutType: 'dado', target: { type: 'face', face: 'top_face' } }))
      ).toEqual(['across_length']);
      expect(
        getAvailableMirrorActions(rectCut({ cutType: 'stopped_dado', target: { type: 'face', face: 'top_face' } }))
      ).toEqual(['across_length']);
      expect(
        getAvailableMirrorActions(rectCut({ cutType: 'groove', target: { type: 'face', face: 'top_face' } }))
      ).toEqual(['across_width']);
      expect(
        getAvailableMirrorActions(rectCut({ cutType: 'rabbet', target: { type: 'edge', edge: 'top_front_edge' } }))
      ).toEqual(['across_width']);
      expect(
        getAvailableMirrorActions(rectCut({ cutType: 'rabbet', target: { type: 'edge', edge: 'top_left_edge' } }))
      ).toEqual(['across_length']);
      expect(
        getAvailableMirrorActions(rectCut({ cutType: 'rabbet', target: { type: 'face', face: 'top_face' } }))
      ).toEqual([]);
      expect(
        getAvailableMirrorActions(rectCut({ cutType: 'cutout', target: { type: 'face', face: 'top_face' } }))
      ).toEqual(['across_length', 'across_width']);
    });
  });

  describe('getMirrorActionLabel', () => {
    it('labels each mirror action', () => {
      expect(getMirrorActionLabel('opposite_end')).toBe('Mirror to Opposite End');
      expect(getMirrorActionLabel('across_length')).toBe('Mirror Across Length');
      expect(getMirrorActionLabel('across_width')).toBe('Mirror Across Width');
    });
  });

  describe('mirrorFeature error and edge paths', () => {
    const dims = { length: 24, width: 8, thickness: 0.75 };

    it('throws for unsupported end-cut mirror axes', () => {
      const endCut = {
        id: 'e',
        kind: 'end_cut',
        version: 1,
        enabled: true,
        target: { type: 'face', face: 'left_end' },
        reference: { primaryFrom: 'min' },
        cutType: 'mitre',
        lengthMode: 'long_point',
        parameters: { horizontalAngle: 45 }
      } as never;
      expect(() => mirrorFeature(endCut, 'across_length', dims)).toThrow(/Unsupported mirror action/);
    });

    it('throws when rect cuts are mirrored to the opposite end or without dimensions', () => {
      const cutout = rectCut({ cutType: 'cutout', target: { type: 'face', face: 'top_face' } });
      expect(() => mirrorFeature(cutout, 'opposite_end', dims)).toThrow(/opposite-end/);
      expect(() => mirrorFeature(cutout, 'across_length')).toThrow(/dimensions are required/);
    });

    it('mirrors an edge-target notch across width with target remap', () => {
      const notch = rectCut({
        cutType: 'edge_notch',
        label: 'Front notch',
        target: { type: 'edge', edge: 'top_front_edge' },
        placement: { x: 3, z: 0 }
      });
      const mirrored = mirrorFeature(notch, 'across_width', dims) as { target: { edge: string }; label?: string };
      expect(mirrored.target.edge).toBe('top_back_edge');
      expect(mirrored.label).toContain('Mirrored Width');
    });

    it('mirrors a corner notch across length onto the paired corner', () => {
      const corner = rectCut({
        cutType: 'corner_notch',
        target: { type: 'corner', corner: 'front_left_corner' },
        placement: { x: 0, z: 0 }
      });
      const mirrored = mirrorFeature(corner, 'across_length', dims) as { target: { corner: string } };
      expect(mirrored.target.corner).toBe('front_right_corner');
    });

    it('mirrors a mortise across width with z reflection', () => {
      const mortise = rectCut({
        cutType: 'mortise',
        target: { type: 'face', face: 'top_face' },
        parameters: { size: { length: 4, width: 2 }, depthMode: 'blind', depth: 0.4 },
        placement: { x: 2, z: 1 }
      });
      const mirrored = mirrorFeature(mortise, 'across_width', dims) as { placement: { x: number; z: number } };
      // z' = width - z - sizeWidth = 8 - 1 - 2 = 5
      expect(mirrored.placement.z).toBeCloseTo(5);
      expect(mirrored.placement.x).toBeCloseTo(2);
    });
  });
});
