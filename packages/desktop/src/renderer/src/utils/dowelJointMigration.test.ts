import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createTestPart, createTestStock } from '../../../../tests/helpers/factories';
import type { CircularCutFeature, Part } from '../types';
import { countLegacyDowelJoints, planDowelJointMigration } from './dowelJointMigration';
import { useProjectStore } from '../store/projectStore';
import { resolveStockForm } from '../../../shared/stock';

vi.unmock('three');

const DIAMETER = 0.375;
const DOWEL_LENGTH = 1.5;

function dowelHole(partId: string, matePartId: string, face: 'top_face' | 'bottom_face'): CircularCutFeature {
  return {
    id: `hole-${partId}`,
    kind: 'circular_cut',
    version: 1,
    enabled: true,
    label: 'Dowel hole 1',
    metadata: {
      dowelJoint: {
        jointId: 'joint-1',
        matePartId,
        memberIndex: 0,
        dowelDiameter: DIAMETER,
        dowelLength: DOWEL_LENGTH,
        embedmentDepth: 0.75
      }
    },
    target: { type: 'face', face },
    reference: { primaryFrom: 'center', secondaryFrom: 'center' },
    cutType: 'round_hole',
    placement: { primary: 0, secondary: 0, rotation: 0 },
    parameters: { diameter: DIAMETER, depthMode: 'blind', depth: 0.75, tilt: 0, direction: 0 }
  };
}

/** Two boards stacked face to face, joined the old way. */
function joinedPair(): Part[] {
  return [
    createTestPart({
      id: 'lower',
      length: 12,
      width: 4,
      thickness: 1,
      position: { x: 0, y: 0.5, z: 0 },
      features: [dowelHole('lower', 'upper', 'top_face')]
    }),
    createTestPart({
      id: 'upper',
      length: 12,
      width: 4,
      thickness: 1,
      position: { x: 0, y: 1.5, z: 0 },
      features: [dowelHole('upper', 'lower', 'bottom_face')]
    })
  ];
}

describe('converting legacy dowel joints', () => {
  it('counts the joints a project still holds', () => {
    expect(countLegacyDowelJoints(joinedPair())).toBe(1);
    expect(countLegacyDowelJoints([createTestPart({ id: 'plain' })])).toBe(0);
  });

  it('mints a real dowel where the picture used to be', () => {
    const plan = planDowelJointMigration(joinedPair(), [], 'imperial');
    expect(plan.jointCount).toBe(1);
    expect(plan.newParts).toHaveLength(1);
    const [dowel] = plan.newParts;
    expect(dowel.length).toBeCloseTo(DOWEL_LENGTH);
    expect(dowel.width).toBeCloseTo(DIAMETER);
    expect(dowel.thickness).toBeCloseTo(DIAMETER);
    // Straddling the joint line, half in each board.
    expect(dowel.position.y).toBeCloseTo(1, 4);
  });

  it('stands the dowel along the axis the holes were bored on', () => {
    const [dowel] = planDowelJointMigration(joinedPair(), [], 'imperial').newParts;
    const axis = new THREE.Vector3(1, 0, 0).applyEuler(
      new THREE.Euler(
        (dowel.rotation.x * Math.PI) / 180,
        (dowel.rotation.y * Math.PI) / 180,
        (dowel.rotation.z * Math.PI) / 180,
        'XYZ'
      )
    );
    // The holes run vertically, so the dowel does too.
    expect(Math.abs(axis.y)).toBeCloseTo(1, 4);
  });

  it('adds rod stock for a diameter the project does not carry', () => {
    const plan = planDowelJointMigration(joinedPair(), [], 'imperial');
    expect(plan.newStocks).toHaveLength(1);
    expect(resolveStockForm(plan.newStocks[0])).toBe('rod');
    expect(plan.newStocks[0].width).toBeCloseTo(DIAMETER);
    expect(plan.newStocks[0].name).toContain('Dowel');
    expect(plan.newParts[0].stockId).toBe(plan.newStocks[0].id);
  });

  it('reuses rod stock the project already has', () => {
    const existing = createTestStock({
      id: 'rod-1',
      name: '3/8" Dowel',
      length: 36,
      width: DIAMETER,
      thickness: DIAMETER,
      form: 'rod'
    });
    const plan = planDowelJointMigration(joinedPair(), [existing], 'imperial');
    expect(plan.newStocks).toHaveLength(0);
    expect(plan.newParts[0].stockId).toBe('rod-1');
  });

  it('leaves the holes where they were bored and takes only the metadata', () => {
    const plan = planDowelJointMigration(joinedPair(), [], 'imperial');
    for (const part of plan.updatedParts) {
      const [hole] = part.features as CircularCutFeature[];
      expect(hole.parameters.diameter).toBeCloseTo(DIAMETER);
      expect(hole.parameters.depth).toBeCloseTo(0.75);
      expect(hole.metadata?.dowelJoint).toBeUndefined();
    }
    expect(countLegacyDowelJoints(plan.updatedParts)).toBe(0);
  });

  it('does nothing to a project with no legacy joints', () => {
    const plain = [createTestPart({ id: 'plain' })];
    const plan = planDowelJointMigration(plain, [], 'imperial');
    expect(plan).toMatchObject({ jointCount: 0, newParts: [], newStocks: [] });
    expect(plan.updatedParts).toEqual(plain);
  });
});

describe('converting from the store', () => {
  beforeEach(() => {
    useProjectStore.setState({ parts: joinedPair(), stocks: [], isDirty: false, units: 'imperial' });
  });

  it('applies the conversion as one ordinary edit', () => {
    expect(useProjectStore.getState().convertLegacyDowelJoints()).toBe(1);
    const state = useProjectStore.getState();
    expect(state.parts).toHaveLength(3);
    expect(state.stocks).toHaveLength(1);
    expect(state.isDirty).toBe(true);
    expect(countLegacyDowelJoints(state.parts)).toBe(0);
  });

  it('reports nothing to do on a project without legacy joints', () => {
    useProjectStore.setState({ parts: [createTestPart({ id: 'plain' })], stocks: [] });
    expect(useProjectStore.getState().convertLegacyDowelJoints()).toBe(0);
    expect(useProjectStore.getState().parts).toHaveLength(1);
  });
});
