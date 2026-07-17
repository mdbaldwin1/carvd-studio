// ADR-006: Collision constraint. Wraps the existing
// `resolveSafeTranslationDelta` overlap-prevention utility so multiple
// transform paths (single-part drag release, group drag release) share the
// same code path through the pipeline.
//
// No-op for resize and rotate candidates today — those don't translate.
// When the host opts out of overlap prevention (preventOverlap === false),
// the constraint is a passthrough.

import { resolveSafeTranslationDelta } from '../../utils/overlapPolicy';
import type { CandidateTransform, Constraint, ConstraintBlocker, ConstraintResult, ConstraintWarning } from './types';

export const collisionConstraint: Constraint = {
  name: 'collision',
  apply(ctx): ConstraintResult {
    const candidate = ctx.candidate;
    const blockers: ConstraintBlocker[] = [];
    const warnings: ConstraintWarning[] = [];

    // Only move candidates need collision; resize and rotate don't translate.
    if (candidate.kind !== 'move') {
      return { adjusted: candidate, blockers, warnings };
    }

    // Opt-out: treat undefined as enabled (safe default).
    const preventOverlap = ctx.project.preventOverlap ?? true;
    if (!preventOverlap) {
      return { adjusted: candidate, blockers, warnings };
    }

    const movingIds = new Set<string>();
    for (const partId of candidate.positions.keys()) movingIds.add(partId);
    if (movingIds.size === 0) {
      return { adjusted: candidate, blockers, warnings };
    }

    // resolveSafeTranslationDelta takes the COMMITTED parts (pre-gesture
    // positions) and a proposed delta. The candidate's `delta` is the
    // proposed translation; we pass parts from project state at their
    // current (committed) positions.
    const safeDelta = resolveSafeTranslationDelta(
      [...ctx.project.parts],
      movingIds,
      candidate.delta,
      ctx.geometryCache
    );

    if (safeDelta === null) {
      // No safe motion exists — the proposed move would overlap with
      // immovable geometry. Surface a blocker; the host decides what to
      // do (drag preview can still proceed; the host commit path checks
      // for blockers and may fall back to the last safe position).
      blockers.push({
        constraintName: 'collision',
        kind: 'collision',
        message: `Move would cause overlap; no safe path along proposed direction.`
      });
      return { adjusted: candidate, blockers, warnings };
    }

    // safeDelta may equal the proposed delta (no clamp needed) or be a
    // shorter vector along the same direction.
    const dx = safeDelta.x;
    const dy = safeDelta.y;
    const dz = safeDelta.z;
    const proposed = candidate.delta;
    const wasClamped =
      Math.abs(dx - proposed.x) > 1e-6 || Math.abs(dy - proposed.y) > 1e-6 || Math.abs(dz - proposed.z) > 1e-6;

    if (!wasClamped) {
      return { adjusted: candidate, blockers, warnings };
    }

    // Rebuild positions from each starting part + the safe delta.
    const adjustedPositions = new Map<string, { x: number; y: number; z: number }>();
    for (const [partId] of candidate.positions) {
      const startingPart = ctx.startingParts.find((p) => p.id === partId);
      if (!startingPart) {
        // Fall back to the candidate's position for parts we can't resolve.
        const original = candidate.positions.get(partId);
        if (original) adjustedPositions.set(partId, original);
        continue;
      }
      adjustedPositions.set(partId, {
        x: startingPart.position.x + dx,
        y: startingPart.position.y + dy,
        z: startingPart.position.z + dz
      });
    }

    warnings.push({
      constraintName: 'collision',
      kind: 'soft-collision',
      message: `Move clamped to nearest safe position along drag direction.`
    });

    return {
      adjusted: {
        kind: 'move',
        delta: { x: dx, y: dy, z: dz },
        positions: adjustedPositions
      } satisfies CandidateTransform,
      blockers,
      warnings
    };
  }
};
