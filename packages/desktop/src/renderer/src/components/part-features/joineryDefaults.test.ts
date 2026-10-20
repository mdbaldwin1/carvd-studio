import { describe, expect, it } from 'vitest';
import { buildDraftFromPreset } from './partFeatureEditorState';

/** The draft a preset produces for a board of the given stock. */
function rectDraft(preset: 'tenon' | 'mortise', partThickness: number, partWidth = 3, partLength = 36) {
  const draft = buildDraftFromPreset(preset, { partThickness, partWidth, partLength });
  if (draft.mode !== 'rect_cut') throw new Error('expected a rect cut');
  return draft;
}

describe('mortise and tenon defaults', () => {
  it('produces a joint that closes when both defaults are accepted', () => {
    // The textbook case and the one in the writing desk: 3/4" rail into a leg.
    const tenon = rectDraft('tenon', 0.75);
    const mortise = rectDraft('mortise', 1.75, 1.75);

    // Tenon width goes into mortise length; tenon thickness into mortise width.
    expect(tenon.sizeWidth).toBeCloseTo(mortise.sizeLength);
    expect(tenon.depth).toBeCloseTo(mortise.sizeWidth);
    // And the mortise is cut deeper than the tenon is long, so the tenon seats
    // on its shoulders instead of bottoming out.
    expect(mortise.depth).toBeGreaterThan(tenon.sizeLength);
    expect(mortise.depth - tenon.sizeLength).toBeCloseTo(1 / 16);
  });

  it('makes a tenon about a third of the stock it is cut on', () => {
    expect(rectDraft('tenon', 0.75).depth).toBeCloseTo(0.25);
    expect(rectDraft('tenon', 1.5).depth).toBeCloseTo(0.5);
    expect(rectDraft('tenon', 1.75).depth).toBeCloseTo(0.5625);
  });

  it('lands tenon thickness on a sixteenth rather than a repeating decimal', () => {
    for (const thickness of [0.75, 1, 1.25, 1.5, 1.75, 2]) {
      const depth = rectDraft('tenon', thickness).depth;
      expect(Math.abs(depth * 16 - Math.round(depth * 16))).toBeLessThan(1e-9);
    }
  });

  it('leaves shoulders on a tenon rather than taking the whole board', () => {
    const tenon = rectDraft('tenon', 0.75, 3);
    expect(tenon.sizeWidth).toBeLessThan(3);
    expect(tenon.sizeWidth).toBeCloseTo(2);
    // Thin stock still gets a tenon rather than nothing.
    expect(rectDraft('tenon', 0.25, 0.5).depth).toBeGreaterThanOrEqual(1 / 8);
  });

  it('keeps a workaday tenon length rather than a runaway one', () => {
    // The old default was 1.5" into a 1/4" deep mortise -- six times too long.
    expect(rectDraft('tenon', 0.75).sizeLength).toBeCloseTo(1);
  });
});
