import { describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { CircularCutFeature, Part } from '../types';
import { detectFeatureMateSnaps, getPartFeatureSockets } from './snapToPartsUtil';
import { wouldTransformedPartsOverlap } from './overlapPolicy';

vi.unmock('three');

const DIAMETER = 0.375;

/** A rail with one 3/8" hole bored an inch into its top face. */
function boredRail(overrides: Partial<Part> = {}): Part {
  const hole: CircularCutFeature = {
    id: 'hole-1',
    kind: 'circular_cut',
    version: 1,
    enabled: true,
    cutType: 'round_hole',
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'center', secondaryFrom: 'center' },
    placement: { primary: 0, secondary: 0, rotation: 0 },
    parameters: { diameter: DIAMETER, depthMode: 'blind', depth: 1, tilt: 0, direction: 0 }
  };
  return createTestPart({
    id: 'rail',
    length: 24,
    width: 3,
    thickness: 1,
    position: { x: 0, y: 0.5, z: 0 },
    features: [hole],
    ...overrides
  });
}

/**
 * A dowel standing on end, the way it has to be held to enter an upward hole.
 * Rotating 90 degrees about Z puts its length along world Y.
 */
function dowel(position: { x: number; y: number; z: number }, overrides: Partial<Part> = {}): Part {
  return createTestPart({
    id: 'dowel',
    length: 2,
    width: DIAMETER,
    thickness: DIAMETER,
    position,
    rotation: { x: 0, y: 0, z: 90 },
    features: [],
    ...overrides
  });
}

describe('dowels mate through the shared socket engine', () => {
  it('presents a bored hole as a socket', () => {
    const sockets = getPartFeatureSockets(boredRail());
    expect(sockets).toHaveLength(1);
    const [socket] = sockets;
    expect(socket.mateKind).toBe('round_hole');
    expect(socket.halfExtent1).toBeCloseTo(DIAMETER / 2);
    expect(socket.halfExtent2).toBeCloseTo(DIAMETER / 2);
    expect(socket.depth).toBeCloseTo(1);
    // The opening points out of the hole, against the way the bit travelled.
    expect(socket.openingNormal.y).toBeCloseTo(1);
    // A round opening is rotationally symmetric, but its basis must still span
    // the plane it lies in rather than collapsing onto the axis.
    expect(socket.tangent1.y).toBeCloseTo(0);
    expect(socket.tangent2.y).toBeCloseTo(0);
  });

  it('reads a through hole as running the whole way across the part', () => {
    const rail = boredRail();
    const hole = rail.features![0] as CircularCutFeature;
    hole.parameters = { ...hole.parameters, depthMode: 'through', depth: undefined };
    expect(getPartFeatureSockets(rail)[0].depth).toBeCloseTo(rail.thickness);
  });

  it('opens one socket per hole in a repeat', () => {
    const rail = boredRail();
    const hole = rail.features![0] as CircularCutFeature;
    hole.pattern = { type: 'linear', count: 3, spacing: 2, direction: 0 };
    const sockets = getPartFeatureSockets(rail);
    expect(sockets).toHaveLength(3);
    // Each one sits where its own hole was bored.
    expect(new Set(sockets.map((socket) => socket.openingCenter.x.toFixed(4))).size).toBe(3);
  });

  it('pulls a dowel held near the hole down into it', () => {
    const rail = boredRail();
    // Held just above the hole and slightly off to one side.
    const held = { x: 0.06, y: 1.9, z: 0.04 };
    const snap = detectFeatureMateSnaps(dowel(held), held, [rail, dowel(held)], ['dowel'], 0.75);

    expect(snap.mateHostPartId).toBe('rail');
    expect([snap.snappedX, snap.snappedY, snap.snappedZ]).toEqual([true, true, true]);
    // Centred on the hole and bottomed out: a 2" dowel an inch into a 1" hole
    // leaves its midpoint level with the rail's top face.
    expect(snap.adjustedPosition.x).toBeCloseTo(0, 4);
    expect(snap.adjustedPosition.z).toBeCloseTo(0, 4);
    expect(snap.adjustedPosition.y).toBeCloseTo(1, 4);
    expect(snap.snapLines[0]).toMatchObject({ family: 'joinery', subtype: 'round_hole' });
  });

  it('refuses a board too flat to seat in a bored hole', () => {
    const rail = boredRail();
    const held = { x: 0.06, y: 1.9, z: 0.04 };
    // Thin enough to pass a plain fit test, but nothing like round.
    const shim = dowel(held, { id: 'shim', width: 0.05 });
    const snap = detectFeatureMateSnaps(shim, held, [rail, shim], ['shim'], 0.75);
    expect(snap.mateHostPartId).toBeUndefined();
  });

  it('keeps a seated dowel on commit, not just during the drag', () => {
    // The material grid is made of boxes and never subtracted the bore, so
    // without the round-hole exemption a dowel snapped home was rejected the
    // instant it was released -- the same pop-out the tenon work fixed.
    const rail = boredRail();
    const seated = dowel({ x: 0, y: 1, z: 0 });
    const parked: Part = { ...seated, position: { x: 500, y: 1, z: 0 } };
    expect(wouldTransformedPartsOverlap([rail, parked], new Map([[seated.id, seated]]))).toBe(false);
  });

  it('still refuses a dowel driven somewhere there is no hole', () => {
    const rail = boredRail();
    // Square in the middle of solid material, nowhere near the bore.
    const buried = dowel({ x: 6, y: 0.5, z: 0 });
    const parked: Part = { ...buried, position: { x: 500, y: 0.5, z: 0 } };
    expect(wouldTransformedPartsOverlap([rail, parked], new Map([[buried.id, buried]]))).toBe(true);
  });

  it('seats a dowel in a hole no matter which way the hole faces', () => {
    // Two rails butted end to end, each bored half an inch into the meeting
    // end, and one pin bridging the pair. The holes face opposite ways, which
    // is the whole point of a dowelled edge joint -- both have to take the pin.
    const endBore = (face: 'left_end' | 'right_end'): CircularCutFeature => ({
      id: `bore-${face}`,
      kind: 'circular_cut',
      version: 1,
      enabled: true,
      cutType: 'round_hole',
      target: { type: 'face', face },
      reference: { primaryFrom: 'center', secondaryFrom: 'center' },
      placement: { primary: 0, secondary: 0, rotation: 0 },
      parameters: { diameter: DIAMETER, depthMode: 'blind', depth: 0.5, tilt: 0, direction: 0 }
    });
    const left = createTestPart({
      id: 'left',
      length: 12,
      width: 3,
      thickness: 1,
      position: { x: -6, y: 0.5, z: 0 },
      features: [endBore('right_end')]
    });
    const right = createTestPart({
      id: 'right',
      length: 12,
      width: 3,
      thickness: 1,
      position: { x: 6, y: 0.5, z: 0 },
      features: [endBore('left_end')]
    });
    // A 1" pin lying along X, centred on the seam, half in each rail.
    const pin = createTestPart({
      id: 'pin',
      length: 1,
      width: DIAMETER,
      thickness: DIAMETER,
      position: { x: 0, y: 0.5, z: 0 },
      features: []
    });

    for (const host of [left, right]) {
      const snap = detectFeatureMateSnaps(pin, pin.position, [host], [pin.id], 0.03);
      expect(snap.mateHostPartId).toBe(host.id);
    }

    const parked: Part = { ...pin, position: { x: 500, y: 0.5, z: 0 } };
    expect(wouldTransformedPartsOverlap([left, right, parked], new Map([[pin.id, pin]]))).toBe(false);
  });

  it('ignores a hole on a disabled cut', () => {
    const rail = boredRail();
    rail.features![0].enabled = false;
    expect(getPartFeatureSockets(rail)).toHaveLength(0);
  });
});
