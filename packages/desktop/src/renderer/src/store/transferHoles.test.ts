import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { CircularCutFeature } from '../types';
import { useProjectStore } from './projectStore';
import { useUIStore } from './uiStore';

vi.unmock('three');

const hole = (overrides: Partial<CircularCutFeature> = {}): CircularCutFeature => ({
  id: 'hole-1',
  kind: 'circular_cut',
  version: 1,
  enabled: true,
  label: 'Dowel hole',
  target: { type: 'face', face: 'top_face' },
  reference: { primaryFrom: 'center', secondaryFrom: 'center' },
  cutType: 'round_hole',
  placement: { primary: 2, secondary: 0, rotation: 0 },
  parameters: { diameter: 0.375, depthMode: 'blind', depth: 0.5, tilt: 0, direction: 0 },
  ...overrides
});

const rail = (features: CircularCutFeature[]) =>
  createTestPart({ id: 'rail', length: 24, width: 4, thickness: 1, position: { x: 0, y: 0.5, z: 0 }, features });

const stileOn = (y: number) =>
  createTestPart({ id: 'stile', length: 24, width: 4, thickness: 1, position: { x: 0, y, z: 0 }, features: [] });

const holesOn = (partId: string) => useProjectStore.getState().parts.find((part) => part.id === partId)?.features ?? [];

describe('transferring holes from the store', () => {
  beforeEach(() => {
    useUIStore.setState({ toast: null });
  });

  const seed = (features: CircularCutFeature[], stileY = 1.5) => {
    useProjectStore.setState({ parts: [rail(features), stileOn(stileY)], isDirty: false });
  };

  it('marks the holes onto the part pressed against it', () => {
    seed([hole()]);
    const count = useProjectStore.getState().transferHolesToMate('rail', 0.5, 'top_face');
    expect(count).toBe(1);
    expect(holesOn('stile')).toHaveLength(1);
    // The rail keeps its own holes; transferring marks, it does not move them.
    expect(holesOn('rail')).toHaveLength(1);
    expect(useProjectStore.getState().isDirty).toBe(true);
  });

  it('marks from whatever face is bored when none is named', () => {
    // Dropping centres into every hole and pressing the pieces together.
    seed([hole()]);
    expect(useProjectStore.getState().transferHolesToMate('rail', 0.5)).toBe(1);
    expect(holesOn('stile')).toHaveLength(1);
  });

  it('asks for the parts to be put together first', () => {
    // Half an inch of daylight: nothing to mark against.
    seed([hole()], 2);
    expect(useProjectStore.getState().transferHolesToMate('rail', 0.5, 'top_face')).toBe(0);
    expect(holesOn('stile')).toHaveLength(0);
    expect(useUIStore.getState().toast?.message).toMatch(/put the parts together/i);
  });

  it('asks for holes before it will transfer any', () => {
    seed([]);
    expect(useProjectStore.getState().transferHolesToMate('rail', 0.5, 'top_face')).toBe(0);
    expect(useUIStore.getState().toast?.message).toMatch(/bore the holes first/i);
  });

  it('does nothing for a part that is not there', () => {
    seed([hole()]);
    expect(useProjectStore.getState().transferHolesToMate('nothing', 0.5, 'top_face')).toBe(0);
  });

  it('bores the marks to the depth it was given', () => {
    seed([hole()]);
    useProjectStore.getState().transferHolesToMate('rail', 0.75, 'top_face');
    const transferred = holesOn('stile')[0] as CircularCutFeature;
    expect(transferred.parameters.depth).toBeCloseTo(0.75);
    expect(transferred.parameters.diameter).toBeCloseTo(0.375);
  });

  it('marks every hole of a repeat', () => {
    seed([
      hole({
        placement: { primary: 0, secondary: 0, rotation: 0 },
        pattern: { type: 'linear', count: 3, spacing: 4, direction: 0 }
      })
    ]);
    expect(useProjectStore.getState().transferHolesToMate('rail', 0.5, 'top_face')).toBe(3);
    expect(holesOn('stile')).toHaveLength(3);
  });
});

describe('boring through an assembly from the store', () => {
  const throughHole = (): CircularCutFeature => ({
    ...hole(),
    placement: { primary: 0, secondary: 0, rotation: 0 },
    parameters: { diameter: 0.375, depthMode: 'through', tilt: 0, direction: 0 }
  });

  it('drills the parts stacked behind the hole', () => {
    useProjectStore.setState({
      parts: [rail([throughHole()]), stileOn(-0.5)],
      isDirty: false
    });
    expect(useProjectStore.getState().boreThroughAssembly('rail')).toBe(1);
    expect(holesOn('stile')).toHaveLength(1);
    expect(useProjectStore.getState().isDirty).toBe(true);
  });

  it('says so when nothing is behind a through hole', () => {
    useProjectStore.setState({ parts: [rail([throughHole()])], isDirty: false });
    expect(useProjectStore.getState().boreThroughAssembly('rail')).toBe(0);
    expect(useUIStore.getState().toast?.message).toMatch(/nothing is stacked behind/i);
  });

  it('does nothing from a blind hole', () => {
    // The rail's default hole is blind, so the bit never reaches the stile.
    useProjectStore.setState({ parts: [rail([hole()]), stileOn(-0.5)], isDirty: false });
    expect(useProjectStore.getState().boreThroughAssembly('rail')).toBe(0);
    expect(holesOn('stile')).toHaveLength(0);
  });

  it('does nothing for a part that is not there', () => {
    useProjectStore.setState({ parts: [rail([throughHole()])], isDirty: false });
    expect(useProjectStore.getState().boreThroughAssembly('nothing')).toBe(0);
  });
});
