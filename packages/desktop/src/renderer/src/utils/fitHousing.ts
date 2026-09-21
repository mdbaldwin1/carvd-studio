import type { Part, RectCutFeature } from '../types';

/** Local mirror of the snap engine's vector shape, which it keeps private. */
type Vec3 = { x: number; y: number; z: number };
import { getPartFeatureSockets, getPartOBB, type FeatureSocket, type PartOBB } from './snapToPartsUtil';

/**
 * Cut the housing to the piece that goes in it.
 *
 * A dado is cut to the shelf, not to a number. That is the other half of the
 * rule behind fitting a tenon: fit whichever piece is cheaper to change. A
 * mortise is hard to alter once chopped, so the tenon is cut to it -- but a
 * shelf's thickness is the stock you bought and cannot be altered at all, so
 * the dado is cut to the shelf.
 *
 * It also quietly fixes the oldest trap in sheet goods. Nominal 3/4" plywood
 * is nearer 23/32", which is why undersized dado sets exist; a dado cut to a
 * typed 3/4" is loose every time, while one cut to the actual part is not.
 */

/** Slack for a piece as deep as it is wide, like a square stick in its housing. */
const ENTRY_TOLERANCE = 1e-9;

/**
 * Where each channel keeps its width.
 *
 * A dado's channel width lives in `size.length` and is measured across the
 * host's length; a groove's lives in `size.width` and is measured across its
 * width. They are genuinely different axes, not a naming quirk, because the
 * two cuts run at right angles to each other.
 */
const CHANNEL: Partial<Record<RectCutFeature['cutType'], { field: 'length' | 'width'; tangent: 1 | 2 }>> = {
  dado: { field: 'length', tangent: 1 },
  stopped_dado: { field: 'length', tangent: 1 },
  half_lap: { field: 'length', tangent: 1 },
  groove: { field: 'width', tangent: 2 },
  stopped_groove: { field: 'width', tangent: 2 }
};

export interface HousingFitPlan {
  housingPartId: string;
  housingFeatureId: string;
  cutType: RectCutFeature['cutType'];
  field: 'length' | 'width';
  /** What the channel has to be to take this piece. */
  width: number;
  /** What it is now, for saying whether anything changed. */
  currentWidth: number;
  changed: boolean;
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** How far an oriented box reaches along a direction. */
function extentAlong(obb: PartOBB, axis: Vec3): number {
  return (
    2 *
    (Math.abs(dot(obb.axes[0], axis)) * obb.halfExtents[0] +
      Math.abs(dot(obb.axes[1], axis)) * obb.halfExtents[1] +
      Math.abs(dot(obb.axes[2], axis)) * obb.halfExtents[2])
  );
}

/**
 * Whether this piece goes into the housing rather than lying across it.
 *
 * A shelf entering a dado stands in it edge-on, so it reaches further along
 * the way in than it is wide across the channel. A board lying flat on the
 * same face is the other way round -- barely a thickness deep and a whole
 * board wide -- and is not being housed at all.
 *
 * Checking the box's alignment instead would pass almost anything, since an
 * unrotated part always has some axis lined up with an unrotated opening.
 */
function entersOpening(obb: PartOBB, socket: FeatureSocket, channelAxis: Vec3): boolean {
  return extentAlong(obb, socket.openingNormal) + ENTRY_TOLERANCE >= extentAlong(obb, channelAxis);
}

function distanceTo(obb: PartOBB, socket: FeatureSocket): number {
  const dx = obb.center.x - socket.openingCenter.x;
  const dy = obb.center.y - socket.openingCenter.y;
  const dz = obb.center.z - socket.openingCenter.z;
  return Math.hypot(dx, dy, dz);
}

/** Every channel on a part that a piece could be housed in. */
export function getHousings(part: Part): RectCutFeature[] {
  return (part.features ?? []).filter(
    (feature): feature is RectCutFeature =>
      feature.enabled && feature.kind === 'rect_cut' && CHANNEL[feature.cutType] !== undefined
  );
}

/**
 * The channel this piece is heading into.
 *
 * Chosen by which openings the piece is square-on to, then by which of those
 * is nearest -- so a side carrying four shelf dadoes gives up the right one,
 * and it works whether or not the two are assembled yet.
 */
function chooseHousing(
  shelfObb: PartOBB,
  housingPart: Part
): { socket: FeatureSocket; feature: RectCutFeature } | null {
  const housings = getHousings(housingPart);
  if (housings.length === 0) return null;

  const sockets = getPartFeatureSockets(housingPart);
  let best: { socket: FeatureSocket; feature: RectCutFeature } | null = null;
  let bestDistance = Infinity;

  for (const feature of housings) {
    const socket = sockets.find((candidate) => candidate.featureId === feature.id);
    if (!socket) continue;
    const channel = CHANNEL[feature.cutType];
    if (!channel) continue;
    const channelAxis = channel.tangent === 1 ? socket.tangent1 : socket.tangent2;
    if (!entersOpening(shelfObb, socket, channelAxis)) continue;
    const distance = distanceTo(shelfObb, socket);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { socket, feature };
    }
  }

  return best;
}

/** What cutting this housing to this piece would do, without doing it. */
export function planHousingFit(shelfPart: Part, housingPart: Part): HousingFitPlan | null {
  if (shelfPart.id === housingPart.id) return null;

  const shelfObb = getPartOBB(shelfPart, shelfPart.position);
  const chosen = chooseHousing(shelfObb, housingPart);
  if (!chosen) return null;

  const channel = CHANNEL[chosen.feature.cutType];
  if (!channel) return null;

  // Measure the piece across the channel, not down its own thickness. Which
  // dimension that is depends on how the piece is turned, which is the whole
  // reason the facing direction matters rather than just the proximity.
  const axis = channel.tangent === 1 ? chosen.socket.tangent1 : chosen.socket.tangent2;
  const width = extentAlong(shelfObb, axis);
  const currentWidth = chosen.feature.parameters.size[channel.field];

  return {
    housingPartId: housingPart.id,
    housingFeatureId: chosen.feature.id,
    cutType: chosen.feature.cutType,
    field: channel.field,
    width,
    currentWidth,
    changed: Math.abs(width - currentWidth) > 1e-9
  };
}

/**
 * Which of two parts carries the housing and which goes into it.
 *
 * When only one is channelled there is nothing to decide. When both are --
 * two shelves crossing, say -- the one whose channel the other actually faces
 * is the housing.
 */
export function resolveHousingRoles(first: Part, second: Part): { shelfPart: Part; housingPart: Part } | null {
  const firstHouses = planHousingFit(second, first) !== null;
  const secondHouses = planHousingFit(first, second) !== null;
  if (firstHouses && !secondHouses) return { shelfPart: second, housingPart: first };
  if (secondHouses && !firstHouses) return { shelfPart: first, housingPart: second };
  return null;
}
