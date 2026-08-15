import { describe, expect, it } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { AssemblyPart, EndCutFeature, Part, RectCutFeature } from '../types';
import { clonePartFeature, clonePartFeatures, normalizeAssemblyPart, normalizePart } from './partFeatures';

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

describe('partFeatures', () => {
  describe('clonePartFeature', () => {
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
