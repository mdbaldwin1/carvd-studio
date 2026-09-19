import { describe, expect, it } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { Part, RectCutFeature } from '../types';
import { getPartFeatureConflicts } from './partFeatureConflicts';

/** A mortise in a leg, entering from the named face. */
function mortise(
  id: string,
  face: 'bottom_face' | 'back_face',
  depth: number,
  placement: { x: number; z: number },
  size = { length: 2, width: 0.5 }
): RectCutFeature {
  return {
    id,
    kind: 'rect_cut',
    version: 1,
    enabled: true,
    label: `${id} mortise`,
    cutType: 'mortise',
    target: { type: 'face', face },
    reference: { primaryFrom: 'min' },
    parameters: { size, depthMode: 'blind', depth },
    placement
  };
}

/** The writing desk's front left leg: 1-3/4" square, two aprons meeting in it. */
const leg = (features: RectCutFeature[]): Part =>
  createTestPart({ id: 'leg', length: 29.25, width: 1.75, thickness: 1.75, features });

const perpendicular = (part: Part) =>
  getPartFeatureConflicts(part.features ?? [], part).filter(
    (issue) => issue.code === 'rect_perpendicular_intersection'
  );

describe('mortises meeting inside a leg', () => {
  it('leaves the writing desk alone, which clears by a sixteenth', () => {
    const desk = leg([
      mortise('front-apron', 'bottom_face', 0.5625, { x: 26.75, z: 0.625 }),
      mortise('side-apron', 'back_face', 0.5625, { x: 26.75, z: 0.625 })
    ]);
    expect(perpendicular(desk)).toEqual([]);
  });

  it('reports two mortises that do meet in the corner', () => {
    // Deep enough, and positioned so all three axes overlap.
    const crowded = leg([
      mortise('front-apron', 'bottom_face', 1.25, { x: 26.75, z: 0.75 }),
      mortise('side-apron', 'back_face', 1.25, { x: 26.75, z: 0.25 })
    ]);
    const issues = perpendicular(crowded);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].message).toMatch(/right angles/);
  });

  it('reports it rather than refusing it, because mitred tenons do meet', () => {
    const crowded = leg([
      mortise('front-apron', 'bottom_face', 1.25, { x: 26.75, z: 0.75 }),
      mortise('side-apron', 'back_face', 1.25, { x: 26.75, z: 0.25 })
    ]);
    expect(perpendicular(crowded).every((issue) => issue.severity === 'warning')).toBe(true);
    expect(perpendicular(crowded)[0].message).toMatch(/mitre the tenon ends/i);
  });

  it('ignores a pair that never shares a height', () => {
    // Both deep, but one is at the top of the leg and the other far below.
    const apart = leg([
      mortise('high', 'bottom_face', 1.25, { x: 26.75, z: 0.75 }),
      mortise('low', 'back_face', 1.25, { x: 4, z: 0.25 })
    ]);
    expect(perpendicular(apart)).toEqual([]);
  });

  it('ignores two mortises entering from the same face', () => {
    const sameFace = leg([
      mortise('a', 'bottom_face', 1.25, { x: 4, z: 0.25 }),
      mortise('b', 'bottom_face', 1.25, { x: 20, z: 0.25 })
    ]);
    expect(perpendicular(sameFace)).toEqual([]);
  });

  it('names both operations, so either one can be the thing you shorten', () => {
    const crowded = leg([
      mortise('front-apron', 'bottom_face', 1.25, { x: 26.75, z: 0.75 }),
      mortise('side-apron', 'back_face', 1.25, { x: 26.75, z: 0.25 })
    ]);
    expect(new Set(perpendicular(crowded).map((issue) => issue.featureId))).toEqual(
      new Set(['front-apron', 'side-apron'])
    );
  });
});
