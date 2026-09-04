import { describe, expect, it } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { CircularCutFeature, RoundedCutFeature } from '../types';
import { expandCircularCut, getFaceFrame, validateCircularCut, validateRoundedCut } from './roundCutUtils';

const part = createTestPart({ length: 24, width: 8, thickness: 2 });

function hole(overrides: Partial<CircularCutFeature> = {}): CircularCutFeature {
  return {
    id: 'hole-1',
    kind: 'circular_cut',
    version: 1,
    enabled: true,
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'center', secondaryFrom: 'center' },
    cutType: 'round_hole',
    placement: { primary: 0, secondary: 0, rotation: 0 },
    parameters: { diameter: 0.5, depthMode: 'through', tilt: 0, direction: 0 },
    ...overrides
  };
}

function rounded(overrides: Partial<RoundedCutFeature> = {}): RoundedCutFeature {
  return {
    id: 'rounded-1',
    kind: 'rounded_cut',
    version: 1,
    enabled: true,
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'center', secondaryFrom: 'center' },
    cutType: 'rounded_rectangle',
    placement: { primary: 0, secondary: 0, rotation: 0 },
    parameters: { length: 4, width: 2, cornerRadius: 0.25, depthMode: 'blind', depth: 0.5 },
    ...overrides
  };
}

describe('roundCutUtils', () => {
  it('rejects invalid recess and rounded-profile dimensions', () => {
    const part = createTestPart({ length: 12, width: 6, thickness: 1 });
    expect(
      validateCircularCut(
        hole({
          cutType: 'countersink',
          parameters: {
            diameter: 0.5,
            depthMode: 'through',
            tilt: 0,
            direction: 0,
            countersink: { majorDiameter: 0.4, includedAngle: 82 }
          }
        }),
        part
      )
    ).toMatch(/Countersink diameter/);
    expect(
      validateRoundedCut(
        rounded({ parameters: { length: 4, width: 2, cornerRadius: 1.25, depthMode: 'through' } }),
        part
      )
    ).toMatch(/Corner radius/);
  });

  it.each([
    ['zero rounded length', { length: 0, width: 2, cornerRadius: 0.25, depthMode: 'through' as const }],
    ['non-finite rounded width', { length: 4, width: Number.NaN, cornerRadius: 0.25, depthMode: 'through' as const }],
    [
      'non-finite rounded rotation',
      { length: 4, width: 2, cornerRadius: 0.25, depthMode: 'through' as const },
      { rotation: Number.NaN }
    ],
    ['zero blind rounded depth', { length: 4, width: 2, cornerRadius: 0.25, depthMode: 'blind' as const, depth: 0 }],
    [
      'negative blind rounded depth',
      { length: 4, width: 2, cornerRadius: 0.25, depthMode: 'blind' as const, depth: -0.25 }
    ]
  ] as const)('rejects %s', (_label, parameters, placement = {}) => {
    expect(
      validateRoundedCut(
        rounded({ parameters, placement: { primary: 0, secondary: 0, rotation: 0, ...placement } }),
        part
      )
    ).not.toBeNull();
  });

  it.each([
    ['a countersink recess deeper than the material', 'countersink', { majorDiameter: 2, includedAngle: 30 }],
    ['a through counterbore recess as deep as the material', 'counterbore', { diameter: 1, depth: 2 }],
    ['a blind counterbore deeper than its pilot', 'counterbore', { diameter: 1, depth: 0.75 }]
  ] as const)('rejects %s', (_label, cutType, recess) => {
    const parameters =
      cutType === 'countersink'
        ? { diameter: 0.5, depthMode: 'through' as const, tilt: 0, direction: 0, countersink: recess }
        : { diameter: 0.5, depthMode: 'blind' as const, depth: 0.5, tilt: 0, direction: 0, counterbore: recess };
    expect(validateCircularCut(hole({ cutType, parameters }), part)).not.toBeNull();
  });

  it('rejects a rounded slot whose run is shorter than its diameter', () => {
    expect(
      validateRoundedCut(
        rounded({
          cutType: 'rounded_slot',
          parameters: { length: 0.5, width: 1, cornerRadius: 0.5, depthMode: 'through' }
        }),
        part
      )
    ).not.toBeNull();
  });

  it.each([
    ['linear', { type: 'linear' as const, count: 1, spacing: 0.01, direction: 23 }],
    ['linear maximum', { type: 'linear' as const, count: 128, spacing: 0.01, direction: 23 }],
    ['grid', { type: 'grid' as const, rows: 1, columns: 1, rowSpacing: 0.01, columnSpacing: 0.01, rotation: 17 }],
    [
      'grid maximum',
      { type: 'grid' as const, rows: 1, columns: 128, rowSpacing: 0.01, columnSpacing: 0.01, rotation: 17 }
    ],
    ['circular', { type: 'circular' as const, count: 1, radius: 0.1, startAngle: 31 }],
    ['circular maximum', { type: 'circular' as const, count: 128, radius: 0.1, startAngle: 31 }]
  ])('accepts an in-bounds %s pattern with authored orientation', (_label, pattern) => {
    expect(validateCircularCut(hole({ pattern }), part)).toBeNull();
    expect(expandCircularCut(hole({ pattern }), part)).toHaveLength(
      pattern.type === 'grid' ? pattern.rows * pattern.columns : pattern.count
    );
  });

  it.each([
    ['linear zero', { type: 'linear' as const, count: 0, spacing: 1, direction: 0 }],
    ['linear over-limit', { type: 'linear' as const, count: 129, spacing: 0.01, direction: 0 }],
    [
      'grid over-limit',
      { type: 'grid' as const, rows: 129, columns: 1, rowSpacing: 0.01, columnSpacing: 0.01, rotation: 0 }
    ],
    ['circular zero', { type: 'circular' as const, count: 0, radius: 1, startAngle: 0 }],
    ['circular over-limit', { type: 'circular' as const, count: 129, radius: 0.1, startAngle: 0 }]
  ])('rejects a %s pattern', (_label, pattern) => {
    expect(validateCircularCut(hole({ pattern }), part)).not.toBeNull();
  });

  it('accepts exact profile edges but rejects over-edge circular and rounded placement', () => {
    expect(validateCircularCut(hole({ placement: { primary: 11.75, secondary: 0, rotation: 0 } }), part)).toBeNull();
    expect(
      validateCircularCut(hole({ placement: { primary: 11.751, secondary: 0, rotation: 0 } }), part)
    ).not.toBeNull();
    expect(validateRoundedCut(rounded({ placement: { primary: 10, secondary: 0, rotation: 0 } }), part)).toBeNull();
    expect(
      validateRoundedCut(rounded({ placement: { primary: 10.001, secondary: 0, rotation: 0 } }), part)
    ).not.toBeNull();
  });

  it('rejects non-finite circular placement before expanding members', () => {
    expect(
      validateCircularCut(hole({ placement: { primary: Number.NaN, secondary: 0, rotation: 0 } }), part)
    ).not.toBeNull();
  });
  it.each([
    ['top_face', { origin: { x: 0, y: 1, z: 0 }, inwardNormal: { x: 0, y: -1, z: 0 }, sizes: [24, 8] }],
    ['bottom_face', { origin: { x: 0, y: -1, z: 0 }, inwardNormal: { x: 0, y: 1, z: 0 }, sizes: [24, 8] }],
    ['front_face', { origin: { x: 0, y: 0, z: -4 }, inwardNormal: { x: 0, y: 0, z: 1 }, sizes: [24, 2] }],
    ['back_face', { origin: { x: 0, y: 0, z: 4 }, inwardNormal: { x: 0, y: 0, z: -1 }, sizes: [24, 2] }],
    ['left_end', { origin: { x: -12, y: 0, z: 0 }, inwardNormal: { x: 1, y: 0, z: 0 }, sizes: [8, 2] }],
    ['right_end', { origin: { x: 12, y: 0, z: 0 }, inwardNormal: { x: -1, y: 0, z: 0 }, sizes: [8, 2] }]
  ] as const)('maps %s into a woodworking face frame', (face, expected) => {
    const frame = getFaceFrame(part, face);
    expect(frame.origin).toEqual(expected.origin);
    expect(frame.inwardNormal).toEqual(expected.inwardNormal);
    expect([frame.primarySize, frame.secondarySize]).toEqual(expected.sizes);
  });

  it('resolves min/center/max references into local entry points', () => {
    const fromMin = expandCircularCut(
      hole({
        reference: { primaryFrom: 'min', secondaryFrom: 'max' },
        placement: { primary: 2, secondary: 1, rotation: 0 }
      }),
      part
    );
    expect(fromMin[0].entryPoint).toEqual({ x: -10, y: 1, z: 3 });
  });

  it('expands linear, grid, and circular patterns in deterministic order', () => {
    const linear = expandCircularCut(hole({ pattern: { type: 'linear', count: 3, spacing: 2, direction: 0 } }), part);
    expect(linear.map((member) => member.entryPoint.x)).toEqual([0, 2, 4]);

    const grid = expandCircularCut(
      hole({ pattern: { type: 'grid', rows: 2, columns: 2, rowSpacing: 3, columnSpacing: 2, rotation: 0 } }),
      part
    );
    expect(grid.map((member) => [member.entryPoint.x, member.entryPoint.z])).toEqual([
      [0, 0],
      [2, 0],
      [0, 3],
      [2, 3]
    ]);

    const circular = expandCircularCut(
      hole({ pattern: { type: 'circular', count: 4, radius: 2, startAngle: 0 } }),
      part
    );
    expect(circular.map((member) => [member.entryPoint.x, member.entryPoint.z])).toEqual([
      [2, 0],
      [0, 2],
      [-2, 0],
      [0, -2]
    ]);
  });

  it('tilts the drilling axis away from the face normal in the authored direction', () => {
    const [expanded] = expandCircularCut(
      hole({ parameters: { diameter: 0.5, depthMode: 'through', tilt: 30, direction: 0 } }),
      part
    );
    expect(expanded.axis.x).toBeCloseTo(0.5);
    expect(expanded.axis.y).toBeCloseTo(-Math.sqrt(3) / 2);
    expect(expanded.axis.z).toBeCloseTo(0);
  });

  it('rejects profiles outside the face and blind holes that exit early', () => {
    expect(validateCircularCut(hole({ placement: { primary: 11.9, secondary: 0, rotation: 0 } }), part)).toContain(
      'extends beyond'
    );
    expect(
      validateCircularCut(
        hole({ parameters: { diameter: 0.5, depthMode: 'blind', depth: 3, tilt: 0, direction: 0 } }),
        part
      )
    ).toContain('available material');
  });

  it('validates rotated rounded profiles against the target face and available depth', () => {
    expect(validateRoundedCut(rounded({ placement: { primary: 10, secondary: 0, rotation: 45 } }), part)).toContain(
      'extends beyond'
    );
    expect(
      validateRoundedCut(
        rounded({ parameters: { length: 4, width: 2, cornerRadius: 0.25, depthMode: 'blind', depth: 2 } }),
        part
      )
    ).toContain('available material');
    expect(validateRoundedCut(rounded(), part)).toBeNull();
  });
});
