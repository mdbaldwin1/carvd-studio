// ADR-006: Ground clamp. No affected part may sit below ground (Y = 0). For
// each part in the candidate transform, computes the world-space minimum Y
// and lifts the whole transform if any part would dip below 0.
//
// The "world half-height" was computed inline in legacy code as
// `worldHalfHeight = part.thickness / 2` for axis-aligned parts. For rotated
// parts we use the geometry bundle's world-space AABB (derived per part from
// `bundle.bounds.localObb` rotated into world space). The constraint expresses
// this through the shared pipeline so callers do not each perform their own
// ground-clamp math.

import { getPartAABB } from '../../components/workspace/workspaceUtils';
import type { Part } from '../../types';
import type { GeometryCache } from '../geometry/cache';
import type { Constraint, ConstraintBlocker, ConstraintResult, ConstraintWarning } from './types';

function clampMovePositions(
  positions: ReadonlyMap<string, { x: number; y: number; z: number }>,
  startingParts: ReadonlyArray<Part>,
  geometryCache: GeometryCache
): {
  positions: Map<string, { x: number; y: number; z: number }>;
  lifted: boolean;
  liftedParts: string[];
} {
  const updated = new Map<string, { x: number; y: number; z: number }>();
  let minDipBelowGround = 0; // negative when any part is below ground
  const liftedParts: string[] = [];

  for (const [partId, pos] of positions) {
    const startingPart = startingParts.find((p) => p.id === partId);
    if (!startingPart) {
      updated.set(partId, pos);
      continue;
    }
    // Compute the part's world-space AABB at the candidate position.
    const aabb = getPartAABB({ ...startingPart, position: pos }, geometryCache);
    if (aabb.minY < minDipBelowGround) {
      minDipBelowGround = aabb.minY;
      liftedParts.push(partId);
    }
  }

  if (minDipBelowGround >= 0) {
    // No lift needed — return positions unchanged with stable references when
    // possible. We rebuild the map to keep the return shape consistent.
    for (const [partId, pos] of positions) updated.set(partId, pos);
    return { positions: updated, lifted: false, liftedParts: [] };
  }

  // Lift the entire transform by the deepest dip.
  const lift = -minDipBelowGround;
  for (const [partId, pos] of positions) {
    updated.set(partId, { x: pos.x, y: pos.y + lift, z: pos.z });
  }
  return { positions: updated, lifted: true, liftedParts };
}

export const groundConstraint: Constraint = {
  name: 'ground',
  apply(ctx): ConstraintResult {
    const candidate = ctx.candidate;
    const blockers: ConstraintBlocker[] = [];
    const warnings: ConstraintWarning[] = [];

    if (candidate.kind === 'move') {
      const { positions, lifted, liftedParts } = clampMovePositions(
        candidate.positions,
        ctx.startingParts,
        ctx.geometryCache
      );
      // Adjust the delta to reflect the lift: the new delta is the difference
      // between the new primary position and the starting primary position.
      // We don't know the "primary" here — but we can recompute delta from any
      // one of the parts since the lift applies uniformly.
      let nextDelta = candidate.delta;
      if (lifted && positions.size > 0) {
        const firstId = positions.keys().next().value;
        const firstStart = ctx.startingParts.find((p) => p.id === firstId);
        const firstNew = firstId !== undefined ? positions.get(firstId) : undefined;
        if (firstStart && firstNew) {
          nextDelta = {
            x: firstNew.x - firstStart.position.x,
            y: firstNew.y - firstStart.position.y,
            z: firstNew.z - firstStart.position.z
          };
        }
      }
      for (const partId of liftedParts) {
        warnings.push({
          constraintName: 'ground',
          kind: 'near-edge',
          partId,
          message: `Part "${partId}" would have dipped below ground; lifted to surface.`
        });
      }
      return {
        adjusted: { kind: 'move', delta: nextDelta, positions },
        blockers,
        warnings
      };
    }

    if (candidate.kind === 'resize') {
      // For resize, the candidate carries one part + new position. Check that
      // part's world AABB at the new dimensions.
      const startingPart = ctx.startingParts.find((p) => p.id === candidate.partId);
      if (!startingPart) {
        return { adjusted: candidate, blockers, warnings };
      }
      const hypothetical: Part = {
        ...startingPart,
        position: candidate.position,
        length: candidate.dimensions.length,
        width: candidate.dimensions.width,
        thickness: candidate.dimensions.thickness
      };
      const aabb = getPartAABB(hypothetical, ctx.geometryCache);
      if (aabb.minY < 0) {
        const lift = -aabb.minY;
        const adjusted = {
          ...candidate,
          position: {
            x: candidate.position.x,
            y: candidate.position.y + lift,
            z: candidate.position.z
          }
        };
        warnings.push({
          constraintName: 'ground',
          kind: 'near-edge',
          partId: candidate.partId,
          message: `Resize would dip "${candidate.partId}" below ground; lifted to surface.`
        });
        return { adjusted, blockers, warnings };
      }
      return { adjusted: candidate, blockers, warnings };
    }

    if (candidate.kind === 'rotate') {
      // Each rotated part is checked independently. If any part dips, all
      // get lifted by the deepest dip (so the rotation set stays cohesive).
      let minDip = 0;
      const liftedIds: string[] = [];
      for (const update of candidate.updates) {
        const starting = ctx.startingParts.find((p) => p.id === update.partId);
        if (!starting) continue;
        const aabb = getPartAABB(
          {
            ...starting,
            position: update.position,
            rotation: update.rotation
          },
          ctx.geometryCache
        );
        if (aabb.minY < minDip) {
          minDip = aabb.minY;
          liftedIds.push(update.partId);
        }
      }
      if (minDip < 0) {
        const lift = -minDip;
        for (const partId of liftedIds) {
          warnings.push({
            constraintName: 'ground',
            kind: 'near-edge',
            partId,
            message: `Rotation would dip "${partId}" below ground; lifted to surface.`
          });
        }
        return {
          adjusted: {
            kind: 'rotate',
            updates: candidate.updates.map((u) => ({
              ...u,
              position: { x: u.position.x, y: u.position.y + lift, z: u.position.z }
            }))
          },
          blockers,
          warnings
        };
      }
      return { adjusted: candidate, blockers, warnings };
    }

    return { adjusted: candidate, blockers, warnings };
  }
};
