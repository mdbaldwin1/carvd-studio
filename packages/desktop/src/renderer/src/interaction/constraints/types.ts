// ADR-006: Constraint pipeline types.
//
// Constraints are pure functions wrapped in an interface. They take a
// candidate transform plus context, return an adjusted transform plus optional
// blockers + warnings. The pipeline runner composes them in tool-specific
// order.

import type { GroupMember, Part, Stock } from '../../types';
import type { GeometryCache } from '../geometry/cache';
import type { PartDimensions, Vec3 } from '../tools/toolSolver';

// ─────────────────────────────────────────────────────────────────────────────
// Candidate transform — what a tool wants to apply before constraints
//
// Discriminated by `kind` so different tools express different transform
// shapes (move = delta, resize = dimensions + position, rotate = rotation per
// part).
// ─────────────────────────────────────────────────────────────────────────────

export type CandidateTransform =
  | {
      kind: 'move';
      /** Delta applied to every affected part. */
      delta: Vec3;
      /** Final positions per part after the tool's raw work. */
      positions: ReadonlyMap<string, Vec3>;
    }
  | {
      kind: 'resize';
      /** The part being resized. */
      partId: string;
      dimensions: PartDimensions;
      position: Vec3;
    }
  | {
      kind: 'rotate';
      /** Per-part final positions + rotations after the tool's raw work. */
      updates: ReadonlyArray<{
        partId: string;
        position: Vec3;
        rotation: { x: number; y: number; z: number };
      }>;
    };

// ─────────────────────────────────────────────────────────────────────────────
// Context passed to every constraint
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectStateSlice {
  /** All parts at their committed positions (not the in-flight candidate). */
  parts: ReadonlyArray<Part>;
  /** All stocks; resize constraint reads `stock.length / width / thickness`. */
  stocks: ReadonlyArray<Stock>;
  /** Group membership for cross-part constraints. */
  groupMembers: ReadonlyArray<GroupMember>;
}

export interface ConstraintContext {
  candidate: CandidateTransform;
  /** Parts touched by this gesture at their PRE-gesture positions. */
  startingParts: ReadonlyArray<Part>;
  /** Snapshot of project state visible to constraints. */
  project: ProjectStateSlice;
  /** Geometry bundle cache (§5) for constraints that need bounds. */
  geometryCache: GeometryCache;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constraint results
//
// Constraints never throw. They produce an adjusted transform and may surface
// blockers (hard vetoes) or warnings (informational).
// ─────────────────────────────────────────────────────────────────────────────

export interface ConstraintBlocker {
  readonly constraintName: string;
  readonly kind: 'collision' | 'out-of-stock-dimensions' | 'below-ground' | 'custom';
  readonly partId?: string;
  readonly message: string;
}

export interface ConstraintWarning {
  readonly constraintName: string;
  readonly kind: 'soft-collision' | 'near-edge' | 'custom';
  readonly partId?: string;
  readonly message: string;
}

export interface ConstraintResult {
  /** Constrained transform. Identical to `ctx.candidate` when the constraint didn't fire. */
  adjusted: CandidateTransform;
  blockers: ConstraintBlocker[];
  warnings: ConstraintWarning[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constraint interface
// ─────────────────────────────────────────────────────────────────────────────

export interface Constraint {
  /** Stable name for debug logs + pipeline composition tooling. */
  readonly name: string;
  apply(ctx: ConstraintContext): ConstraintResult;
}
