import { describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import { clonePartFeature } from './partFeatures';
import {
  createDowelJoint,
  detachDeletedDowelMates,
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

  it('reports edited or moved paired holes before save', () => {
    const firstPart = createTestPart({ id: 'first', thickness: 1, position: { x: 0, y: 0, z: 0 } });
    const secondPart = createTestPart({ id: 'second', thickness: 1, position: { x: 0, y: 1, z: 0 } });
    const joint = createDowelJoint({
      firstPart,
      firstFace: 'top_face',
      secondPart,
      secondFace: 'bottom_face',
      diameter: 0.375,
      dowelLength: 1,
      firstEmbedmentDepth: 0.5,
      secondEmbedmentDepth: 0.5,
      count: 1,
      spacing: 2,
      firstPrimary: 0,
      firstSecondary: 0
    });
    const paired = [
      { ...firstPart, features: joint.firstFeatures },
      { ...secondPart, features: joint.secondFeatures }
    ];
    expect(validateDowelRelationships(paired)).toEqual([]);

    joint.secondFeatures[0].parameters.diameter = 0.5;
    expect(validateDowelRelationships(paired)).toEqual([expect.stringMatching(/mismatched or misaligned/i)]);
    joint.secondFeatures[0].parameters.diameter = 0.375;
    joint.secondFeatures[0].pattern = { type: 'linear', count: 2, spacing: 1, direction: 0 };
    expect(validateDowelRelationships(paired)).toEqual([expect.stringMatching(/mismatched or misaligned/i)]);
    joint.secondFeatures[0].pattern = undefined;
    joint.secondFeatures[0].cutType = 'countersink';
    joint.secondFeatures[0].parameters.countersink = { majorDiameter: 0.75, includedAngle: 82 };
    expect(validateDowelRelationships(paired)).toEqual([expect.stringMatching(/mismatched or misaligned/i)]);
    joint.secondFeatures[0].cutType = 'round_hole';
    joint.secondFeatures[0].parameters.countersink = undefined;
    paired[1] = { ...paired[1], position: { x: 1, y: 1, z: 0 } };
    expect(validateDowelRelationships(paired)).toEqual([expect.stringMatching(/mismatched or misaligned/i)]);
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

  it('marks a coaxial 1/4 inch and 1/2 inch mismatch invalid in both diagnostics and visualization', () => {
    const firstPart = createTestPart({ id: 'first', thickness: 1, position: { x: 0, y: 0, z: 0 } });
    const secondPart = createTestPart({ id: 'second', thickness: 1, position: { x: 0, y: 1, z: 0 } });
    const joint = createDowelJoint({
      firstPart,
      firstFace: 'top_face',
      secondPart,
      secondFace: 'bottom_face',
      diameter: 0.25,
      dowelLength: 0.75,
      firstEmbedmentDepth: 0.375,
      secondEmbedmentDepth: 0.375,
      count: 1,
      spacing: 1,
      firstPrimary: 0,
      firstSecondary: 0
    });
    joint.secondFeatures[0].parameters.diameter = 0.5;
    const parts = [
      { ...firstPart, features: joint.firstFeatures },
      { ...secondPart, features: joint.secondFeatures }
    ];

    expect(getDowelJointAlignment(parts[0], joint.firstFeatures[0], parts[1], joint.secondFeatures[0]).offset).toBe(0);
    expect(validateDowelRelationships(parts)).toEqual([expect.stringMatching(/mismatched or misaligned/i)]);
    expect(getDowelVisualizations(parts)).toEqual([expect.objectContaining({ aligned: false })]);
  });

  it.each([
    { label: 'one disabled member', firstEnabled: false, secondEnabled: true },
    { label: 'both disabled members', firstEnabled: false, secondEnabled: false }
  ])('keeps $label diagnosable and never renders it aligned', ({ firstEnabled, secondEnabled }) => {
    const firstPart = createTestPart({ id: 'first', thickness: 1, position: { x: 0, y: 0, z: 0 } });
    const secondPart = createTestPart({ id: 'second', thickness: 1, position: { x: 0, y: 1, z: 0 } });
    const joint = createDowelJoint({
      firstPart,
      firstFace: 'top_face',
      secondPart,
      secondFace: 'bottom_face',
      diameter: 0.375,
      dowelLength: 0.75,
      firstEmbedmentDepth: 0.375,
      secondEmbedmentDepth: 0.375,
      count: 1,
      spacing: 1,
      firstPrimary: 0,
      firstSecondary: 0
    });
    joint.firstFeatures[0].enabled = firstEnabled;
    joint.secondFeatures[0].enabled = secondEnabled;
    const parts = [
      { ...firstPart, features: joint.firstFeatures },
      { ...secondPart, features: joint.secondFeatures }
    ];

    expect(validateDowelRelationships(parts)).toEqual([expect.stringMatching(/mismatched or misaligned/i)]);
    expect(getDowelVisualizations(parts)).toEqual([expect.objectContaining({ aligned: false })]);
  });

  it.each([
    {
      label: 'placement after a length resize',
      firstPrimary: 4,
      resize: (part: ReturnType<typeof createTestPart>) => ({ ...part, length: 8 })
    },
    {
      label: 'depth after a thickness resize',
      firstPrimary: 0,
      resize: (part: ReturnType<typeof createTestPart>) => ({
        ...part,
        thickness: 0.25,
        position: { ...part.position, y: part.id === 'first' ? 0.375 : 0.625 }
      })
    }
  ])('revalidates current host $label and renders the retained relationship invalid', ({ firstPrimary, resize }) => {
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
      count: 1,
      spacing: 1,
      firstPrimary,
      firstSecondary: 0
    });
    const resizedParts = [
      { ...resize(firstPart), features: joint.firstFeatures },
      { ...resize(secondPart), features: joint.secondFeatures }
    ];

    expect(
      getDowelJointAlignment(resizedParts[0], joint.firstFeatures[0], resizedParts[1], joint.secondFeatures[0])
    ).toMatchObject({ aligned: true });
    expect(validateDowelRelationships(resizedParts)).toEqual([expect.stringMatching(/mismatched or misaligned/i)]);
    expect(getDowelVisualizations(resizedParts)).toEqual([expect.objectContaining({ aligned: false })]);
  });

  it('keeps authored holes part-local while move diagnostics change and restore', () => {
    const firstPart = createTestPart({ id: 'first', thickness: 1, position: { x: 0, y: 0, z: 0 } });
    const secondPart = createTestPart({ id: 'second', thickness: 1, position: { x: 0, y: 1, z: 0 } });
    const joint = createDowelJoint({
      firstPart,
      firstFace: 'top_face',
      secondPart,
      secondFace: 'bottom_face',
      diameter: 0.375,
      dowelLength: 0.75,
      firstEmbedmentDepth: 0.375,
      secondEmbedmentDepth: 0.375,
      count: 1,
      spacing: 1,
      firstPrimary: 0,
      firstSecondary: 0
    });
    const originalSecondFeature = clonePartFeature(joint.secondFeatures[0]);
    const movedSecond = { ...secondPart, position: { x: 0.25, y: 1, z: 0 }, features: joint.secondFeatures };

    expect(getDowelVisualizations([{ ...firstPart, features: joint.firstFeatures }, movedSecond])[0].aligned).toBe(
      false
    );
    expect(joint.secondFeatures[0]).toEqual(originalSecondFeature);

    const restoredSecond = { ...movedSecond, position: { ...secondPart.position } };
    expect(getDowelVisualizations([{ ...firstPart, features: joint.firstFeatures }, restoredSecond])[0].aligned).toBe(
      true
    );
    expect(joint.secondFeatures[0]).toEqual(originalSecondFeature);
  });

  it('detaches the surviving mate as an ordinary hole when one paired hole is deleted', () => {
    const firstPart = createTestPart({ id: 'first', thickness: 1, position: { x: 0, y: 0, z: 0 } });
    const secondPart = createTestPart({ id: 'second', thickness: 1, position: { x: 0, y: 1, z: 0 } });
    const joint = createDowelJoint({
      firstPart,
      firstFace: 'top_face',
      secondPart,
      secondFace: 'bottom_face',
      diameter: 0.375,
      dowelLength: 0.75,
      firstEmbedmentDepth: 0.375,
      secondEmbedmentDepth: 0.375,
      count: 1,
      spacing: 1,
      firstPrimary: 0,
      firstSecondary: 0
    });
    const parts = [
      { ...firstPart, features: joint.firstFeatures },
      { ...secondPart, features: joint.secondFeatures }
    ];

    const reconciled = detachDeletedDowelMates(parts, firstPart.id, []);
    const survivingHole = reconciled.find((part) => part.id === secondPart.id)?.features?.[0];

    expect(reconciled.find((part) => part.id === firstPart.id)?.features).toEqual([]);
    expect(survivingHole).toMatchObject({
      id: joint.secondFeatures[0].id,
      label: 'Round hole 1',
      kind: 'circular_cut',
      cutType: 'round_hole',
      parameters: { diameter: 0.375, depthMode: 'blind', depth: 0.375 }
    });
    expect(survivingHole?.metadata?.dowelJoint).toBeUndefined();
    expect(validateDowelRelationships(reconciled)).toEqual([]);
    expect(getDowelVisualizations(reconciled)).toEqual([]);
  });
});
