import { describe, expect, it } from 'vitest';
import type {
  CutInstruction,
  PartFeature,
  EdgeProfileFeature,
  EndCutFeature,
  RouterProfileDefinition,
  RouterToolDefinition
} from '../types';
import { getCutSetups } from './cutSetups';
import { getInstructionFabricationLines } from './cutListInstructions';
import { getFeaturePlacementSummary, getFeatureSummary } from './partFeatureSummary';

const dado = (id: string, width: number, depth: number, offset: number): PartFeature => ({
  id,
  kind: 'rect_cut',
  version: 1,
  enabled: true,
  cutType: 'dado',
  target: { type: 'face', face: 'top_face' },
  reference: { primaryFrom: 'min' },
  parameters: { size: { length: width, width: 0 }, depthMode: 'blind', depth },
  placement: { x: offset, z: 0 }
});

const hole = (id: string, diameter: number): PartFeature => ({
  id,
  kind: 'circular_cut',
  version: 1,
  enabled: true,
  cutType: 'round_hole',
  target: { type: 'face', face: 'top_face' },
  reference: { primaryFrom: 'center', secondaryFrom: 'center' },
  parameters: { diameter, depthMode: 'through', tilt: 0, direction: 0 },
  placement: { primary: 0, secondary: 0, rotation: 0 }
});

const part = (partId: string, partName: string, features: PartFeature[]): CutInstruction => ({
  partId,
  partName,
  cutLength: 24,
  cutWidth: 6,
  thickness: 0.75,
  stockId: 'stock',
  stockName: 'Maple',
  grainSensitive: true,
  canRotate: false,
  isGlueUp: false,
  features
});

describe('operations grouped by setup', () => {
  it.each(['imperial', 'metric'] as const)(
    'flags blank-referenced slots after a mitre in reports and setups (%s)',
    (units) => {
      const mitre: EndCutFeature = {
        id: 'mitre',
        kind: 'end_cut',
        version: 1,
        enabled: true,
        target: { type: 'face', face: 'right_end' },
        reference: { primaryFrom: 'max' },
        cutType: 'mitre',
        lengthMode: 'long_point',
        parameters: { horizontalAngle: 45 }
      };
      const route: PartFeature = {
        id: 'slot',
        kind: 'routed_path',
        version: 1,
        enabled: true,
        target: { type: 'face', face: 'right_end' },
        reference: { primaryFrom: 'center', secondaryFrom: 'center' },
        path: {
          points: [
            { primary: -0.75, secondary: 0 },
            { primary: 0.75, secondary: 0 }
          ]
        },
        bit: { profile: 'straight', diameter: 0.125 },
        parameters: { depthMode: 'blind', depth: 2.25 }
      };
      const instruction = part('a', 'Splined mitre', [mitre, route]);
      const setup = getCutSetups([instruction], units)[1];
      expect(setup.operation).toBe('Routed path — shop setup required');
      expect(setup.setting).toContain('Route depth is not a machine plunge setting');
      expect(getInstructionFabricationLines(instruction, units)[1]).toContain(
        'original square end, not the angled cut face'
      );
      for (const features of [
        [route, mitre],
        [{ ...mitre, enabled: false }, route],
        [{ ...mitre, target: { type: 'face' as const, face: 'left_end' as const } }, route],
        [{ ...mitre, parameters: { horizontalAngle: 0 } }, route]
      ]) {
        const ordinary = part('b', 'Square reference', features);
        expect(
          getCutSetups([ordinary], units).find((entry) => entry.parts.some((entry) => entry.featureId === 'slot'))
            ?.operation
        ).toBe('Routed path');
        expect(getInstructionFabricationLines(ordinary, units).join(' ')).not.toContain('not a machine plunge setting');
      }
    }
  );

  it('separates square and pocket drilling and distinct counterbore/countersink tooling', () => {
    const square = hole('square', 0.25);
    if (square.kind !== 'circular_cut') throw new Error('Expected hole');
    const pocket = { ...square, id: 'pocket', parameters: { ...square.parameters, tilt: 75 } };
    const counterbore = {
      ...pocket,
      id: 'cb',
      cutType: 'counterbore' as const,
      parameters: { ...pocket.parameters, counterbore: { diameter: 0.5, depth: 0.125 } }
    };
    const deeper = {
      ...counterbore,
      id: 'deep',
      parameters: { ...counterbore.parameters, counterbore: { diameter: 0.5, depth: 0.25 } }
    };
    const sink = {
      ...square,
      id: 'cs',
      cutType: 'countersink' as const,
      parameters: { ...square.parameters, countersink: { majorDiameter: 0.5, includedAngle: 82 } }
    };
    const wider = {
      ...sink,
      id: 'wide',
      parameters: { ...sink.parameters, countersink: { majorDiameter: 0.75, includedAngle: 90 } }
    };
    const setups = getCutSetups([part('a', 'Board', [square, pocket, counterbore, deeper, sink, wider])], 'imperial');
    expect(setups).toHaveLength(6);
    expect(setups[0].setting).toContain('90° from face');
    expect(setups[1].setting).toContain('15° from face');
    expect(setups[2].setting).toContain('1/2" counterbore × 1/8" recess');
    expect(setups[3].setting).toContain('1/2" counterbore × 1/4" recess');
    expect(setups[4].setting).toContain('1/2" countersink, 82° included angle');
    expect(setups[5].setting).toContain('3/4" countersink, 90° included angle');
  });

  it('describes a through mortise as through instead of zero depth', () => {
    const cut = dado('open', 1.5, 0, 0);
    if (cut.kind !== 'rect_cut') throw new Error('Expected rectangular cut');
    cut.cutType = 'mortise';
    cut.parameters.depthMode = 'through';
    cut.parameters.size.width = 0.25;
    expect(getFeatureSummary(cut, 'imperial')).toContain('1 1/2" × 1/4" · Through');
    expect(getFeatureSummary(cut, 'imperial')).not.toContain('0" deep');
  });

  it('reports dovetail layout and wall slopes and separates their setups', () => {
    const base = dado('tail', 0.75, 0.75, 0);
    if (base.kind !== 'rect_cut') throw new Error('Expected rectangular cut');
    const taper = {
      ...base,
      cutType: 'cutout' as const,
      parameters: { ...base.parameters, depthMode: 'through' as const, taperAngle: 10 }
    };
    const walls = { ...taper, id: 'pin', parameters: { ...taper.parameters, taperAngle: 0, sideWallAngle: -10 } };
    expect(getFeatureSummary(taper, 'imperial')).toContain('10° taper in the face, widening toward Right');
    expect(getFeatureSummary(walls, 'imperial')).toContain('10° side walls, narrowing with depth');
    expect(getCutSetups([part('a', 'Board', [taper, walls])], 'imperial')).toHaveLength(2);
    const blind = {
      ...walls,
      cutType: 'mortise' as const,
      parameters: { ...walls.parameters, depthMode: 'blind' as const, depth: 0.5, sideWallAngle: 10 }
    };
    expect(getFeatureSummary(blind, 'imperial')).toContain('10° side walls, widening with depth');
  });

  it('describes stopped ends and keeps square and routed setups separate', () => {
    const cut = dado('stopped', 0.75, 0.25, 4);
    if (cut.kind !== 'rect_cut') throw new Error('Expected rectangular cut');
    cut.cutType = 'stopped_dado';
    cut.parameters.stoppedSpan = true;
    cut.parameters.size.width = 7;
    cut.parameters.cornerRadius = 0.375;
    expect(getFeatureSummary(cut, 'imperial')).toContain('3/8" radius at stopped ends');
    expect(getFeaturePlacementSummary(cut, 'imperial', 8)).toBe('4" from Left · Open at Back · Stop 1" from Front');
    const square = { ...cut, id: 'square', parameters: { ...cut.parameters, cornerRadius: 0 } };
    expect(getCutSetups([part('a', 'Side', [cut, square])], 'imperial')).toHaveLength(2);
    cut.placement.z = 0.5;
    cut.parameters.size.width = 6.5;
    expect(getFeaturePlacementSummary(cut, 'imperial', 8)).toBe(
      '4" from Left · Stop 1/2" from Back · Stop 1" from Front'
    );
  });
  it('describes a biscuit pocket by blade, kerf, and plunge rather than a router corner radius', () => {
    const depth = 12.516 / 25.4;
    const cut: PartFeature = {
      id: 'biscuit',
      kind: 'rounded_cut',
      version: 1,
      enabled: true,
      cutType: 'rounded_slot',
      target: { type: 'face', face: 'front_face' },
      reference: { primaryFrom: 'min' },
      placement: { primary: 12, secondary: 0.375, rotation: 0 },
      parameters: {
        length: 2 * Math.sqrt(2 * (50 / 25.4) * depth - depth * depth),
        width: 4 / 25.4,
        cornerRadius: 2 / 25.4,
        depthMode: 'blind',
        depth,
        plateJoiner: true
      }
    };
    expect(getFeatureSummary(cut, 'imperial')).toBe(
      'Plate-joiner slot on Front Face · 100mm blade · 4mm kerf × 12.516mm plunge'
    );
    expect(getCutSetups([part('board', 'Board', [cut])], 'imperial')[0]).toMatchObject({
      operation: 'Plate joiner',
      setting: '100mm blade, 4mm kerf, 12.516mm plunge'
    });
  });
  it('does not combine distinct precise settings merely because their readable labels round alike', () => {
    const setups = getCutSetups(
      [part('a', 'A', [hole('a', 0.123441)]), part('b', 'B', [hole('b', 0.123442)])],
      'imperial'
    );
    expect(setups).toHaveLength(2);
    expect(setups[0].key).not.toBe(setups[1].key);
  });
  it('gathers the same cut from every part that needs it', () => {
    const setups = getCutSetups(
      [
        part('side-l', 'Left Side', [dado('a', 0.75, 0.25, 4)]),
        part('side-r', 'Right Side', [dado('b', 0.75, 0.25, 4)])
      ],
      'imperial'
    );
    expect(setups).toHaveLength(1);
    expect(setups[0].passes).toBe(2);
    expect(setups[0].parts.map((entry) => entry.partName)).toEqual(['Left Side', 'Right Side']);
  });

  it('ignores where a cut sits, because the offset is not a machine setting', () => {
    // Two dados at different positions run back to back without touching it.
    const setups = getCutSetups(
      [part('side', 'Side', [dado('a', 0.75, 0.25, 4), dado('b', 0.75, 0.25, 14)])],
      'imperial'
    );
    expect(setups).toHaveLength(1);
    expect(setups[0].passes).toBe(2);
  });

  it('separates cuts that genuinely need the machine changed', () => {
    const setups = getCutSetups(
      [part('side', 'Side', [dado('a', 0.75, 0.25, 4), dado('b', 0.5, 0.25, 14), dado('c', 0.75, 0.5, 20)])],
      'imperial'
    );
    // Three settings: two widths and two depths.
    expect(setups).toHaveLength(3);
    expect(setups.map((setup) => setup.passes)).toEqual([1, 1, 1]);
  });

  it('says what the machine has to be set to', () => {
    const [setup] = getCutSetups([part('side', 'Side', [dado('a', 0.75, 0.25, 4)])], 'imperial');
    expect(setup.operation).toBe('Dado');
    expect(setup.setting).toBe('3/4" wide, 1/4" deep');
  });

  it('groups bores by the bit rather than by the part', () => {
    const setups = getCutSetups(
      [part('rail', 'Rail', [hole('a', 0.375), hole('b', 0.375)]), part('stile', 'Stile', [hole('c', 0.375)])],
      'imperial'
    );
    expect(setups).toHaveLength(1);
    expect(setups[0].operation).toBe('Drill');
    expect(setups[0].setting).toContain('3/8" bit');
    expect(setups[0].passes).toBe(3);
  });

  it('keeps setups in the order their first piece appears', () => {
    const setups = getCutSetups(
      [part('a', 'A', [hole('h', 0.25)]), part('b', 'B', [dado('d', 0.75, 0.25, 4)])],
      'imperial'
    );
    expect(setups.map((setup) => setup.operation)).toEqual(['Drill', 'Dado']);
  });

  it('names a part once however many passes it takes', () => {
    const setups = getCutSetups(
      [part('side', 'Side', [dado('a', 0.75, 0.25, 4), dado('b', 0.75, 0.25, 14)])],
      'imperial'
    );
    expect(new Set(setups[0].parts.map((entry) => entry.partName)).size).toBe(1);
    expect(setups[0].passes).toBe(2);
  });

  it('has nothing to say about blanks with no operations', () => {
    expect(getCutSetups([part('plain', 'Plain', [])], 'imperial')).toEqual([]);
  });

  it('measures the setting in the project’s own units', () => {
    const [setup] = getCutSetups([part('side', 'Side', [dado('a', 0.75, 0.25, 4)])], 'metric');
    expect(setup.setting).toContain('mm');
  });
});

describe('what each operation needs the machine set to', () => {
  const only = (feature: PartFeature) => getCutSetups([part('p', 'Piece', [feature])], 'imperial')[0];

  const rect = (cutType: string, parameters: Record<string, unknown>): PartFeature =>
    ({
      id: `${cutType}-1`,
      kind: 'rect_cut',
      version: 1,
      enabled: true,
      cutType,
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'min' },
      parameters,
      placement: { x: 0, z: 0 }
    }) as unknown as PartFeature;

  it('sets a groove by its width and depth', () => {
    const setup = only(rect('groove', { size: { length: 24, width: 0.25 }, depthMode: 'blind', depth: 0.375 }));
    expect(setup.operation).toBe('Groove');
    expect(setup.setting).toBe('1/4" wide, 3/8" deep');
  });

  it('sets a rabbet by its shoulder', () => {
    const setup = only({
      ...rect('rabbet', { size: { length: 24, width: 0.5 }, depthMode: 'blind', depth: 0.25 }),
      target: { type: 'edge', edge: 'top_front_edge' }
    } as PartFeature);
    expect(setup.setting).toBe('1/2" shoulder, 1/4" deep');
  });

  it('distinguishes a routed mortise from a chopped one', () => {
    const square = only(rect('mortise', { size: { length: 2, width: 0.25 }, depthMode: 'blind', depth: 1 }));
    const routed = only(
      rect('mortise', { size: { length: 2, width: 0.25 }, depthMode: 'blind', depth: 1, cornerRadius: 0.125 })
    );
    // Different tools entirely, so never the same setup.
    expect(square.setting).toContain('square corners');
    expect(routed.setting).toContain('routed');
    expect(square.key).not.toBe(routed.key);
  });

  it('sets a tenon by its thickness and length', () => {
    const setup = only(rect('tenon', { size: { length: 1, width: 2 }, depthMode: 'blind', depth: 0.25 }));
    expect(setup.setting).toBe('1/4" thick, 1" long');
  });

  it('describes a through cut as through rather than as a depth', () => {
    const setup = only(rect('cutout', { size: { length: 2, width: 1 }, depthMode: 'through' }));
    expect(setup.operation).toBe('Cutout');
    expect(setup.setting).toContain('through');
  });

  it('sets a rounded opening by its radius', () => {
    const setup = only({
      id: 'slot',
      kind: 'rounded_cut',
      version: 1,
      enabled: true,
      cutType: 'rounded_slot',
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'center', secondaryFrom: 'center' },
      parameters: { length: 3, width: 1, cornerRadius: 0.5, depthMode: 'through' },
      placement: { primary: 0, secondary: 0, rotation: 0 }
    } as unknown as PartFeature);
    expect(setup.operation).toBe('Rounded slot');
    expect(setup.setting).toContain('1/2" radius');
  });

  it.each(['v_bit', 'engraving'] as const)('keeps %s included angles in separate machine setups', (profile) => {
    const route = (id: string, includedAngle: number): PartFeature => ({
      id,
      kind: 'routed_path',
      version: 1,
      enabled: true,
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'center', secondaryFrom: 'center' },
      path: {
        points: [
          { primary: -3, secondary: 0 },
          { primary: 3, secondary: 0 }
        ]
      },
      bit: { profile, diameter: 0.25, includedAngle },
      parameters: { depthMode: 'blind', depth: 0.125 }
    });
    const setups = getCutSetups(
      [part('a', 'Board', [route('one', 60), route('two', 90), route('three', 60)])],
      'imperial'
    );
    expect(setups).toHaveLength(2);
    expect(setups.map((setup) => setup.passes)).toEqual([2, 1]);
    expect(setups.map((setup) => setup.setting)).toEqual(
      [60, 90].map(
        (angle) => `1/4" ${profile === 'v_bit' ? 'V-bit' : 'Engraving bit'}, ${angle}° included angle, 1/8" deep`
      )
    );
  });

  it.each(['t_slot', 'keyhole'] as const)('distinguishes all %s cutter dimensions and routing depth', (profile) => {
    const route = (
      id: string,
      changes: Partial<{ diameter: number; shankDiameter: number; cutterHeight: number }> = {},
      depth = 0.375
    ): PartFeature => ({
      id,
      kind: 'routed_path',
      version: 1,
      enabled: true,
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'center', secondaryFrom: 'center' },
      path: {
        points: [
          { primary: -3, secondary: 0 },
          { primary: 3, secondary: 0 }
        ]
      },
      bit: { profile, diameter: 0.5, shankDiameter: 0.25, cutterHeight: 0.125, ...changes },
      parameters: { depthMode: 'blind', depth }
    });
    const setups = getCutSetups(
      [
        part('a', 'Board', [
          route('first'),
          route('same'),
          route('head', { diameter: 0.75 }),
          route('shank', { shankDiameter: 0.1875 }),
          route('height', { cutterHeight: 0.25 }),
          route('depth', {}, 0.5)
        ])
      ],
      'imperial'
    );
    expect(setups).toHaveLength(5);
    expect(setups.map((setup) => setup.passes)).toEqual([2, 1, 1, 1, 1]);
    expect(setups[0].setting).toBe(
      `1/2" ${profile === 't_slot' ? 'T-Slot' : 'Keyhole'} bit, 1/4" shank, 1/8" cutter height, 3/8" deep`
    );
    expect(setups[2].setting).toContain('3/16" shank');
    expect(setups[3].setting).toContain('1/4" cutter height');
  });

  it('keeps dovetail angle, maximum diameter and shank dimensions distinct', () => {
    const route = (
      id: string,
      changes: Partial<{ diameter: number; shankDiameter: number; includedAngle: number }> = {}
    ): PartFeature => ({
      id,
      kind: 'routed_path',
      version: 1,
      enabled: true,
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'center', secondaryFrom: 'center' },
      path: {
        points: [
          { primary: -3, secondary: 0 },
          { primary: 3, secondary: 0 }
        ]
      },
      bit: { profile: 'dovetail', diameter: 0.5, shankDiameter: 0.25, includedAngle: 16, ...changes },
      parameters: { depthMode: 'blind', depth: 0.25 }
    });
    const setups = getCutSetups(
      [
        part('a', 'Board', [
          route('one'),
          route('same'),
          route('head', { diameter: 0.75 }),
          route('shank', { shankDiameter: 0.1875 }),
          route('angle', { includedAngle: 20 })
        ])
      ],
      'imperial'
    );
    expect(setups).toHaveLength(4);
    expect(setups.map((setup) => setup.passes)).toEqual([2, 1, 1, 1]);
    expect(setups[0].setting).toContain('8° slope, 1/2" max diameter, 1/4" shank');
    expect(setups[3].setting).toContain('10° slope');
  });

  it.each([
    ['straight', 'Straight'],
    ['core_box', 'Core Box']
  ])('sets a routed path with readable %s bit name', (profile, label) => {
    const setup = only({
      id: 'route',
      kind: 'routed_path',
      version: 1,
      enabled: true,
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'center', secondaryFrom: 'center' },
      path: {
        points: [
          { primary: -3, secondary: 0 },
          { primary: 3, secondary: 0 }
        ]
      },
      bit: { profile, diameter: 0.25 },
      parameters: { depthMode: 'blind', depth: 0.25 }
    } as unknown as PartFeature);
    expect(setup.operation).toBe('Routed path');
    expect(setup.setting).toBe(`1/4" ${label} bit, 1/4" deep`);
  });

  it('sets an edge profile by its profile and size', () => {
    const setup = only({
      id: 'edge',
      kind: 'edge_profile',
      version: 1,
      enabled: true,
      target: { type: 'edge', edge: 'top_front_edge' },
      reference: { primaryFrom: 'center' },
      profile: 'roundover',
      parameters: { size: 0.25, depth: 0.25 }
    } as unknown as PartFeature);
    expect(setup.operation).toBe('Edge profile');
    expect(setup.setting).toContain('roundover');
  });

  it('sets a mitre by the angle, not by which end it is cut on', () => {
    const left = only({
      id: 'left',
      kind: 'end_cut',
      version: 1,
      enabled: true,
      target: { type: 'face', face: 'left_end' },
      reference: { primaryFrom: 'min' },
      cutType: 'mitre',
      lengthMode: 'long_point',
      parameters: { horizontalAngle: 45 }
    } as unknown as PartFeature);
    expect(left.operation).toBe('Mitre');
    expect(left.setting).toBe('45°');
  });

  it('separates a compound cut, which needs the blade tilted too', () => {
    const setup = only({
      id: 'compound',
      kind: 'end_cut',
      version: 1,
      enabled: true,
      target: { type: 'face', face: 'left_end' },
      reference: { primaryFrom: 'min' },
      cutType: 'compound',
      lengthMode: 'long_point',
      parameters: { horizontalAngle: 45, verticalAngle: 15 }
    } as unknown as PartFeature);
    expect(setup.setting).toBe('45°, 15° tilt');
  });
});

describe('saved tooling and remaining machine settings', () => {
  const profile: RouterProfileDefinition = {
    version: 1,
    id: 'custom-profile',
    name: 'Cabinet bead',
    family: 'custom',
    source: 'generic',
    parameters: {},
    boundary: {
      start: { u: 0, v: 0 },
      segments: [
        { kind: 'line', to: { u: 1, v: 0 } },
        { kind: 'line', to: { u: 0, v: 1 } }
      ]
    }
  };
  const tool: RouterToolDefinition = {
    version: 1,
    id: 'bead-tool',
    name: 'Bead cutter',
    source: 'manufacturer',
    manufacturer: 'Example',
    sku: 'B1',
    profileFamily: 'custom',
    cutterDiameter: 1,
    shankDiameter: 0.5,
    cuttingHeight: 0.75
  };
  const edge = (id: string, overrides: Partial<EdgeProfileFeature> = {}): EdgeProfileFeature => ({
    id,
    kind: 'edge_profile',
    version: 1,
    enabled: true,
    target: { type: 'edge', edge: 'top_front_edge' },
    profile: 'custom',
    parameters: { size: 0.25, depth: 0.25 },
    routerProfileSnapshot: profile,
    reference: { primaryFrom: 'center' },
    ...overrides
  });
  const setups = (...features: PartFeature[]) => getCutSetups([part('p', 'Board', features)], 'imperial');

  it('separates changed saved contours even with the same name, id and stale revision', () => {
    const changed = {
      ...profile,
      revision: 'stale',
      boundary: { ...profile.boundary, segments: [{ kind: 'line' as const, to: { u: 0.5, v: 1 } }] }
    };
    const result = setups(edge('one'), edge('two', { routerProfileSnapshot: changed }), edge('three'));
    expect(result).toHaveLength(2);
    expect(result.map((entry) => entry.passes)).toEqual([2, 1]);
    expect(result[0].setting).toContain('Cabinet bead');
    expect(result[0].setting).toContain('no physical tool assigned');
  });

  it('separates saved physical tools and envelope revisions while grouping identical snapshots', () => {
    const result = setups(
      edge('generic'),
      edge('one', { routerToolSnapshot: tool }),
      edge('same', { routerToolSnapshot: globalThis.structuredClone(tool) }),
      edge('other-tool', { routerToolSnapshot: { ...tool, id: 'second-tool', sku: 'B2' } }),
      edge('other-bearing', { routerToolSnapshot: { ...tool, bearingDiameter: 0.375 } }),
      edge('other-envelope', {
        routerToolSnapshot: {
          ...tool,
          envelopeVersion: 1,
          sections: [
            { role: 'cutter', start: 0, end: 0.75, diameter: 1 },
            { role: 'shank', start: 0.75, end: 2, diameter: 0.5 }
          ]
        }
      })
    );
    expect(result).toHaveLength(5);
    expect(result[1].passes).toBe(2);
    expect(result[1].setting).toContain('Tool: Bead cutter (Example B1)');
    expect(result[1].setting).toContain('1" cutter, 1/2" shank, 3/4" cutting height');
  });

  const rect = (id: string, cutType: 'mortise' | 'tenon' | 'rabbet' | 'cutout', parameters: Record<string, unknown>) =>
    ({
      id,
      kind: 'rect_cut',
      version: 1,
      enabled: true,
      cutType,
      target: { type: 'edge', edge: 'top_left_edge' },
      reference: { primaryFrom: 'min' },
      placement: { x: 0, z: 0 },
      parameters: { size: { length: 0.5, width: 1 }, depthMode: 'blind', depth: 0.25, ...parameters }
    }) as PartFeature;

  it.each(['mortise', 'tenon', 'cutout'] as const)('keeps different %s corner radii separate', (cutType) => {
    const result = setups(rect('a', cutType, { cornerRadius: 0.125 }), rect('b', cutType, { cornerRadius: 0.25 }));
    expect(result).toHaveLength(2);
    expect(result[0].setting).toContain('1/8" corner radius');
    expect(result[1].setting).toContain('1/4" corner radius');
  });

  it('distinguishes which walls lean and uses the end-edge rabbet shoulder dimension', () => {
    const result = setups(rect('a', 'mortise', { wallAngle: 8 }), rect('b', 'mortise', { sideWallAngle: 8 }));
    expect(result).toHaveLength(2);
    expect(result[0].setting).toContain('8° end walls');
    expect(result[1].setting).toContain('8° side walls');
    const rabbets = setups(rect('a', 'rabbet', {}), rect('b', 'rabbet', { size: { length: 0.75, width: 1 } }));
    expect(rabbets).toHaveLength(2);
    expect(rabbets[0].setting).toContain('1/2" shoulder');
    expect(rabbets[1].setting).toContain('3/4" shoulder');
  });

  it('separates a partial-thickness end cut from a full cut and other band heights', () => {
    const base = {
      id: 'full',
      kind: 'end_cut',
      version: 1,
      enabled: true,
      cutType: 'mitre',
      target: { type: 'face', face: 'left_end' },
      reference: { primaryFrom: 'min' },
      lengthMode: 'long_point',
      parameters: { horizontalAngle: 45 }
    } as PartFeature;
    const result = setups(
      base,
      { ...base, id: 'low', parameters: { horizontalAngle: 45, band: { from: 0, to: 0.125 } } } as PartFeature,
      { ...base, id: 'high', parameters: { horizontalAngle: 45, band: { from: 0.5, to: 0.625 } } } as PartFeature
    );
    expect(result).toHaveLength(3);
    expect(result[1].setting).toContain('cut band 0" to 1/8" from bottom');
  });
});
