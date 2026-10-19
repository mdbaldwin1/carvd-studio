import { describe, expect, it, vi } from 'vitest';
import { Euler, MathUtils, Quaternion, Vector3 } from 'three';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { Part } from '../types';
import { partsOverlapInMaterial } from './partFeatureGeometry';
import { guideCrossedSlotDrag } from './crossedSlotDrag';
import { resolveSinglePartReleaseMove } from './interactionMovement';
import { resolveSafeTranslationDelta } from './overlapPolicy';
vi.unmock('three');

function pair(height = 3): [Part, Part] {
  return [false, true].map((back) =>
    createTestPart({
      id: back ? 'fixed' : 'moving',
      length: 12,
      width: 6,
      thickness: 0.75,
      position: { x: 0, y: back ? 3 : height, z: 0 },
      rotation: { x: 90, y: 0, z: back ? 90 : 0 },
      features: [
        {
          id: 'slot',
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          target: { type: 'edge', edge: back ? 'top_back_edge' : 'top_front_edge' },
          reference: { primaryFrom: 'min' },
          cutType: 'edge_notch',
          parameters: { size: { length: 0.75, width: 3 }, depthMode: 'through' },
          placement: { x: 5.625, z: 0 }
        }
      ]
    })
  ) as [Part, Part];
}
function rotate(part: Part, q: Quaternion): Part {
  const r = new Euler().setFromQuaternion(
    q
      .clone()
      .multiply(
        new Quaternion().setFromEuler(
          new Euler(
            ...([part.rotation.x, part.rotation.y, part.rotation.z].map(MathUtils.degToRad) as [
              number,
              number,
              number
            ]),
            'XYZ'
          )
        )
      ),
    'XYZ'
  );
  const p = new Vector3(part.position.x, part.position.y, part.position.z).applyQuaternion(q);
  return {
    ...part,
    position: { x: p.x, y: p.y + 20, z: p.z },
    rotation: { x: MathUtils.radToDeg(r.x), y: MathUtils.radToDeg(r.y), z: MathUtils.radToDeg(r.z) }
  };
}

describe('engaged crossed-slot body drag', () => {
  it('distinguishes axis-only clearance from diagonal corner interference at the native 6.2078 height', () => {
    const [moving, fixed] = pair(6.2078);
    for (const delta of [
      { x: 0.1, y: 0, z: 0 },
      { x: 0, y: 0, z: 0.1 }
    ]) {
      const candidate = { ...moving, position: { x: delta.x, y: moving.position.y, z: delta.z } };
      expect(partsOverlapInMaterial(candidate, fixed)).toBe(false);
      expect(resolveSafeTranslationDelta([moving, fixed], new Set([moving.id]), delta)).toEqual(delta);
    }
    const diagonal = { x: 0.1, y: 0, z: 0.1 };
    expect(partsOverlapInMaterial({ ...moving, position: { x: 0.1, y: moving.position.y, z: 0.1 } }, fixed)).toBe(true);
    expect(resolveSafeTranslationDelta([moving, fixed], new Set([moving.id]), diagonal)).toBeNull();
  });

  it('retains the same partial-clearance restriction under arbitrary rotations', () => {
    const q = new Quaternion().setFromEuler(new Euler(0.37, 0.61, -0.29));
    const [moving, fixed] = pair(6.2078).map((part) => rotate(part, q));
    for (const [local, blocked] of [
      [new Vector3(0.1, 0, 0), false],
      [new Vector3(0, 0, 0.1), false],
      [new Vector3(0.1, 0, 0.1), true]
    ] as const) {
      const delta = local.applyQuaternion(q);
      const candidate = {
        ...moving,
        position: { x: moving.position.x + delta.x, y: moving.position.y + delta.y, z: moving.position.z + delta.z }
      };
      expect(partsOverlapInMaterial(candidate, fixed)).toBe(blocked);
      const safe = resolveSafeTranslationDelta([moving, fixed], new Set([moving.id]), delta);
      if (blocked) expect(safe).toBeNull();
      else expect(safe).toEqual(delta);
    }
  });
  it.each([3, 4])('withdraws from Y=%s without allowing camera-plane sideways penetration', (height) => {
    const [moving, fixed] = pair(height);
    const guided = guideCrossedSlotDrag(moving, [moving, fixed], { x: 0.8, y: 1, z: -0.6 })!;
    expect(guided.x).toBeCloseTo(0);
    expect(guided.y).toBeCloseTo(1);
    expect(guided.z).toBeCloseTo(0);
    expect(resolveSafeTranslationDelta([moving, fixed], new Set([moving.id]), guided)).toEqual(guided);
    const sideways = guideCrossedSlotDrag(moving, [moving, fixed], { x: 1, y: 0, z: 0 })!;
    expect(new Vector3(sideways.x, sideways.y, sideways.z).length()).toBeLessThan(1e-8);
  });
  it('preserves the slot axis under arbitrary rigid rotations', () => {
    const q = new Quaternion().setFromEuler(new Euler(0.37, 0.61, -0.29));
    const [moving, fixed] = pair().map((p) => rotate(p, q));
    const delta = new Vector3(0.8, 1, -0.6).applyQuaternion(q);
    const expected = new Vector3(0, 1, 0).applyQuaternion(q);
    const guided = guideCrossedSlotDrag(moving, [moving, fixed], delta)!;
    expect(new Vector3(guided.x, guided.y, guided.z).distanceTo(expected)).toBeLessThan(1e-8);
    expect(resolveSafeTranslationDelta([moving, fixed], new Set([moving.id]), guided)).toEqual(guided);
  });
  it('releases sideways movement after withdrawal clears both boards', () => {
    const [moving, fixed] = pair();
    const delta = { x: 2, y: 7, z: 2 };
    expect(guideCrossedSlotDrag(moving, [moving, fixed], delta)).toEqual(delta);
    expect(
      guideCrossedSlotDrag({ ...moving, position: { x: 0, y: 10, z: 0 } }, [fixed], { x: 2, y: 0, z: 0 })
    ).toBeNull();
  });
  it('does not guide uncut, blind, misaligned, or same-opening slots', () => {
    const [moving, fixed] = pair();
    expect(guideCrossedSlotDrag({ ...moving, features: [] }, [fixed], { x: 1, y: 1, z: 0 })).toBeNull();
    expect(
      guideCrossedSlotDrag({ ...moving, position: { x: 1, y: 3, z: 0 } }, [fixed], { x: 1, y: 1, z: 0 })
    ).toBeNull();
    const blind = globalThis.structuredClone(moving);
    if (blind.features![0].kind === 'rect_cut') blind.features![0].parameters.depthMode = 'blind';
    expect(guideCrossedSlotDrag(blind, [fixed], { x: 1, y: 1, z: 0 })).toBeNull();
    const same = globalThis.structuredClone(fixed);
    same.features![0].target = { type: 'edge', edge: 'top_front_edge' };
    expect(guideCrossedSlotDrag(moving, [same], { x: 1, y: 1, z: 0 })).toBeNull();
  });
  it('keeps a rotated guided preview on release without granting collision immunity', () => {
    const q = new Quaternion().setFromEuler(new Euler(0.37, 0.61, -0.29));
    const [moving, fixed] = pair().map((p) => rotate(p, q));
    const input = new Vector3(0.8, 1, -0.6).applyQuaternion(q);
    const guided = guideCrossedSlotDrag(moving, [moving, fixed], input)!;
    const proposedPosition = {
      x: moving.position.x + guided.x,
      y: moving.position.y + guided.y,
      z: moving.position.z + guided.z
    };
    const release = resolveSinglePartReleaseMove({
      part: moving,
      projectParts: [moving, fixed],
      proposedPosition,
      preventOverlap: true
    });
    expect(release.position).toEqual(proposedPosition);
    expect(release.collisionBlocked).toBe(false);
  });
  it('does not guide a clear part back into a misaligned slot or through its wall', () => {
    const [initial, fixed] = pair();
    const moving = { ...initial, position: { x: 1, y: 10, z: 0 } };
    const delta = { x: 0, y: -7, z: 0 };
    expect(guideCrossedSlotDrag(moving, [moving, fixed], delta)).toBeNull();
    const release = resolveSinglePartReleaseMove({
      part: moving,
      projectParts: [moving, fixed],
      proposedPosition: { x: 1, y: 3, z: 0 },
      preventOverlap: true
    });
    expect(release.position.y).toBeGreaterThan(3);
  });
  it('keeps ordinary collision prevention for a third board in the withdrawal path', () => {
    const [moving, fixed] = pair();
    const obstacle = createTestPart({
      id: 'obstacle',
      length: 14,
      width: 14,
      thickness: 0.75,
      position: { x: 0, y: 6.75, z: 0 }
    });
    const parts = [moving, fixed, obstacle];
    const guided = guideCrossedSlotDrag(moving, parts, { x: 0.8, y: 2, z: -0.6 })!;
    const safe = resolveSafeTranslationDelta(parts, new Set([moving.id]), guided);
    expect(safe?.y ?? 0).toBeLessThan(0.4);
  });
});
