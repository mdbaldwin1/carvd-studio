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

  it.each([0.005, 0.02])('reports real interference of %s inches without treating it as clearance', (extra) => {
    const side = dadoedSide(0.71875);
    expect(getJointFitIssues([side, shelfIn(side, 0.71875 + extra)])).toEqual([
      expect.objectContaining({ problem: 'tight', amount: expect.closeTo(extra, 6) })
    ]);
  });

  it('ignores numeric noise and permits intentionally small clearance without prescribing a fit', () => {
    const side = dadoedSide(0.71875);
    expect(getJointFitIssues([side, shelfIn(side, 0.71875001)])).toEqual([]);
    expect(getJointFitIssues([side, shelfIn(side, 0.69875)])).toEqual([]);
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

describe('a joint that is not the same size all the way down', () => {
  const T = 0.75;
  const W = 3;
  const DEPTH = 0.5;
  const SPLAY = 10;
  const flare = Math.tan((SPLAY * Math.PI) / 180) * DEPTH;

  /**
   * A half-blind dovetail: the front's sockets are undercut, and the side's
   * tails flare to match. Widest meets widest at the socket floor, narrowest
   * at its mouth, and the joint closes.
   */
  const halfBlind = (tailWidth: number): Part[] => {
    const front = createTestPart({
      id: 'front',
      length: 12,
      width: W,
      thickness: T,
      position: { x: 0, y: T / 2, z: 0 },
      features: [0.4, 1.7].map(
        (z, index): RectCutFeature => ({
          id: `socket-${index}`,
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          cutType: 'mortise',
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'min' },
          parameters: {
            size: { length: T, width: 0.9 - 2 * flare },
            depthMode: 'blind',
            depth: DEPTH,
            sideWallAngle: SPLAY
          },
          placement: { x: 0, z: z + flare }
        })
      )
    });
    const side = createTestPart({
      id: 'side',
      length: 12,
      width: W,
      thickness: T,
      rotation: { x: 0, y: 0, z: 90 },
      // Its tip stops at the socket floor, half an inch into a 3/4 board.
      position: { x: -6 + T / 2, y: 6 + T - DEPTH, z: 0 },
      features: [0, 1.3, 2.6].map(
        (z, index): RectCutFeature => ({
          id: `gap-${index}`,
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          cutType: 'cutout',
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'min' },
          parameters: { size: { length: DEPTH, width: 1.3 - tailWidth }, depthMode: 'through', taperAngle: SPLAY },
          placement: { x: 0, z }
        })
      )
    });
    return [front, side];
  };

  it('passes a dovetail whose tail flares to the socket that took it', () => {
    // Measured at its widest against the mouth at its narrowest, this reads
    // as an eighth of an inch too fat -- comparing two places that, in the
    // wood, are at opposite ends of the joint and never touch.
    expect(getJointFitIssues(halfBlind(0.9))).toEqual([]);
  });

  it('still catches a tail that is genuinely too fat for its socket', () => {
    const issues = getJointFitIssues(halfBlind(1.05));
    const tight = issues.filter((issue) => issue.problem === 'tight');
    expect(tight.length).toBeGreaterThan(0);
    // Cut 0.15 over at the shoulder, which is the section that meets the mouth.
    expect(tight[0].amount).toBeCloseTo(0.15, 4);
  });

  it('names the cut, so two sockets on one board do not read as one warning twice', () => {
    const [front, side] = halfBlind(1.05);
    const named: Part = {
      ...front,
      features: (front.features ?? []).map((feature, index) => ({ ...feature, name: `Tail socket ${index + 1}` }))
    };
    const messages = getJointFitIssues([named, side]).map((issue) => issue.message);
    expect(messages.length).toBeGreaterThan(0);
    expect(new Set(messages).size).toBe(messages.length);
    expect(messages[0]).toContain('Tail socket');
  });
});
