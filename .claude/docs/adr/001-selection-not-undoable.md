# ADR-001: Selection is not undoable

Status: Accepted
Date: 2026-05-18
Phase: P0

## Context

`zundo`'s `temporal` middleware wraps **only** `projectStore` (parts, stocks, groups, group members, assemblies, custom shopping items, license mode, ground level, snap settings, project metadata). All other stores — `selectionStore`, `uiStore`, `cameraStore`, `snapStore`, `clipboardStore`, `interactionStore`, `appSettingsStore`, `assemblyEditingStore` — are unwrapped.

That places selection state outside the undo history by construction today. As we redesign the interaction architecture (especially §3 Session Controller and §10 Overlay Engine), there will be temptation to thread selection through `projectStore` as a derived field, or to push selection into a Zustand slice that gets time-traveled. Both options break the user's mental model:

- Cmd+Z after moving a part should restore the part's position, **not** clear or re-establish a selection state from before the move.
- A user selecting multiple parts to compare dimensions should not have those selection clicks consume undo slots — they hit Cmd+Z expecting to undo a real edit and instead see selection rewind.

The user has stated this directly: "selection changes don't seem like they should be undoable."

## Decision

**Selection state is never part of the undo history.**

- `selectionStore.selectedPartIds`, `selectionStore.hoveredPartId`, and any future selection-adjacent state (e.g., active reference targets, last drilled-into group, edit-mode focus) live outside `zundo`.
- The interaction session (`interactionStore.activeSession`) — which carries snapshot data during an in-flight gesture — is also not undoable. Only the **committed result** of a gesture, written to `projectStore`, enters the undo history.
- Any future sub-system that wants to add user-visible "undoability" must persist its undoable state into `projectStore` so it flows through the existing temporal middleware. New stores wrapped with `temporal` directly are disallowed without a superseding ADR.

After an undo or redo, the selection is reconciled to the resulting project state (selected IDs that no longer exist are dropped silently). The selection itself is not restored to whatever it was at the previous undo step.

## Alternatives considered

- **Wrap `selectionStore` with `temporal`.** Rejected. Undo would rewind through every click, making Cmd+Z unable to undo a real edit until the user clicked through their selection history. Empirically users do not expect selection to be on the undo timeline; this matches the Figma/Sketch/Illustrator convention.

- **Treat selection as derived from `projectStore`.** Rejected. Selection is a UI concern (which part am I about to act on), not a domain concern. Coupling it to project state means every selection click is a `projectStore` mutation, which triggers a `temporal` history slot and rerenders every component that subscribes to the project store.

- **Snapshot+restore selection alongside undo, but outside `temporal`.** Considered but rejected. It would require parallel history stacks that have to be kept in sync with `temporal`'s internal stack. The complexity is high and the user value is low; the current behavior (selection survives unaffected unless its target is undone away) is what users expect.

## Consequences

- **Easier:** `interactionStore`, overlay components, and any session-scoped state can be added without considering undo at all. The session controller (§3) does not need to coordinate with `zundo`.
- **Easier:** The undo history stays short and meaningful. Each entry corresponds to a user-visible edit.
- **Harder:** A future "remember my workspace state" feature (snapshot UI state across reload) would need a separate persistence path. Acceptable — that's not user-visible undo.
- **Harder for misuse:** Anyone tempted to wrap a new store with `temporal` must justify it in a superseding ADR. This is a feature, not a bug.
- **Migration cost:** Zero. The codebase already conforms to this rule. The ADR exists to lock the rule in writing so the redesign phases do not accidentally regress it.

## Open questions

None.

## References

- Blueprint: invariant "Selection lives outside zundo"
- Code: [`packages/desktop/src/renderer/src/store/projectStore.ts:382`](../../../packages/desktop/src/renderer/src/store/projectStore.ts#L382) — sole `temporal()` wrap
- Code: [`packages/desktop/src/renderer/src/store/selectionStore.ts`](../../../packages/desktop/src/renderer/src/store/selectionStore.ts) — plain `create()`, no temporal
- Code: [`packages/desktop/src/renderer/src/store/interactionStore.ts`](../../../packages/desktop/src/renderer/src/store/interactionStore.ts) — plain `create()`, session state
- Execution plan: [interaction-architecture-execution-plan.md](../interaction-architecture-execution-plan.md) "Decisions locked"
