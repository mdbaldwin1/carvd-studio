import type { RectCutFeature } from '../types';

/**
 * What each rectangular cut *is*, in one place.
 *
 * The cuts themselves are already parametric: a feature stores intent, and
 * `getResolvedRectCutFeature` derives the geometry from the part's current
 * size on every read, which is why a half lap stays half the stock when the
 * board is resized. What was not in one place is the handful of facts about
 * each kind of cut that the rest of the app keeps asking -- whether it is
 * joinery, whether something sits in it, which way it runs, which stored
 * dimension holds its width.
 *
 * Those answers used to live in six hand-kept lists in six files. Two of them
 * held the same eight cut types in different orders with nothing keeping them
 * in step, and adding a cut type meant finding every list by memory -- which
 * is exactly how `half_lap` reached the app housed and grain-aware but absent
 * from the preview's list.
 *
 * Because this is an exhaustive `Record`, a new cut type is now a type error
 * until every question below has been answered for it.
 */

export type RectCutType = RectCutFeature['cutType'];

/** Which way a rect cut travels across the board it is cut in. */
export type CutRun = 'across_width' | 'along_length';

/**
 * Where a channel keeps its width.
 *
 * A dado's width lives in `size.length` and is measured across the host's
 * length; a groove's lives in `size.width` and is measured across its width.
 * They are genuinely different axes, not a naming quirk, because the two cuts
 * run at right angles to each other.
 */
export interface RectCutChannel {
  field: 'length' | 'width';
  /** Which of the socket's two tangents the width is measured along. */
  tangent: 1 | 2;
}

export interface RectCutTraits {
  /** What the cut is called in the shop. */
  label: string;
  /**
   * Joinery rather than a plain opening -- a cut made to meet another piece.
   */
  joinery: boolean;
  /**
   * Seats another part in the recess it opens.
   *
   * These have to be settled against the real material rather than the
   * full-thickness plan contour, which cannot express a cut that removes
   * nothing in plan. Deliberately a separate question from `joinery`: they
   * happen to agree today, and keeping them on one row is what makes it
   * visible if they ever stop.
   */
  housing: boolean;
  /** Its channel, if it is one a piece slides along; null if it is not. */
  channel: RectCutChannel | null;
  /**
   * Which way it runs, if it runs at all.
   *
   * The same partition as `channel`, seen from the grain's side rather than
   * the socket's: a dado is cut across the grain and a groove with it.
   */
  run: CutRun | null;
}

const ACROSS: RectCutChannel = { field: 'length', tangent: 1 };
const ALONG: RectCutChannel = { field: 'width', tangent: 2 };

export const RECT_CUT_TRAITS: Record<RectCutType, RectCutTraits> = {
  // Plain openings. Nothing seats in them and nothing is derived from the
  // stock, so they are the cuts that fall straight through the resolver.
  corner_notch: { label: 'Corner notch', joinery: false, housing: false, channel: null, run: null },
  edge_notch: { label: 'Edge notch', joinery: false, housing: false, channel: null, run: null },
  cutout: { label: 'Cutout', joinery: false, housing: false, channel: null, run: null },

  // Channels. A shelf or a tongue slides along these.
  dado: { label: 'Dado', joinery: true, housing: true, channel: ACROSS, run: 'across_width' },
  stopped_dado: { label: 'Stopped dado', joinery: true, housing: true, channel: ACROSS, run: 'across_width' },
  half_lap: { label: 'Half lap', joinery: true, housing: true, channel: ACROSS, run: 'across_width' },
  groove: { label: 'Groove', joinery: true, housing: true, channel: ALONG, run: 'along_length' },
  stopped_groove: { label: 'Stopped groove', joinery: true, housing: true, channel: ALONG, run: 'along_length' },

  // Joinery that seats a piece without running anywhere: a rabbet takes an
  // edge, a mortise takes a tenon, and a tenon is the piece that is taken.
  rabbet: { label: 'Rabbet', joinery: true, housing: true, channel: null, run: null },
  mortise: { label: 'Mortise', joinery: true, housing: true, channel: null, run: null },
  tenon: { label: 'Tenon', joinery: true, housing: true, channel: null, run: null }
};

export const ALL_RECT_CUT_TYPES = Object.keys(RECT_CUT_TRAITS) as RectCutType[];

/** Whether this cut is one a piece is housed in. */
export function isHousingCut(cutType: RectCutType): boolean {
  return RECT_CUT_TRAITS[cutType].housing;
}

/** Whether this cut is joinery rather than a plain opening. */
export function isJoineryCut(cutType: RectCutType): boolean {
  return RECT_CUT_TRAITS[cutType].joinery;
}
