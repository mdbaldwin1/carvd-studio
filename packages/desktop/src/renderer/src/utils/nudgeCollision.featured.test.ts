import { execFileSync } from 'child_process';
import { readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import { Euler, Quaternion, Vector3, MathUtils } from 'three';
import { planAssembly, suggestAssembly } from './assemblyLayout';
import type { Part } from '../types';
import * as materialGeometry from './partFeatureGeometry';
import { partsOverlap, resolveSafeNudgeTranslationDelta, resolveSafeDragTranslationDelta } from './overlapPolicy';
import { useProjectStore } from '../store/projectStore';
import { useSelectionStore } from '../store/selectionStore';
import { useSnapStore } from '../store/snapStore';
vi.unmock('three');
it('profiled board should not tunnel through an intervening wall', () => {
  const moving = createTestPart({
    id: 'profiled',
    length: 12,
    width: 3,
    thickness: 0.75,
    position: { x: 0, y: 2, z: 0 },
    features: [
      {
        id: 'bead',
        kind: 'edge_profile',
        version: 1,
        enabled: true,
        target: { type: 'edge', edge: 'top_front_edge' },
        reference: { primaryFrom: 'min', secondaryFrom: 'min' },
        profile: 'bead',
        parameters: { size: 0.125, depth: 0.125 }
      }
    ]
  });
  const wall = createTestPart({ id: 'wall', length: 0.01, width: 4, thickness: 2, position: { x: 7, y: 2, z: 0 } });
  expect(partsOverlap(moving, wall)).toBe(false);
  expect(partsOverlap({ ...moving, position: { x: 7, y: 2, z: 0 } }, wall)).toBe(true);
  expect(partsOverlap({ ...moving, position: { x: 15, y: 2, z: 0 } }, wall)).toBe(false);
  useProjectStore.setState({
    parts: [moving, wall],
    stocks: [],
    groupMembers: [],
    stockConstraints: { constrainDimensions: false, constrainColor: false, constrainGrain: false, preventOverlap: true }
  });
  useSelectionStore.getState().clearSelection();
  useSelectionStore.getState().selectPart(moving.id);
  useSnapStore.setState({ snapToPartsEnabled: false });
  useProjectStore.getState().moveSelectedParts({ x: 15, y: 0, z: 0 });
  expect(useProjectStore.getState().parts[0].position.x).toBeLessThan(1);
});

function rotate(part: Part, q: Quaternion): Part {
  const rotation = new Euler().setFromQuaternion(
    q
      .clone()
      .multiply(
        new Quaternion().setFromEuler(
          new Euler(
            MathUtils.degToRad(part.rotation.x),
            MathUtils.degToRad(part.rotation.y),
            MathUtils.degToRad(part.rotation.z)
          )
        )
      )
  );
  const position = new Vector3(part.position.x, part.position.y, part.position.z).applyQuaternion(q);
  return {
    ...part,
    position: { x: position.x, y: position.y, z: position.z },
    rotation: {
      x: MathUtils.radToDeg(rotation.x),
      y: MathUtils.radToDeg(rotation.y),
      z: MathUtils.radToDeg(rotation.z)
    }
  };
}
it.each([false, true])('preserves a moving bore around a fixed pin, rotated=%s', (rotated) => {
  const board = createTestPart({
    id: 'bored',
    length: 4,
    width: 3,
    thickness: 0.75,
    position: { x: 0, y: 2, z: 0 },
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
        parameters: { diameter: 0.5, depthMode: 'through', tilt: 0, direction: 0 }
      }
    ]
  });
  const pin = createTestPart({
    id: 'pin',
    blankShape: 'round',
    length: 8,
    width: 0.25,
    thickness: 0.25,
    position: { x: 0, y: 2, z: 0 },
    rotation: { x: 0, y: 0, z: 90 }
  });
  const q = rotated ? new Quaternion().setFromEuler(new Euler(0.3, 0.7, -0.4)) : new Quaternion();
  const parts = [board, pin].map((p) => rotate(p, q));
  const delta = new Vector3(0, 2, 0).applyQuaternion(q);
  expect(partsOverlap(parts[0], parts[1])).toBe(false);
  expect(partsOverlap({ ...parts[0], features: [] }, parts[1])).toBe(true);
  expect(resolveSafeNudgeTranslationDelta(parts, new Set([board.id]), delta)).toMatchObject({
    x: delta.x,
    y: delta.y,
    z: delta.z
  });
});
it.each([false, true])('permits tangential contact but blocks a shallow actual intrusion, rotated=%s', (rotated) => {
  const moving = createTestPart({
    id: 'bead',
    length: 2,
    width: 1,
    thickness: 0.75,
    position: { x: 0, y: 2, z: 0 },
    features: [
      {
        id: 'profile',
        kind: 'edge_profile',
        version: 1,
        enabled: true,
        target: { type: 'edge', edge: 'top_front_edge' },
        reference: { primaryFrom: 'min' },
        profile: 'bead',
        parameters: { size: 0.125, depth: 0.125 }
      }
    ]
  });
  const wall = createTestPart({ id: 'wall', length: 0.01, width: 2, thickness: 2, position: { x: 2, y: 0.625, z: 0 } });
  const q = rotated ? new Quaternion().setFromEuler(new Euler(0.3, 0.7, -0.4)) : new Quaternion();
  const delta = new Vector3(5, 0, 0).applyQuaternion(q);
  let parts = [moving, wall].map((p) => rotate(p, q));
  expect(resolveSafeNudgeTranslationDelta(parts, new Set([moving.id]), delta)).toMatchObject({
    x: delta.x,
    y: delta.y,
    z: delta.z
  });
  wall.position.y += 0.001;
  parts = [moving, wall].map((p) => rotate(p, q));
  const safe = resolveSafeNudgeTranslationDelta(parts, new Set([moving.id]), delta)!;
  expect(Math.hypot(safe.x, safe.y, safe.z)).toBeCloseTo(0.995, 3);
});
it('prepares a featured pair once during first-contact search and prunes distant pairs', () => {
  const moving = createTestPart({
    id: 'bead',
    length: 2,
    width: 1,
    thickness: 0.75,
    position: { x: 0, y: 2, z: 0 },
    features: [
      {
        id: 'profile',
        kind: 'edge_profile',
        version: 1,
        enabled: true,
        target: { type: 'edge', edge: 'top_front_edge' },
        reference: { primaryFrom: 'min' },
        profile: 'bead',
        parameters: { size: 0.125, depth: 0.125 }
      }
    ]
  });
  const wall = createTestPart({ id: 'wall', length: 0.01, width: 2, thickness: 2, position: { x: 1.005, y: 2, z: 0 } });
  const far = Array.from({ length: 100 }, (_, i) =>
    createTestPart({ id: `far-${i}`, position: { x: 1000 + i * 20, y: 0, z: 0 } })
  );
  const originalPrepare = materialGeometry.createPartTranslationMaterialTest;
  const attempts = vi.fn();
  const prepare = vi.spyOn(materialGeometry, 'createPartTranslationMaterialTest').mockImplementation((...args) => {
    const sweep = originalPrepare(...args);
    return {
      ...sweep,
      overlaps: (delta) => {
        attempts();
        return sweep.overlaps(delta);
      }
    };
  });
  try {
    resolveSafeNudgeTranslationDelta([moving, wall, ...far], new Set([moving.id]), { x: 5, y: 0, z: 0 });
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(attempts).toHaveBeenCalledTimes(2);
  } finally {
    prepare.mockRestore();
  }
});

it('withdraws the real beaded-board tongue axially without filling its shoulders', () => {
  const host = createTestPart({
    id: 'host',
    length: 12,
    width: 3,
    thickness: 0.75,
    features: [
      {
        id: 'a50bf779-0cd3-47df-b1d0-cc40f64c7380',
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        target: { type: 'face', face: 'front_face' },
        reference: { primaryFrom: 'min' },
        cutType: 'groove',
        parameters: { size: { length: 12, width: 0.25 }, depthMode: 'blind', depth: 0.375 },
        placement: { x: 0, z: 0.25 }
      },
      {
        id: 'fa874b35-fca4-4881-beea-9f2d3a430be8',
        kind: 'edge_profile',
        version: 1,
        enabled: true,
        target: { type: 'edge', edge: 'top_front_edge' },
        reference: { primaryFrom: 'min', secondaryFrom: 'min' },
        profile: 'bead',
        parameters: { size: 0.125, depth: 0.125 }
      }
    ]
  });
  const board = createTestPart({
    id: 'board',
    length: 12,
    width: 3,
    thickness: 0.75,
    features: [
      {
        id: 'aedc893a-f7ae-4075-85fc-20f962f6bfd7',
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        label: 'Tongue shoulder top',
        target: { type: 'face', face: 'top_face' },
        reference: { primaryFrom: 'min' },
        cutType: 'cutout',
        parameters: { size: { length: 12, width: 0.375 }, depthMode: 'blind', depth: 0.25 },
        placement: { x: 0, z: 0 }
      },
      {
        id: '407273a6-d70b-4fd2-afb4-d11537160c2f',
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        label: 'Tongue shoulder underside',
        target: { type: 'face', face: 'bottom_face' },
        reference: { primaryFrom: 'min' },
        cutType: 'cutout',
        parameters: { size: { length: 12, width: 0.375 }, depthMode: 'blind', depth: 0.25 },
        placement: { x: 0, z: 0 }
      },
      {
        id: 'b3897ee1-0090-44dc-9a1f-2d7bf92adde2',
        kind: 'routed_path',
        version: 1,
        enabled: true,
        label: 'Shoulder chamfer',
        target: { type: 'face', face: 'top_face' },
        reference: { primaryFrom: 'center', secondaryFrom: 'center' },
        path: {
          points: [
            { primary: -6, secondary: -1.125 },
            { primary: 6, secondary: -1.125 }
          ]
        },
        bit: { profile: 'v_bit', diameter: 0.25, includedAngle: 90 },
        parameters: { depthMode: 'blind', depth: 0.125 }
      }
    ]
  });
  const suggestion = suggestAssembly([board, host]);
  const placed = planAssembly(board, host, suggestion.options)!;
  expect(partsOverlap(placed, host)).toBe(false);
  const axis = new Vector3(1, 0, 0).applyEuler(
    new Euler(
      MathUtils.degToRad(placed.rotation.x),
      MathUtils.degToRad(placed.rotation.y),
      MathUtils.degToRad(placed.rotation.z)
    )
  );
  const delta = axis.multiplyScalar(15);
  const start = performance.now();
  expect(resolveSafeNudgeTranslationDelta([placed, host], new Set([board.id]), delta)).toMatchObject({
    x: delta.x,
    y: delta.y,
    z: delta.z
  });
  // Loose enough for shared CI, but prevents accidentally rebuilding a large
  // host BVH separately for every swept triangle and every binary-search step.
  expect(performance.now() - start).toBeLessThan(2000);
});

it('rejects the exploded cutter sampler away-path before preparing its large meshes', () => {
  const path = join(tmpdir(), `carvd-nudge-sampler-${process.pid}.carvd`);
  let file: {
    parts: Part[];
    groups: { id: string; name: string }[];
    groupMembers: { groupId: string; memberId: string }[];
  };
  try {
    execFileSync(process.execPath, ['scripts/make-joinery-test-project.cjs', path], { stdio: 'pipe' });
    file = JSON.parse(readFileSync(path, 'utf8'));
  } finally {
    rmSync(path, { force: true });
  }
  const station = file.groups.find((group) => group.name === '54 Cutter Sampler (Exploded)')!;
  const ids = file.groupMembers.filter((member) => member.groupId === station.id).map((member) => member.memberId);
  const source = file.parts.filter((part) => ids.includes(part.id));
  expect(source).toHaveLength(2);
  const q = new Quaternion().setFromEuler(new Euler(0.31, 0.57, -0.23));
  const parts = source.map((part) => rotate(part, q));
  const moving = parts.find((part) => part.name === 'Sampler — Router Bits')!;
  const fixed = parts.find((part) => part.id !== moving.id)!;
  const delta = new Vector3(
    moving.position.x - fixed.position.x,
    moving.position.y - fixed.position.y,
    moving.position.z - fixed.position.z
  )
    .normalize()
    .multiplyScalar(16);
  const prepare = vi.spyOn(materialGeometry, 'createPartTranslationMaterialTest');
  try {
    const start = performance.now();
    expect(resolveSafeNudgeTranslationDelta(parts, new Set([moving.id]), delta)).toMatchObject({
      x: delta.x,
      y: delta.y,
      z: delta.z
    });
    expect(prepare).not.toHaveBeenCalled();
    expect(performance.now() - start).toBeLessThan(1000);
  } finally {
    prepare.mockRestore();
  }
});

it.each([0, 30, 45, -25])(
  'withdraws a bored tenon at %s degrees without treating mortise tangency as penetration',
  (angle) => {
    const original = [
      createTestPart({
        length: 16,
        width: 1.75,
        thickness: 1.75,
        features: [
          {
            id: 'cut-0-0',
            kind: 'rect_cut',
            version: 1,
            enabled: true,
            label: 'Rail mortise',
            target: { type: 'face', face: 'top_face' },
            reference: { primaryFrom: 'min' },
            cutType: 'mortise',
            parameters: { size: { length: 2, width: 0.25 }, depthMode: 'blind', depth: 1.0625 },
            placement: { x: 12, z: 0.75 }
          },
          {
            id: 'cut-0-1',
            kind: 'circular_cut',
            version: 1,
            enabled: true,
            label: 'Peg hole',
            target: { type: 'face', face: 'front_face' },
            reference: { primaryFrom: 'center', secondaryFrom: 'center' },
            cutType: 'round_hole',
            parameters: { diameter: 0.25, depthMode: 'through', tilt: 0, direction: 0 },
            placement: { primary: 5, secondary: 0.375, rotation: 0 }
          }
        ],
        id: 'pegged-leg',
        position: { x: 0, y: 8, z: 0 },
        rotation: { x: 0, y: 0, z: 90 }
      }),
      createTestPart({
        length: 12,
        width: 3,
        thickness: 0.75,
        features: [
          {
            id: 'cut-1-0',
            kind: 'circular_cut',
            version: 1,
            enabled: true,
            label: 'Tenon peg bore \u2014 drill before cheek cuts',
            target: { type: 'face', face: 'top_face' },
            reference: { primaryFrom: 'center', secondaryFrom: 'center' },
            cutType: 'round_hole',
            parameters: { diameter: 0.25, depthMode: 'through', tilt: 0, direction: 0 },
            placement: { primary: 5.5, secondary: 0, rotation: 0 }
          },
          {
            id: 'cut-1-1',
            kind: 'rect_cut',
            version: 1,
            enabled: true,
            target: { type: 'face', face: 'right_end' },
            reference: { primaryFrom: 'min' },
            cutType: 'tenon',
            parameters: { size: { length: 1, width: 2 }, depthMode: 'blind', depth: 0.25 },
            placement: { x: 0, z: 0.5 }
          }
        ],
        id: 'pegged-rail',
        position: { x: -5.875, y: 13, z: 0 },
        rotation: { x: 90, y: 0, z: 0 }
      }),
      createTestPart({
        length: 2.5,
        width: 0.25,
        thickness: 0.25,
        features: [],
        blankShape: 'round',
        id: 'pegged-peg',
        position: { x: -0.375, y: 13, z: 0 },
        rotation: { x: 0, y: 90, z: 0 }
      })
    ];
    const q = new Quaternion().setFromEuler(new Euler(MathUtils.degToRad(angle), MathUtils.degToRad(15), 0));
    const [leg, rail, peg] = original.map((part) => rotate(part, q));
    const vector = new Vector3(-2, 0, 0).applyQuaternion(q);
    const delta = { x: vector.x, y: vector.y, z: vector.z };
    expect(partsOverlap(rail, leg)).toBe(false);
    const free = resolveSafeNudgeTranslationDelta([leg, rail], new Set([rail.id]), delta);
    expect(free).not.toBeNull();
    expect(free!.x).toBeCloseTo(delta.x, 8);
    expect(free!.y).toBeCloseTo(delta.y, 8);
    expect(free!.z).toBeCloseTo(delta.z, 8);
    const dragFree = resolveSafeDragTranslationDelta([leg, rail], new Set([rail.id]), delta, undefined, leg.id);
    expect(dragFree!.x).toBeCloseTo(delta.x, 8);
    const dragLocked = resolveSafeDragTranslationDelta([leg, rail, peg], new Set([rail.id]), delta, undefined, leg.id);
    expect(Math.hypot(dragLocked?.x ?? 0, dragLocked?.y ?? 0, dragLocked?.z ?? 0)).toBeLessThan(0.01);
    const locked = resolveSafeNudgeTranslationDelta([leg, rail, peg], new Set([rail.id]), delta);
    expect(Math.hypot(locked?.x ?? 0, locked?.y ?? 0, locked?.z ?? 0)).toBeLessThan(0.01);
    const withdrawn = {
      ...rail,
      position: { x: rail.position.x + delta.x, y: rail.position.y + delta.y, z: rail.position.z + delta.z }
    };
    const reverse = { x: -delta.x, y: -delta.y, z: -delta.z };
    const reseat = resolveSafeNudgeTranslationDelta([leg, withdrawn], new Set([rail.id]), reverse);
    expect(reseat).not.toBeNull();
    expect(reseat!.x).toBeCloseTo(reverse.x, 8);
    expect(reseat!.y).toBeCloseTo(reverse.y, 8);
    expect(reseat!.z).toBeCloseTo(reverse.z, 8);
  }
);

it.each([0, 30, 45, -25])(
  'keeps a seated rectangular key from tunneling through a dragged board at %s degrees',
  (angle) => {
    const path = join(tmpdir(), `carvd-key-drag-${process.pid}-${angle}.carvd`);
    let parts: Part[];
    try {
      execFileSync(process.execPath, ['scripts/make-joinery-test-project.cjs', path], { stdio: 'pipe' });
      const file = JSON.parse(readFileSync(path, 'utf8')) as { parts: Part[] };
      parts = file.parts.filter((part) => part.name.startsWith('Keyed —'));
    } finally {
      rmSync(path, { force: true });
    }
    expect(parts).toHaveLength(3);
    const origin = parts.find((part) => part.name.endsWith('Board A'))!.position;
    const q = new Quaternion().setFromEuler(new Euler(MathUtils.degToRad(angle), 0.27, -0.19));
    parts = parts.map((part) =>
      rotate(
        {
          ...part,
          position: {
            x: part.position.x - origin.x,
            y: part.position.y - origin.y,
            z: part.position.z - origin.z
          }
        },
        q
      )
    );
    const board = parts.find((part) => part.name.endsWith('Board B'))!;
    const host = parts.find((part) => part.name.endsWith('Board A'))!;
    const key = parts.find((part) => part.name.includes('Key 1'))!;
    const delta = new Vector3(2.9985, 0, -1.9211).applyQuaternion(q);
    expect(partsOverlap(board, key)).toBe(false);
    const blocked = resolveSafeDragTranslationDelta(parts, new Set([board.id]), delta, undefined, host.id);
    expect(Math.hypot(blocked?.x ?? 0, blocked?.y ?? 0, blocked?.z ?? 0)).toBeLessThan(0.01);
    const free = resolveSafeDragTranslationDelta(
      parts.filter((part) => part.id !== key.id),
      new Set([board.id]),
      delta,
      undefined,
      host.id
    );
    expect(free).not.toBeNull();
    expect(free!.x).toBeCloseTo(delta.x, 8);
    expect(free!.y).toBeCloseTo(delta.y, 8);
    expect(free!.z).toBeCloseTo(delta.z, 8);
    const lift = new Vector3(0, 2, 0).applyQuaternion(q);
    const withdrawal = resolveSafeDragTranslationDelta(parts, new Set([key.id]), lift);
    expect(withdrawal!.x).toBeCloseTo(lift.x, 8);
    expect(withdrawal!.y).toBeCloseTo(lift.y, 8);
    expect(withdrawal!.z).toBeCloseTo(lift.z, 8);
  }
);
