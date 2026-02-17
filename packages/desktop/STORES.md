# Store Architecture

This document describes the Zustand store architecture for Carvd Studio's renderer process.

## Store Inventory

| Store                     | File                      | Fields | Actions | Middleware         | Purpose                                                          |
| ------------------------- | ------------------------- | ------ | ------- | ------------------ | ---------------------------------------------------------------- |
| `useProjectStore`         | `projectStore.ts`         | 18     | 48      | `temporal` (zundo) | Domain data: parts, stocks, groups, assemblies, project settings |
| `useUIStore`              | `uiStore.ts`              | 6      | 10      | —                  | Transient UI: context menu, toast, modals, pending deletes       |
| `useCameraStore`          | `cameraStore.ts`          | 9      | 10      | —                  | Camera state, display mode, grid, grain visibility               |
| `useSelectionStore`       | `selectionStore.ts`       | 8      | 17      | subscriber bridge  | Part/group selection, hover, drag, group expand/collapse         |
| `useSnapStore`            | `snapStore.ts`            | 4      | 8       | —                  | Snap-to-parts, snap lines, reference parts/distances             |
| `useAssemblyEditingStore` | `assemblyEditingStore.ts` | 4      | 5       | —                  | Assembly editing session (snapshot/restore)                      |
| `useClipboardStore`       | `clipboardStore.ts`       | 1      | 4       | —                  | Copy/paste clipboard for parts and groups                        |
| `useLicenseStore`         | `licenseStore.ts`         | 1      | 1       | —                  | License mode (`trial` / `licensed` / `free`)                     |
| `useAppSettingsStore`     | `appSettingsStore.ts`     | 3      | 2       | electron listener  | App preferences persisted via Electron                           |

All store files are in `src/renderer/src/store/`.

## Undo/Redo (Temporal)

Only `useProjectStore` has undo/redo via the `temporal` (zundo) middleware.

- **`partialize`**: Snapshots 18 domain fields. Excludes `filePath` and `isDirty` (metadata, not undoable).
- **`limit`**: 100 history entries.
- **`equality`**: `JSON.stringify` comparison to skip duplicate snapshots.
- **Access**: `useProjectStore.temporal.getState()` provides `undo()`, `redo()`, `clear()`.

The other 8 stores hold transient/UI state that should **not** be undoable.

## Cross-Store Dependencies

Arrows show which stores are read from within another store's actions (via `useOtherStore.getState()`).

```
projectStore ──→ uiStore (showToast)
             ──→ selectionStore (read selectedPartIds, clear on new/load)
             ──→ snapStore (reset on new/load)
             ──→ cameraStore (reset on new/load)
             ──→ clipboardStore (clear on new/load)
             ──→ licenseStore (read licenseMode for limit checks)

clipboardStore ──→ projectStore (read parts/groups/stocks for copy/paste)
               ──→ selectionStore (read selectedPartIds)
               ──→ licenseStore (read licenseMode)
               ──→ uiStore (showToast)

uiStore ──→ projectStore (generate thumbnail)
        ──→ licenseStore (read licenseMode)

selectionStore ──→ projectStore (isDescendantOf for group editing)
               ──→ snapStore (updateReferenceDistances on selection change)

snapStore ──→ projectStore (getAllDescendantPartIds, read parts)
          ──→ selectionStore (read selectedPartIds)

assemblyEditingStore ──→ projectStore (newProject, loadProject, addPart, etc.)
                     ──→ selectionStore (clear selection)
                     ──→ snapStore (clear references)
                     ──→ cameraStore (center camera)

licenseStore ──→ (none)
cameraStore ──→ (none)
appSettingsStore ──→ (none, uses Electron API directly)
```

## Reset Behavior

When `newProject()` or `loadProject()` is called on `projectStore`:

| Store                | Reset? | What resets                                                                 |
| -------------------- | ------ | --------------------------------------------------------------------------- |
| projectStore         | Yes    | All 18 domain fields to defaults or loaded values                           |
| selectionStore       | Yes    | `selectedPartIds`, `selectedGroupIds`, `expandedGroupIds`, `editingGroupId` |
| snapStore            | Yes    | `referencePartIds`, `activeSnapLines`, `activeReferenceDistances`           |
| cameraStore          | Yes    | `cameraState` cleared, `pendingCameraRestore` cleared                       |
| clipboardStore       | Yes    | `clipboard` cleared                                                         |
| uiStore              | No     | Toast/context menu/modals are independent                                   |
| licenseStore         | No     | License mode is app-wide runtime state                                      |
| assemblyEditingStore | No     | Has its own snapshot/restore lifecycle                                      |
| appSettingsStore     | No     | Persisted app preferences, independent of projects                          |

## Usage Patterns

### Reading from another store inside an action

```typescript
// In projectStore action:
const { licenseMode } = useLicenseStore.getState();
const { selectedPartIds } = useSelectionStore.getState();
```

### Component selectors

```typescript
// Fine-grained selector (re-renders only when parts change)
const parts = useProjectStore((s) => s.parts);

// Multiple fields with useShallow (re-renders when any field changes)
const { selectedPartIds, hoveredPartId } = useSelectionStore(
  useShallow((s) => ({ selectedPartIds: s.selectedPartIds, hoveredPartId: s.hoveredPartId }))
);
```

### Exported helper functions

`projectStore.ts` exports pure helper functions used by multiple stores and components:

| Helper                                              | Description                                              |
| --------------------------------------------------- | -------------------------------------------------------- |
| `generateCopyName(name)`                            | Smart copy naming ("Part 1" → "Part 1 (copy)")           |
| `getContainingGroupId(partId, groupMembers)`        | Find which group a part belongs to                       |
| `getAllDescendantPartIds(groupId, groupMembers)`    | Recursively get all part IDs in a group (memoized)       |
| `getAllDescendantGroupIds(groupId, groupMembers)`   | Recursively get all group IDs including the group itself |
| `getAncestorGroupIds(partId, groupMembers)`         | Walk up the hierarchy to find ancestor groups            |
| `isDescendantOf(childId, ancestorId, groupMembers)` | Check group containment (circular reference prevention)  |
| `validatePartsForCutList(parts, stocks)`            | Validate parts before cut list generation                |
