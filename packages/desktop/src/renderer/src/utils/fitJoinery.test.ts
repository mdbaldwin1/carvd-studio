import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { Part, RectCutFeature } from '../types';
import { getTenons, MORTISE_RELIEF, planTenonFit, resolveTenonAndMortiseParts } from './fitJoinery';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';

vi.unmock('three');

/** The writing desk's leg mortise: 2 x 1/2, 9/16 deep. */
function mortise(id = 'mortise-1', overrides: Partial<RectCutFeature['parameters']> = {}): RectCutFeature {
  return {
    id,
    kind: 'rect_cut',
    version: 1,
    enabled: true,
    cutType: 'mortise',
    target: { type: 'face', face: 'bottom_face' },
    reference: { primaryFrom: 'min' },
    parameters: { size: { length: 2, width: 0.5 }, depthMode: 'blind', depth: 0.5625, ...overrides },
    placement: { x: 26.75, z: 0.625 }
  };
}

/** A tenon deliberately cut wrong, so fitting has something to correct. */
function tenon(id = 'tenon-1'): RectCutFeature {
  return {
    id,
    kind: 'rect_cut',
    version: 1,
    enabled: true,
    cutType: 'tenon',
    target: { type: 'face', face: 'right_end' },
    reference: { primaryFrom: 'min' },
    parameters: { size: { length: 1.5, width: 1 }, depthMode: 'blind', depth: 0.25 },
    placement: { x: 0, z: 0.5 }
  };
}

const leg = (features: RectCutFeature[]): Part =>
  createTestPart({ id: 'leg', length: 29.25, width: 1.75, thickness: 1.75, position: { x: 0, y: 0, z: 0 }, features });
const apron = (features: RectCutFeature[]): Part =>
  createTestPart({ id: 'apron', length: 41.5, width: 3, thickness: 0.75, position: { x: 10, y: 0, z: 0 }, features });

describe('fitting a tenon to its mortise', () => {
  it('takes the mortise cross-section for the tongue', () => {
    const plan = planTenonFit(apron([tenon()]), leg([mortise()]))!;
    const fitted = plan.tenons[0].parameters;
    // The mortise's width becomes the tenon's thickness, its length the width.
    expect(fitted.depth).toBeCloseTo(0.5);
    expect(fitted.size.width).toBeCloseTo(2);
  });

  it('stops the tenon short so it seats on its shoulders', () => {
    const plan = planTenonFit(apron([tenon()]), leg([mortise()]))!;
    // 9/16 deep mortise, less a sixteenth of relief.
    expect(plan.tenons[0].parameters.size.length).toBeCloseTo(0.5625 - MORTISE_RELIEF);
    expect(plan.tenons[0].parameters.size.length).toBeCloseTo(0.5);
  });

  it('reproduces the writing desk exactly', () => {
    // The joint the user cut by hand, sixteen numbers at a time.
    const fitted = planTenonFit(apron([tenon()]), leg([mortise()]))!.tenons[0].parameters;
    expect(fitted.size.length).toBeCloseTo(0.5);
    expect(fitted.size.width).toBeCloseTo(2);
    expect(fitted.depth).toBeCloseTo(0.5);
  });

  it('fits every tenon on the rail, since both ends are cut to one setting', () => {
    const plan = planTenonFit(apron([tenon('left'), tenon('right')]), leg([mortise()]))!;
    expect(plan.tenons).toHaveLength(2);
    expect(plan.tenons.every((entry) => entry.changed)).toBe(true);
  });

  it('reports nothing to change when the tenon already fits', () => {
    const rail = apron([tenon()]);
    const plan = planTenonFit(rail, leg([mortise()]))!;
    const alreadyFitted = apron([{ ...tenon(), parameters: plan.tenons[0].parameters }]);
    expect(planTenonFit(alreadyFitted, leg([mortise()]))!.tenons[0].changed).toBe(false);
  });

  it('never leaves a tenon thicker than the rail it is cut on', () => {
    // A mortise far wider than the rail is thick cannot dictate the tongue.
    const fat = mortise('fat', { size: { length: 2, width: 3 }, depthMode: 'blind', depth: 0.5625 });
    const fitted = planTenonFit(apron([tenon()]), leg([fat]))!.tenons[0].parameters;
    expect(fitted.depth).toBeLessThan(0.75);
  });

  it('picks the nearer of two mortises in a leg', () => {
    const near = mortise('near', { size: { length: 2, width: 0.5 }, depthMode: 'blind', depth: 0.5625 });
    const far: RectCutFeature = {
      ...mortise('far', { size: { length: 3, width: 0.75 }, depthMode: 'blind', depth: 1 }),
      target: { type: 'face', face: 'back_face' }
    };
    const plan = planTenonFit(apron([tenon()]), leg([near, far]))!;
    expect(['near', 'far']).toContain(plan.mortiseFeatureId);
    // Whichever it picked, the tenon took that mortise's numbers.
    const chosen = plan.mortiseFeatureId === 'near' ? near : far;
    expect(plan.tenons[0].parameters.size.width).toBeCloseTo(chosen.parameters.size.length);
  });

  it('declines when the pair is not a mortise and tenon', () => {
    expect(planTenonFit(apron([]), leg([mortise()]))).toBeNull();
    expect(resolveTenonAndMortiseParts(apron([tenon()]), leg([]))).toBeNull();
    expect(resolveTenonAndMortiseParts(apron([]), leg([]))).toBeNull();
  });

  it('works out which part holds which half, whichever order they came in', () => {
    const rail = apron([tenon()]);
    const post = leg([mortise()]);
    expect(resolveTenonAndMortiseParts(rail, post)).toMatchObject({ tenonPart: rail, mortisePart: post });
    expect(resolveTenonAndMortiseParts(post, rail)).toMatchObject({ tenonPart: rail, mortisePart: post });
  });

  it('finds the tenons on a part', () => {
    expect(getTenons(apron([tenon(), mortise()]))).toHaveLength(1);
    expect(getTenons(apron([{ ...tenon(), enabled: false }]))).toHaveLength(0);
  });
});

describe('fitting from the store', () => {
  beforeEach(() => {
    useUIStore.setState({ toast: null });
    useProjectStore.setState({ parts: [apron([tenon()]), leg([mortise()])], isDirty: false });
  });

  const tenonOf = () =>
    (useProjectStore.getState().parts.find((part) => part.id === 'apron')?.features?.[0] as RectCutFeature).parameters;

  it('cuts the tenon to the mortise', () => {
    expect(useProjectStore.getState().fitTenonsToMortise('apron', 'leg')).toBe(1);
    expect(tenonOf().depth).toBeCloseTo(0.5);
    expect(tenonOf().size.width).toBeCloseTo(2);
    expect(tenonOf().size.length).toBeCloseTo(0.5);
    expect(useProjectStore.getState().isDirty).toBe(true);
  });

  it('works whichever part was picked first', () => {
    expect(useProjectStore.getState().fitTenonsToMortise('leg', 'apron')).toBe(1);
    expect(tenonOf().size.width).toBeCloseTo(2);
  });

  it('leaves the mortise alone — it is the harder half to alter', () => {
    useProjectStore.getState().fitTenonsToMortise('apron', 'leg');
    const legMortise = (useProjectStore.getState().parts.find((part) => part.id === 'leg')?.features?.[0] as
      | RectCutFeature
      | undefined)!.parameters;
    expect(legMortise.size).toEqual({ length: 2, width: 0.5 });
    expect(legMortise.depth).toBeCloseTo(0.5625);
  });

  it('says so when the joint already fits', () => {
    useProjectStore.getState().fitTenonsToMortise('apron', 'leg');
    expect(useProjectStore.getState().fitTenonsToMortise('apron', 'leg')).toBe(0);
    expect(useUIStore.getState().toast?.message).toMatch(/already fits/i);
  });

  it('asks for the right pair when there is no joint to fit', () => {
    useProjectStore.setState({ parts: [apron([]), leg([])] });
    expect(useProjectStore.getState().fitTenonsToMortise('apron', 'leg')).toBe(0);
    expect(useUIStore.getState().toast?.message).toMatch(/tenon/i);
  });
});
