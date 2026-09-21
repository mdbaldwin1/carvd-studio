import { describe, expect, it } from 'vitest';
import { ALL_RECT_CUT_TYPES, RECT_CUT_TRAITS, isHousingCut, isJoineryCut } from './rectCutTraits';

describe('rect cut traits', () => {
  it('answers every question for every cut type', () => {
    // The Record is exhaustive, so a new cut type will not compile until it is
    // enrolled. This guards the softer half: an entry that compiles but was
    // filled in with a placeholder.
    expect(ALL_RECT_CUT_TYPES.length).toBe(11);
    for (const cutType of ALL_RECT_CUT_TYPES) {
      const traits = RECT_CUT_TRAITS[cutType];
      expect(traits.label.length, cutType).toBeGreaterThan(0);
      expect(typeof traits.joinery, cutType).toBe('boolean');
      expect(typeof traits.housing, cutType).toBe('boolean');
    }
  });

  it('keeps a channel and the way it runs in step', () => {
    // These are the same physical fact seen twice -- a dado's width measured
    // along the host's length is exactly what makes it run across the width.
    // They are stored separately because they answer to different callers, so
    // the agreement has to be asserted rather than assumed.
    for (const cutType of ALL_RECT_CUT_TYPES) {
      const { channel, run } = RECT_CUT_TRAITS[cutType];
      if (channel === null) {
        expect(run, cutType).toBeNull();
        continue;
      }
      expect(run, cutType).toBe(channel.field === 'length' ? 'across_width' : 'along_length');
      expect(channel.tangent, cutType).toBe(channel.field === 'length' ? 1 : 2);
    }
  });

  it('treats every channel as joinery something is housed in', () => {
    for (const cutType of ALL_RECT_CUT_TYPES) {
      if (RECT_CUT_TRAITS[cutType].channel === null) continue;
      expect(isJoineryCut(cutType), cutType).toBe(true);
      expect(isHousingCut(cutType), cutType).toBe(true);
    }
  });

  it('names the cuts nothing seats in', () => {
    // The plain openings. If one of these ever becomes joinery it should be a
    // deliberate edit here, not a silent drift in one of the callers.
    const plain = ALL_RECT_CUT_TYPES.filter((cutType) => !RECT_CUT_TRAITS[cutType].joinery);
    expect(plain).toEqual(['corner_notch', 'edge_notch', 'cutout']);
    for (const cutType of plain) expect(isHousingCut(cutType), cutType).toBe(false);
  });
});
