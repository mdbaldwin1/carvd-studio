# Desktop App: UI Component Architecture Review

**Created:** 2026-02-14
**Status:** 🟡 SIGNIFICANT IMPROVEMENTS NEEDED
**Reviewer:** Claude
**Priority:** HIGH

## Executive Summary

The component architecture has several maintainability issues:

1. **Monster components** (1,974 lines!) that violate Single Responsibility Principle
2. **Flat component directory** with ~50 components in one folder
3. **Unclear separation of concerns** between components
4. **Limited component reusability** due to tight coupling

### Severity Breakdown

- 🔴 **Critical:** 1 issue (monster components)
- 🟡 **Medium:** 4 issues (organization, coupling, reusability, documentation)
- 🟢 **Low:** 2 issues (naming, testing)

---

## Critical Issues

### 1. 🔴 Monster Components (Violate SRP)

**Issue:** Several components are massive and do too much

**Largest Components:**

1. **Part.tsx** - 1,974 lines 🚨
2. **Workspace.tsx** - 1,621 lines 🚨
3. **CutListModal.tsx** - 1,126 lines 🚨
4. **StockLibraryModal.tsx** - 968 lines 🚨
5. **AppSettingsModal.tsx** - 568 lines ⚠️
6. **ContextMenu.tsx** - 548 lines ⚠️
7. **StartScreen.tsx** - 539 lines ⚠️

**Problems:**

1. **Unmaintainable**
   - Too much logic to understand at once
   - Hard to debug
   - High cognitive load
   - Difficult to test effectively

2. **Violates Single Responsibility Principle**
   - Component doing too many things
   - Mixed concerns (UI, logic, state management)
   - Hard to reuse parts of the functionality

3. **Poor Developer Experience**
   - Slow to load in editor
   - Hard to navigate
   - Difficult to find specific logic
   - New developers will struggle

4. **Testing Challenges**
   - Test files also huge (CutListModal.test.tsx is 1,000 lines!)
   - Hard to test in isolation
   - Many edge cases to cover

**Impact:** 🔴 CRITICAL - These components are technical debt bombs

**Recommendations:**

#### Part.tsx (1,974 lines) - Break Into Multiple Components

**Likely Structure** (needs investigation):

```
Part/
  ├── Part.tsx (main component, <100 lines)
  ├── PartGeometry.tsx (Three.js mesh, materials)
  ├── PartInteraction.tsx (drag, select, hover handlers)
  ├── PartLabel.tsx (dimensions display)
  ├── PartGrain.tsx (grain direction indicator)
  ├── PartEdges.tsx (edge highlighting)
  ├── ReferenceLines.tsx (reference distance indicators)
  └── usePartInteraction.ts (custom hook for interaction logic)
```

**Estimated Effort:** 1-2 weeks (careful refactoring needed)

#### Workspace.tsx (1,621 lines) - Break Into Feature Components

**Likely Structure** (needs investigation):

```
Workspace/
  ├── Workspace.tsx (main orchestrator)
  ├── WorkspaceCanvas.tsx (Three.js Canvas setup)
  ├── WorkspaceCamera.tsx (Camera controls)
  ├── WorkspaceControls.tsx (orbit controls, keyboard)
  ├── WorkspaceGrid.tsx (floor grid)
  ├── WorkspaceLighting.tsx (lights)
  ├── WorkspaceScene.tsx (scene setup, fog, background)
  ├── WorkspaceHelpers.tsx (axes, reference indicators)
  ├── PartRenderer.tsx (renders all Part components)
  └── hooks/
      ├── useWorkspaceCamera.ts
      ├── useWorkspaceSelection.ts
      └── useWorkspaceInteraction.ts
```

**Estimated Effort:** 2-3 weeks

#### CutListModal.tsx (1,126 lines) - Break Into Sub-Components

**Likely Structure:**

```
CutListModal/
  ├── CutListModal.tsx (main modal shell)
  ├── CutListTable.tsx (table display)
  ├── CutListStockCard.tsx (stock sheet visualization)
  ├── CutListOptimizerControls.tsx (optimizer settings)
  ├── CutListShoppingList.tsx (shopping list generation)
  ├── CutListExportButton.tsx (PDF export)
  ├── CutListSummary.tsx (stats, totals)
  └── useCutListOptimization.ts (optimization logic hook)
```

**Estimated Effort:** 1-2 weeks

#### StockLibraryModal.tsx (968 lines) - Break Into Sub-Components

**Likely Structure:**

```
StockLibraryModal/
  ├── StockLibraryModal.tsx (main modal)
  ├── StockList.tsx (list of stock items)
  ├── StockListItem.tsx (individual stock item)
  ├── StockDetails.tsx (detail view/edit)
  ├── StockConstraints.tsx (dimension constraints)
  ├── StockImportExport.tsx (import/export buttons)
  └── useStockLibrary.ts (already exists!)
```

**Estimated Effort:** 1 week

---

## Medium Priority Issues

### 2. 🟡 Flat Component Directory Structure

**Issue:** All ~50 components in single flat directory

**Current Structure:**

```
components/
  ├── AboutModal.tsx
  ├── AboutModal.test.tsx
  ├── AddAssemblyModal.tsx
  ├── AddAssemblyModal.test.tsx
  ├── ...
  └── (48 more files)
```

**Problems:**

1. Hard to find related components
2. No clear feature grouping
3. Doesn't scale as app grows
4. Unclear component relationships

**Impact:** 🟡 MEDIUM - Slows navigation, reduces clarity

**Recommended Structure:**

```
components/
  ├── common/              # Reusable components
  │   ├── Button/
  │   ├── Modal/
  │   ├── ColorPicker/
  │   ├── FractionInput/
  │   ├── HelpTooltip/
  │   ├── LoadingSpinner/
  │   ├── ProgressBar/
  │   └── Toast/
  │
  ├── layout/              # Layout components
  │   ├── AppHeader/
  │   ├── Sidebar/
  │   ├── Toolbar/
  │   └── HotkeyHints/
  │
  ├── workspace/           # 3D workspace feature
  │   ├── Workspace/
  │   ├── Part/
  │   ├── Grid/
  │   ├── Camera/
  │   └── SelectionBox/
  │
  ├── project/             # Project management
  │   ├── StartScreen/
  │   ├── NewProjectDialog/
  │   ├── ProjectSettingsModal/
  │   └── RecoveryDialog/
  │
  ├── stock/               # Stock/materials feature
  │   ├── AddStockModal/
  │   ├── EditStockModal/
  │   ├── StockLibraryModal/
  │   └── CutListModal/
  │
  ├── assembly/            # Assembly feature
  │   ├── AddAssemblyModal/
  │   ├── SaveAssemblyModal/
  │   ├── AssemblyEditingBanner/
  │   └── AssemblyEditingExitDialog/
  │
  ├── template/            # Template feature
  │   ├── TemplatesScreen/
  │   ├── TemplateBrowserModal/
  │   ├── TemplateEditingBanner/
  │   └── TemplateEditingExitDialog/
  │
  ├── settings/            # Settings/preferences
  │   ├── AppSettingsModal/
  │   └── ProjectSettingsModal/
  │
  ├── licensing/           # Trial/licensing
  │   ├── LicenseActivationModal/
  │   ├── TrialBanner/
  │   └── TrialExpiredModal/
  │
  ├── tutorial/            # Tutorial/onboarding
  │   ├── WelcomeTutorial/
  │   ├── TutorialOverlay/
  │   └── TutorialTooltip/
  │
  └── parts-list/          # Parts list feature
      ├── HierarchicalPartsList/
      └── ImportToLibraryDialog/
```

**Benefits:**

- Clear feature boundaries
- Easier to find related components
- Better for code splitting
- Scales as app grows
- Easier for new developers

**Estimated Effort:** 2-3 days (mainly moving files and updating imports)

---

### 3. 🟡 Unclear Component Responsibilities

**Issue:** Some components have overlapping or unclear responsibilities

**Examples to Investigate:**

- **FileMenu** vs **useMenuCommands** - Where does menu logic belong?
- **Workspace** vs **Canvas** - What's the separation?
- **ContextMenu** - Does too much? (548 lines)
- **App.tsx** - 40+ imports, orchestrating everything

**Problems:**

1. Difficult to understand what each component does
2. Logic duplication possible
3. Tight coupling between components
4. Hard to test in isolation

**Impact:** 🟡 MEDIUM - Increases maintenance cost

**Recommendation:**

1. Document each component's responsibility in a `README.md` or component doc comments
2. Ensure clear Single Responsibility for each component
3. Extract shared logic into custom hooks
4. Use composition over inheritance/props drilling

**Estimated Effort:** 1 week (analysis + refactoring)

---

### 4. 🟡 Limited Component Reusability

**Issue:** Difficult to reuse components outside their original context

**Observations:**

- Many modal components are feature-specific
- Hard to extract common patterns
- Tight coupling to Zustand stores
- Limited prop-based customization

**Problems:**

1. Code duplication
2. Inconsistent UI patterns
3. Harder to maintain consistency
4. Difficult to build Storybook or style guide

**Impact:** 🟡 MEDIUM - Reduces productivity, increases inconsistency

**Recommendation:**

1. Extract common patterns into reusable primitives:
   - `<Modal>` base component
   - `<Button>` variants (primary, secondary, danger, etc.)
   - `<Input>`, `<Select>`, `<Checkbox>` form primitives
   - `<Table>` component with sortable columns
   - `<Card>`, `<Section>` layout components

2. Use composition for customization:

   ```tsx
   // Instead of many specific modals, compose from primitives
   <Modal>
     <ModalHeader>{title}</ModalHeader>
     <ModalBody>{children}</ModalBody>
     <ModalFooter>{actions}</ModalFooter>
   </Modal>
   ```

3. Separate business logic from UI:

   ```tsx
   // Business logic in hook
   const { data, isLoading, submit } = useStockLibrary();

   // UI component receives data via props
   <StockLibrary stocks={data} isLoading={isLoading} onSubmit={submit} />;
   ```

**Estimated Effort:** 2-3 weeks (ongoing refactoring)

---

### 5. 🟡 Insufficient Component Documentation

**Issue:** Most components lack documentation

**Current State:**

- No component doc comments
- No prop type documentation
- No usage examples
- No Storybook or component library

**Problems:**

1. Hard for new developers to understand how to use components
2. Unclear what props do
3. No visual reference for components
4. Hard to test components in isolation

**Impact:** 🟡 MEDIUM - Slows development and onboarding

**Recommendation:**

1. Add JSDoc comments to components:

   ```tsx
   /**
    * Modal for adding new stock to the library
    *
    * @param isOpen - Controls modal visibility
    * @param onClose - Callback when modal is closed
    * @param onSave - Callback when stock is saved
    */
   export function AddStockModal({ isOpen, onClose, onSave }: Props) {
     // ...
   }
   ```

2. Document complex props with TSDoc:

   ```tsx
   interface StockProps {
     /** Unique identifier for the stock */
     id: string;
     /** Display name (e.g., "3/4\" Plywood") */
     name: string;
     /** Stock type: "plywood" or "board" */
     type: StockType;
     // ...
   }
   ```

3. Consider Storybook for visual documentation:
   - See components in isolation
   - Test different states/props
   - Design system documentation
   - Useful for designers and developers

**Estimated Effort:**

- JSDoc comments: 1-2 weeks
- Storybook setup: 1-2 weeks

---

## Low Priority Issues

### 6. 🟢 Inconsistent Component Naming

**Issue:** Some naming inconsistencies

**Examples:**

- `HelpTooltip` vs `TutorialTooltip` (why not both `...Tooltip`?)
- `FileMenu` vs `ContextMenu` (both menus, different patterns?)
- `StartScreen` vs `TemplatesScreen` (screens, good!)

**Impact:** 🟢 LOW - Minor confusion, easily fixed

**Recommendation:**

- Establish naming conventions:
  - `...Modal` for modals
  - `...Dialog` for confirmation dialogs
  - `...Screen` for full-screen views
  - `...Banner` for notification banners
  - `...Tooltip` for tooltips
  - `...Menu` for menus

**Estimated Effort:** 1 day (rename + update imports)

---

### 7. 🟢 Test Files Mixed with Source

**Issue:** `.test.tsx` files in same directory as source

**Current:**

```
components/
  ├── Modal.tsx
  ├── Modal.test.tsx
  ├── Button.tsx
  └── Button.test.tsx
```

**Impact:** 🟢 LOW - Clutters directory, but not a major issue

**Alternative:**

```
components/
  ├── Modal/
  │   ├── index.tsx
  │   ├── Modal.tsx
  │   └── __tests__/
  │       └── Modal.test.tsx
  └── Button/
      ├── index.tsx
      ├── Button.tsx
      └── __tests__/
          └── Button.test.tsx
```

**Note:** Current approach is fine. Only worth changing if doing major reorganization.

---

## Positive Aspects

✅ **Good Separation:** Main/Renderer/Preload processes properly separated
✅ **Custom Hooks:** Good use of hooks for logic extraction
✅ **TypeScript:** Strong typing throughout
✅ **Testing:** Comprehensive test coverage
✅ **Component Tests:** Testing Library usage is good

---

## Recommended Action Plan

### Phase 1: High-Impact Quick Wins (1-2 Weeks)

1. **Break up Part.tsx** into smaller components (highest impact)
2. Reorganize components into feature directories
3. Add JSDoc comments to top 10 most-used components

### Phase 2: Major Refactoring (3-4 Weeks)

1. Break up Workspace.tsx into smaller components
2. Break up CutListModal.tsx into smaller components
3. Extract reusable primitives (Modal, Button, Input, etc.)
4. Document all component responsibilities

### Phase 3: Polish & Optimization (2-3 Weeks)

1. Break up remaining large components
2. Ensure consistent naming conventions
3. Consider Storybook for component documentation
4. Create component design system guide

### Phase 4: Ongoing

1. Enforce component size limits in code review (<300 lines ideally)
2. Keep component documentation updated
3. Refactor as needed when touching components
4. Build component library incrementally

---

## Questions for Team Discussion

1. **Priority:** Should we tackle Part.tsx or Workspace.tsx first?
2. **Approach:** Big bang refactor or incremental?
3. **Storybook:** Do we want visual component documentation?
4. **Testing:** Do we need to update tests during refactoring?
5. **Timeline:** How much time can we dedicate to this?

---

## Metrics to Track

After refactoring:

- Average component size (should be <200 lines)
- Largest component size (should be <500 lines)
- Component reusability (how many times is `<Modal>` used?)
- Test coverage (should maintain or improve)
- Time to find and modify components (should decrease)

---

## Related Review Documents

- `09-desktop-styling.md` - Styling architecture affects component structure
- `08-desktop-state-management.md` - Store coupling affects component design
- `10-desktop-testing.md` - Testing strategy affects component architecture

---

## Status

- [x] Initial review completed
- [ ] Largest components analyzed in detail
- [ ] Refactoring plan created
- [ ] Part.tsx refactored
- [ ] Workspace.tsx refactored
- [ ] CutListModal.tsx refactored
- [ ] Component organization updated
- [ ] Documentation added

**Next Step:** Deep analysis of Part.tsx to plan refactoring
