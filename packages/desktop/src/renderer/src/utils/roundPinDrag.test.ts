import { describe, expect, it, vi } from 'vitest';
import { Euler, Quaternion, Vector3, MathUtils } from 'three';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { Part } from '../types';
import { resolveSafeTranslationDelta } from './overlapPolicy';
import { guideRoundPinDrag } from './roundPinDrag';
vi.unmock('three');
const pair = (): [Part, Part] => [
  createTestPart({
    id: 'pin',
    length: 0.75,
    width: 0.25,
    thickness: 0.25,
    blankShape: 'round',
    position: { x: 0, y: 0.375, z: 0 },
    rotation: { x: 0, y: 0, z: 90 }
  }),
  createTestPart({
    id: 'host',
    length: 12,
    width: 3,
    thickness: 0.75,
    position: { x: 0, y: 0.375, z: 0 },
    features: [
      {
        id: 'bore',
        kind: 'circular_cut',
        version: 1,
        enabled: true,
        cutType: 'round_hole',
        target: { type: 'face', face: 'top_face' },
        reference: { primaryFrom: 'center', secondaryFrom: 'center' },
        placement: { primary: 0, secondary: 0, rotation: 0 },
        parameters: { diameter: 0.25, depthMode: 'through', tilt: 0, direction: 0 }
      }
    ]
  })
];
const rotate = (part: Part, q: Quaternion): Part => {
  const rotation = new Euler().setFromQuaternion(
    q
      .clone()
      .multiply(
        new Quaternion().setFromEuler(
          new Euler(
            ...([part.rotation.x, part.rotation.y, part.rotation.z].map(MathUtils.degToRad) as [number, number, number])
          )
        )
      )
  );
  const p = new Vector3(part.position.x, part.position.y, part.position.z).applyQuaternion(q);
  return {
    ...part,
    position: { x: p.x, y: p.y + 20, z: p.z },
    rotation: {
      x: MathUtils.radToDeg(rotation.x),
      y: MathUtils.radToDeg(rotation.y),
      z: MathUtils.radToDeg(rotation.z)
    }
  };
};
describe('engaged round pin body dragging', () => {
  it('reproduces a blocked camera-plane diagonal while allowing axial withdrawal', () => {
    const [pin, host] = pair();
    const diagonal = resolveSafeTranslationDelta([pin, host], new Set([pin.id]), { x: 0.1, y: 0.25, z: 0.1 });
    expect(diagonal?.y ?? 0).toBeLessThan(0.01);
    expect(resolveSafeTranslationDelta([pin, host], new Set([pin.id]), { x: 0, y: 0.25, z: 0 })).toEqual({
      x: 0,
      y: 0.25,
      z: 0
    });
  });
  it.each([false, true])('guides coaxial withdrawal, rotated=%s', (rotated) => {
    const q = rotated ? new Quaternion().setFromEuler(new Euler(0.37, 0.61, -0.29)) : new Quaternion();
    const [pin, host] = pair().map((part) => rotate(part, q));
    const input = new Vector3(0.1, 0.25, 0.1).applyQuaternion(q);
    const expected = new Vector3(0, 0.25, 0).applyQuaternion(q);
    const guided = guideRoundPinDrag(pin, [pin, host], input)!;
    expect(new Vector3(guided.x, guided.y, guided.z).distanceTo(expected)).toBeLessThan(1e-8);
    expect(resolveSafeTranslationDelta([pin, host], new Set([pin.id]), guided)).toEqual(guided);
  });
  it('releases the guide once the whole pin clears the bore', () => {
    const [pin, host] = pair();
    const delta = { x: 0.1, y: 1, z: 0.1 };
    expect(guideRoundPinDrag(pin, [host], delta)).toEqual(delta);
    expect(guideRoundPinDrag({ ...pin, position: { x: 0, y: 1.2, z: 0 } }, [host], { x: 1, y: 0, z: 0 })).toBeNull();
  });
  it('does not guide square stock, an oversize or off-center pin, or an unbored board', () => {
    const [pin, host] = pair();
    const delta = { x: 0.1, y: 0.25, z: 0.1 };
    expect(guideRoundPinDrag({ ...pin, blankShape: undefined }, [host], delta)).toBeNull();
    expect(guideRoundPinDrag({ ...pin, width: 0.3, thickness: 0.3 }, [host], delta)).toBeNull();
    expect(guideRoundPinDrag({ ...pin, position: { x: 0.1, y: 0.375, z: 0 } }, [host], delta)).toBeNull();
    expect(guideRoundPinDrag(pin, [{ ...host, features: [] }], delta)).toBeNull();
  });
  it('guides through two aligned bores and does not pass a blind-hole floor', () => {
    const [pin, host] = pair();
    const lower = { ...host, id: 'lower', thickness: 0.375, position: { x: 0, y: 0.1875, z: 0 } };
    const upper = { ...host, id: 'upper', thickness: 0.375, position: { x: 0, y: 0.5625, z: 0 } };
    const guided = guideRoundPinDrag(pin, [lower, upper], { x: 0.1, y: 0.25, z: 0.1 })!;
    expect(guided.y).toBeCloseTo(0.25);
    expect(resolveSafeTranslationDelta([pin, lower, upper], new Set([pin.id]), guided)).toEqual(guided);
    const blind = globalThis.structuredClone(host);
    if (blind.features![0].kind === 'circular_cut') {
      blind.features![0].parameters.depthMode = 'blind';
      blind.features![0].parameters.depth = 0.5;
    }
    const short = { ...pin, length: 0.25, position: { x: 0, y: 0.5, z: 0 } };
    const down = guideRoundPinDrag(short, [blind], { x: 0.1, y: -0.4, z: 0.1 })!;
    const safe = resolveSafeTranslationDelta([short, blind], new Set([short.id]), down);
    expect(safe?.y ?? 0).toBeGreaterThan(-0.14);
  });
  it('keeps unrelated material collision checks on the guided path', () => {
    const [pin, host] = pair();
    const obstacle = createTestPart({
      id: 'obstacle',
      length: 4,
      width: 4,
      thickness: 0.75,
      position: { x: 0, y: 1.175, z: 0 }
    });
    const parts = [pin, host, obstacle];
    const guided = guideRoundPinDrag(pin, parts, { x: 0.1, y: 0.25, z: 0.1 })!;
    const safe = resolveSafeTranslationDelta(parts, new Set([pin.id]), guided);
    expect(safe?.y ?? 0).toBeLessThan(0.06);
  });
});
