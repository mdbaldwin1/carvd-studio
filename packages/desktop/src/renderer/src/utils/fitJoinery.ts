import type { Part, RectCutFeature } from '../types';
import { getResolvedRectCutFeature } from './rectCutUtils';
import { getPartFeatureSockets } from './snapToPartsUtil';

/**
 * Cut the tenon to the mortise.
 *
 * At the bench you never measure a joint twice. You cut the mortise with the
 * chisel or the bit you own, and then you cut the tenon to what you made --
 * because two independent sets of numbers are two chances to be wrong, and the
 * joint only cares that they agree.
 *
 * The direction is deliberate. A mortise is the harder half to alter once it
 * is cut, so the tenon is what gets fitted, never the other way round.
 */

/**
 * A mortise is cut a shade deeper than its tenon is long, so the tenon seats
 * on its shoulders rather than bottoming out, and glue has somewhere to go.
 */
export const MORTISE_RELIEF = 1 / 16;

/** The tenon's tongue must leave some shoulder behind it. */
const MIN_SHOULDER = 1 / 32;

export interface FittedTenon {
  featureId: string;
  parameters: RectCutFeature['parameters'];
  /** What changed, for telling the user what was done. */
  changed: boolean;
}

export interface TenonFitPlan {
  tenonPartId: string;
  mortisePartId: string;
  mortiseFeatureId: string;
  tenons: FittedTenon[];
}

function enabledRectCuts(part: Part, cutType: RectCutFeature['cutType']): RectCutFeature[] {
  return (part.features ?? []).filter(
    (feature): feature is RectCutFeature =>
      feature.enabled && feature.kind === 'rect_cut' && feature.cutType === cutType
  );
}

export function getTenons(part: Part): RectCutFeature[] {
  return enabledRectCuts(part, 'tenon');
}

export function getMortises(part: Part): RectCutFeature[] {
  return enabledRectCuts(part, 'mortise');
}

/**
 * The mortise a given rail is heading for.
 *
 * A leg usually carries more than one -- the front apron's and the side
 * apron's -- so the nearest opening is the one this rail is being fitted to.
 */
function chooseMortise(tenonPart: Part, mortisePart: Part): RectCutFeature | undefined {
  const mortises = getMortises(mortisePart);
  if (mortises.length <= 1) return mortises[0];

  const sockets = getPartFeatureSockets(mortisePart);
  let best: RectCutFeature | undefined;
  let bestDistance = Infinity;

  for (const mortise of mortises) {
    const socket = sockets.find((candidate) => candidate.featureId === mortise.id);
    if (!socket) continue;
    const dx = socket.openingCenter.x - tenonPart.position.x;
    const dy = socket.openingCenter.y - tenonPart.position.y;
    const dz = socket.openingCenter.z - tenonPart.position.z;
    const distance = dx * dx + dy * dy + dz * dz;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = mortise;
    }
  }

  return best ?? mortises[0];
}

/** The tenon parameters that seat in this mortise, in this rail. */
export function fitTenonParameters(
  tenon: RectCutFeature,
  mortise: RectCutFeature,
  mortisePart: Part,
  tenonPart: Part
): RectCutFeature['parameters'] {
  const resolved = getResolvedRectCutFeature(mortise, mortisePart);
  const mortiseDepth = resolved.parameters.depth ?? 0;

  // The tongue takes the mortise's own cross-section: its width becomes the
  // tenon's thickness, its length the tenon's width.
  const thickness = Math.min(resolved.parameters.size.width, tenonPart.thickness - MIN_SHOULDER * 2);
  const width = Math.min(resolved.parameters.size.length, tenonPart.width);

  // Stop short of the bottom so the joint closes on the shoulders. A mortise
  // too shallow to hold the relief just gets a tenon as long as it is deep.
  const length = mortiseDepth > MORTISE_RELIEF ? mortiseDepth - MORTISE_RELIEF : mortiseDepth;

  return {
    ...tenon.parameters,
    size: { length: Math.max(0, length), width: Math.max(0, width) },
    depthMode: 'blind',
    depth: Math.max(0, thickness)
  };
}

function sameParameters(a: RectCutFeature['parameters'], b: RectCutFeature['parameters']): boolean {
  const near = (x: number, y: number) => Math.abs(x - y) < 1e-9;
  return near(a.size.length, b.size.length) && near(a.size.width, b.size.width) && near(a.depth ?? 0, b.depth ?? 0);
}

/**
 * Work out what fitting this rail to this leg would do, without doing it.
 *
 * Every tenon on the rail is fitted to the one mortise, which is what happens
 * at the bench too: a rail with a tenon at each end gets both cut to the same
 * setting, and the legs are bored to match.
 */
export function planTenonFit(tenonPart: Part, mortisePart: Part): TenonFitPlan | null {
  if (tenonPart.id === mortisePart.id) return null;

  const tenons = getTenons(tenonPart);
  if (tenons.length === 0) return null;

  const mortise = chooseMortise(tenonPart, mortisePart);
  if (!mortise) return null;

  return {
    tenonPartId: tenonPart.id,
    mortisePartId: mortisePart.id,
    mortiseFeatureId: mortise.id,
    tenons: tenons.map((tenon) => {
      const parameters = fitTenonParameters(tenon, mortise, mortisePart, tenonPart);
      return { featureId: tenon.id, parameters, changed: !sameParameters(tenon.parameters, parameters) };
    })
  };
}

/**
 * Which of two parts holds the tenons and which the mortises.
 *
 * Returns nothing when the pair is not a mortise and tenon at all, or when
 * both carry both and there is no telling which way round it goes.
 */
export function resolveTenonAndMortiseParts(first: Part, second: Part): { tenonPart: Part; mortisePart: Part } | null {
  const firstFits = getTenons(first).length > 0 && getMortises(second).length > 0;
  const secondFits = getTenons(second).length > 0 && getMortises(first).length > 0;
  if (firstFits && !secondFits) return { tenonPart: first, mortisePart: second };
  if (secondFits && !firstFits) return { tenonPart: second, mortisePart: first };
  return null;
}
