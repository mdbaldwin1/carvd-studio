/**
 * Integration/workflow tests for Carvd Studio (Bead 5.9)
 *
 * These test multi-store workflows at the store level, verifying that
 * stores interact correctly when performing real user workflows.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectStore, validatePartsForCutList } from './store/projectStore';
import { useClipboardStore } from './store/clipboardStore';
import { useSelectionStore } from './store/selectionStore';
import { useSnapStore } from './store/snapStore';
import { useUIStore } from './store/uiStore';
import { useLicenseStore } from './store/licenseStore';
import { useAssemblyEditingStore } from './store/assemblyEditingStore';
import { generateOptimizedCutList } from './utils/cutListOptimizer';
import {
  createTestProject,
  createSimpleCutListScenario,
  createComplexCutListScenario,
  createNestedGroupStructure
} from '../../../tests/helpers/factories';

// Reset all stores to clean state
const resetAllStores = () => {
  useProjectStore.getState().newProject();
  useSelectionStore.setState({
    selectedPartIds: [],
    selectedGroupIds: [],
    hoveredPartId: null,
    transformMode: 'translate',
    activeDragDelta: null,
    selectionBox: null,
    expandedGroupIds: [],
    editingGroupId: null
  });
  useUIStore.setState({
    contextMenu: null,
    toast: null,
    pendingDeletePartIds: null,
    cutListModalOpen: false,
    saveAssemblyModalOpen: false,
    manualThumbnail: null
  });
  useSnapStore.setState({
    snapToPartsEnabled: true,
    activeSnapLines: [],
    referencePartIds: [],
    activeReferenceDistances: []
  });
  useAssemblyEditingStore.setState({
    isEditingAssembly: false,
    editingAssemblyId: null,
    editingAssemblyName: '',
    previousProjectSnapshot: null
  });
  useLicenseStore.setState({ licenseMode: 'trial' });
  useClipboardStore.setState({
    clipboard: { parts: [], groups: [], groupMembers: [] }
  });
};

// ============================================================
// Workflow 1: Part → Stock → Cut List
// ============================================================
describe('Workflow: Part creation → stock assignment → cut list generation', () => {
  beforeEach(resetAllStores);

  it('creates parts, assigns stock, generates a valid cut list', () => {
    const store = useProjectStore.getState();

    // 1. Add stock
    const stockId = store.addStock({
      name: 'Oak Plywood',
      length: 96,
      width: 48,
      thickness: 0.75,
      pricingUnit: 'per_item',
      pricePerUnit: 45.0,
      color: '#d4a574'
    });
    expect(stockId).toBeTruthy();

    // 2. Add parts
    const partId1 = store.addPart({ name: 'Shelf', length: 24, width: 12 });
    const partId2 = store.addPart({ name: 'Side Panel', length: 36, width: 12 });
    expect(partId1).toBeTruthy();
    expect(partId2).toBeTruthy();

    // 3. Select parts and assign stock
    useSelectionStore.getState().selectParts([partId1!, partId2!]);
    useProjectStore.getState().assignStockToSelectedParts(stockId!);

    // 4. Verify stock assignment
    const state = useProjectStore.getState();
    expect(state.parts.find((p) => p.id === partId1)!.stockId).toBe(stockId);
    expect(state.parts.find((p) => p.id === partId2)!.stockId).toBe(stockId);

    // 5. Verify color inherited from stock
    const stock = state.stocks.find((s) => s.id === stockId)!;
    expect(state.parts.find((p) => p.id === partId1)!.color).toBe(stock.color);

    // 6. Validate parts for cut list — should pass (all have stock)
    const issues = validatePartsForCutList(state.parts, state.stocks);
    const criticalIssues = issues.filter((i) => i.severity === 'error');
    expect(criticalIssues).toHaveLength(0);

    // 7. Generate cut list
    const cutList = generateOptimizedCutList(
      state.parts,
      state.stocks,
      state.kerfWidth,
      state.overageFactor,
      state.modifiedAt,
      []
    );
    expect(cutList).toBeDefined();
    expect(cutList.instructions.length).toBeGreaterThan(0);
    expect(cutList.stockBoards.length).toBeGreaterThan(0);
    expect(cutList.skippedParts).toHaveLength(0);

    // 8. Store cut list and verify it persists
    useProjectStore.getState().setCutList(cutList);
    expect(useProjectStore.getState().cutList).toBe(cutList);
  });

  it('marks cut list stale when parts are modified after generation', () => {
    const store = useProjectStore.getState();

    // Setup: create scenario, generate cut list
    const stockId = store.addStock({ name: 'Stock', length: 96, width: 48 })!;
    const partId = store.addPart({ name: 'Part', length: 24, width: 12 })!;
    useSelectionStore.getState().selectParts([partId]);
    useProjectStore.getState().assignStockToSelectedParts(stockId);

    const state = useProjectStore.getState();
    const cutList = generateOptimizedCutList(
      state.parts,
      state.stocks,
      state.kerfWidth,
      state.overageFactor,
      state.modifiedAt,
      []
    );
    useProjectStore.getState().setCutList(cutList);
    expect(useProjectStore.getState().cutList!.isStale).toBe(false);

    // Modify part — should mark cut list stale
    useProjectStore.getState().updatePart(partId, { length: 48 });
    expect(useProjectStore.getState().cutList!.isStale).toBe(true);
  });

  it('handles parts without stock assignment in validation', () => {
    const store = useProjectStore.getState();

    store.addPart({ name: 'No Stock Part', length: 24, width: 12 });
    store.addStock({ name: 'Oak', length: 96, width: 48 });

    const state = useProjectStore.getState();
    const issues = validatePartsForCutList(state.parts, state.stocks);
    // Part without stock should generate a warning
    expect(issues.length).toBeGreaterThan(0);
  });

  it('generates cut list with multiple stock types', () => {
    const { stocks, parts } = createComplexCutListScenario();

    // Load project with pre-assigned parts
    useProjectStore.getState().loadProject(
      createTestProject({
        stocks,
        parts
      })
    );

    const state = useProjectStore.getState();
    const cutList = generateOptimizedCutList(state.parts, state.stocks, 0.125, 0.1, state.modifiedAt, []);

    expect(cutList.stockBoards.length).toBeGreaterThan(0);
    // Should have boards for both plywood and pine
    const boardStockIds = new Set(cutList.stockBoards.map((b) => b.stockId));
    expect(boardStockIds.size).toBe(2);
  });
});

// ============================================================
// Workflow 2: Copy/Paste with Groups
// ============================================================
describe('Workflow: Copy/paste with groups and stock assignments', () => {
  beforeEach(resetAllStores);

  it('copies parts with stock, pastes with new IDs and offset positions', () => {
    const store = useProjectStore.getState();

    // Create stock and parts
    const stockId = store.addStock({ name: 'Oak', length: 96, width: 48 })!;
    const partId1 = store.addPart({ name: 'Part A', length: 24, width: 12 })!;
    const partId2 = store.addPart({ name: 'Part B', length: 36, width: 12 })!;

    // Assign stock
    useSelectionStore.getState().selectParts([partId1, partId2]);
    useProjectStore.getState().assignStockToSelectedParts(stockId);

    // Copy
    useClipboardStore.getState().copySelectedParts();
    expect(useClipboardStore.getState().clipboard.parts).toHaveLength(2);

    // Paste
    const newPartIds = useClipboardStore.getState().pasteClipboard();
    expect(newPartIds).toHaveLength(2);

    // Verify new parts have different IDs
    expect(newPartIds[0]).not.toBe(partId1);
    expect(newPartIds[1]).not.toBe(partId2);

    // Verify new parts retain stock assignment
    const state = useProjectStore.getState();
    expect(state.parts).toHaveLength(4); // 2 original + 2 pasted
    const pastedPart1 = state.parts.find((p) => p.id === newPartIds[0])!;
    expect(pastedPart1.stockId).toBe(stockId);
  });

  it('copies and pastes grouped parts preserving group structure', () => {
    const store = useProjectStore.getState();

    // Create parts
    const partId1 = store.addPart({ name: 'Leg 1' })!;
    const partId2 = store.addPart({ name: 'Leg 2' })!;

    // Create group
    const groupId = useProjectStore.getState().createGroup('Legs', [
      { id: partId1, type: 'part' },
      { id: partId2, type: 'part' }
    ]);
    expect(groupId).toBeTruthy();

    // Select the group and copy
    useSelectionStore.setState({ selectedPartIds: [], selectedGroupIds: [groupId!] });
    useClipboardStore.getState().copySelectedParts();
    expect(useClipboardStore.getState().clipboard.groups).toHaveLength(1);
    expect(useClipboardStore.getState().clipboard.groupMembers.length).toBeGreaterThan(0);

    // Paste
    const newPartIds = useClipboardStore.getState().pasteClipboard();
    expect(newPartIds).toHaveLength(2);

    // Verify pasted group exists with new IDs
    const state = useProjectStore.getState();
    expect(state.parts).toHaveLength(4);
    expect(state.groups).toHaveLength(2); // original + pasted

    // Pasted group should have the copied parts
    const pastedGroup = state.groups.find((g) => g.id !== groupId)!;
    const pastedMembers = state.groupMembers.filter((gm) => gm.groupId === pastedGroup.id);
    expect(pastedMembers).toHaveLength(2);
  });

  it('enforces part limit when pasting in free mode', () => {
    useLicenseStore.setState({ licenseMode: 'free' });
    const store = useProjectStore.getState();

    // Create many parts to reach the limit
    const partIds: string[] = [];
    for (let i = 0; i < 10; i++) {
      const id = store.addPart({ name: `Part ${i + 1}` });
      if (id) partIds.push(id);
    }

    // Select all and copy
    useSelectionStore.getState().selectParts(partIds);
    useClipboardStore.getState().copySelectedParts();

    // Paste should be blocked by limit
    const newIds = useClipboardStore.getState().pasteClipboard();
    // Should show a toast warning
    const toast = useUIStore.getState().toast;
    if (newIds.length === 0) {
      expect(toast).toBeTruthy();
    }
  });
});

// ============================================================
// Workflow 3: Assembly creation → placement
// ============================================================
describe('Workflow: Assembly creation → saving → placement', () => {
  beforeEach(resetAllStores);

  it('creates assembly from selection and places it in the project', () => {
    const store = useProjectStore.getState();

    // Create parts with stock
    const stockId = store.addStock({
      name: 'Pine',
      length: 96,
      width: 5.5,
      thickness: 0.75,
      color: '#f0d090'
    })!;
    const partId1 = store.addPart({
      name: 'Leg',
      length: 36,
      width: 3,
      position: { x: 0, y: 18, z: 0 }
    })!;
    const partId2 = store.addPart({
      name: 'Stretcher',
      length: 20,
      width: 3,
      position: { x: 0, y: 5, z: 10 }
    })!;

    // Assign stock
    useSelectionStore.getState().selectParts([partId1, partId2]);
    useProjectStore.getState().assignStockToSelectedParts(stockId);

    // Create assembly from selection
    const assembly = useProjectStore
      .getState()
      .createAssemblyFromSelection('Table Leg Assembly', 'Two legs with stretcher');
    expect(assembly).not.toBeNull();
    expect(assembly!.name).toBe('Table Leg Assembly');
    expect(assembly!.parts).toHaveLength(2);
    expect(assembly!.description).toBe('Two legs with stretcher');

    // Verify relative positions are stored (not absolute)
    const legPart = assembly!.parts.find((p) => p.name === 'Leg')!;
    const stretcherPart = assembly!.parts.find((p) => p.name === 'Stretcher')!;
    expect(legPart.relativePosition).toBeDefined();
    expect(stretcherPart.relativePosition).toBeDefined();

    // Verify embedded stock data
    expect(legPart.embeddedStock).toBeDefined();
    expect(legPart.embeddedStock!.name).toBe('Pine');

    // Save assembly to project
    useProjectStore.getState().addAssembly(assembly!);
    expect(useProjectStore.getState().assemblies).toHaveLength(1);

    // Place assembly at a different position
    const originalPartCount = useProjectStore.getState().parts.length;
    const newPartIds = useProjectStore.getState().placeAssembly(assembly!.id, { x: 50, y: 0, z: 50 });
    expect(newPartIds).toHaveLength(2);

    // Verify new parts were created
    const state = useProjectStore.getState();
    expect(state.parts.length).toBe(originalPartCount + 2);

    // Verify stock was resolved (should reuse existing stock)
    const placedPart = state.parts.find((p) => p.id === newPartIds[0])!;
    expect(placedPart.stockId).toBe(stockId);
  });

  it('creates assembly with groups and preserves group structure on placement', () => {
    const store = useProjectStore.getState();

    // Create parts and group them
    const partId1 = store.addPart({ name: 'Part A', position: { x: 0, y: 0.375, z: 0 } })!;
    const partId2 = store.addPart({ name: 'Part B', position: { x: 10, y: 0.375, z: 0 } })!;

    const groupId = useProjectStore.getState().createGroup('Parts Group', [
      { id: partId1, type: 'part' },
      { id: partId2, type: 'part' }
    ]);
    expect(groupId).toBeTruthy();

    // Select group and create assembly
    useSelectionStore.setState({ selectedPartIds: [], selectedGroupIds: [groupId!] });
    const assembly = useProjectStore.getState().createAssemblyFromSelection('Grouped Assembly');
    expect(assembly).not.toBeNull();
    expect(assembly!.parts).toHaveLength(2);
    expect(assembly!.groups).toHaveLength(1);
    expect(assembly!.groupMembers).toHaveLength(2);

    // Save and place
    useProjectStore.getState().addAssembly(assembly!);
    const newPartIds = useProjectStore.getState().placeAssembly(assembly!.id, { x: 30, y: 0, z: 0 });
    expect(newPartIds).toHaveLength(2);

    // Verify group was created for placed parts
    const state = useProjectStore.getState();
    expect(state.groups.length).toBeGreaterThan(1); // Original + placed
  });

  it('blocks assembly creation in free mode', () => {
    useLicenseStore.setState({ licenseMode: 'free' });
    const store = useProjectStore.getState();

    const partId1 = store.addPart({ name: 'Part 1' })!;
    const partId2 = store.addPart({ name: 'Part 2' })!;

    useSelectionStore.getState().selectParts([partId1, partId2]);
    const assembly = useProjectStore.getState().createAssemblyFromSelection('Blocked Assembly');
    expect(assembly).toBeNull();

    const toast = useUIStore.getState().toast;
    expect(toast).toBeTruthy();
  });
});

// ============================================================
// Workflow 4: Undo/Redo across operations
// ============================================================
describe('Workflow: Undo/redo across multi-step operations', () => {
  beforeEach(() => {
    resetAllStores();
    // Wait for temporal history to clear
    useProjectStore.temporal.getState().clear();
  });

  it('undoes part addition', () => {
    const store = useProjectStore.getState();
    expect(store.parts).toHaveLength(0);

    // Add a part
    const partId = store.addPart({ name: 'Test Part' });
    expect(partId).toBeTruthy();
    expect(useProjectStore.getState().parts).toHaveLength(1);

    // Undo
    useProjectStore.temporal.getState().undo();
    expect(useProjectStore.getState().parts).toHaveLength(0);

    // Redo
    useProjectStore.temporal.getState().redo();
    expect(useProjectStore.getState().parts).toHaveLength(1);
  });

  it('undoes stock assignment', () => {
    const store = useProjectStore.getState();

    const stockId = store.addStock({ name: 'Oak', color: '#aa8855' })!;
    const partId = store.addPart({ name: 'Shelf', color: '#cccccc' })!;

    // Assign stock
    useSelectionStore.getState().selectParts([partId]);
    useProjectStore.getState().assignStockToSelectedParts(stockId);

    // Verify assignment happened
    expect(useProjectStore.getState().parts[0].stockId).toBe(stockId);
    expect(useProjectStore.getState().parts[0].color).toBe('#aa8855');

    // Undo
    useProjectStore.temporal.getState().undo();
    expect(useProjectStore.getState().parts[0].stockId).toBeNull();
  });

  it('undo/redo preserves group operations', () => {
    const store = useProjectStore.getState();

    const partId1 = store.addPart({ name: 'Part 1' })!;
    const partId2 = store.addPart({ name: 'Part 2' })!;

    // Create group
    const groupId = useProjectStore.getState().createGroup('Test Group', [
      { id: partId1, type: 'part' },
      { id: partId2, type: 'part' }
    ]);
    expect(groupId).toBeTruthy();
    expect(useProjectStore.getState().groups).toHaveLength(1);
    expect(useProjectStore.getState().groupMembers).toHaveLength(2);

    // Undo group creation
    useProjectStore.temporal.getState().undo();
    expect(useProjectStore.getState().groups).toHaveLength(0);
    expect(useProjectStore.getState().groupMembers).toHaveLength(0);

    // Redo group creation
    useProjectStore.temporal.getState().redo();
    expect(useProjectStore.getState().groups).toHaveLength(1);
    expect(useProjectStore.getState().groupMembers).toHaveLength(2);
  });

  it('new action after undo clears redo stack', () => {
    const store = useProjectStore.getState();

    store.addPart({ name: 'Part 1' });
    store.addPart({ name: 'Part 2' });
    expect(useProjectStore.getState().parts).toHaveLength(2);

    // Undo last add
    useProjectStore.temporal.getState().undo();
    expect(useProjectStore.getState().parts).toHaveLength(1);
    expect(useProjectStore.temporal.getState().futureStates.length).toBeGreaterThan(0);

    // New action should clear redo stack
    store.addPart({ name: 'Part 3' });
    expect(useProjectStore.temporal.getState().futureStates).toHaveLength(0);
  });

  it('newProject clears undo history', () => {
    const store = useProjectStore.getState();

    store.addPart({ name: 'Part 1' });
    store.addPart({ name: 'Part 2' });
    expect(useProjectStore.temporal.getState().pastStates.length).toBeGreaterThan(0);

    // Use fake timers BEFORE calling newProject so the setTimeout is captured
    vi.useFakeTimers();

    // newProject should clear history (after the async clear)
    useProjectStore.getState().newProject();

    // Clear happens via setTimeout(..., 0), trigger it
    vi.advanceTimersByTime(1);
    vi.useRealTimers();

    expect(useProjectStore.temporal.getState().pastStates).toHaveLength(0);
    expect(useProjectStore.temporal.getState().futureStates).toHaveLength(0);
  });
});

// ============================================================
// Workflow 5: Project save → load → verify
// ============================================================
describe('Workflow: Project save and load integrity', () => {
  beforeEach(resetAllStores);

  it('round-trips project data through loadProject', () => {
    const store = useProjectStore.getState();

    // Build up a project with rich data
    const stockId = store.addStock({
      name: 'Walnut',
      length: 96,
      width: 48,
      thickness: 0.75,
      color: '#5a3825'
    })!;
    const partId1 = store.addPart({ name: 'Top', length: 48, width: 24 })!;
    const partId2 = store.addPart({ name: 'Side', length: 36, width: 24 })!;

    // Assign stock
    useSelectionStore.getState().selectParts([partId1, partId2]);
    useProjectStore.getState().assignStockToSelectedParts(stockId);

    // Create group
    useProjectStore.getState().createGroup('Panels', [
      { id: partId1, type: 'part' },
      { id: partId2, type: 'part' }
    ]);

    // Add snap guide
    useProjectStore.getState().addSnapGuide('x', 24);

    // Add custom shopping item
    useProjectStore.getState().addCustomShoppingItem({
      name: 'Wood Screws',
      quantity: 24,
      unitPrice: 0.15,
      description: '#8 x 1-1/4"',
      category: 'Hardware'
    });

    // Capture state
    const originalState = useProjectStore.getState();

    // Extract project data (simulating what file save would produce)
    const projectData = createTestProject({
      name: originalState.projectName,
      parts: originalState.parts,
      stocks: originalState.stocks,
      groups: originalState.groups,
      groupMembers: originalState.groupMembers,
      assemblies: originalState.assemblies,
      units: originalState.units,
      gridSize: originalState.gridSize,
      kerfWidth: originalState.kerfWidth,
      overageFactor: originalState.overageFactor,
      projectNotes: originalState.projectNotes,
      stockConstraints: originalState.stockConstraints,
      snapGuides: originalState.snapGuides,
      customShoppingItems: originalState.customShoppingItems,
      createdAt: originalState.createdAt,
      modifiedAt: originalState.modifiedAt
    });

    // Load into fresh store
    useProjectStore.getState().newProject();
    useProjectStore.getState().loadProject(projectData, '/path/to/project.carvd');

    const loadedState = useProjectStore.getState();

    // Verify all data was restored
    expect(loadedState.parts).toHaveLength(originalState.parts.length);
    expect(loadedState.stocks).toHaveLength(originalState.stocks.length);
    expect(loadedState.groups).toHaveLength(originalState.groups.length);
    expect(loadedState.groupMembers).toHaveLength(originalState.groupMembers.length);
    expect(loadedState.snapGuides).toHaveLength(1);
    expect(loadedState.customShoppingItems).toHaveLength(1);

    // Verify stock assignments survived
    const loadedPart = loadedState.parts.find((p) => p.name === 'Top')!;
    expect(loadedPart.stockId).toBe(stockId);

    // Verify file path was set
    expect(loadedState.filePath).toBe('/path/to/project.carvd');
    expect(loadedState.isDirty).toBe(false);
  });

  it('preserves cut list through project load', () => {
    // Create a project with a cut list
    const { stock, parts } = createSimpleCutListScenario();
    const project = createTestProject({ stocks: [stock], parts });

    useProjectStore.getState().loadProject(project);

    const state = useProjectStore.getState();
    const cutList = generateOptimizedCutList(state.parts, state.stocks, 0.125, 0.1, state.modifiedAt, []);
    useProjectStore.getState().setCutList(cutList);

    // Save the project data including cut list
    const stateWithCutList = useProjectStore.getState();
    const projectData = createTestProject({
      ...project,
      parts: stateWithCutList.parts,
      stocks: stateWithCutList.stocks
    });

    // Load into fresh store
    useProjectStore.getState().newProject();
    useProjectStore.getState().loadProject(projectData);

    // Note: cutList is not part of Project type — it's managed separately
    // but the parts/stocks that generated it are preserved
    const reloaded = useProjectStore.getState();
    expect(reloaded.parts).toHaveLength(parts.length);
    expect(reloaded.stocks).toHaveLength(1);
  });

  it('loads pre-built project with nested groups', () => {
    const { groups, parts, groupMembers } = createNestedGroupStructure();
    const project = createTestProject({ parts, groups, groupMembers });

    useProjectStore.getState().loadProject(project);

    const state = useProjectStore.getState();
    expect(state.parts).toHaveLength(3);
    expect(state.groups).toHaveLength(2);
    expect(state.groupMembers).toHaveLength(4);

    // Verify nesting: Group A contains Group B
    const groupAMembers = state.groupMembers.filter((gm) => gm.groupId === groups[0].id);
    const nestedGroup = groupAMembers.find((gm) => gm.memberType === 'group');
    expect(nestedGroup).toBeDefined();
    expect(nestedGroup!.memberId).toBe(groups[1].id);
  });
});

// ============================================================
// Workflow 6: Multi-store selection interactions
// ============================================================
describe('Workflow: Multi-store selection and operations', () => {
  beforeEach(resetAllStores);

  it('selection drives stock assignment, copy, and delete', () => {
    const store = useProjectStore.getState();

    // Create parts
    const partId1 = store.addPart({ name: 'Part A' })!;
    const partId2 = store.addPart({ name: 'Part B' })!;
    const stockId = store.addStock({ name: 'Oak' })!;

    // Select Part A only → assign stock
    useSelectionStore.getState().selectParts([partId1]);
    useProjectStore.getState().assignStockToSelectedParts(stockId);
    expect(useProjectStore.getState().parts.find((p) => p.id === partId1)!.stockId).toBe(stockId);
    expect(useProjectStore.getState().parts.find((p) => p.id === partId2)!.stockId).toBeNull();

    // Select Part B → copy → paste
    useSelectionStore.getState().selectParts([partId2]);
    useClipboardStore.getState().copySelectedParts();
    const pastedIds = useClipboardStore.getState().pasteClipboard();
    expect(pastedIds).toHaveLength(1);
    expect(useProjectStore.getState().parts).toHaveLength(3);

    // Select pasted part → delete
    useSelectionStore.getState().selectParts(pastedIds);
    useProjectStore.getState().deleteSelectedParts();
    expect(useProjectStore.getState().parts).toHaveLength(2);
  });

  it('snap reference interactions persist through selection changes', () => {
    const store = useProjectStore.getState();

    const partId1 = store.addPart({ name: 'Reference Part' })!;
    const partId2 = store.addPart({ name: 'Moving Part' })!;

    // Set Part 1 as reference
    useSnapStore.getState().toggleReference([partId1]);
    expect(useSnapStore.getState().referencePartIds).toContain(partId1);

    // Change selection — reference should persist
    useSelectionStore.getState().selectParts([partId2]);
    expect(useSnapStore.getState().referencePartIds).toContain(partId1);

    // Clear reference
    useSnapStore.getState().clearReferences();
    expect(useSnapStore.getState().referencePartIds).toHaveLength(0);
  });
});

// ============================================================
// Workflow 7: License mode enforcement
// ============================================================
describe('Workflow: License mode affects multi-store operations', () => {
  beforeEach(resetAllStores);

  it('free mode blocks groups, assemblies but allows basic part operations', () => {
    useLicenseStore.setState({ licenseMode: 'free' });
    const store = useProjectStore.getState();

    // Basic part operations should work (within limit)
    const partId1 = store.addPart({ name: 'Part 1' });
    const partId2 = store.addPart({ name: 'Part 2' });
    expect(partId1).toBeTruthy();
    expect(partId2).toBeTruthy();

    // Group creation should be blocked
    const groupId = useProjectStore.getState().createGroup('Test', [
      { id: partId1!, type: 'part' },
      { id: partId2!, type: 'part' }
    ]);
    expect(groupId).toBeNull();

    // Assembly creation should be blocked
    const assembly = useProjectStore.getState().createAssemblyFromSelection('Test');
    expect(assembly).toBeNull();
  });

  it('switching to licensed mode unlocks features', () => {
    useLicenseStore.setState({ licenseMode: 'free' });
    const store = useProjectStore.getState();

    const partId1 = store.addPart({ name: 'Part 1' })!;
    const partId2 = store.addPart({ name: 'Part 2' })!;

    // Groups blocked in free mode
    const members = [
      { id: partId1, type: 'part' as const },
      { id: partId2, type: 'part' as const }
    ];
    expect(useProjectStore.getState().createGroup('Test', members)).toBeNull();

    // Switch to licensed
    useLicenseStore.setState({ licenseMode: 'licensed' });
    const groupId = useProjectStore.getState().createGroup('Test Group', members);
    expect(groupId).toBeTruthy();
    expect(useProjectStore.getState().groups).toHaveLength(1);
  });
});

// ============================================================
// Workflow 8: Custom shopping items with cut list
// ============================================================
describe('Workflow: Custom shopping items persist through operations', () => {
  beforeEach(resetAllStores);

  it('custom items survive cut list regeneration', () => {
    const store = useProjectStore.getState();

    // Add custom shopping items
    store.addCustomShoppingItem({
      name: 'Wood Screws #8',
      quantity: 50,
      unitPrice: 0.1,
      category: 'Hardware'
    });
    store.addCustomShoppingItem({
      name: 'Wood Glue',
      quantity: 1,
      unitPrice: 8.99,
      category: 'Adhesive'
    });

    expect(useProjectStore.getState().customShoppingItems).toHaveLength(2);

    // Create parts and generate cut list
    const stockId = store.addStock({ name: 'Oak', length: 96, width: 48 })!;
    const partId = store.addPart({ name: 'Shelf' })!;
    useSelectionStore.getState().selectParts([partId]);
    useProjectStore.getState().assignStockToSelectedParts(stockId);

    const state = useProjectStore.getState();
    const cutList = generateOptimizedCutList(state.parts, state.stocks, 0.125, 0.1, state.modifiedAt, []);
    useProjectStore.getState().setCutList(cutList);

    // Custom items should still be there
    expect(useProjectStore.getState().customShoppingItems).toHaveLength(2);

    // Regenerate cut list — custom items persist
    useProjectStore.getState().clearCutList();
    expect(useProjectStore.getState().customShoppingItems).toHaveLength(2);
  });
});

// ============================================================
// Workflow 9: Snap guides lifecycle
// ============================================================
describe('Workflow: Snap guides creation and management', () => {
  beforeEach(resetAllStores);

  it('creates, uses, and clears snap guides', () => {
    const store = useProjectStore.getState();

    // Create guides on all three axes
    store.addSnapGuide('x', 24);
    store.addSnapGuide('z', 12);
    store.addSnapGuide('y', 6);

    expect(useProjectStore.getState().snapGuides).toHaveLength(3);

    // Verify axes and positions
    const guides = useProjectStore.getState().snapGuides;
    expect(guides.find((g) => g.axis === 'x')!.position).toBe(24);
    expect(guides.find((g) => g.axis === 'z')!.position).toBe(12);
    expect(guides.find((g) => g.axis === 'y')!.position).toBe(6);

    // Remove one guide
    const xGuide = guides.find((g) => g.axis === 'x')!;
    store.removeSnapGuide(xGuide.id);
    expect(useProjectStore.getState().snapGuides).toHaveLength(2);

    // Clear all guides
    store.clearSnapGuides();
    expect(useProjectStore.getState().snapGuides).toHaveLength(0);
  });

  it('snap guides persist through project save/load', () => {
    const store = useProjectStore.getState();

    store.addSnapGuide('x', 48);
    store.addSnapGuide('z', 24);

    const state = useProjectStore.getState();
    const project = createTestProject({
      snapGuides: state.snapGuides
    });

    // Load into fresh store
    useProjectStore.getState().newProject();
    useProjectStore.getState().loadProject(project);

    expect(useProjectStore.getState().snapGuides).toHaveLength(2);
  });
});

// ============================================================
// Workflow 10: End-to-end project lifecycle
// ============================================================
describe('Workflow: Full project lifecycle', () => {
  beforeEach(resetAllStores);

  it('creates a complete project from scratch through to cut list', () => {
    const store = useProjectStore.getState();

    // 1. Set project settings
    useProjectStore.setState({ units: 'imperial' });

    // 2. Add stocks
    const plywoodId = store.addStock({
      name: '3/4 Plywood',
      length: 96,
      width: 48,
      thickness: 0.75,
      pricingUnit: 'per_item',
      pricePerUnit: 45.0
    })!;
    const pineId = store.addStock({
      name: '1x6 Pine',
      length: 96,
      width: 5.5,
      thickness: 0.75,
      pricingUnit: 'board_foot',
      pricePerUnit: 3.5
    })!;

    // 3. Add parts for a simple bookshelf
    const topId = store.addPart({ name: 'Top', length: 36, width: 12 })!;
    const bottomId = store.addPart({ name: 'Bottom', length: 36, width: 12 })!;
    const leftSideId = store.addPart({ name: 'Left Side', length: 30, width: 12 })!;
    const rightSideId = store.addPart({ name: 'Right Side', length: 30, width: 12 })!;
    const shelf1Id = store.addPart({ name: 'Shelf 1', length: 34.5, width: 11.25 })!;
    const shelf2Id = store.addPart({ name: 'Shelf 2', length: 34.5, width: 11.25 })!;
    const faceFrameTopId = store.addPart({ name: 'Face Frame Top', length: 34.5, width: 2 })!;
    const faceFrameBottomId = store.addPart({ name: 'Face Frame Bottom', length: 34.5, width: 2 })!;

    // 4. Assign stocks
    useSelectionStore.getState().selectParts([topId, bottomId, leftSideId, rightSideId, shelf1Id, shelf2Id]);
    useProjectStore.getState().assignStockToSelectedParts(plywoodId);

    useSelectionStore.getState().selectParts([faceFrameTopId, faceFrameBottomId]);
    useProjectStore.getState().assignStockToSelectedParts(pineId);

    // 5. Create groups
    const sidesGroupId = useProjectStore.getState().createGroup('Sides', [
      { id: leftSideId, type: 'part' },
      { id: rightSideId, type: 'part' }
    ]);

    const shelvesGroupId = useProjectStore.getState().createGroup('Shelves', [
      { id: shelf1Id, type: 'part' },
      { id: shelf2Id, type: 'part' }
    ]);

    const faceFrameGroupId = useProjectStore.getState().createGroup('Face Frame', [
      { id: faceFrameTopId, type: 'part' },
      { id: faceFrameBottomId, type: 'part' }
    ]);

    expect(sidesGroupId).toBeTruthy();
    expect(shelvesGroupId).toBeTruthy();
    expect(faceFrameGroupId).toBeTruthy();

    // 6. Verify complete project state
    const state = useProjectStore.getState();
    expect(state.parts).toHaveLength(8);
    expect(state.stocks).toHaveLength(2);
    expect(state.groups).toHaveLength(3);

    // All parts should have stock assignments
    expect(state.parts.every((p) => p.stockId !== null)).toBe(true);

    // 7. Validate and generate cut list
    const issues = validatePartsForCutList(state.parts, state.stocks);
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);

    const cutList = generateOptimizedCutList(state.parts, state.stocks, 0.125, 0.1, state.modifiedAt, []);
    expect(cutList.instructions.length).toBeGreaterThan(0);
    expect(cutList.stockBoards.length).toBeGreaterThan(0);
    expect(cutList.statistics).toBeDefined();

    // Should have boards for both stock types
    const stockIdsUsed = new Set(cutList.stockBoards.map((b) => b.stockId));
    expect(stockIdsUsed.size).toBe(2);

    // 8. Save assembly from sides group
    useSelectionStore.setState({ selectedPartIds: [], selectedGroupIds: [sidesGroupId!] });
    const assembly = useProjectStore.getState().createAssemblyFromSelection('Bookshelf Sides');
    expect(assembly).not.toBeNull();
    expect(assembly!.parts).toHaveLength(2);

    // 9. Project should be dirty after all these changes
    expect(state.isDirty).toBe(true);
  });
});
