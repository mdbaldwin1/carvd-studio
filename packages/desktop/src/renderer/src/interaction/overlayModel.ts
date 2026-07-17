// ADR-005: One pure function derives every workspace overlay into an
// `OverlayModel`. Overlay components consume slices via props — they do not
// read from stores directly.
//
// The model currently owns snap, reference-distance, and multi-selection
// dimension overlay inputs. Some reference edit paths still carry legacy
// indicator/session data through the model until the edit flow is split into
// its own interaction host.

import type { GroupMember, Part, ReferenceDistanceIndicator, ReferenceRuler, SnapLine } from '../types';
import type { InteractionSession } from '../store/interactionStore';
import { shouldHideReferenceDistanceIndicators } from '../utils/interactionOverlay';
import { referenceRelationToRuler } from '../utils/referenceRelations';
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
 * Inputs the reference-distance-indicators overlay needs.
 *
 * Two ruler sources exist: an "active session" set derived from
 * `interactionStore.activeSession.referenceState.candidateRelations` (used while
 * a move/resize is in flight), and a legacy idle set from
 * `snapStore.activeReferenceRulers`. The slot exposes a single resolved
 * `rulers` list — the active set takes priority when non-empty. The component
 * doesn't reproduce the priority logic.
 *
 * The slot also exposes `legacyIndicators` and `activeSession` because the
 * component's inline edit + resize handler paths need them; carrying them
 * here removes those store reads from the component without rewriting the
 * edit flow (which has its own state and writes back to projectStore).
 */
export interface ReferenceOverlayInputs {
  rulers: ReferenceRuler[];
  legacyIndicators: ReadonlyArray<ReferenceDistanceIndicator>;
  activeSession: InteractionSession | null;
  parts: ReadonlyArray<Part>;
  units: 'imperial' | 'metric';
  displayMode: 'solid' | 'wireframe' | 'translucent';
}

/** Backwards-compatible alias. */
export type ReferenceOverlayData = ReferenceOverlayInputs;

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
  references: ReferenceOverlayInputs | null;
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
  /** Reference-overlay state read from `snapStore`. */
  references: {
    activeReferenceRulers: ReadonlyArray<ReferenceRuler>;
    activeReferenceDistances: ReadonlyArray<ReferenceDistanceIndicator>;
  };
  /** Camera display mode (drives line/label occlusion). */
  displayMode: 'solid' | 'wireframe' | 'translucent';
}

/**
 * Compute the overlay model from upstream state. Pure: no React, no DOM, no
 * store hooks. Callers (typically a workspace hook) read from stores, pass the
 * raw state in, and propagate the result down via props.
 */
export function computeOverlayModel(input: ComputeOverlayModelInput): OverlayModel {
  return {
    snap: deriveSnapOverlay(input),
    references: deriveReferenceOverlay(input),
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

function deriveReferenceOverlay(input: ComputeOverlayModelInput): ReferenceOverlayInputs | null {
  // The component used to gate visibility via `shouldHideReferenceDistanceIndicators`;
  // we honor the same predicate here so the slot is null when the overlay
  // should not render at all.
  if (shouldHideReferenceDistanceIndicators(input.activeSession)) return null;

  // Resolved rulers: prefer the active-session candidates when present (they
  // carry the active/passive distinction); fall back to the snap-store list
  // for idle reference distances.
  const sessionRulers = input.activeSession?.referenceState.candidateRelations.length
    ? input.activeSession.referenceState.candidateRelations.map((relation) =>
        referenceRelationToRuler(
          relation,
          relation.id === input.activeSession?.referenceState.activeRelationId ? 'active' : 'passive'
        )
      )
    : [];
  const rulers = sessionRulers.length > 0 ? sessionRulers : [...input.references.activeReferenceRulers];

  if (rulers.length === 0) return null;

  return {
    rulers,
    legacyIndicators: input.references.activeReferenceDistances,
    activeSession: input.activeSession,
    parts: input.project.parts,
    units: input.project.units,
    displayMode: input.displayMode
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
