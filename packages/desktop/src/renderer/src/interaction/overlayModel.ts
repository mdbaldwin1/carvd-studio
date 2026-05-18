// ADR-005: One pure function derives every workspace overlay into an
// `OverlayModel`. Overlay components consume slices via props — they do not
// read from stores directly.
//
// Phase §10a (this commit): the `snap` slot is wired end-to-end. The
// `references` and `dimensions` slots are stubbed so the model can grow
// without API churn when §10b migrates the remaining components.

import type { SnapLine } from '../types';
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
 * Placeholder for §10b. The multi-selection dimension overlay derives from
 * selectionStore + projectStore. Filled in when MultiSelectionDimensions
 * migrates.
 */
export interface DimensionOverlayData {
  readonly placeholder: true;
}

// ─────────────────────────────────────────────────────────────────────────────
// OverlayModel
//
// A `null` slot means "the overlay should not render at all." Components stay
// trivial: `if (!props.data) return null;`. There are no in-between states.
// ─────────────────────────────────────────────────────────────────────────────

export interface OverlayModel {
  snap: SnapOverlayData | null;
  references: ReferenceOverlayData | null;
  dimensions: DimensionOverlayData | null;
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
  // Reserved for §10b — selection, parts/groupMembers, references, units, etc.
}

/**
 * Compute the overlay model from upstream state. Pure: no React, no DOM, no
 * store hooks. Callers (typically a workspace hook) read from stores, pass the
 * raw state in, and propagate the result down via props.
 */
export function computeOverlayModel(input: ComputeOverlayModelInput): OverlayModel {
  return {
    snap: deriveSnapOverlay(input),
    references: null, // §10b
    dimensions: null // §10b
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
