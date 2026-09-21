import type { Part } from '../types';
import { formatFabricationMeasurement } from './fractions';
import { RECT_CUT_TRAITS } from './rectCutTraits';
import {
  getPartFeatureSockets,
  getPartMaterialOBBs,
  getPartOBB,
  type FeatureSocket,
  type PartOBB
} from './snapToPartsUtil';

/** Local mirror of the snap engine's vector shape, which it keeps private. */
type Vec3 = { x: number; y: number; z: number };

/**
 * Whether the pieces of a joint still fit each other.
 *
 * Cutting a tenon to its mortise is a one-off act, here as at the bench: the
 * two are not linked afterwards, and nothing follows the other around. That is
 * deliberate. Changing a mortise in the shop does not change the tenon, it
 * makes the tenon wrong, and software that quietly resized the far piece would
 * be lying about what wood does.
 *
 * What the bench gives you that a drawing does not is that the error is
 * obvious: the joint will not close. So the price of not linking the two is
 * that something has to notice. Nothing did -- a part's operations are checked
 * on their own, never against the piece they were cut to fit, and a feature
 * edit does not even go through the overlap check that a move does. Narrow a
 * mortise with the rail still in it and the model held a joint that could not
 * be assembled, with nothing said.
 */

/** The band the mate engine already calls a tight fit. */
const GOOD_FIT = 0.03;
/** A piece has to be properly in the socket, not merely near its mouth. */
const MIN_ENGAGEMENT = 1 / 32;
/**
 * Past this the two are not a joint that has drifted, they are unrelated.
 *
 * Half an inch is far more than any joint survives, and stopping there keeps
 * the check from inventing joints out of parts that merely pass close by.
 */
const MAX_MISFIT = 0.5;

export type JointFitProblem = 'tight' | 'loose';

export interface JointFitIssue {
  hostPartId: string;
  hostFeatureId: string;
  matePartId: string;
  problem: JointFitProblem;
  /** How far out of fit, in inches. */
  amount: number;
  message: string;
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** How far an oriented box reaches along a direction, end to end. */
function extentAlong(obb: PartOBB, axis: Vec3): number {
  return (
    2 *
    (Math.abs(dot(obb.axes[0], axis)) * obb.halfExtents[0] +
      Math.abs(dot(obb.axes[1], axis)) * obb.halfExtents[1] +
      Math.abs(dot(obb.axes[2], axis)) * obb.halfExtents[2])
  );
}

/**
 * Whether this piece is actually in that socket.
 *
 * Deliberately looser than the mate engine's test, which requires a fit to a
 * hundredth and so goes quiet on exactly the joints worth reporting -- a
 * tenon that no longer fits its mortise does not mate, which is the point.
 * Being in the socket is judged on position alone, and the fit is then
 * measured rather than demanded.
 */
function occupies(obb: PartOBB, socket: FeatureSocket): boolean {
  // The piece has to occupy the socket's own depth, so compare the two as
  // spans along the way in and require real overlap. Measuring only how far
  // the leading face lies past the mouth puts no limit on how far past, and
  // every part anywhere behind that plane reads as driven into the socket.
  const n = socket.openingNormal;
  const halfN = extentAlong(obb, n) / 2;
  const centerN = dot(obb.center, n);
  const openingN = dot(socket.openingCenter, n);
  const engagement = Math.min(centerN + halfN, openingN) - Math.max(centerN - halfN, openingN - socket.depth);
  if (engagement < MIN_ENGAGEMENT) return false;

  // Square-on to the opening, give or take the misfit being looked for. The
  // offsets are between centres, so a shelf that runs well past a dado's ends
  // is still judged to be in it.
  const off1 = Math.abs(dot(obb.center, socket.tangent1) - dot(socket.openingCenter, socket.tangent1));
  const off2 = Math.abs(dot(obb.center, socket.tangent2) - dot(socket.openingCenter, socket.tangent2));
  return off1 <= socket.halfExtent1 + MAX_MISFIT && off2 <= socket.halfExtent2 + MAX_MISFIT;
}

/**
 * The dimensions of this socket that are a fit.
 *
 * A channel is only a fit across its width. Its length is the run of the cut,
 * and a shelf is entitled to be longer than its dado -- measuring that too
 * would call every through dado an interference. A pocket holds its piece
 * both ways, so both are measured.
 */
function fitAxes(socket: FeatureSocket): Array<{ axis: Vec3; opening: number }> {
  const both = [
    { axis: socket.tangent1, opening: 2 * socket.halfExtent1 },
    { axis: socket.tangent2, opening: 2 * socket.halfExtent2 }
  ];
  // A bore and a rounded slot both hold their piece on every side, so both
  // dimensions are a fit. Only the rectangular channels run anywhere.
  if (socket.mateKind === 'round_hole' || socket.mateKind === 'rounded_slot' || socket.mateKind === 'rounded_rectangle')
    return both;
  const channel = RECT_CUT_TRAITS[socket.mateKind].channel;
  if (!channel) return both;
  return [channel.tangent === 1 ? both[0] : both[1]];
}

/** What to call the cut in a sentence. */
function cutName(socket: FeatureSocket): string {
  if (socket.mateKind === 'round_hole') return 'hole';
  if (socket.mateKind === 'rounded_slot') return 'slot';
  if (socket.mateKind === 'rounded_rectangle') return 'rounded opening';
  return RECT_CUT_TRAITS[socket.mateKind].label.toLowerCase();
}

/**
 * Every joint in the project whose two halves no longer fit each other.
 *
 * One issue per pair: the worst dimension is the one that decides whether it
 * goes together, and reporting the others as well would say the same thing
 * twice about one joint.
 */
export function getJointFitIssues(parts: Part[], units: 'imperial' | 'metric' = 'imperial'): JointFitIssue[] {
  const issues: JointFitIssue[] = [];

  // Every socket is compared against every part, so the pair count is square
  // in the size of the project. The work per pair is what has to stay small:
  // a bounding sphere each, tested before any of the extent maths, throws out
  // all but the handful of parts near a given cut. Without it a project the
  // size of a kitchen spends a third of a second here on every edit.
  const candidates = parts.map((part) => {
    const obb = getPartOBB(part, part.position);
    return {
      part,
      obb,
      radius: Math.hypot(obb.halfExtents[0], obb.halfExtents[1], obb.halfExtents[2]),
      // What is actually left of the board after its own cuts. A tongued
      // board is three quarters thick and enters a quarter-inch groove on a
      // quarter-inch tongue; measured as a whole box it reads half an inch
      // too fat for a joint that fits perfectly well.
      material: null as PartOBB[] | null
    };
  });

  for (const host of parts) {
    const sockets = getPartFeatureSockets(host);
    if (sockets.length === 0) continue;

    for (const socket of sockets) {
      const socketRadius = Math.hypot(socket.halfExtent1, socket.halfExtent2, socket.depth);
      for (const candidate of candidates) {
        const mate = candidate.part;
        if (mate.id === host.id) continue;
        const reach = socketRadius + candidate.radius + MAX_MISFIT;
        const dx = candidate.obb.center.x - socket.openingCenter.x;
        const dy = candidate.obb.center.y - socket.openingCenter.y;
        const dz = candidate.obb.center.z - socket.openingCenter.z;
        if (dx * dx + dy * dy + dz * dz > reach * reach) continue;
        if (!occupies(candidate.obb, socket)) continue;
        // Judge the piece by the part of it that is in the socket. On an
        // uncut board that is the whole board; on one that carries a tongue
        // or a tenon it is only that.
        candidate.material ??= getPartMaterialOBBs(mate);
        const seated = candidate.material.filter((cell) => occupies(cell, socket));
        if (seated.length === 0) continue;

        let worst: { problem: JointFitProblem; amount: number } | null = null;
        for (const { axis, opening } of fitAxes(socket)) {
          // Where a cut has split the piece into several cells across this
          // axis, the joint is as wide as all of them together.
          const reach = seated.map((cell) => ({
            lo: dot(cell.center, axis) - extentAlong(cell, axis) / 2,
            hi: dot(cell.center, axis) + extentAlong(cell, axis) / 2
          }));
          const delta = Math.max(...reach.map((r) => r.hi)) - Math.min(...reach.map((r) => r.lo)) - opening;
          const amount = Math.abs(delta);
          if (amount <= GOOD_FIT || amount > MAX_MISFIT) continue;
          if (worst && worst.amount >= amount) continue;
          worst = { problem: delta > 0 ? 'tight' : 'loose', amount };
        }
        if (!worst) continue;

        const measure = formatFabricationMeasurement(worst.amount, units);
        const where = `the ${cutName(socket)} in ${host.name}`;
        issues.push({
          hostPartId: host.id,
          hostFeatureId: socket.featureId,
          matePartId: mate.id,
          problem: worst.problem,
          amount: worst.amount,
          message:
            worst.problem === 'tight'
              ? `${mate.name} is ${measure} too big for ${where} and will not go together.`
              : `${mate.name} sits ${measure} loose in ${where}.`
        });
      }
    }
  }

  return issues;
}
