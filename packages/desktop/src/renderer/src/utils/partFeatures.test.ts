import { describe, expect, it } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { AssemblyPart, CircularCutFeature, EndCutFeature, Part, RectCutFeature } from '../types';
import {
  clonePartFeature,
  clonePartFeatures,
  clonePartFeaturesForCopy,
  normalizeAssemblyPart,
  normalizePart,
  validateSerializedPartFeatures
} from './partFeatures';

function createEndCutFeature(): EndCutFeature {
  return {
    id: 'end-cut-1',
    kind: 'end_cut',
    version: 1 as const,
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
    version: 1 as const,
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
    version: 1 as const,
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
    version: 1 as const,
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

describe('clonePartFeaturesForCopy', () => {
  const doweled = (id: string, jointId: string, matePartId: string): RectCutFeature =>
    ({
      id,
      kind: 'rect_cut',
      version: 1,
      enabled: true,
      cutType: 'cutout',
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'min', secondaryFrom: 'min' },
      parameters: { size: { length: 1, width: 1 }, depthMode: 'through' },
      placement: { x: 1, z: 1 },
      metadata: { dowelJoint: { jointId, matePartId, role: 'a' } }
    }) as unknown as RectCutFeature;

  it('gives every copied cut an identity of its own', () => {
    const original = doweled('cut-1', 'joint-1', 'part-b');
    const [copy] = clonePartFeaturesForCopy([original], new Map([['part-b', 'part-b-copy']]), new Map())!;
    expect(copy.id).not.toBe('cut-1');
  });

  it('keeps the joint when the other half is copied too, pointing at the copy', () => {
    const copied = clonePartFeaturesForCopy(
      [doweled('cut-1', 'joint-1', 'part-b')],
      new Map([['part-b', 'part-b-copy']]),
      new Map()
    )!;
    const dowel = copied[0].metadata!.dowelJoint!;
    expect(dowel.matePartId).toBe('part-b-copy');
    // A fresh joint, so the copies are married to each other rather than to
    // the boards they were copied from.
    expect(dowel.jointId).not.toBe('joint-1');
  });

  it('gives both halves of one joint the same new joint id', () => {
    const jointIds = new Map<string, string>();
    const first = clonePartFeaturesForCopy([doweled('a', 'joint-1', 'part-b')], new Map([['part-b', 'b2']]), jointIds)!;
    const second = clonePartFeaturesForCopy(
      [doweled('b', 'joint-1', 'part-b')],
      new Map([['part-b', 'b2']]),
      jointIds
    )!;
    expect(second[0].metadata!.dowelJoint!.jointId).toBe(first[0].metadata!.dowelJoint!.jointId);
  });

  it('drops the joint when its other half was left behind', () => {
    // A dowel pointing at a board that was not copied is a reference to
    // nothing, and keeping it would leave the copy joined to the original.
    const copied = clonePartFeaturesForCopy([doweled('cut-1', 'joint-1', 'part-b')], new Map(), new Map())!;
    expect(copied[0].metadata?.dowelJoint).toBeUndefined();
  });

  it('leaves no empty metadata behind when the joint was all it held', () => {
    const copied = clonePartFeaturesForCopy([doweled('cut-1', 'joint-1', 'part-b')], new Map(), new Map())!;
    expect(copied[0].metadata).toBeUndefined();
  });

  it('keeps other metadata when only the joint has to go', () => {
    const feature = doweled('cut-1', 'joint-1', 'part-b');
    (feature.metadata as Record<string, unknown>).note = 'scribe to fit';
    const copied = clonePartFeaturesForCopy([feature], new Map(), new Map())!;
    expect(copied[0].metadata).toEqual({ note: 'scribe to fit' });
  });

  it('copies a cut with no joint at all, untouched', () => {
    const plain = { ...doweled('cut-1', 'joint-1', 'part-b'), metadata: undefined };
    const copied = clonePartFeaturesForCopy([plain], new Map(), new Map())!;
    expect(copied[0].metadata).toBeUndefined();
  });

  it('has nothing to say about a part with no cuts', () => {
    expect(clonePartFeaturesForCopy(undefined, new Map(), new Map())).toBeUndefined();
  });
});

describe('validateSerializedPartFeatures', () => {
  const valid = () => ({
    id: 'cut-1',
    kind: 'rect_cut',
    version: 1,
    enabled: true,
    cutType: 'cutout',
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'min', secondaryFrom: 'min' },
    parameters: { size: { length: 2, width: 1 }, depthMode: 'through' },
    placement: { x: 1, z: 1 }
  });

  const errorsFor = (feature: unknown) => validateSerializedPartFeatures([feature], 'parts[0].features');

  it('passes a well-formed cut', () => {
    expect(errorsFor(valid())).toEqual([]);
  });

  it('rejects a cut that is not an object at all', () => {
    expect(errorsFor('a dado')).toEqual(['parts[0].features[0] is invalid']);
  });

  it('names the file position of the cut at fault', () => {
    const errors = validateSerializedPartFeatures([valid(), { ...valid(), id: '' }], 'parts[3].features');
    expect(errors[0]).toContain('parts[3].features[1]');
  });

  it('refuses two cuts sharing an id', () => {
    const errors = validateSerializedPartFeatures([valid(), valid()], 'features');
    expect(errors.some((error) => error.includes('duplicate feature id'))).toBe(true);
  });

  it.each([
    ['id', { id: 42 }],
    ['version', { version: 2 }],
    ['enabled', { enabled: 'yes' }],
    ['label', { label: 7 }],
    ['metadata', { metadata: 'notes' }],
    ['target', { target: { type: 'nowhere' } }],
    ['cutType', { cutType: 'nonsense' }],
    ['parameters', { parameters: 'big' }],
    ['placement', { placement: { x: 'left', z: 0 } }]
  ])('rejects a bad %s', (field, override) => {
    const errors = errorsFor({ ...valid(), ...override });
    expect(errors.some((error) => error.includes(field))).toBe(true);
  });

  it('rejects a blind cut with no depth', () => {
    // Without one the pocket loads clean and renders as nothing, turning up
    // much later as an editor conflict rather than an import error.
    const errors = errorsFor({ ...valid(), parameters: { size: { length: 2, width: 1 }, depthMode: 'blind' } });
    expect(errors.some((error) => error.includes('depth'))).toBe(true);
  });

  it('rejects a cut of no known kind', () => {
    expect(errorsFor({ ...valid(), kind: 'sawdust' }).some((error) => error.includes('kind'))).toBe(true);
  });

  it('rejects a rounded cut whose corners are larger than the opening', () => {
    const errors = errorsFor({
      id: 'slot',
      kind: 'rounded_cut',
      version: 1,
      enabled: true,
      cutType: 'rounded_rectangle',
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'center', secondaryFrom: 'center' },
      placement: { primary: 0, secondary: 0, rotation: 0 },
      parameters: { length: 4, width: 2, cornerRadius: 3, depthMode: 'through' }
    });
    expect(errors.some((error) => error.includes('cornerRadius'))).toBe(true);
  });
});

describe('validating a hole read back from a file', () => {
  const hole = (overrides: Record<string, unknown> = {}, parameters: Record<string, unknown> = {}) => ({
    id: 'hole-1',
    kind: 'circular_cut',
    version: 1,
    enabled: true,
    cutType: 'round_hole',
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'center', secondaryFrom: 'center' },
    placement: { primary: 0, secondary: 0, rotation: 0 },
    parameters: { diameter: 0.5, depthMode: 'through', tilt: 0, direction: 0, ...parameters },
    ...overrides
  });

  const errorsFor = (feature: unknown) => validateSerializedPartFeatures([feature], 'features');

  it('passes an ordinary hole', () => {
    expect(errorsFor(hole())).toEqual([]);
  });

  it.each([
    ['diameter', { diameter: 0 }],
    ['depthMode', { depthMode: 'halfway' }],
    ['tilt', { tilt: 90 }],
    ['direction', { direction: 'north' }]
  ])('rejects a bad %s', (field, parameters) => {
    expect(errorsFor(hole({}, parameters)).some((error) => error.includes(field))).toBe(true);
  });

  it('rejects a blind hole with no depth', () => {
    expect(errorsFor(hole({}, { depthMode: 'blind' })).some((error) => error.includes('depth'))).toBe(true);
  });

  it('rejects a hole of no known kind', () => {
    expect(errorsFor(hole({ cutType: 'wormhole' })).some((error) => error.includes('cutType'))).toBe(true);
  });

  it('rejects parameters that are not a record at all', () => {
    expect(errorsFor(hole({ parameters: 'big' })).some((error) => error.includes('parameters'))).toBe(true);
  });

  it('rejects a countersink whose head is no wider than its shank', () => {
    // A countersink that does not widen is just a hole, and a screw head
    // would stand proud of the surface.
    const errors = errorsFor(
      hole({ cutType: 'countersink' }, { countersink: { majorDiameter: 0.5, includedAngle: 82 } })
    );
    expect(errors.some((error) => error.includes('countersink'))).toBe(true);
  });

  it('rejects a countersink cut flat rather than conical', () => {
    const errors = errorsFor(
      hole({ cutType: 'countersink' }, { countersink: { majorDiameter: 1, includedAngle: 180 } })
    );
    expect(errors.some((error) => error.includes('countersink'))).toBe(true);
  });

  it('accepts a proper countersink', () => {
    expect(
      errorsFor(hole({ cutType: 'countersink' }, { countersink: { majorDiameter: 1, includedAngle: 82 } }))
    ).toEqual([]);
  });
});
