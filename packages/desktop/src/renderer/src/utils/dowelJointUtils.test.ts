import { describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import {
  createDowelJoint,
  getDowelJointAlignment,
  getDowelVisualizations,
  validateDowelRelationships
} from './dowelJointUtils';

vi.unmock('three');

describe('dowelJointUtils', () => {
  it('rejects separated opposing faces', () => {
    const firstPart = createTestPart({ position: { x: 0, y: 0, z: 0 } });
    const secondPart = createTestPart({ position: { x: 0, y: 10, z: 0 } });
    expect(() =>
      createDowelJoint({
        firstPart,
        firstFace: 'top_face',
        secondPart,
        secondFace: 'bottom_face',
        diameter: 0.375,
        dowelLength: 2,
        firstEmbedmentDepth: 1,
        secondEmbedmentDepth: 1,
        count: 1,
        spacing: 2,
        firstPrimary: 0,
        firstSecondary: 0
      })
    ).toThrow(/touching/i);
  });

  it('reports a dangling relationship before save', () => {
    const part = createTestPart({
      id: 'first',
      features: [
        {
          id: 'hole-1',
          kind: 'circular_cut',
          version: 1,
          enabled: true,
          metadata: {
            dowelJoint: {
              jointId: 'joint-1',
              matePartId: 'missing',
              memberIndex: 0,
              dowelDiameter: 0.375,
              dowelLength: 2,
              embedmentDepth: 1
            }
          },
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'center', secondaryFrom: 'center' },
          cutType: 'round_hole',
          placement: { primary: 0, secondary: 0, rotation: 0 },
          parameters: { diameter: 0.375, depthMode: 'blind', depth: 1, tilt: 0, direction: 0 }
        }
      ]
    });
    expect(validateDowelRelationships([part])).toEqual([expect.stringMatching(/missing its matching hole/i)]);
  });
  it('creates matching part-local holes on opposing mating faces', () => {
    const firstPart = createTestPart({
      id: 'first',
      length: 10,
      width: 4,
      thickness: 1,
      position: { x: 0, y: 0, z: 0 }
    });
    const secondPart = createTestPart({
      id: 'second',
      length: 10,
      width: 4,
      thickness: 1,
      position: { x: 0, y: 1, z: 0 }
    });

    const result = createDowelJoint({
      firstPart,
      firstFace: 'top_face',
      secondPart,
      secondFace: 'bottom_face',
      diameter: 0.375,
      dowelLength: 0.75,
      firstEmbedmentDepth: 0.375,
      secondEmbedmentDepth: 0.375,
      count: 2,
      spacing: 2,
      firstPrimary: -1,
      firstSecondary: 0
    });

    expect(result.firstFeatures).toHaveLength(2);
    expect(result.secondFeatures).toHaveLength(2);
    expect(result.firstFeatures[0]).toMatchObject({
      kind: 'circular_cut',
      target: { face: 'top_face' },
      placement: { primary: -1, secondary: 0 },
      metadata: {
        dowelJoint: {
          matePartId: 'second',
          memberIndex: 0,
          dowelDiameter: 0.375,
          dowelLength: 0.75,
          embedmentDepth: 0.375
        }
      }
    });
    expect(result.secondFeatures[0]).toMatchObject({
      target: { face: 'bottom_face' },
      placement: { primary: -1, secondary: 0 },
      metadata: { dowelJoint: { matePartId: 'first', memberIndex: 0 } }
    });
    expect(result.firstFeatures[0].metadata?.dowelJoint).toMatchObject({ jointId: result.jointId });
  });

  it('rejects faces that are not parallel and opposing', () => {
    const firstPart = createTestPart({ id: 'first' });
    const secondPart = createTestPart({ id: 'second' });
    expect(() =>
      createDowelJoint({
        firstPart,
        firstFace: 'top_face',
        secondPart,
        secondFace: 'top_face',
        diameter: 0.25,
        dowelLength: 0.75,
        firstEmbedmentDepth: 0.25,
        secondEmbedmentDepth: 0.25,
        count: 1,
        spacing: 1,
        firstPrimary: 0,
        firstSecondary: 0
      })
    ).toThrow(/parallel and opposing/);
  });

  it('reports non-destructive misalignment after a mating part moves', () => {
    const firstPart = createTestPart({
      id: 'first',
      length: 10,
      width: 4,
      thickness: 1,
      position: { x: 0, y: 0, z: 0 }
    });
    const secondPart = createTestPart({
      id: 'second',
      length: 10,
      width: 4,
      thickness: 1,
      position: { x: 0.2, y: 1, z: 0 }
    });
    const result = createDowelJoint({
      firstPart,
      firstFace: 'top_face',
      secondPart: { ...secondPart, position: { x: 0, y: 1, z: 0 } },
      secondFace: 'bottom_face',
      diameter: 0.25,
      dowelLength: 0.75,
      firstEmbedmentDepth: 0.25,
      secondEmbedmentDepth: 0.25,
      count: 1,
      spacing: 1,
      firstPrimary: 0,
      firstSecondary: 0
    });

    expect(
      getDowelJointAlignment(firstPart, result.firstFeatures[0], secondPart, result.secondFeatures[0]).aligned
    ).toBe(false);
  });

  it('derives one visualization per physical dowel without creating parts', () => {
    const firstPart = createTestPart({
      id: 'first',
      length: 10,
      width: 4,
      thickness: 1,
      position: { x: 0, y: 0, z: 0 }
    });
    const secondPart = createTestPart({
      id: 'second',
      length: 10,
      width: 4,
      thickness: 1,
      position: { x: 0, y: 1, z: 0 }
    });
    const joint = createDowelJoint({
      firstPart,
      firstFace: 'top_face',
      secondPart,
      secondFace: 'bottom_face',
      diameter: 0.375,
      dowelLength: 0.75,
      firstEmbedmentDepth: 0.375,
      secondEmbedmentDepth: 0.375,
      count: 2,
      spacing: 2,
      firstPrimary: -1,
      firstSecondary: 0
    });
    const parts = [
      { ...firstPart, features: joint.firstFeatures },
      { ...secondPart, features: joint.secondFeatures }
    ];
    expect(getDowelJointAlignment(parts[0], joint.firstFeatures[0], parts[1], joint.secondFeatures[0])).toEqual({
      aligned: true,
      offset: 0,
      axisErrorDegrees: 0
    });

    const visuals = getDowelVisualizations(parts);
    expect(visuals).toHaveLength(2);
    expect(visuals[0]).toMatchObject({
      jointId: joint.jointId,
      memberIndex: 0,
      diameter: 0.375,
      length: 0.75,
      aligned: true
    });
    expect(visuals[0].center).toMatchObject({ x: -1, y: 0.5, z: 0 });
  });
});
