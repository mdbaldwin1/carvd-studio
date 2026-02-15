# Desktop App: State Management Review

**Created:** 2026-02-14
**Status:** 🔴 CRITICAL ISSUES IDENTIFIED
**Reviewer:** Claude
**Priority:** HIGH

## Executive Summary

The state management architecture has a **god object** anti-pattern issue - a single massive Zustand store (2,663 lines) managing nearly all application state.

### Severity Breakdown

- 🔴 **Critical:** 1 issue (god object store)
- 🟡 **Medium:** 3 issues (state organization, tight coupling, performance)
- 🟢 **Low:** 2 issues (documentation, testing)

---

## Critical Issues

### 1. 🔴 God Object Anti-Pattern: Massive projectStore

**File:** `packages/desktop/src/renderer/src/store/projectStore.ts`
**Lines:** 2,663 lines 🚨
**Test File:** 3,031 lines

**Issue:** Single monolithic store managing too much state

**Store Responsibilities (Way Too Many):**

1. Project metadata (name, file path, dirty flag)
2. Parts management (CRUD operations)
3. Stock management (CRUD operations)
4. Groups management
5. Assemblies management
6. Selection state (parts, groups)
7. UI state (hover, transform mode, drag delta)
8. Context menu state
9. Camera state and requests
10. Selection box
11. Toast notifications
12. Thumbnails
13. Clipboard
14. Snap-to-parts (snap lines, guides, reference parts)
15. Cut list state and modal
16. Display settings (grid, display mode)
17. Assembly editing mode
18. Custom shopping items
19. License mode
20. Project settings (units, grid size, kerf, overage)
21. Stock constraints
22. Grain direction display
23. Pending delete state
24. Camera view vectors
25. Reference distance indicators

**Problems:**

1. **Violates Single Responsibility Principle**
   - Store doing way too much
   - Hard to understand what belongs where
   - High cognitive load
   - Difficult to reason about state changes

2. **Poor Separation of Concerns**
   - UI state mixed with domain state
   - Transient state mixed with persistent state
   - Feature-specific state all in one place
   - Makes it hard to save/restore project state

3. **Performance Issues**
   - Every state change notifies ALL subscribers
   - Components may re-render unnecessarily
   - Hard to optimize with selectors
   - Undo/redo stores entire state (huge snapshots)

4. **Testing Challenges**
   - Test file is 3,031 lines (even bigger than store!)
   - Hard to test features in isolation
   - Must mock entire store for small tests
   - High setup overhead for each test

5. **Maintainability Nightmare**
   - Hard to find specific state/actions
   - Easy to create bugs by modifying wrong state
   - Difficult to refactor
   - New features forced into same store

**Impact:** 🔴 CRITICAL - This is a major architectural issue that will get worse over time

**Recommendation: Split into Multiple Stores**

**Proposed Architecture:**

```tsx
// Core project data (persisted)
projectStore.ts (500-800 lines)
  - projectName, filePath, isDirty
  - parts, stocks, groups, assemblies
  - snapGuides, cutList
  - createdAt, modifiedAt, version
  - units, gridSize, kerfWidth, overageFactor
  - stockConstraints, customShoppingItems

// UI/selection state (transient)
selectionStore.ts (300-400 lines)
  - selectedPartIds, selectedGroupIds
  - hoveredPartId
  - transformMode
  - activeDragDelta
  - selectionBox
  - expandedGroupIds

// Camera/viewport state
cameraStore.ts (200-300 lines)
  - cameraState
  - cameraViewVectors
  - centerCameraRequested
  - centerCameraAtOriginRequested
  - centerCameraAtPosition
  - displayMode, showGrid, showGrainDirection

// Clipboard (shared state)
clipboardStore.ts (100-150 lines)
  - clipboard.parts
  - clipboard.groups
  - copy/paste actions

// Snap system state
snapStore.ts (200-300 lines)
  - snapToPartsEnabled
  - activeSnapLines
  - referencePartIds
  - activeReferenceDistances

// Modal/dialog state (transient)
uiStore.ts (200-300 lines)
  - contextMenu
  - toast
  - pendingDeletePartIds
  - cutListModalOpen
  - saveAssemblyModalOpen
  - manualThumbnail

// Assembly editing mode state
assemblyEditingStore.ts (200-300 lines)
  - isEditingAssembly
  - editingAssemblyId
  - editingAssemblyName
  - previousProjectSnapshot

// License/feature limits (rarely changes)
licenseStore.ts (100-150 lines)
  - licenseMode
  - feature limit checks
```

**Benefits:**

1. **Better Performance**
   - Components only subscribe to relevant stores
   - Less unnecessary re-renders
   - Smaller undo/redo snapshots (only project data)

2. **Better Organization**
   - Clear boundaries between concerns
   - Easier to find state/actions
   - Logical grouping

3. **Better Testing**
   - Test stores in isolation
   - Smaller test files
   - Less setup overhead

4. **Better Maintainability**
   - Changes isolated to relevant store
   - Less risk of breaking unrelated features
   - Easier to understand

5. **Better Persistence**
   - Only projectStore needs to be saved to file
   - Clear separation of transient vs persistent state
   - Easier to implement auto-save

**Migration Strategy:**

1. Start with least-coupled state (uiStore, cameraStore)
2. Extract one store at a time
3. Update components incrementally
4. Keep tests passing throughout
5. Remove extracted state from projectStore last

**Estimated Effort:** 3-4 weeks (careful refactoring needed)

---

## Medium Priority Issues

### 2. 🟡 Unclear State Organization

**Issue:** No clear pattern for organizing state within the store

**Current State:**

```tsx
interface ProjectState {
  // Comments like "Project data", "UI state" help
  // But still 25+ concerns mixed together
  // Hard to tell what's persistent vs transient
  // Hard to tell what's feature-specific vs global
}
```

**Problems:**

1. Hard to understand relationships
2. Difficult to know where new state goes
3. Unclear ownership of state

**Impact:** 🟡 MEDIUM - Slows development, increases errors

**Recommendation:**

- Split stores as described above
- Within each store, group related state
- Use TypeScript interfaces to enforce structure
- Document persistent vs transient clearly

---

### 3. 🟡 Tight Coupling to Components

**Issue:** Many components directly use the store, making them hard to reuse

**Example Pattern:**

```tsx
// Component directly coupled to store
function MyComponent() {
  const parts = useProjectStore((s) => s.parts);
  const addPart = useProjectStore((s) => s.addPart);
  // ...
}
```

**Problems:**

1. Component can't be used without store
2. Hard to test component in isolation
3. Can't reuse component in different context
4. Difficult to build Storybook

**Impact:** 🟡 MEDIUM - Reduces reusability, complicates testing

**Recommendation:**

- Use custom hooks to abstract store access:

  ```tsx
  // Hook abstracts store
  function usePartManagement() {
    const parts = useProjectStore((s) => s.parts);
    const addPart = useProjectStore((s) => s.addPart);
    return { parts, addPart };
  }

  // Component receives data via props (more reusable)
  function PartsList({ parts, onAdd }) {
    // ...
  }

  // Container connects to store
  function PartsListContainer() {
    const { parts, addPart } = usePartManagement();
    return <PartsList parts={parts} onAdd={addPart} />;
  }
  ```

- Separate presentational from container components
- Test presentational components with props (no store)
- Test hooks separately from components

**Estimated Effort:** 2-3 weeks (ongoing refactoring)

---

### 4. 🟡 Potential Performance Issues

**Issue:** Large store may cause unnecessary re-renders

**Current State:**

- Zustand is generally performant
- But large stores with many subscribers can cause issues
- Every action that modifies store notifies all subscribers
- Undo/redo snapshots entire state (2,663 lines of state!)

**Problems:**

1. More state = more chance of irrelevant re-renders
2. Large undo/redo snapshots (memory usage)
3. Difficult to optimize with memoization

**Impact:** 🟡 MEDIUM - May cause performance issues at scale

**Recommendation:**

- Split stores (addresses most issues)
- Use granular selectors:

  ```tsx
  // Bad: subscribes to all parts changes
  const parts = useProjectStore((s) => s.parts);

  // Good: only subscribes to specific part
  const part = useProjectStore((s) => s.parts.find((p) => p.id === id));

  // Better: memoized selector
  const selectPartById = (id: string) => (s: ProjectState) =>
    s.parts.find((p) => p.id === id);
  const part = useProjectStore(selectPartById(id));
  ```

- Consider `temporal` options to exclude transient state from undo:
  ```tsx
  const useStore = create(
    temporal(
      (set, get) => ({...}),
      {
        partialize: (state) => {
          // Only include persistent state in undo/redo
          const { toast, contextMenu, hoveredPartId, ...persisted } = state;
          return persisted;
        }
      }
    )
  );
  ```

**Estimated Effort:** 1-2 weeks (profiling + optimization)

---

## Low Priority Issues

### 5. 🟢 Limited Store Documentation

**Issue:** Store actions lack documentation

**Current State:**

- TypeScript types provide some documentation
- But complex actions need explanation
- No examples of usage patterns

**Impact:** 🟢 LOW - Mostly affects new developers

**Recommendation:**

- Add JSDoc comments to complex actions:

  ```tsx
  /**
   * Duplicates selected parts and adds them to the project with new IDs.
   * Maintains relative positioning of parts.
   *
   * @returns Array of new part IDs
   */
  duplicateSelectedParts: () => string[];
  ```

- Document state relationships
- Add usage examples in comments

**Estimated Effort:** 1-2 days

---

### 6. 🟢 Store Test File Too Large

**Issue:** projectStore.test.ts is 3,031 lines (larger than the store itself!)

**Impact:** 🟢 LOW - Tests work, but hard to navigate

**Recommendation:**

- Split test file to match store organization:

  ```
  projectStore/
    ├── projectStore.ts
    └── __tests__/
        ├── parts.test.ts
        ├── stocks.test.ts
        ├── groups.test.ts
        ├── selection.test.ts
        ├── camera.test.ts
        └── clipboard.test.ts
  ```

- When splitting stores, split tests accordingly

**Estimated Effort:** 1-2 days

---

## Positive Aspects

✅ **Zustand:** Good choice of state library (simple, performant)
✅ **Zundo:** Undo/redo integration is excellent
✅ **TypeScript:** Strong typing throughout
✅ **Test Coverage:** Comprehensive testing (76% branch coverage)
✅ **Immer Integration:** Zustand uses Immer for immutable updates (implicit)

---

## Comparison: Zustand vs Alternatives

**Current: Zustand** ✅ Good Choice

- Simple API
- Good performance
- TypeScript support
- Small bundle size
- Easy testing

**Alternative: Redux Toolkit**

- More boilerplate
- Better DevTools
- More structured (enforced patterns)
- Larger ecosystem
- NOT RECOMMENDED (Zustand is simpler and sufficient)

**Alternative: Jotai/Recoil**

- Atomic state (many small stores)
- More complex mental model
- Better for large apps
- NOT RECOMMENDED (unnecessary complexity)

**Recommendation:** Stick with Zustand, just split into multiple stores.

---

## Recommended Action Plan

### Phase 1: Analysis & Planning (1 Week)

1. ✅ Identify issues (this document)
2. Map state dependencies (what depends on what)
3. Design store boundaries
4. Create migration plan
5. Set up tracking for performance metrics

### Phase 2: Extract UI/Transient State (2 Weeks)

1. Create `uiStore` (toast, context menu, modals)
2. Create `cameraStore` (camera state, view settings)
3. Create `selectionStore` (selected parts/groups)
4. Update components to use new stores
5. Test thoroughly

### Phase 3: Extract Feature State (2 Weeks)

1. Create `snapStore` (snap-to-parts system)
2. Create `assemblyEditingStore` (assembly editing mode)
3. Create `clipboardStore` (copy/paste)
4. Update components
5. Test thoroughly

### Phase 4: Extract Domain State (1 Week)

1. Create `licenseStore` (license mode, feature limits)
2. Consider splitting projectStore further if still large
3. Update remaining components
4. Test thoroughly

### Phase 5: Optimization (1 Week)

1. Profile rendering performance
2. Optimize selectors
3. Configure temporal (undo/redo) to exclude transient state
4. Measure improvements
5. Document patterns

### Phase 6: Documentation (3-4 Days)

1. Document store architecture
2. Add JSDoc comments
3. Create usage examples
4. Update testing guide

**Total Estimated Effort:** 6-7 weeks

---

## Questions for Team Discussion

1. **Priority:** Is this a high priority given current roadmap?
2. **Approach:** Big bang or incremental migration?
3. **Testing:** How do we ensure tests pass throughout migration?
4. **Performance:** Have we observed actual performance issues?
5. **Timeline:** Can we allocate 6-7 weeks for this?

---

## Metrics to Track

Before and after migration:

- Store sizes (lines of code)
- Average re-renders per action (React DevTools Profiler)
- Undo/redo snapshot size (memory profiler)
- Test execution time
- Time to find specific state/action

---

## Related Review Documents

- `07-desktop-ui-components.md` - Component coupling to stores
- `10-desktop-testing.md` - Testing strategy with stores
- `01-desktop-architecture.md` - Overall architecture

---

## Status

- [x] Initial review completed
- [ ] State dependencies mapped
- [ ] Store boundaries designed
- [ ] Migration plan created
- [ ] uiStore extracted
- [ ] cameraStore extracted
- [ ] selectionStore extracted
- [ ] Other stores extracted
- [ ] Documentation updated

**Next Step:** Map state dependencies and design store boundaries
