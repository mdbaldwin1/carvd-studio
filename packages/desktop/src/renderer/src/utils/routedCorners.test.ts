import { describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { Part, RectCutFeature } from '../types';
import { getRectCutCornerRadius } from './partFeatureGeometry';
import { validateRectCutFeature } from './rectCutUtils';
import { getFeatureSummary } from './partFeatureSummary';
import { planTenonFit } from './fitJoinery';

vi.unmock('three');

function mortise(cornerRadius?: number): RectCutFeature {
  return {
    id: 'mortise-1',
    kind: 'rect_cut',
    version: 1,
    enabled: true,
    cutType: 'mortise',
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'min' },
    parameters: { size: { length: 2, width: 0.5 }, depthMode: 'blind', depth: 0.5625, cornerRadius },
    placement: { x: 2, z: 0.625 }
  };
}

const leg = (features: RectCutFeature[]): Part =>
  createTestPart({ id: 'leg', length: 29.25, width: 1.75, thickness: 1.75, features });

describe('corners a bit leaves behind', () => {
  it('leaves a chopped pocket square', () => {
    // Absent means square, which is what a chisel gives and what the drawing
    // has always shown.
    expect(getRectCutCornerRadius(mortise(), leg([]))).toBe(0);
    expect(getRectCutCornerRadius(mortise(0), leg([]))).toBe(0);
  });

  it('rounds a routed pocket to the bit', () => {
    expect(getRectCutCornerRadius(mortise(0.25), leg([]))).toBeCloseTo(0.25);
  });

  it('never rounds past a stadium', () => {
    // A 1/2" wide mortise routed with its own width is half-round at the ends;
    // asking for more cannot make the arcs cross.
    expect(getRectCutCornerRadius(mortise(5), leg([]))).toBeCloseTo(0.25);
  });

  it('ignores a radius on a cut with no inside corner', () => {
    // A dado runs out to both edges, so a bit leaves it no corner to round.
    const dado: RectCutFeature = {
      ...mortise(0.25),
      cutType: 'dado',
      parameters: { size: { length: 0.75, width: 0 }, depthMode: 'blind', depth: 0.25, cornerRadius: 0.25 }
    };
    expect(getRectCutCornerRadius(dado, leg([]))).toBe(0);
  });

  it('rejects a radius larger than the pocket can hold', () => {
    const tooRound: RectCutFeature = {
      ...mortise(),
      parameters: { size: { length: 2, width: 0.5 }, depthMode: 'blind', depth: 0.5625, cornerRadius: 1 }
    };
    expect(validateRectCutFeature(tooRound, leg([]))).toMatch(/larger than the pocket/i);
    expect(validateRectCutFeature(mortise(0.25), leg([]))).toBeNull();
  });

  it('says in the cut list how the corners come out', () => {
    expect(getFeatureSummary(mortise(), 'imperial')).toContain('square corners');
    const routed = getFeatureSummary(mortise(0.25), 'imperial');
    expect(routed).toContain('routed');
    expect(routed).toContain('radius corners');
  });
});

describe('a tenon fitted to a routed mortise', () => {
  const apron = (features: RectCutFeature[]): Part =>
    createTestPart({ id: 'apron', length: 41.5, width: 3, thickness: 0.75, features });

  const tenon = (): RectCutFeature => ({
    id: 'tenon-1',
    kind: 'rect_cut',
    version: 1,
    enabled: true,
    cutType: 'tenon',
    target: { type: 'face', face: 'right_end' },
    reference: { primaryFrom: 'min' },
    parameters: { size: { length: 1.5, width: 1 }, depthMode: 'blind', depth: 0.25 },
    placement: { x: 0, z: 0.5 }
  });

  it('carries the rounding requirement onto the tongue', () => {
    const fitted = planTenonFit(apron([tenon()]), leg([mortise(0.25)]))!.tenons[0].parameters;
    // The mortise has round ends, so the tongue has to be rounded to match.
    expect(fitted.cornerRadius).toBeGreaterThan(0);
    expect(fitted.cornerRadius).toBeLessThanOrEqual(fitted.depth! / 2);
  });

  it('leaves a tongue square when the mortise was chopped square', () => {
    const fitted = planTenonFit(apron([tenon()]), leg([mortise()]))!.tenons[0].parameters;
    expect(fitted.cornerRadius).toBeUndefined();
  });

  it('tells the maker to round the corners rather than drawing it and staying quiet', () => {
    const fitted = planTenonFit(apron([tenon()]), leg([mortise(0.25)]))!.tenons[0].parameters;
    const summary = getFeatureSummary({ ...tenon(), parameters: fitted }, 'imperial');
    expect(summary).toMatch(/round the corners/i);
  });

  it('counts a corner change as a change worth making', () => {
    const rail = apron([tenon()]);
    const square = planTenonFit(rail, leg([mortise()]))!.tenons[0];
    const alreadySquare = apron([{ ...tenon(), parameters: square.parameters }]);
    // Same numbers but now a routed mortise: the tongue still needs rounding.
    expect(planTenonFit(alreadySquare, leg([mortise(0.25)]))!.tenons[0].changed).toBe(true);
  });
});
