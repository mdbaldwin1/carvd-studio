import { describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { CircularCutFeature, Part } from '../types';
import { boreThroughAssembly } from './boreThrough';

vi.unmock('three');

const DIAMETER = 0.375;

function hole(overrides: Partial<CircularCutFeature> = {}): CircularCutFeature {
  return {
    id: 'hole-1',
    kind: 'circular_cut',
    version: 1,
    enabled: true,
    label: 'Peg hole',
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'center', secondaryFrom: 'center' },
    cutType: 'round_hole',
    placement: { primary: 0, secondary: 0, rotation: 0 },
    parameters: { diameter: DIAMETER, depthMode: 'through', tilt: 0, direction: 0 },
    ...overrides
  };
}

/** A board bored straight down through its thickness. */
const top = (features: CircularCutFeature[] = [hole()]) =>
  createTestPart({ id: 'top', length: 12, width: 4, thickness: 1, position: { x: 0, y: 2.5, z: 0 }, features });

/** Directly beneath it, faces touching. */
const middle = (overrides: Partial<Part> = {}) =>
  createTestPart({ id: 'middle', length: 12, width: 4, thickness: 1, position: { x: 0, y: 1.5, z: 0 }, ...overrides });

const bottom = (overrides: Partial<Part> = {}) =>
  createTestPart({ id: 'bottom', length: 12, width: 4, thickness: 1, position: { x: 0, y: 0.5, z: 0 }, ...overrides });

describe('boring through an assembly', () => {
  it('drills every part stacked in the bit’s path', () => {
    const bored = boreThroughAssembly(top(), 'top_face', [top(), middle(), bottom()]);
    expect(bored.map((entry) => entry.partId)).toEqual(['middle', 'bottom']);
    // One pass with one bit: the same diameter, all the way through.
    for (const entry of bored) {
      expect(entry.feature.parameters.diameter).toBeCloseTo(DIAMETER);
      expect(entry.feature.parameters.depthMode).toBe('through');
    }
  });

  it('enters each part through the face the bit meets first', () => {
    const bored = boreThroughAssembly(top(), 'top_face', [top(), middle()]);
    expect(bored[0].feature.target).toEqual({ type: 'face', face: 'top_face' });
  });

  it('puts the hole where the bit actually passes, not where it started', () => {
    const offset = top([hole({ placement: { primary: 3, secondary: 1, rotation: 0 } })]);
    const [bored] = boreThroughAssembly(offset, 'top_face', [offset, middle()]);
    expect(bored.feature.placement.primary).toBeCloseTo(3, 6);
    expect(Math.abs(bored.feature.placement.secondary)).toBeCloseTo(1, 6);
  });

  it('stops at the first gap, because a bit travels through wood and not air', () => {
    // The bottom board is in line but half an inch adrift.
    const floating = bottom({ position: { x: 0, y: -0.5, z: 0 } });
    const bored = boreThroughAssembly(top(), 'top_face', [top(), middle(), floating]);
    expect(bored.map((entry) => entry.partId)).toEqual(['middle']);
  });

  it('ignores a part that is nowhere near the hole', () => {
    const aside = middle({ id: 'aside', position: { x: 0, y: 1.5, z: 20 } });
    expect(boreThroughAssembly(top(), 'top_face', [top(), aside])).toEqual([]);
  });

  it('does nothing from a blind hole, which is where the bit stopped', () => {
    const blind = top([
      hole({ parameters: { diameter: DIAMETER, depthMode: 'blind', depth: 0.5, tilt: 0, direction: 0 } })
    ]);
    expect(boreThroughAssembly(blind, 'top_face', [blind, middle()])).toEqual([]);
  });

  it('never bores the part the hole was authored on', () => {
    const bored = boreThroughAssembly(top(), 'top_face', [top(), middle()]);
    expect(bored.every((entry) => entry.partId !== 'top')).toBe(true);
  });

  it('drills once per hole in a repeat', () => {
    const patterned = top([hole({ pattern: { type: 'linear', count: 3, spacing: 2, direction: 0 } })]);
    const bored = boreThroughAssembly(patterned, 'top_face', [patterned, middle()]);
    expect(bored).toHaveLength(3);
    expect(new Set(bored.map((entry) => entry.feature.placement.primary.toFixed(4))).size).toBe(3);
  });

  it('bores sideways through a part standing on edge', () => {
    // A rail bored through its face, with a leg standing against its end.
    const rail = createTestPart({
      id: 'rail',
      length: 12,
      width: 4,
      thickness: 1,
      position: { x: 0, y: 2, z: 0 },
      features: [hole({ target: { type: 'face', face: 'front_face' } })]
    });
    const leg = createTestPart({ id: 'leg', length: 12, width: 4, thickness: 1, position: { x: 0, y: 2, z: -4 } });
    const bored = boreThroughAssembly(rail, 'front_face', [rail, leg]);
    expect(bored.map((entry) => entry.partId)).toEqual(['leg']);
    expect(bored[0].feature.target).toEqual({ type: 'face', face: 'front_face' });
  });
});
