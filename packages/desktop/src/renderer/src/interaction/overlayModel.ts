// ADR-005: One pure function derives every workspace overlay into an
// `OverlayModel`. Overlay components consume slices via props — they do not
// read from stores directly.
//
// Phase §10a (this commit): the `snap` slot is wired end-to-end. The
// `references` and `dimensions` slots are stubbed so the model can grow
// without API churn when §10b migrates the remaining components.

import type { GroupMember, Part, SnapLine } from '../types';
import type { InteractionSession } from '../store/interactionStore';
import type { Vec3 } from './tools/toolSolver';

// ─────────────────────────────────────────────────────────────────────────────
// Slot types
// ─────────────────────────────────────────────────────────────────────────────

/** Snap-overlay payload: alignment lines + pulse + label position. */
export interface SnapOverlayData {
  /** Active snap lines to render. */
  lines: SnapLine[];
  /** Timestamp (perf.now) of the last snap-engage pulse. */
  pulseAt: number;
  /** World position for the snap label, or null if hidden. */
  labelPosition: Vec3 | null;
}

/**
 * Placeholder for §10b. The reference-distance overlay derives from
 * `snapStore.activeReferenceRulers` + `interactionStore.activeSession.referenceState`.
 * Filled in when ReferenceDistanceIndicators migrates.
 */
export interface ReferenceOverlayData {
  // Intentionally empty — see §10b.
  readonly placeholder: true;
}

/**
 * Inputs the multi-selection-dimensions overlay needs to compute its bounding
 * box + per-axis gap labels. The expensive AABB and gap math stays in the
 * component (`useMemo`-based) — this slot is dependency injection plus the
 * single "should this overlay render at all?" gate.
 *
 * The slot is `null` when an interaction session is active (we hide bounding
 * dimensions during drag/resize/rotate to keep the canvas readable). It is
 * also `null` when the selection is too small to need a bounding box.
 */
export interface DimensionOverlayInputs {
  parts: ReadonlyArray<Part>;
  selectedPartIds: ReadonlyArray<string>;
  selectedGroupIds: ReadonlyArray<string>;
  groupMembers: ReadonlyArray<GroupMember>;
  units: 'imperial' | 'metric';
}

/** Backwards-compatible alias. */
export type DimensionOverlayData = DimensionOverlayInputs;

// ─────────────────────────────────────────────────────────────────────────────
// OverlayModel
//
// A `null` slot means "the overlay should not render at all." Components stay
// trivial: `if (!props.data) return null;`. There are no in-between states.
// ─────────────────────────────────────────────────────────────────────────────

export interface OverlayModel {
  snap: SnapOverlayData | null;
  references: ReferenceOverlayData | null;
  dimensions: DimensionOverlayInputs | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Derivation
// ─────────────────────────────────────────────────────────────────────────────

export interface ComputeOverlayModelInput {
  /** Active interaction session, if any. */
  activeSession: InteractionSession | null;
  /** Snap-related state read from `snapStore`. */
  snap: {
    activeSnapLines: ReadonlyArray<SnapLine>;
    snapPulseAt: number;
    snapLabelPosition: Vec3 | null;
  };
  /** Selection state used to derive multi-selection dimension overlays. */
  selection: {
    selectedPartIds: ReadonlyArray<string>;
    selectedGroupIds: ReadonlyArray<string>;
  };
  /** Project state used to derive overlays that depend on parts/groups. */
  project: {
    parts: ReadonlyArray<Part>;
    groupMembers: ReadonlyArray<GroupMember>;
    units: 'imperial' | 'metric';
  };
  // Reserved for §10b-2 — reference rulers from snapStore + interactionStore.
}

/**
 * Compute the overlay model from upstream state. Pure: no React, no DOM, no
 * store hooks. Callers (typically a workspace hook) read from stores, pass the
 * raw state in, and propagate the result down via props.
 */
export function computeOverlayModel(input: ComputeOverlayModelInput): OverlayModel {
  return {
    snap: deriveSnapOverlay(input),
    references: null, // §10b-2
    dimensions: deriveDimensionOverlay(input)
  };
}

function deriveSnapOverlay(input: ComputeOverlayModelInput): SnapOverlayData | null {
  // The snap layer renders only when there are active lines. Pulse and label
  // are pass-throughs — they decay/animate inside the renderer, which is fine
  // because they are tied to the line set's identity.
  if (input.snap.activeSnapLines.length === 0) return null;
  return {
    lines: [...input.snap.activeSnapLines],
    pulseAt: input.snap.snapPulseAt,
    labelPosition: input.snap.snapLabelPosition
  };
}

function deriveDimensionOverlay(input: ComputeOverlayModelInput): DimensionOverlayInputs | null {
  // Hide bounding-box dimensions while an interaction is active — the gestures
  // own the canvas's measurement attention during drag/resize/rotate.
  if (input.activeSession !== null) return null;

  // The minimum-entities gate (single group vs ≥2 parts) lives in the
  // component because it needs the resolved measurement entities, which the
  // component computes via useMemo. The slot only gates on session activity
  // and "is there any selection at all" — cheap to check here.
  const hasSelection = input.selection.selectedPartIds.length > 0 || input.selection.selectedGroupIds.length > 0;
  if (!hasSelection) return null;

  return {
    parts: input.project.parts,
    selectedPartIds: input.selection.selectedPartIds,
    selectedGroupIds: input.selection.selectedGroupIds,
    groupMembers: input.project.groupMembers,
    units: input.project.units
  };
}
