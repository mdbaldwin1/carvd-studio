import { describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { CircularCutFeature, Part } from '../types';
import { findHolesOffTheFace, findMatingFace, getHolesOnFace, transferHolesToMatingFace } from './holeTransfer';

vi.unmock('three');

const DIAMETER = 0.375;

function hole(overrides: Partial<CircularCutFeature> = {}): CircularCutFeature {
  return {
    id: 'hole-1',
    kind: 'circular_cut',
    version: 1,
    enabled: true,
    label: 'Dowel hole',
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'center', secondaryFrom: 'center' },
    cutType: 'round_hole',
    placement: { primary: 2, secondary: 0.5, rotation: 0 },
    parameters: { diameter: DIAMETER, depthMode: 'blind', depth: 0.5, tilt: 0, direction: 0 },
    ...overrides
  };
}

/** A rail lying flat, holes bored down into its top face. */
function rail(features: CircularCutFeature[] = [hole()]): Part {
  return createTestPart({
    id: 'rail',
    length: 24,
    width: 4,
    thickness: 1,
    position: { x: 0, y: 0.5, z: 0 },
    features
  });
}

/** A stile sitting directly on top of the rail, so the faces are touching. */
function stile(overrides: Partial<Part> = {}): Part {
  return createTestPart({
    id: 'stile',
    length: 24,
    width: 4,
    thickness: 1,
    position: { x: 0, y: 1.5, z: 0 },
    features: [],
    ...overrides
  });
}

describe('transferring holes across a joint line', () => {
  it('finds the face pressed against the one that was bored', () => {
    const found = findMatingFace(rail(), 'top_face', [stile()]);
    expect(found).toMatchObject({ face: 'bottom_face' });
    expect(found?.part.id).toBe('stile');
  });

  it('finds nothing when the parts are apart, or only alongside each other', () => {
    // Half an inch of daylight is not a joint.
    expect(findMatingFace(rail(), 'top_face', [stile({ position: { x: 0, y: 2, z: 0 } })])).toBeNull();
    // Touching, but the wrong face: these two are edge to edge, not stacked.
    expect(findMatingFace(rail(), 'top_face', [stile({ position: { x: 0, y: 0.5, z: 4 } })])).toBeNull();
    expect(findMatingFace(rail(), 'top_face', [])).toBeNull();
  });

  it('marks a hole onto the mating face at the same point in the world', () => {
    const transferred = transferHolesToMatingFace(rail(), 'top_face', stile(), 'bottom_face', 0.5);
    expect(transferred).toHaveLength(1);
    // The stile is the same size and squarely on top, so the mark lands at the
    // same offset along the length and mirrored across the width.
    expect(transferred[0].placement.primary).toBeCloseTo(2, 6);
    expect(Math.abs(transferred[0].placement.secondary)).toBeCloseTo(0.5, 6);
    expect(transferred[0].feature.target).toEqual({ type: 'face', face: 'bottom_face' });
  });

  it('bores the mating hole with the same bit', () => {
    const [transferred] = transferHolesToMatingFace(rail(), 'top_face', stile(), 'bottom_face', 0.75);
    expect(transferred.feature.parameters.diameter).toBeCloseTo(DIAMETER);
    // Depth is the operator's: the two halves of a joint are rarely equal.
    expect(transferred.feature.parameters.depth).toBeCloseTo(0.75);
    expect(transferred.feature.parameters.depthMode).toBe('blind');
  });

  it('follows the part when it is moved rather than copying the old offset', () => {
    const shifted = stile({ position: { x: 3, y: 1.5, z: 0 } });
    const [transferred] = transferHolesToMatingFace(rail(), 'top_face', shifted, 'bottom_face', 0.5);
    // The hole is where it always was in the world; on a stile shifted 3" along
    // its own length, that is 3" nearer the other end.
    expect(transferred.placement.primary).toBeCloseTo(-1, 6);
  });

  it('marks every hole in a repeat, not just the one that was authored', () => {
    const patterned = rail([
      hole({
        placement: { primary: 0, secondary: 0, rotation: 0 },
        pattern: { type: 'linear', count: 3, spacing: 4, direction: 0 }
      })
    ]);
    const transferred = transferHolesToMatingFace(patterned, 'top_face', stile(), 'bottom_face', 0.5);
    // A patterned hole is a row of real holes, and the jig steps across all of
    // them. They come back as plain holes because the mating face is measured
    // from its own edges, so the authored repeat need not describe the same row.
    expect(transferred).toHaveLength(3);
    const spacings = transferred
      .slice(1)
      .map((entry, index) => entry.placement.primary - transferred[index].placement.primary);
    expect(spacings.every((gap) => Math.abs(Math.abs(gap) - 4) < 1e-6)).toBe(true);
    expect(transferred.every((entry) => entry.feature.pattern === undefined)).toBe(true);
  });

  it('only takes the holes on the face that was bored', () => {
    const twoFaces = rail([hole(), hole({ id: 'hole-2', target: { type: 'face', face: 'bottom_face' } })]);
    expect(getHolesOnFace(twoFaces, 'top_face')).toHaveLength(1);
    expect(transferHolesToMatingFace(twoFaces, 'top_face', stile(), 'bottom_face', 0.5)).toHaveLength(1);
  });

  it('skips a hole on a disabled cut', () => {
    expect(getHolesOnFace(rail([hole({ enabled: false })]), 'top_face')).toHaveLength(0);
  });

  it('reports a mark that landed off the edge of the mating face', () => {
    // A narrow stile the rail's hole misses entirely.
    const narrow = stile({ width: 0.5 });
    const transferred = transferHolesToMatingFace(rail(), 'top_face', narrow, 'bottom_face', 0.5);
    expect(findHolesOffTheFace(narrow, 'bottom_face', transferred)).toHaveLength(1);
    // The same marks land cleanly on a stile wide enough to take them.
    const wide = stile();
    expect(
      findHolesOffTheFace(wide, 'bottom_face', transferHolesToMatingFace(rail(), 'top_face', wide, 'bottom_face', 0.5))
    ).toHaveLength(0);
  });
});
