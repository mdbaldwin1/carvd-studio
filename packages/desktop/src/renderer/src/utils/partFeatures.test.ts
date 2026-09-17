import { describe, expect, it } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import type {
  AssemblyPart,
  CircularCutFeature,
  EdgeProfileFeature,
  EndCutFeature,
  Part,
  RectCutFeature,
  RoutedPathFeature
} from '../types';
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

function createRoutedPathFeature(overrides: Partial<RoutedPathFeature> = {}): RoutedPathFeature {
  return {
    id: 'route-1',
    kind: 'routed_path',
    version: 1,
    enabled: true,
    label: 'Stopped center groove',
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'center', secondaryFrom: 'center' },
    path: {
      points: [
        { primary: -3, secondary: 0 },
        { primary: 3, secondary: 0 }
      ]
    },
    bit: { profile: 'straight', diameter: 0.25 },
    parameters: { depthMode: 'blind', depth: 0.375 },
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
      ['routed path', createRoutedPathFeature()],
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

    it('deep-clones routed paths, points, and bit profiles', () => {
      const original = createRoutedPathFeature({
        path: {
          closed: true,
          points: [
            { primary: 0, secondary: 0 },
            { primary: 2, secondary: 1 }
          ]
        },
        bit: { profile: 'v_bit', diameter: 0.5, includedAngle: 90 },
        parameters: { depthMode: 'blind', depth: 0.2 }
      });
      const clone = clonePartFeature(original);

      expect(clone).toEqual(original);
      expect(clone.path).not.toBe(original.path);
      expect(clone.path.points).not.toBe(original.path.points);
      expect(clone.path.points[0]).not.toBe(original.path.points[0]);
      expect(clone.parameters).not.toBe(original.parameters);
      expect(clone.bit).not.toBe(original.bit);

      clone.path.points[0].primary = 99;
      clone.bit.diameter = 2;
      expect(original.path.points[0].primary).toBe(0);
      expect(original.bit.diameter).toBe(0.5);
    });

    it.each([
      ['a one-point path', { path: { points: [{ primary: 0, secondary: 0 }] } }, 'path.points'],
      [
        'a non-finite point',
        {
          path: {
            points: [
              { primary: 0, secondary: 0 },
              { primary: Infinity, secondary: 0 }
            ]
          }
        },
        'path.points'
      ],
      ['an edge target', { target: { type: 'edge', edge: 'top_front_edge' } }, 'target'],
      ['an unknown bit', { bit: { profile: 'laser', diameter: 0.25 } }, 'bit.profile'],
      ['a zero diameter', { bit: { profile: 'straight', diameter: 0 } }, 'diameter'],
      ['a V-bit without angle', { bit: { profile: 'v_bit', diameter: 0.5 } }, 'includedAngle'],
      ['a 180-degree V-bit', { bit: { profile: 'v_bit', diameter: 0.5, includedAngle: 180 } }, 'includedAngle'],
      [
        'a blind route without depth',
        { bit: { profile: 'core_box', diameter: 0.5 }, parameters: { depthMode: 'blind' } },
        'depth'
      ]
    ])('rejects routed-path data with %s', (_name, override, expectedError) => {
      const candidate = { ...createRoutedPathFeature(), ...override };
      expect(validateSerializedPartFeatures([candidate], 'features').join('\n')).toContain(expectedError);
    });

    it('preserves and validates routed-path data across JSON serialization', () => {
      const original = createRoutedPathFeature({
        path: {
          closed: true,
          points: [
            { primary: -1, secondary: -1, cornerRadius: 0.25 },
            { primary: 1, secondary: -1 },
            { primary: 0, secondary: 1 }
          ]
        },
        bit: { profile: 'core_box', diameter: 0.375 },
        parameters: { depthMode: 'through' }
      });

      const restored = JSON.parse(JSON.stringify(original)) as unknown;
      expect(validateSerializedPartFeatures([restored], 'features')).toEqual([]);
      expect(restored).toEqual(original);
    });

    it('accepts legacy routed points with no corner radius and an explicit sharp corner', () => {
      const omitted = createRoutedPathFeature();
      const explicitSharp = createRoutedPathFeature({
        path: {
          points: [
            { primary: 0, secondary: 0, cornerRadius: 0 },
            { primary: 1, secondary: 0 }
          ]
        }
      });

      expect(validateSerializedPartFeatures([omitted], 'features')).toEqual([]);
      expect(validateSerializedPartFeatures([explicitSharp], 'features')).toEqual([]);
    });

    it.each([
      { profile: 'dovetail', diameter: 0.5, shankDiameter: 0.25, includedAngle: 14 },
      { profile: 't_slot', diameter: 0.75, shankDiameter: 0.25, cutterHeight: 0.125 },
      { profile: 'keyhole', diameter: 0.375, shankDiameter: 0.125, cutterHeight: 0.2 }
    ] as const)('accepts and round-trips a $profile bit', (bit) => {
      const original = createRoutedPathFeature({ bit });
      const restored = JSON.parse(JSON.stringify(original)) as unknown;

      expect(validateSerializedPartFeatures([restored], 'features')).toEqual([]);
      expect(restored).toEqual(original);
    });

    it.each([
      ['missing dovetail shank', { profile: 'dovetail', diameter: 0.5, includedAngle: 14 }, 'shankDiameter'],
      [
        'equal dovetail shank',
        { profile: 'dovetail', diameter: 0.5, shankDiameter: 0.5, includedAngle: 14 },
        'shankDiameter'
      ],
      [
        'negative T-slot shank',
        { profile: 't_slot', diameter: 0.5, shankDiameter: -0.1, cutterHeight: 0.1 },
        'shankDiameter'
      ],
      ['missing T-slot height', { profile: 't_slot', diameter: 0.5, shankDiameter: 0.25 }, 'cutterHeight'],
      [
        'zero keyhole height',
        { profile: 'keyhole', diameter: 0.5, shankDiameter: 0.25, cutterHeight: 0 },
        'cutterHeight'
      ],
      [
        'zero dovetail angle',
        { profile: 'dovetail', diameter: 0.5, shankDiameter: 0.25, includedAngle: 0 },
        'includedAngle'
      ],
      [
        'flat dovetail angle',
        { profile: 'dovetail', diameter: 0.5, shankDiameter: 0.25, includedAngle: 180 },
        'includedAngle'
      ]
    ])('rejects $0', (_name, bit, expectedError) => {
      const feature = createRoutedPathFeature({ bit: bit as RoutedPathFeature['bit'] });
      expect(validateSerializedPartFeatures([feature], 'features').join('\n')).toContain(expectedError);
    });

    it.each(['t_slot', 'keyhole'] as const)('requires a blind %s route to reach the cutter height', (profile) => {
      const feature = createRoutedPathFeature({
        bit: { profile, diameter: 0.5, shankDiameter: 0.25, cutterHeight: 0.25 },
        parameters: { depthMode: 'blind', depth: 0.125 }
      });
      expect(validateSerializedPartFeatures([feature], 'features').join('\n')).toContain(
        'depth must be at least the bit cutterHeight'
      );

      feature.parameters.depth = 0.25;
      expect(validateSerializedPartFeatures([feature], 'features')).toEqual([]);
    });

    it('deep-clones undercut bit dimensions', () => {
      const original = createRoutedPathFeature({
        bit: { profile: 't_slot', diameter: 0.75, shankDiameter: 0.25, cutterHeight: 0.125 }
      });
      const clone = clonePartFeature(original);
      if (clone.bit.profile !== 't_slot') throw new Error('expected T-slot bit');

      clone.bit.shankDiameter = 0.2;
      clone.bit.cutterHeight = 0.1;
      expect(original.bit).toEqual({
        profile: 't_slot',
        diameter: 0.75,
        shankDiameter: 0.25,
        cutterHeight: 0.125
      });
    });

    it.each([Number.NaN, Infinity, -0.01])('rejects an invalid corner radius of %s', (cornerRadius) => {
      const feature = createRoutedPathFeature({
        path: {
          points: [
            { primary: 0, secondary: 0, cornerRadius },
            { primary: 1, secondary: 0 }
          ]
        }
      });
      expect(validateSerializedPartFeatures([feature], 'features').join('\n')).toContain('path.points');
    });

    it('rejects degenerate and underspecified closed paths', () => {
      const repeated = createRoutedPathFeature({
        path: {
          points: [
            { primary: 1, secondary: 1 },
            { primary: 1, secondary: 1 }
          ]
        }
      });
      const twoPointLoop = createRoutedPathFeature({
        path: {
          closed: true,
          points: [
            { primary: 0, secondary: 0 },
            { primary: 1, secondary: 0 }
          ]
        }
      });

      expect(validateSerializedPartFeatures([repeated], 'features').join('\n')).toContain('non-zero segment');
      expect(validateSerializedPartFeatures([twoPointLoop], 'features').join('\n')).toContain('at least three');
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

describe('edge profile persistence', () => {
  const feature: EdgeProfileFeature = {
    id: 'edge-profile-1',
    kind: 'edge_profile',
    version: 1,
    enabled: true,
    target: { type: 'edge', edge: 'top_front_edge' },
    reference: { primaryFrom: 'min', secondaryFrom: 'min' },
    profile: 'ogee',
    parameters: { size: 0.5, depth: 0.25 }
  };

  it('validates, round-trips, and deep-clones an edge profile', () => {
    const restored = JSON.parse(JSON.stringify(feature)) as unknown;
    expect(validateSerializedPartFeatures([restored], 'features')).toEqual([]);
    expect(restored).toEqual(feature);
    const clone = clonePartFeature(feature);
    expect(clone).toEqual(feature);
    expect(clone).not.toBe(feature);
    expect(clone.parameters).not.toBe(feature.parameters);
  });

  it('persists a custom profile reference and independent canonical snapshot', () => {
    const custom: EdgeProfileFeature = {
      ...feature,
      profile: 'custom',
      routerProfileId: 'shop-ogee',
      routerProfileSnapshot: {
        version: 1,
        id: 'shop-ogee',
        name: 'Shop Ogee',
        family: 'ogee',
        source: 'generic',
        parameters: { radius: 0.25 },
        boundary: {
          start: { u: 0, v: 0.5 },
          segments: [{ kind: 'arc', to: { u: 0.5, v: 0 }, radius: 0.5, clockwise: true }]
        }
      },
      routerToolId: 'ogee-tool',
      routerToolSnapshot: {
        version: 1,
        id: 'ogee-tool',
        name: 'Shop Ogee Bit',
        source: 'generic',
        profileFamily: 'ogee',
        routerProfileId: 'shop-ogee',
        cutterDiameter: 0.75,
        shankDiameter: 0.5,
        cuttingHeight: 0.5,
        envelopeVersion: 1,
        sections: [
          { role: 'cutter', start: 0, end: 0.5, diameter: 0.75 },
          { role: 'shank', start: 0.5, end: 1.5, diameter: 0.5 }
        ],
        overallLength: 2,
        safeColletInsertion: 0.75
      }
    };
    expect(validateSerializedPartFeatures([custom], 'features')).toEqual([]);
    const clone = clonePartFeature(custom);
    expect(clone.routerProfileSnapshot).not.toBe(custom.routerProfileSnapshot);
    expect(clone.routerProfileSnapshot?.boundary.segments[0]).not.toBe(
      custom.routerProfileSnapshot?.boundary.segments[0]
    );
    expect(clone.routerToolSnapshot).not.toBe(custom.routerToolSnapshot);
    expect(clone.routerToolSnapshot?.sections).not.toBe(custom.routerToolSnapshot?.sections);
  });

  it('keeps legacy built-in edge profiles valid without a library reference', () => {
    expect(validateSerializedPartFeatures([feature], 'features')).toEqual([]);
  });

  it('requires custom profile references and snapshots to agree', () => {
    const invalid = { ...feature, profile: 'custom', routerProfileId: 'missing', routerProfileSnapshot: undefined };
    expect(validateSerializedPartFeatures([invalid], 'features').join('\n')).toContain('routerProfileSnapshot');
  });

  it('rejects incompatible assigned tools and stale explicit revisions', () => {
    const snapshot = {
      version: 1 as const,
      id: 'shop-cove',
      name: 'Shop Cove',
      family: 'cove',
      source: 'generic' as const,
      parameters: {},
      boundary: {
        start: { u: 0, v: 0.5 },
        segments: [{ kind: 'arc' as const, to: { u: 0.5, v: 0 }, radius: 0.5, clockwise: true }]
      }
    };
    const candidate = {
      ...feature,
      profile: 'custom',
      routerProfileId: snapshot.id,
      routerProfileRevision: 'stale',
      routerProfileSnapshot: snapshot,
      routerToolId: 'wrong-tool',
      routerToolSnapshot: {
        version: 1,
        id: 'wrong-tool',
        name: 'Ogee Tool',
        source: 'generic',
        profileFamily: 'ogee',
        cutterDiameter: 1,
        shankDiameter: 0.5,
        cuttingHeight: 0.5
      }
    };
    const errors = validateSerializedPartFeatures([candidate], 'features').join('\n');
    expect(errors).toContain('routerProfileRevision does not match');
    expect(errors).toContain('incompatible with the selected profile');
  });

  it.each([
    [{ profile: 'unknown' }, 'profile'],
    [{ parameters: { size: 0, depth: 0.25 } }, 'parameters.size'],
    [{ target: { type: 'face', face: 'top_face' } }, 'target']
  ])('rejects malformed edge profile data', (override, error) => {
    expect(validateSerializedPartFeatures([{ ...feature, ...override }], 'features').join('\n')).toContain(error);
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

describe('serialized feature rejections', () => {
  const errors = (feature: unknown) => validateSerializedPartFeatures([feature], 'features').join(' | ');

  it('rejects a routed path with malformed parameters', () => {
    expect(errors({ ...createRoutedPathFeature(), parameters: 'deep' })).toContain('parameters are invalid');
    expect(errors(createRoutedPathFeature({ parameters: { depthMode: 'halfway' } as never }))).toContain(
      'parameters.depthMode is invalid'
    );
    // A blind route has to say how deep it goes.
    expect(errors(createRoutedPathFeature({ parameters: { depthMode: 'blind' } as never }))).toContain(
      'parameters.depth is invalid'
    );
    expect(errors(createRoutedPathFeature({ parameters: { depthMode: 'through', depth: -1 } as never }))).toContain(
      'parameters.depth is invalid'
    );
  });

  it('rejects a routed path with no usable bit', () => {
    expect(errors({ ...createRoutedPathFeature(), bit: null })).toContain('bit is invalid');
  });

  it('requires a closed route to enclose an area', () => {
    const twoPointLoop = createRoutedPathFeature({
      path: {
        closed: true,
        points: [
          { primary: -1, secondary: 0 },
          { primary: 1, secondary: 0 }
        ]
      }
    });
    expect(errors(twoPointLoop)).toContain('at least three points when closed');
    expect(
      errors(
        createRoutedPathFeature({
          path: {
            closed: 'yes',
            points: [
              { primary: -1, secondary: 0 },
              { primary: 1, secondary: 0 },
              { primary: 0, secondary: 1 }
            ]
          } as never
        })
      )
    ).toContain('path.closed is invalid');
  });

  it('rejects a rounded cut with impossible dimensions', () => {
    expect(
      errors(createRoundedCutFeature({ parameters: { length: 0, width: 2, cornerRadius: 0.25 } as never }))
    ).toContain('parameters.length is invalid');
    expect(
      errors(createRoundedCutFeature({ parameters: { length: 4, width: -2, cornerRadius: 0.25 } as never }))
    ).toContain('parameters.width is invalid');
    expect(errors({ ...createRoundedCutFeature(), parameters: 7 })).toContain('parameters are invalid');
    expect(errors(createRoundedCutFeature({ cutType: 'not-a-shape' as never }))).toContain('cutType is invalid');
  });

  it('rejects a counterbore that is not wider than its hole', () => {
    expect(
      errors(
        createCircularCutFeature({
          cutType: 'counterbore',
          parameters: {
            ...(createCircularCutFeature().parameters as Record<string, unknown>),
            diameter: 0.5,
            // A counterbore narrower than its own hole is not a counterbore.
            counterbore: { diameter: 0.25, depth: 0.2 }
          } as never
        })
      )
    ).toContain('counterbore is invalid');
  });

  it('rejects a malformed repeat pattern', () => {
    expect(errors(createCircularCutFeature({ pattern: { type: 'linear', count: 0 } as never }))).toContain(
      'pattern is invalid'
    );
  });
});

function createEdgeProfileFeature(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'edge-1',
    kind: 'edge_profile',
    version: 1,
    enabled: true,
    target: { type: 'edge', edge: 'top_front_edge' },
    reference: { primaryFrom: 'center' },
    profile: 'roundover',
    placement: { x: 0, y: 0, z: 0 },
    parameters: { size: 0.25, depth: 0.25 },
    ...overrides
  };
}

describe('serialized router bit and edge profile rejections', () => {
  const errors = (feature: unknown) => validateSerializedPartFeatures([feature], 'features').join(' | ');
  const withBit = (bit: Record<string, unknown>) => errors(createRoutedPathFeature({ bit } as never));

  it('holds a V-style bit to a real included angle and a straight bit to none', () => {
    expect(withBit({ profile: 'v_bit', diameter: 0.5 })).toContain('bit.includedAngle is invalid');
    expect(withBit({ profile: 'v_bit', diameter: 0.5, includedAngle: 180 })).toContain('bit.includedAngle is invalid');
    // An included angle is meaningless on a flat-bottomed cutter.
    expect(withBit({ profile: 'straight', diameter: 0.25, includedAngle: 60 })).toContain(
      'bit.includedAngle is invalid'
    );
    expect(withBit({ profile: 'v_bit', diameter: 0.5, includedAngle: 60 })).not.toContain('includedAngle');
  });

  it('requires an undercutting bit to have a shank narrower than its cutter', () => {
    expect(withBit({ profile: 'dovetail', diameter: 0.5, includedAngle: 14, shankDiameter: 0.5 })).toContain(
      'bit.shankDiameter is invalid'
    );
    expect(withBit({ profile: 'straight', diameter: 0.25, shankDiameter: 0.25 })).toContain(
      'bit.shankDiameter is invalid'
    );
  });

  it('requires a slotting bit to declare a cutter height the cut can reach', () => {
    expect(withBit({ profile: 't_slot', diameter: 0.75, shankDiameter: 0.25 })).toContain(
      'bit.cutterHeight is invalid'
    );
    expect(withBit({ profile: 'straight', diameter: 0.25, cutterHeight: 0.5 })).toContain(
      'bit.cutterHeight is invalid'
    );
    // The routed path above is a 0.375" blind cut, shallower than this cutter.
    expect(withBit({ profile: 't_slot', diameter: 0.75, shankDiameter: 0.25, cutterHeight: 0.5 })).toContain(
      'parameters.depth must be at least the bit cutterHeight'
    );
  });

  it('rejects an edge profile with unusable library identifiers', () => {
    expect(errors(createEdgeProfileFeature({ routerProfileId: '' }))).toContain('routerProfileId is invalid');
    expect(errors(createEdgeProfileFeature({ routerProfileRevision: 7 }))).toContain(
      'routerProfileRevision is invalid'
    );
    expect(errors(createEdgeProfileFeature({ routerToolId: '' }))).toContain('routerToolId is invalid');
    expect(errors(createEdgeProfileFeature({ routerToolRevision: 7 }))).toContain('routerToolRevision is invalid');
  });

  it('requires a custom edge profile to carry the snapshot it names', () => {
    const custom = errors(createEdgeProfileFeature({ profile: 'custom' }));
    expect(custom).toContain('routerProfileId is required for a custom profile');
    expect(custom).toContain('routerProfileSnapshot is required for a custom profile');

    const snapshot = {
      version: 1,
      id: 'other-profile',
      name: 'Ogee',
      family: 'Custom',
      source: 'generic',
      parameters: {},
      boundary: { start: { u: 0, v: 0.25 }, segments: [{ kind: 'line', to: { u: 0.25, v: 0 } }] }
    };
    expect(
      errors(
        createEdgeProfileFeature({ profile: 'custom', routerProfileId: 'my-profile', routerProfileSnapshot: snapshot })
      )
    ).toContain('routerProfileSnapshot.id must match routerProfileId');
  });

  it('requires an assigned router tool to carry its snapshot', () => {
    expect(errors(createEdgeProfileFeature({ routerToolId: 'tool-1' }))).toContain(
      'routerToolSnapshot is required when a tool is assigned'
    );
  });

  it('rejects an edge profile whose size or depth is unusable', () => {
    expect(errors({ ...createEdgeProfileFeature(), parameters: 'deep' })).toContain('parameters are invalid');
    expect(errors(createEdgeProfileFeature({ parameters: { size: 0.25, depth: 0 } }))).toContain(
      'parameters.depth is invalid'
    );
  });
});
