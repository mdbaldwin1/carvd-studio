# ADR-007: Store ownership and dependency graph

Status: Accepted
Date: 2026-05-18
Phase: §12 Store Ownership

## Context

After Phases §3, §4a, §5a, §8a, §10, §11, and §1a landed, the workspace's state model is split across nine Zustand stores plus a set of pure-derivation adapters. The boundaries between stores have evolved organically; some now-historical decisions (where to put reference state, who owns the active session, what the scene graph is) deserve to be written down so future work doesn't re-litigate them.

This ADR captures the **store ownership graph** as it stands at the end of this branch, and locks in the rules for what can and cannot live in each store. No code change. The deliverable is the documentation.

## Decision

### Store roster

| Store                  | Owns                                                                                                                                                       | Wrapped by `zundo` (undo)? |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `projectStore`         | Persisted domain data: parts, stocks, groups, group members, assemblies, custom shopping items, project metadata, snap guides, ground level, snap settings | **Yes** (the only one)     |
| `selectionStore`       | `selectedPartIds`, `selectedGroupIds`, `hoveredPartId`, `editingGroupId`, drag intent, drag state markers                                                  | No                         |
| `uiStore`              | Transient UI: toasts, modals, thumbnails, tutorial state, context-menu state, sidebar stock highlight                                                      | No                         |
| `cameraStore`          | Camera position / target, display mode (`solid` / `wireframe` / `translucent`), show-grid flag, pending camera restore                                     | No                         |
| `snapStore`            | Snap detection results, reference part IDs, active snap lines, active reference rulers, idle reference distance indicators, snap perf telemetry            | No                         |
| `interactionStore`     | Active session (move / resize / rotate), session-scoped reference state (candidate relations, active/hovered relation, latched axis)                       | No                         |
| `clipboardStore`       | Copy/paste buffer                                                                                                                                          | No                         |
| `licenseStore`         | License mode, trial status                                                                                                                                 | No                         |
| `appSettingsStore`     | User preferences: theme, units, grid size, snap settings, lighting preset, brightness                                                                      | No                         |
| `assemblyEditingStore` | Assembly edit mode state                                                                                                                                   | No                         |

### Hard rules

1. **`projectStore` is the only undoable store** (ADR-001). Any state that needs to participate in undo/redo lives there. Selection, UI, camera, etc. are deliberately outside the undo timeline.

2. **No `temporal` middleware on new stores.** Adding a new undoable store requires a superseding ADR. The current `zundo` wrap on `projectStore` is load-bearing for snapshot size; spreading temporal across multiple stores would compound history footprint.

3. **Stores do not subscribe to each other directly.** Actions can read snapshots via `useXxxStore.getState()`, but no store may install `useXxxStore.subscribe(...)` on another store. Cross-store derivation happens in pure functions called from React components (e.g. `computeOverlayModel`, `useWorkspaceSceneGraph`).

4. **Pure-derivation adapters are not stores.** `WorkspaceSceneGraph` (ADR-008), `OverlayModel` (ADR-005), `PartGeometryBundle` (ADR-009), and `ConstraintPipeline` (ADR-006) are pure functions and types. They are computed at consumer call sites (typically via `useMemo` or an explicit cache). They are not in the store roster above.

5. **Action references vs state subscriptions.** A component reading `useStore((s) => s.someAction)` reads a stable function reference — Zustand does not trigger a re-render. A component reading `useStore((s) => s.someStateField)` subscribes to that field and re-renders on change. Overlay components per ADR-005 are pure prop consumers for _state_; they may still read _actions_ (e.g. `ReferenceDistanceIndicators` reads `moveSelectedParts` from `projectStore` for its inline edit handler) because actions don't subscribe.

### Cross-store dependencies (read-only via `.getState()`)

```
                     ┌──────────────────┐
                     │   projectStore   │ (parts, groups, groupMembers, etc.)
                     │   [zundo wrap]   │
                     └────────┬─────────┘
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
       ▼                      ▼                      ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ snapStore    │       │ interaction  │       │ clipboard    │
│ reads parts, │       │ Store        │       │ Store        │
│ groupMembers │       │ reads parts  │       │ reads parts, │
│ for snap     │       │ for ref      │       │ groups,      │
│ resolution   │       │ state during │       │ groupMembers │
│              │       │ active drag  │       │ during copy  │
└──────────────┘       └──────────────┘       └──────────────┘
       ▲                      ▲
       │                      │
       └──────┬───────────────┘
              │
        ┌─────┴──────┐
        │ overlayModel│ (pure adapter, ADR-005)
        │  reads:    │
        │  - project │
        │  - snap    │
        │  - inter.  │
        │  - select. │
        │  - camera  │
        └────────────┘
```

`selectionStore`, `cameraStore`, `appSettingsStore`, `licenseStore`, `uiStore`, `assemblyEditingStore` are read by various subsystems but do not depend on other stores themselves (they have no `.getState()` calls into peers in their action implementations).

### Reference state: snapStore vs interactionStore

The codex agent's prior work split reference-related state across two stores:

- **`interactionStore.activeSession.referenceState`** — owned by an active move/resize/rotate session. Contains the candidate relations the solver is considering, the active/hovered relation, the latched axis. Cleared when the session ends.

- **`snapStore.activeReferenceRulers` / `activeReferenceDistances`** — owned by the snap engine. Used for **idle** reference distance display (when no session is active but a part is selected with references nearby).

The boundary is the active-vs-idle distinction. A component (`ReferenceDistanceIndicators`) reads both and prefers session-derived rulers when a session is active. This is documented in `reference-positioning-system.md` and was the design decision the audit locked in.

**Future cleanup (deferred):** `snapStore.activeReferenceRulers` could be fully derived from `interactionStore.activeSession.referenceState` once the idle path also publishes through a session-like object. That's a §12c task, not done in this ADR. The current split is acceptable; both fields are well-typed and the overlay model derivation handles the union cleanly.

### Right-click target globals (retired)

A `globalRightClickTarget` module-level variable in `workspaceUtils.ts` used to bridge per-mesh R3F pointerdown handlers and the workspace contextmenu listener. ADR-002 (hit-test service) and ADR-003 (session controller) made this redundant: the controller's `onContextMenu` action carries a typed `HitTarget` from the hit-test service. The global was deleted in the Phase 3b cleanup. No new ad-hoc cross-component globals may be added — communication between subsystems goes through stores or typed action payloads.

## Alternatives considered

- **One mega-store for everything.** Rejected. Subscriber locality is the main perf benefit of multi-store Zustand setup; one store would re-render every consumer on every change.
- **Stores subscribe to each other to compute derived state.** Rejected (rule #3 above). Subscriptions across stores produce hard-to-reason-about update cascades; pure derivation in React via `useMemo` is observable and debuggable.
- **Persist `OverlayModel` / `PartGeometryBundle` / `WorkspaceSceneGraph` in stores.** Rejected. These are pure functions of upstream state; persisting them creates a synchronization layer that has to be kept in sync with the truth. The cache approaches in ADR-005 / ADR-008 / ADR-009 are correct.
- **Move `selectionStore` into `projectStore` (since selection often refers to project entities).** Rejected. Selection is transient; project data is persisted. Wrapping selection in `zundo` would put click events on the undo timeline (ADR-001).

## Consequences

- **Easier:** Onboarding a new subsystem means picking the right existing store (or justifying a new one in an ADR). The roster is finite.
- **Easier:** A change in one store's contract is grep-able to its consumers (every consumer is either a `useXxxStore(...)` call or a `useXxxStore.getState()` call).
- **Easier:** Custom cuts (§6) adds nothing to the store list — feature operations live in `projectStore.parts[i].fabricationOperations` per ADR-010.
- **Harder:** A future "remember UI panel collapse state" feature has to decide: persist (via projectStore or a new persisted store), or session-only (uiStore). The decision is explicit, not implicit.
- **Migration cost (this commit):** Zero. The ADR captures the existing state.

## Open questions

- **`appSettingsStore` vs `projectStore` for snap settings.** Today `appSettingsStore.settings.snapDistance` and `projectStore.snapSensitivity` (etc.) both exist. The split is "app-level default" vs "per-project override" but the boundary is fuzzy and was made organically. A future ADR may consolidate. Not blocking custom-cuts.

- **`assemblyEditingStore`.** This is a small, focused store for assembly edit mode. It could fold into `selectionStore` (it's about what's being edited) or `uiStore` (it's a mode flag). Left alone — splitting was a deliberate choice when assemblies shipped, and consolidating would be a cosmetic change with no real payoff.

## References

- ADR-001 (Selection is not undoable) — locks the no-temporal-on-selection rule
- ADR-002 (Hit-Test Service) — eliminated the right-click global
- ADR-003 (Session Controller) — owns `interactionStore.activeSession`
- ADR-005 (Overlay Model) — pure derivation, not in store roster
- ADR-008 (Scene Graph) — pure derivation, not in store roster
- ADR-009 (Geometry Bundle) — pure derivation with read-through cache, not in store roster
- [`packages/desktop/CLAUDE.md`](../../packages/desktop/CLAUDE.md) — store overview (pre-this-branch baseline)
