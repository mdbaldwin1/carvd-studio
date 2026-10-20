import { describe, expect, it } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { RectCutFeature } from '../types';
import { getResolvedRectCutFeature, validateRectCutFeature } from './rectCutUtils';
import { buildDraftFromPreset } from '../components/part-features/partFeatureEditorState';
import { getFeatureSummary } from './partFeatureSummary';

function halfLap(overrides: Partial<RectCutFeature> = {}): RectCutFeature {
  return {
    id: 'lap-1',
    kind: 'rect_cut',
    version: 1,
    enabled: true,
    cutType: 'half_lap',
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'min' },
    parameters: { size: { length: 3, width: 0 }, depthMode: 'blind', depth: 0.1 },
    placement: { x: 0, z: 0 },
    ...overrides
  };
}

const board = (thickness: number, width = 3) =>
  createTestPart({ id: 'rail', length: 24, width, thickness, features: [] });

describe('half lap is half the stock', () => {
  it('derives its depth from the board on every read', () => {
    // The stored 0.1 is ignored: a half lap is half the stock by definition,
    // so the depth follows the board rather than whatever was typed once.
    expect(getResolvedRectCutFeature(halfLap(), board(0.75)).parameters.depth).toBeCloseTo(0.375);
    expect(getResolvedRectCutFeature(halfLap(), board(1.5)).parameters.depth).toBeCloseTo(0.75);
  });

  it('stays a half when the board is resized', () => {
    const lap = halfLap();
    const before = getResolvedRectCutFeature(lap, board(0.75)).parameters.depth ?? 0;
    const after = getResolvedRectCutFeature(lap, board(1.25)).parameters.depth ?? 0;
    expect(before / 0.75).toBeCloseTo(0.5);
    expect(after / 1.25).toBeCloseTo(0.5);
  });

  it('spans the full width, like the dado it is cut as', () => {
    expect(getResolvedRectCutFeature(halfLap(), board(0.75, 5)).parameters.size.width).toBeCloseTo(5);
    expect(getResolvedRectCutFeature(halfLap(), board(0.75)).placement.z).toBe(0);
  });

  it('two laps on matching stock meet flush', () => {
    const rail = getResolvedRectCutFeature(halfLap(), board(0.75)).parameters.depth ?? 0;
    const stile = getResolvedRectCutFeature(halfLap(), board(0.75)).parameters.depth ?? 0;
    expect(rail + stile).toBeCloseTo(0.75);
  });

  it('is its own cut type rather than a dado wearing a label', () => {
    const draft = buildDraftFromPreset('half_lap', { partThickness: 0.75, partWidth: 3, partLength: 24 });
    if (draft.mode !== 'rect_cut') throw new Error('expected a rect cut');
    expect(draft.cutType).toBe('half_lap');
    expect(draft.depth).toBeCloseTo(0.375);
    expect(draft.depthMode).toBe('blind');
  });

  it('says its depth follows the stock rather than quoting a bare number', () => {
    const summary = getFeatureSummary(getResolvedRectCutFeature(halfLap(), board(0.75)), 'imperial');
    expect(summary).toContain('Half Lap');
    expect(summary).toContain('half the stock');
  });

  it('is rejected when its run leaves the blank', () => {
    const past = halfLap({
      placement: { x: 22, z: 0 },
      parameters: { size: { length: 6, width: 0 }, depthMode: 'blind', depth: 0.1 }
    });
    expect(validateRectCutFeature(past, board(0.75))).toMatch(/past the blank/i);
    expect(validateRectCutFeature(halfLap(), board(0.75))).toBeNull();
  });

  it('cannot be taken through, because a lap through the board is a cut-off end', () => {
    const through = halfLap({ parameters: { size: { length: 3, width: 0 }, depthMode: 'through' } });
    // The resolver pins it blind whatever the stored mode says.
    expect(getResolvedRectCutFeature(through, board(0.75)).parameters.depthMode).toBe('blind');
  });
});
