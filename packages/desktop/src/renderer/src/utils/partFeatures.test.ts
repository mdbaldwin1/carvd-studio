import { describe, expect, it } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { AssemblyPart, CircularCutFeature, EndCutFeature, Part, RectCutFeature } from '../types';
import {
  clonePartFeature,
  clonePartFeatures,
  normalizeAssemblyPart,
  normalizePart,
  validateSerializedPartFeatures
} from './partFeatures';

function createEndCutFeature(): EndCutFeature {
  return {
    id: 'end-cut-1',
    kind: 'end_cut',
    version: 1,
    enabled: true,
    label: 'Left mitre',
    metadata: { source: 'test' },
    target: { type: 'face', face: 'left_end' },
    reference: { primaryFrom: 'min', secondaryFrom: 'center', tertiaryFrom: 'max' },
    cutType: 'mitre',
    lengthMode: 'long_point',
    parameters: { horizontalAngle: 45, horizontalFlip: true }
  };
}

function createRectCutFeature(target?: RectCutFeature['target']): RectCutFeature {
  return {
    id: 'rect-cut-1',
    kind: 'rect_cut',
    version: 1,
    enabled: true,
    target: target ?? { type: 'corner', corner: 'front_left_corner' },
    reference: { primaryFrom: 'min', secondaryFrom: 'min' },
    cutType: 'corner_notch',
    parameters: { size: { length: 2, width: 2 }, depthMode: 'through' },
    placement: { x: 0, z: 0 }
  };
}

function createCircularCutFeature(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'round-hole-1',
    kind: 'circular_cut',
    version: 1,
    enabled: true,
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'min', secondaryFrom: 'min' },
    cutType: 'round_hole',
    placement: { primary: 2, secondary: 1, rotation: 0 },
    parameters: {
      diameter: 0.375,
      depthMode: 'through',
      tilt: 0,
      direction: 0
    },
    ...overrides
  };
}

function createRoundedCutFeature(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'rounded-slot-1',
    kind: 'rounded_cut',
    version: 1,
    enabled: true,
    target: { type: 'face', face: 'front_face' },
    reference: { primaryFrom: 'center', secondaryFrom: 'center' },
    cutType: 'rounded_slot',
    placement: { primary: 0, secondary: 0, rotation: 90 },
    parameters: {
      length: 3,
      width: 0.5,
      cornerRadius: 0.25,
      depthMode: 'blind',
      depth: 0.25
    },
    ...overrides
  };
}

describe('partFeatures', () => {
  describe('validateSerializedPartFeatures', () => {
    it.each([
      ['round hole', createCircularCutFeature()],
      [
        'countersink',
        createCircularCutFeature({
          cutType: 'countersink',
          parameters: {
            diameter: 0.25,
            depthMode: 'through',
            tilt: 15,
            direction: 90,
            countersink: { majorDiameter: 0.5, includedAngle: 82 }
          }
        })
      ],
      [
        'counterbore pattern',
        createCircularCutFeature({
          cutType: 'counterbore',
          parameters: {
            diameter: 0.25,
            depthMode: 'blind',
            depth: 1,
            tilt: 0,
            direction: 0,
            counterbore: { diameter: 0.5, depth: 0.25 }
          },
          pattern: { type: 'linear', count: 4, spacing: 2, direction: 0 }
        })
      ],
      ['rounded slot', createRoundedCutFeature()],
      [
        'rounded rectangle',
        createRoundedCutFeature({
          cutType: 'rounded_rectangle',
          parameters: { length: 4, width: 2, cornerRadius: 0.375, depthMode: 'through' }
        })
      ]
    ])('accepts a valid %s', (_name, candidate) => {
      expect(validateSerializedPartFeatures([candidate], 'features')).toEqual([]);
    });

    it.each([
      ['non-finite diameter', createCircularCutFeature({ parameters: { diameter: Number.NaN } }), 'diameter'],
      ['invalid target', createCircularCutFeature({ target: { type: 'edge', edge: 'top_front_edge' } }), 'target'],
      [
        'excessive pattern count',
        createCircularCutFeature({ pattern: { type: 'linear', count: 129, spacing: 1, direction: 0 } }),
        'pattern'
      ],
      [
        'malformed dowel metadata',
        createCircularCutFeature({ metadata: { dowelJoint: { jointId: '', matePartId: 42 } } }),
        'dowelJoint'
      ],
      [
        'oversized rounded corner radius',
        createRoundedCutFeature({
          parameters: { length: 3, width: 0.5, cornerRadius: 1, depthMode: 'through' }
        }),
        'cornerRadius'
      ]
    ])('rejects %s', (_name, candidate, expectedError) => {
      expect(validateSerializedPartFeatures([candidate], 'features').join('\n')).toContain(expectedError);
    });

    it.each([
      ['missing length mode', { ...createEndCutFeature(), lengthMode: undefined }, 'lengthMode'],
      [
        'invalid end target',
        { ...createEndCutFeature(), target: { type: 'face', face: 'top_face' } },
        'target is invalid for an end cut'
      ],
      [
        'invalid optional flip',
        { ...createEndCutFeature(), parameters: { horizontalAngle: 45, horizontalFlip: 'yes' } },
        'parameters'
      ],
      [
        'invalid nested measurement reference',
        {
          ...createEndCutFeature(),
          parameters: { horizontalAngle: 45, reference: { mode: 'centerline', value: Number.NaN } }
        },
        'parameters'
      ],
      [
        'invalid secondary origin',
        { ...createEndCutFeature(), reference: { primaryFrom: 'min', secondaryFrom: 'sideways' } },
        'reference'
      ]
    ])('rejects %s', (_name, candidate, expectedError) => {
      expect(validateSerializedPartFeatures([candidate], 'features').join('\n')).toContain(expectedError);
    });
  });

  describe('clonePartFeature', () => {
    it('deep-clones circular cut patterns, termination details, and dowel metadata', () => {
      const original = createCircularCutFeature({
        cutType: 'counterbore',
        metadata: {
          dowelJoint: {
            jointId: 'joint-1',
            matePartId: 'part-2',
            memberIndex: 0,
            dowelDiameter: 0.375,
            dowelLength: 2,
            embedmentDepth: 1
          }
        },
        parameters: {
          diameter: 0.25,
          depthMode: 'blind',
          depth: 1,
          tilt: 0,
          direction: 0,
          counterbore: { diameter: 0.5, depth: 0.25 }
        },
        pattern: { type: 'linear', count: 3, spacing: 2, direction: 0 }
      }) as unknown as CircularCutFeature;

      const clone = clonePartFeature(original);
      expect(clone).toEqual(original);
      if (clone.kind !== 'circular_cut') throw new Error('expected circular cut clone');
      expect(clone.pattern).not.toBe(original.pattern);
      expect(clone.parameters.counterbore).not.toBe(original.parameters.counterbore);
      expect(clone.metadata?.dowelJoint).not.toBe(original.metadata?.dowelJoint);

      if (clone.pattern?.type === 'linear') clone.pattern.count = 7;
      if (clone.parameters.counterbore) clone.parameters.counterbore.depth = 0.125;
      (clone.metadata?.dowelJoint as { jointId: string }).jointId = 'joint-clone';
      expect((original.pattern as { count: number }).count).toBe(3);
      expect(original.parameters.counterbore?.depth).toBe(0.25);
      expect((original.metadata?.dowelJoint as { jointId: string }).jointId).toBe('joint-1');
    });

    it('deep-clones end cut features so mutations do not leak back', () => {
      const original = createEndCutFeature();
      const clone = clonePartFeature(original);

      expect(clone).toEqual(original);
      expect(clone).not.toBe(original);
      expect(clone.target).not.toBe(original.target);
      expect(clone.reference).not.toBe(original.reference);
      expect(clone.metadata).not.toBe(original.metadata);
      expect(clone.parameters).not.toBe(original.parameters);

      if (clone.kind !== 'end_cut') throw new Error('expected end cut clone');
      clone.parameters.horizontalAngle = 30;
      clone.target.face = 'right_end';
      clone.reference.primaryFrom = 'max';
      expect(original.parameters.horizontalAngle).toBe(45);
      expect(original.target.face).toBe('left_end');
      expect(original.reference.primaryFrom).toBe('min');
    });

    it('omits metadata when the source feature has none', () => {
      const original = createEndCutFeature();
      original.metadata = undefined;
      expect(clonePartFeature(original).metadata).toBeUndefined();
    });

    it('deep-clones rect cut features including size and placement', () => {
      const original = createRectCutFeature();
      const clone = clonePartFeature(original);

      expect(clone).toEqual(original);
      if (clone.kind !== 'rect_cut') throw new Error('expected rect cut clone');
      expect(clone.parameters.size).not.toBe(original.parameters.size);
      expect(clone.placement).not.toBe(original.placement);

      clone.parameters.size.length = 99;
      clone.placement.x = 99;
      expect(original.parameters.size.length).toBe(2);
      expect(original.placement.x).toBe(0);
    });

    it('clones face and edge targets by value', () => {
      const faceClone = clonePartFeature(createRectCutFeature({ type: 'face', face: 'top_face' }));
      expect(faceClone.target).toEqual({ type: 'face', face: 'top_face' });

      const edgeOriginal = createRectCutFeature({ type: 'edge', edge: 'top_front_edge' });
      const edgeClone = clonePartFeature(edgeOriginal);
      expect(edgeClone.target).toEqual({ type: 'edge', edge: 'top_front_edge' });
      expect(edgeClone.target).not.toBe(edgeOriginal.target);
    });
  });

  describe('clonePartFeatures', () => {
    it('returns an empty array for undefined input', () => {
      expect(clonePartFeatures(undefined)).toEqual([]);
      expect(clonePartFeatures()).toEqual([]);
    });

    it('clones every feature into a new array', () => {
      const features = [createEndCutFeature(), createRectCutFeature()];
      const clones = clonePartFeatures(features);

      expect(clones).toEqual(features);
      expect(clones).not.toBe(features);
      expect(clones[0]).not.toBe(features[0]);
      expect(clones[1]).not.toBe(features[1]);
    });
  });

  describe('normalizePart', () => {
    it('seeds defaults for missing rotation, grain fields, and features', () => {
      const part = createTestPart();
      const legacy = {
        ...part,
        rotation: undefined,
        grainSensitive: undefined,
        grainDirection: undefined,
        features: undefined
      } as unknown as Part;

      const normalized = normalizePart(legacy);
      expect(normalized.rotation).toEqual({ x: 0, y: 0, z: 0 });
      expect(normalized.grainSensitive).toBe(true);
      expect(normalized.grainDirection).toBe('length');
      expect(normalized.features).toEqual([]);
    });

    it('preserves explicit values and clones existing features', () => {
      const features = [createEndCutFeature()];
      const part = createTestPart({
        rotation: { x: 0, y: 90, z: 0 },
        grainSensitive: false,
        grainDirection: 'width',
        features
      });

      const normalized = normalizePart(part);
      expect(normalized.rotation).toEqual({ x: 0, y: 90, z: 0 });
      expect(normalized.grainSensitive).toBe(false);
      expect(normalized.grainDirection).toBe('width');
      expect(normalized.features).toEqual(features);
      expect(normalized.features?.[0]).not.toBe(features[0]);
    });
  });

  describe('normalizeAssemblyPart', () => {
    it('seeds defaults for missing rotation, grain fields, and features', () => {
      const assemblyPart = {
        name: 'Assembly Part',
        length: 12,
        width: 4,
        thickness: 0.75,
        relativePosition: { x: 0, y: 0, z: 0 },
        rotation: undefined,
        stockId: null,
        grainSensitive: undefined,
        grainDirection: undefined,
        color: '#d4a574',
        features: undefined
      } as unknown as AssemblyPart;

      const normalized = normalizeAssemblyPart(assemblyPart);
      expect(normalized.rotation).toEqual({ x: 0, y: 0, z: 0 });
      expect(normalized.grainSensitive).toBe(true);
      expect(normalized.grainDirection).toBe('length');
      expect(normalized.features).toEqual([]);
    });

    it('clones existing features on assembly parts', () => {
      const features = [createRectCutFeature()];
      const assemblyPart: AssemblyPart = {
        name: 'Assembly Part',
        length: 12,
        width: 4,
        thickness: 0.75,
        relativePosition: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        stockId: null,
        grainSensitive: true,
        grainDirection: 'length',
        color: '#d4a574',
        features
      };

      const normalized = normalizeAssemblyPart(assemblyPart);
      expect(normalized.features).toEqual(features);
      expect(normalized.features?.[0]).not.toBe(features[0]);
    });
  });
});
