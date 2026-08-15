import { describe, expect, it } from 'vitest';
import type { EndCutFeature, PartFeature } from '../types';
import {
  getDerivedLengthMeasurements,
  getEndCutInsetAt,
  getLengthReferenceValue,
  getPartEndCutProfiles,
  getReferenceMode
} from './endCutUtils';

function createEndCut(overrides?: {
  id?: string;
  enabled?: boolean;
  face?: 'left_end' | 'right_end';
  cutType?: EndCutFeature['cutType'];
  lengthMode?: EndCutFeature['lengthMode'];
  parameters?: Partial<EndCutFeature['parameters']>;
}): EndCutFeature {
  return {
    id: overrides?.id ?? 'end-cut-1',
    kind: 'end_cut',
    version: 1,
    enabled: overrides?.enabled ?? true,
    target: { type: 'face', face: overrides?.face ?? 'left_end' },
    reference: { primaryFrom: overrides?.face === 'right_end' ? 'max' : 'min' },
    cutType: overrides?.cutType ?? 'mitre',
    lengthMode: overrides?.lengthMode ?? 'long_point',
    parameters: {
      horizontalAngle: 45,
      ...overrides?.parameters
    }
  };
}

describe('endCutUtils', () => {
  describe('getReferenceMode', () => {
    it('prefers the stored parameter reference mode over the legacy lengthMode', () => {
      const feature = createEndCut({
        lengthMode: 'long_point',
        parameters: { horizontalAngle: 45, reference: { mode: 'short_point', value: 20 } }
      });
      expect(getReferenceMode(feature)).toBe('short_point');
    });

    it('falls back to the legacy lengthMode when no stored reference exists', () => {
      const feature = createEndCut({ lengthMode: 'centerline' });
      expect(getReferenceMode(feature)).toBe('centerline');
    });
  });

  describe('getPartEndCutProfiles', () => {
    it('returns zeroed profiles when there are no features', () => {
      const profiles = getPartEndCutProfiles({ length: 24, width: 4, thickness: 1 });
      expect(profiles.left).toEqual({
        baseInset: 0,
        horizontalInset: 0,
        verticalInset: 0,
        maxInset: 0,
        horizontalFlip: false,
        verticalFlip: false
      });
      expect(profiles.right).toEqual(profiles.left);
    });

    it('ignores disabled end cuts and non-end-cut features', () => {
      const rectCut: PartFeature = {
        id: 'rect-1',
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        target: { type: 'face', face: 'top_face' },
        reference: { primaryFrom: 'min' },
        cutType: 'cutout',
        parameters: { size: { length: 2, width: 2 }, depthMode: 'through' },
        placement: { x: 1, z: 1 }
      };
      const profiles = getPartEndCutProfiles({
        length: 24,
        width: 4,
        thickness: 1,
        features: [createEndCut({ enabled: false }), rectCut]
      });
      expect(profiles.left.maxInset).toBe(0);
      expect(profiles.right.maxInset).toBe(0);
    });

    it('computes horizontal-only insets for mitre cuts', () => {
      const profiles = getPartEndCutProfiles({
        length: 24,
        width: 4,
        thickness: 1,
        features: [createEndCut({ cutType: 'mitre', parameters: { horizontalAngle: 45 } })]
      });
      expect(profiles.left.horizontalInset).toBeCloseTo(4);
      expect(profiles.left.verticalInset).toBe(0);
      expect(profiles.left.maxInset).toBeCloseTo(4);
      expect(profiles.right.maxInset).toBe(0);
    });

    it('computes vertical-only insets for bevel cuts', () => {
      const profiles = getPartEndCutProfiles({
        length: 24,
        width: 4,
        thickness: 1,
        features: [
          createEndCut({
            face: 'right_end',
            cutType: 'bevel',
            parameters: { horizontalAngle: 45, verticalAngle: 45 }
          })
        ]
      });
      expect(profiles.right.horizontalInset).toBe(0);
      expect(profiles.right.verticalInset).toBeCloseTo(1);
      expect(profiles.right.maxInset).toBeCloseTo(1);
      expect(profiles.left.maxInset).toBe(0);
    });

    it('combines horizontal and vertical insets for compound cuts on both ends', () => {
      const profiles = getPartEndCutProfiles({
        length: 24,
        width: 4,
        thickness: 1,
        features: [
          createEndCut({
            id: 'left',
            face: 'left_end',
            cutType: 'compound',
            parameters: { horizontalAngle: 45, verticalAngle: 45, horizontalFlip: true, verticalFlip: true }
          }),
          createEndCut({
            id: 'right',
            face: 'right_end',
            cutType: 'compound',
            parameters: { horizontalAngle: 30, verticalAngle: 30 }
          })
        ]
      });

      expect(profiles.left.horizontalInset).toBeCloseTo(4);
      expect(profiles.left.verticalInset).toBeCloseTo(1);
      expect(profiles.left.maxInset).toBeCloseTo(5);
      expect(profiles.left.horizontalFlip).toBe(true);
      expect(profiles.left.verticalFlip).toBe(true);

      expect(profiles.right.horizontalInset).toBeCloseTo(Math.tan((30 * Math.PI) / 180) * 4);
      expect(profiles.right.verticalInset).toBeCloseTo(Math.tan((30 * Math.PI) / 180) * 1);
      expect(profiles.right.horizontalFlip).toBe(false);
      expect(profiles.right.verticalFlip).toBe(false);
    });

    it('returns zero insets when width and thickness are zero', () => {
      const profiles = getPartEndCutProfiles({
        length: 24,
        width: 0,
        thickness: 0,
        features: [createEndCut({ cutType: 'compound', parameters: { horizontalAngle: 45, verticalAngle: 45 } })]
      });
      expect(profiles.left.horizontalInset).toBe(0);
      expect(profiles.left.verticalInset).toBe(0);
    });

    it('treats negative angles as their absolute inset', () => {
      const profiles = getPartEndCutProfiles({
        length: 24,
        width: 4,
        thickness: 1,
        features: [createEndCut({ cutType: 'mitre', parameters: { horizontalAngle: -45 } })]
      });
      expect(profiles.left.horizontalInset).toBeCloseTo(4);
    });

    it('scales insets down when combined cuts exceed the available length', () => {
      const profiles = getPartEndCutProfiles({
        length: 2,
        width: 4,
        thickness: 1,
        features: [
          createEndCut({ id: 'left', face: 'left_end', cutType: 'mitre', parameters: { horizontalAngle: 45 } }),
          createEndCut({ id: 'right', face: 'right_end', cutType: 'mitre', parameters: { horizontalAngle: 45 } })
        ]
      });

      const total = profiles.left.maxInset + profiles.right.maxInset;
      expect(total).toBeCloseTo(1.99);
      expect(profiles.left.maxInset).toBeCloseTo(0.995);
      expect(profiles.right.maxInset).toBeCloseTo(0.995);
    });
  });

  describe('getEndCutInsetAt', () => {
    const dimensions = { width: 4, thickness: 1 };

    it('returns zero when the profile has no insets', () => {
      const profiles = getPartEndCutProfiles({ length: 24, ...dimensions });
      expect(getEndCutInsetAt('left', profiles, dimensions, { y: 0, z: 0 })).toBe(0);
    });

    it('interpolates horizontal insets across the width on the left end', () => {
      const profiles = getPartEndCutProfiles({
        length: 24,
        ...dimensions,
        features: [createEndCut({ cutType: 'mitre', parameters: { horizontalAngle: 45 } })]
      });
      expect(getEndCutInsetAt('left', profiles, dimensions, { y: 0, z: -2 })).toBeCloseTo(0);
      expect(getEndCutInsetAt('left', profiles, dimensions, { y: 0, z: 0 })).toBeCloseTo(2);
      expect(getEndCutInsetAt('left', profiles, dimensions, { y: 0, z: 2 })).toBeCloseTo(4);
    });

    it('reverses the horizontal gradient when horizontally flipped', () => {
      const profiles = getPartEndCutProfiles({
        length: 24,
        ...dimensions,
        features: [createEndCut({ cutType: 'mitre', parameters: { horizontalAngle: 45, horizontalFlip: true } })]
      });
      expect(getEndCutInsetAt('left', profiles, dimensions, { y: 0, z: -2 })).toBeCloseTo(4);
      expect(getEndCutInsetAt('left', profiles, dimensions, { y: 0, z: 2 })).toBeCloseTo(0);
    });

    it('mirrors the horizontal gradient on the right end', () => {
      const profiles = getPartEndCutProfiles({
        length: 24,
        ...dimensions,
        features: [createEndCut({ face: 'right_end', cutType: 'mitre', parameters: { horizontalAngle: 45 } })]
      });
      expect(getEndCutInsetAt('right', profiles, dimensions, { y: 0, z: -2 })).toBeCloseTo(4);
      expect(getEndCutInsetAt('right', profiles, dimensions, { y: 0, z: 2 })).toBeCloseTo(0);
    });

    it('interpolates vertical insets across the thickness for bevels', () => {
      const profiles = getPartEndCutProfiles({
        length: 24,
        ...dimensions,
        features: [createEndCut({ cutType: 'bevel', parameters: { horizontalAngle: 0, verticalAngle: 45 } })]
      });
      expect(getEndCutInsetAt('left', profiles, dimensions, { y: -0.5, z: 0 })).toBeCloseTo(0);
      expect(getEndCutInsetAt('left', profiles, dimensions, { y: 0.5, z: 0 })).toBeCloseTo(1);
    });

    it('reverses the vertical gradient when vertically flipped', () => {
      const profiles = getPartEndCutProfiles({
        length: 24,
        ...dimensions,
        features: [
          createEndCut({
            face: 'right_end',
            cutType: 'bevel',
            parameters: { horizontalAngle: 0, verticalAngle: 45, verticalFlip: true }
          })
        ]
      });
      expect(getEndCutInsetAt('right', profiles, dimensions, { y: -0.5, z: 0 })).toBeCloseTo(0);
      expect(getEndCutInsetAt('right', profiles, dimensions, { y: 0.5, z: 0 })).toBeCloseTo(1);
    });

    it('uses zero ratios when the queried dimensions are zero', () => {
      const profiles = getPartEndCutProfiles({
        length: 24,
        ...dimensions,
        features: [createEndCut({ cutType: 'compound', parameters: { horizontalAngle: 45, verticalAngle: 45 } })]
      });
      expect(getEndCutInsetAt('left', profiles, { width: 0, thickness: 0 }, { y: 0.5, z: 2 })).toBe(0);
    });
  });

  describe('getDerivedLengthMeasurements', () => {
    it('derives blank, long point, short point, and centerline values', () => {
      const measurements = getDerivedLengthMeasurements({
        length: 24,
        width: 4,
        thickness: 1,
        features: [createEndCut({ cutType: 'mitre', parameters: { horizontalAngle: 45 } })]
      });
      expect(measurements.blank).toBe(24);
      expect(measurements.longPoint).toBe(24);
      expect(measurements.shortPoint).toBeCloseTo(20);
      expect(measurements.centerline).toBeCloseTo(22);
    });

    it('subtracts insets from both ends', () => {
      const measurements = getDerivedLengthMeasurements({
        length: 24,
        width: 4,
        thickness: 1,
        features: [
          createEndCut({ id: 'left', face: 'left_end', cutType: 'mitre', parameters: { horizontalAngle: 45 } }),
          createEndCut({
            id: 'right',
            face: 'right_end',
            cutType: 'bevel',
            parameters: { horizontalAngle: 0, verticalAngle: 45 }
          })
        ]
      });
      expect(measurements.shortPoint).toBeCloseTo(19);
      expect(measurements.centerline).toBeCloseTo(21.5);
    });

    it('clamps negative lengths to zero', () => {
      const measurements = getDerivedLengthMeasurements({ length: -5, width: 4, thickness: 1 });
      expect(measurements.longPoint).toBe(0);
      expect(measurements.shortPoint).toBe(0);
      expect(measurements.centerline).toBe(0);
    });
  });

  describe('getLengthReferenceValue', () => {
    const measurements = { blank: 24, longPoint: 24, shortPoint: 20, centerline: 22 };

    it('returns the matching measurement per length mode', () => {
      expect(getLengthReferenceValue(measurements, 'long_point')).toBe(24);
      expect(getLengthReferenceValue(measurements, 'short_point')).toBe(20);
      expect(getLengthReferenceValue(measurements, 'centerline')).toBe(22);
    });

    it('defaults to the long point for unknown modes', () => {
      expect(getLengthReferenceValue(measurements, undefined as unknown as 'long_point')).toBe(24);
    });
  });
});
