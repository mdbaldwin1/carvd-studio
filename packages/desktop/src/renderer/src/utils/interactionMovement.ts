import type { GroupMember, Part } from '../types';
import { getCombinedBounds } from './snapToPartsUtil';
import { type InteractionSelectionInput, resolveTransformSelectedPartIds } from './interactionSelection';
import { applyConstraints } from '../interaction/constraints/pipeline';
import { groundConstraint } from '../interaction/constraints/groundConstraint';
import { collisionConstraint } from '../interaction/constraints/collisionConstraint';
import { createGeometryCache, type GeometryCache } from '../interaction/geometry/cache';

export interface MoveSelectionResolution {
  affectedPartIds: string[];
  affectedParts: Part[];
  anchorPosition: { x: number; y: number; z: number };
}

export interface TranslationDelta {
  x: number;
  y: number;
  z: number;
}

export interface ConstrainedMoveDeltaResult {
  delta: TranslationDelta;
  overlapBlocked: boolean;
  overlapClamped: boolean;
  usedFallbackDelta: boolean;
}

export interface GroupReleaseMoveResult {
  affectedPartIds: Set<string>;
  constrained: ConstrainedMoveDeltaResult;
}

export interface SinglePartReleaseMoveResult {
  position: TranslationDelta;
  delta: TranslationDelta;
  collisionBlocked: boolean;
  collisionClamped: boolean;
}

export interface SinglePartPreviewMoveResult {
  position: TranslationDelta;
  delta: TranslationDelta;
}

// `calculatePartWorldHalfHeight` retired in §8b-group — the rotation-aware
// world half-height math is now inside `groundConstraint` via `getPartAABB`.
// Pre-allocated three.js objects (`_upVector` etc.) likewise removed.

export function resolveMoveSelection(
  selection: InteractionSelectionInput,
  parts: Part[],
  groupMembers: GroupMember[],
  primaryPartId?: string
): MoveSelectionResolution {
  const affectedPartIdSet = new Set(resolveTransformSelectedPartIds(selection, groupMembers));

  if (primaryPartId) {
    affectedPartIdSet.add(primaryPartId);
  }

  const affectedPartIds = [...affectedPartIdSet];
  const affectedParts = parts.filter((part) => affectedPartIdSet.has(part.id));
  const primaryPart = primaryPartId ? (parts.find((part) => part.id === primaryPartId) ?? null) : null;
  const anchorParts = affectedParts.length > 0 ? affectedParts : primaryPart ? [primaryPart] : [];

  if (anchorParts.length > 1) {
    const bounds = getCombinedBounds(anchorParts);
    return {
      affectedPartIds,
      affectedParts,
      anchorPosition: { x: bounds.centerX, y: bounds.centerY, z: bounds.centerZ }
    };
  }

  const anchorPart = anchorParts[0] ?? primaryPart;
  return {
    affectedPartIds,
    affectedParts,
    anchorPosition: anchorPart
      ? { x: anchorPart.position.x, y: anchorPart.position.y, z: anchorPart.position.z }
      : { x: 0, y: 0, z: 0 }
  };
}

export function applyGroundConstraintToDelta(
  parts: Part[],
  movingPartIds: Iterable<string>,
  proposedDelta: TranslationDelta
): TranslationDelta {
  // ADR-006: delegate to the constraint pipeline. Callers (today:
  // resolveConstrainedMoveDelta → useGroupDrag) keep their signature; the
  // ground-clamp math now goes through groundConstraint so multi-part group
  // drag shares the same code path as single-part drag, resize, and rotate.
  const movingIdSet = new Set(movingPartIds);
  const movingParts = parts.filter((p) => movingIdSet.has(p.id));
  if (movingParts.length === 0) return proposedDelta;

  const positions = new Map<string, { x: number; y: number; z: number }>();
  for (const part of movingParts) {
    positions.set(part.id, {
      x: part.position.x + proposedDelta.x,
      y: part.position.y + proposedDelta.y,
      z: part.position.z + proposedDelta.z
    });
  }

  const result = applyConstraints(
    {
      candidate: { kind: 'move', delta: proposedDelta, positions },
      startingParts: movingParts,
      project: { parts, stocks: [], groupMembers: [] },
      geometryCache: createGeometryCache()
    },
    [groundConstraint]
  );

  if (result.adjusted.kind === 'move') {
    return result.adjusted.delta;
  }
  return proposedDelta;
}

export function resolveConstrainedMoveDelta(
  parts: Part[],
  movingPartIds: Iterable<string>,
  proposedDelta: TranslationDelta,
  options?: {
    preventOverlap?: boolean;
    fallbackDeltaOnOverlap?: TranslationDelta | null;
  }
): ConstrainedMoveDeltaResult {
  // ADR-006: ground + collision both go through the constraint pipeline.
  // Public contract (return shape with overlapBlocked / overlapClamped /
  // usedFallbackDelta flags) preserved so useGroupDrag and any other
  // caller keep working without code changes.
  const movingIdSet = new Set(movingPartIds);
  const movingParts = parts.filter((p) => movingIdSet.has(p.id));

  if (movingParts.length === 0) {
    return {
      delta: proposedDelta,
      overlapBlocked: false,
      overlapClamped: false,
      usedFallbackDelta: false
    };
  }

  const positions = new Map<string, { x: number; y: number; z: number }>();
  for (const part of movingParts) {
    positions.set(part.id, {
      x: part.position.x + proposedDelta.x,
      y: part.position.y + proposedDelta.y,
      z: part.position.z + proposedDelta.z
    });
  }

  const result = applyConstraints(
    {
      candidate: { kind: 'move', delta: proposedDelta, positions },
      startingParts: movingParts,
      project: {
        parts,
        stocks: [],
        groupMembers: [],
        preventOverlap: options?.preventOverlap ?? false
      },
      geometryCache: createGeometryCache()
    },
    [groundConstraint, collisionConstraint]
  );

  const adjustedDelta = result.adjusted.kind === 'move' ? result.adjusted.delta : proposedDelta;
  const overlapBlocked = result.blockers.some((b) => b.constraintName === 'collision');
  const overlapClamped =
    !overlapBlocked && result.warnings.some((w) => w.constraintName === 'collision' && w.kind === 'soft-collision');

  if (overlapBlocked && options?.fallbackDeltaOnOverlap) {
    return {
      delta: options.fallbackDeltaOnOverlap,
      overlapBlocked: true,
      overlapClamped: false,
      usedFallbackDelta: true
    };
  }

  return {
    delta: adjustedDelta,
    overlapBlocked,
    overlapClamped,
    usedFallbackDelta: false
  };
}

export function resolveGroupReleaseMove({
  parts,
  groupMembers,
  selection,
  proposedDelta,
  fallbackDeltaOnOverlap,
  preventOverlap,
  primaryPartId
}: {
  parts: Part[];
  groupMembers: GroupMember[];
  selection: InteractionSelectionInput;
  proposedDelta: TranslationDelta;
  fallbackDeltaOnOverlap: TranslationDelta;
  preventOverlap: boolean;
  primaryPartId?: string;
}): GroupReleaseMoveResult {
  const affectedPartIds = new Set(resolveMoveSelection(selection, parts, groupMembers, primaryPartId).affectedPartIds);
  return {
    affectedPartIds,
    constrained: resolveConstrainedMoveDelta(parts, affectedPartIds, proposedDelta, {
      preventOverlap,
      fallbackDeltaOnOverlap
    })
  };
}

export function resolveSinglePartReleaseMove({
  part,
  projectParts,
  proposedPosition,
  preventOverlap,
  geometryCache
}: {
  part: Part;
  projectParts: Part[];
  proposedPosition: TranslationDelta;
  preventOverlap: boolean;
  geometryCache?: GeometryCache;
}): SinglePartReleaseMoveResult {
  const proposedDelta = {
    x: proposedPosition.x - part.position.x,
    y: proposedPosition.y - part.position.y,
    z: proposedPosition.z - part.position.z
  };
  const result = applyConstraints(
    {
      candidate: {
        kind: 'move',
        delta: proposedDelta,
        positions: new Map([[part.id, proposedPosition]])
      },
      startingParts: [part],
      project: {
        parts: projectParts,
        stocks: [],
        groupMembers: [],
        preventOverlap
      },
      geometryCache: geometryCache ?? createGeometryCache()
    },
    [groundConstraint, collisionConstraint]
  );

  const collisionBlocked = result.blockers.some((b) => b.constraintName === 'collision');
  if (result.adjusted.kind !== 'move') {
    return {
      position: proposedPosition,
      delta: proposedDelta,
      collisionBlocked,
      collisionClamped: false
    };
  }

  const adjustedPosition = result.adjusted.positions.get(part.id) ?? proposedPosition;
  return {
    position: adjustedPosition,
    delta: result.adjusted.delta,
    collisionBlocked,
    collisionClamped: result.warnings.some((w) => w.constraintName === 'collision' && w.kind === 'soft-collision')
  };
}

export function resolveSinglePartPreviewMove({
  part,
  projectParts,
  proposedDelta,
  proposedPosition,
  geometryCache
}: {
  part: Part;
  projectParts: Part[];
  proposedDelta: TranslationDelta;
  proposedPosition: TranslationDelta;
  geometryCache?: GeometryCache;
}): SinglePartPreviewMoveResult {
  const result = applyConstraints(
    {
      candidate: {
        kind: 'move',
        delta: proposedDelta,
        positions: new Map([[part.id, proposedPosition]])
      },
      startingParts: [part],
      project: {
        parts: projectParts,
        stocks: [],
        groupMembers: []
      },
      geometryCache: geometryCache ?? createGeometryCache()
    },
    [groundConstraint]
  );

  if (result.adjusted.kind !== 'move') {
    return { position: proposedPosition, delta: proposedDelta };
  }

  return {
    position: result.adjusted.positions.get(part.id) ?? proposedPosition,
    delta: result.adjusted.delta
  };
}
