import { describe, expect, it } from 'vitest';
import type { CutInstruction, PartFeature } from '../types';
import { getCutSetups } from './cutSetups';

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
    const setup = only(rect('rabbet', { size: { length: 24, width: 0.5 }, depthMode: 'blind', depth: 0.25 }));
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

  it('sets a routed path by its bit', () => {
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
      bit: { profile: 'straight', diameter: 0.25 },
      parameters: { depthMode: 'blind', depth: 0.25 }
    } as unknown as PartFeature);
    expect(setup.operation).toBe('Routed path');
    expect(setup.setting).toBe('1/4" straight bit, 1/4" deep');
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
