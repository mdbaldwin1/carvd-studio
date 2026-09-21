import { describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { Part, RectCutFeature } from '../types';
import { getJointFitIssues } from './jointFit';

vi.unmock('three');

/** A cabinet side with one dado run across it, sized to whatever goes in. */
function dadoedSide(channelWidth: number): Part {
  const dado: RectCutFeature = {
    id: 'dado-1',
    kind: 'rect_cut',
    version: 1,
    enabled: true,
    cutType: 'dado',
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'min' },
    parameters: { size: { length: channelWidth, width: 8 }, depthMode: 'blind', depth: 0.25 },
    placement: { x: 8, z: 0 }
  };
  return createTestPart({
    id: 'side',
    length: 18,
    width: 8,
    thickness: 0.75,
    position: { x: 0, y: 0.375, z: 0 },
    features: [dado]
  });
}

/** A shelf standing in that dado, seated to its floor. */
function shelfIn(side: Part, thickness: number): Part {
  const dado = side.features![0] as RectCutFeature;
  return createTestPart({
    id: 'shelf',
    length: 8,
    width: 8,
    thickness,
    rotation: { x: 0, y: 0, z: 90 },
    position: {
      // Centred on the dado, standing down in it by its depth.
      x: side.position.x - side.length / 2 + dado.placement.x + dado.parameters.size.length / 2,
      y: side.position.y + side.thickness / 2 - dado.parameters.depth! + 8 / 2,
      z: side.position.z
    }
  });
}

describe('joint fit', () => {
  it('says nothing about a dado cut to the shelf in it', () => {
    const side = dadoedSide(0.71875);
    expect(getJointFitIssues([side, shelfIn(side, 0.71875)])).toEqual([]);
  });

  it('catches the shelf that rattles in a dado cut to the nominal size', () => {
    // The oldest trap in sheet goods: nominal 3/4" ply is nearer 23/32", so a
    // dado cut to a typed 3/4" is loose by a thirty-second every time.
    const side = dadoedSide(0.75);
    const issues = getJointFitIssues([side, shelfIn(side, 0.71875)]);
    expect(issues).toHaveLength(1);
    expect(issues[0].problem).toBe('loose');
    expect(issues[0].amount).toBeCloseTo(1 / 32, 5);
    expect(issues[0].message).toContain('1/32"');
    // The housing is where the fix is made, so that is what it points at.
    expect(issues[0].hostPartId).toBe('side');
    expect(issues[0].hostFeatureId).toBe('dado-1');
    expect(issues[0].matePartId).toBe('shelf');
  });

  it('catches a shelf too thick to go in at all', () => {
    const side = dadoedSide(0.625);
    const issues = getJointFitIssues([side, shelfIn(side, 0.75)]);
    expect(issues).toHaveLength(1);
    expect(issues[0].problem).toBe('tight');
    expect(issues[0].amount).toBeCloseTo(0.125, 5);
    expect(issues[0].message).toContain('will not go together');
  });

  it('measures a channel across its width and not along its run', () => {
    // A shelf is entitled to be longer than the dado housing it -- a through
    // dado runs right out of both edges. Measuring the run as if it were a
    // fit would call every one of them an interference.
    const side = dadoedSide(0.71875);
    const proud = shelfIn(side, 0.71875);
    expect(getJointFitIssues([side, { ...proud, length: 24 }])).toEqual([]);
  });

  it('leaves parts that are merely near a cut alone', () => {
    const side = dadoedSide(0.75);
    const shelf = shelfIn(side, 0.71875);
    // Lifted clear of the dado: not a joint, so not a misfit.
    const lifted: Part = { ...shelf, position: { ...shelf.position, y: shelf.position.y + 6 } };
    expect(getJointFitIssues([side, lifted])).toEqual([]);
  });

  it('does not invent a joint out of a part across the room', () => {
    const side = dadoedSide(0.75);
    const shelf = shelfIn(side, 0.71875);
    const faraway: Part = { ...shelf, position: { ...shelf.position, x: shelf.position.x + 400 } };
    expect(getJointFitIssues([side, faraway])).toEqual([]);
  });

  it('reports a joint once, on its worst dimension', () => {
    const side = dadoedSide(0.625);
    const issues = getJointFitIssues([side, shelfIn(side, 0.75)]);
    expect(issues).toHaveLength(1);
  });

  it('reports in metric when the project is metric', () => {
    const side = dadoedSide(0.625);
    const issues = getJointFitIssues([side, shelfIn(side, 0.75)], 'metric');
    expect(issues[0].message).toContain('mm');
  });
});
