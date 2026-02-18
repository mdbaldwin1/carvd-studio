import { describe, it, expect, beforeEach } from 'vitest';
import { useAssemblyEditingStore } from './assemblyEditingStore';
import { useProjectStore } from './projectStore';
import { useSelectionStore } from './selectionStore';
import { useSnapStore } from './snapStore';
import { useUIStore } from './uiStore';
import {
  createTestPart,
  createTestStock,
  createTestGroup,
  createTestGroupMember
} from '../../../../tests/helpers/factories';

const resetStores = () => {
  const store = useProjectStore.getState();
  store.newProject();
  useAssemblyEditingStore.setState({
    isEditingAssembly: false,
    editingAssemblyId: null,
    editingAssemblyName: '',
    previousProjectSnapshot: null
  });
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
};

describe('assemblyEditingStore', () => {
  beforeEach(() => {
    resetStores();
  });

  describe('startEditingAssembly', () => {
    it('enters assembly editing mode', () => {
      const store = useAssemblyEditingStore.getState();

      store.startEditingAssembly('assembly-123', 'Test Assembly', [createTestPart({ id: 'part-1', name: 'Shelf' })]);

      const state = useAssemblyEditingStore.getState();
      expect(state.isEditingAssembly).toBe(true);
      expect(state.editingAssemblyId).toBe('assembly-123');
      expect(state.editingAssemblyName).toBe('Test Assembly');
    });

    it('saves previous project state snapshot', () => {
      const projectStore = useProjectStore.getState();
      projectStore.addPart({ name: 'Existing Part' });
      projectStore.addStock({ name: 'Existing Stock' });

      useAssemblyEditingStore
        .getState()
        .startEditingAssembly('assembly-123', 'Test Assembly', [createTestPart({ id: 'part-1' })]);

      const state = useAssemblyEditingStore.getState();
      expect(state.previousProjectSnapshot).not.toBeNull();
      expect(state.previousProjectSnapshot!.parts.some((p) => p.name === 'Existing Part')).toBe(true);
    });

    it('loads assembly parts into workspace', () => {
      const assemblyParts = [
        createTestPart({ id: 'part-1', name: 'Assembly Part 1' }),
        createTestPart({ id: 'part-2', name: 'Assembly Part 2' })
      ];

      useAssemblyEditingStore.getState().startEditingAssembly('assembly-123', 'Test Assembly', assemblyParts);

      const state = useProjectStore.getState();
      expect(state.parts).toHaveLength(2);
      expect(state.parts[0].name).toBe('Assembly Part 1');
      expect(state.parts[1].name).toBe('Assembly Part 2');
    });

    it('merges embedded stocks with existing stocks', () => {
      const projectStore = useProjectStore.getState();
      const existingStockId = projectStore.addStock({ name: 'Existing Stock' });
      const embeddedStock = createTestStock({ id: 'embedded-1', name: 'Embedded Stock' });

      useAssemblyEditingStore
        .getState()
        .startEditingAssembly('assembly-123', 'Test Assembly', [createTestPart()], [], [], [embeddedStock]);

      const state = useProjectStore.getState();
      expect(state.stocks.some((s) => s.id === existingStockId)).toBe(true);
      expect(state.stocks.some((s) => s.name === 'Embedded Stock')).toBe(true);
    });

    it('updates project name to indicate editing mode', () => {
      useAssemblyEditingStore.getState().startEditingAssembly('assembly-123', 'Drawer Assembly', [createTestPart()]);

      expect(useProjectStore.getState().projectName).toContain('Drawer Assembly');
    });

    it('expands all groups when loading assembly with groups', () => {
      const part1 = createTestPart({ name: 'Part 1' });
      const part2 = createTestPart({ name: 'Part 2' });
      const group = createTestGroup({ name: 'Test Group' });
      const groupMember = createTestGroupMember(group.id, part1.id);

      useAssemblyEditingStore
        .getState()
        .startEditingAssembly('assembly-123', 'Assembly with Groups', [part1, part2], [group], [groupMember]);

      expect(useProjectStore.getState().groups).toHaveLength(1);
      expect(useSelectionStore.getState().expandedGroupIds).toContain(group.id);
    });

    it('clears selection and UI state when entering edit mode', () => {
      const projectStore = useProjectStore.getState();
      const partId = projectStore.addPart({ name: 'Selected Part' });
      useSelectionStore.getState().selectPart(partId);
      useSnapStore.getState().addToReferences([partId]);

      useAssemblyEditingStore.getState().startEditingAssembly('assembly-123', 'Test Assembly', [createTestPart()]);

      expect(useSelectionStore.getState().selectedPartIds).toHaveLength(0);
      expect(useSnapStore.getState().referencePartIds).toHaveLength(0);
      expect(useSelectionStore.getState().editingGroupId).toBeNull();
    });
  });

  describe('saveEditingAssembly', () => {
    it('returns null when not in editing mode', () => {
      const result = useAssemblyEditingStore.getState().saveEditingAssembly();

      expect(result).toBeNull();
    });

    it('creates assembly from current workspace parts', () => {
      useAssemblyEditingStore
        .getState()
        .startEditingAssembly('assembly-123', 'Test Assembly', [createTestPart({ name: 'Original Part' })]);

      // Modify the workspace
      useProjectStore.getState().addPart({ name: 'New Part' });

      const assembly = useAssemblyEditingStore.getState().saveEditingAssembly();

      expect(assembly).not.toBeNull();
      expect(assembly!.parts).toHaveLength(2);
      expect(assembly!.parts.some((p) => p.name === 'New Part')).toBe(true);
    });

    it('preserves the assembly ID', () => {
      useAssemblyEditingStore.getState().startEditingAssembly('assembly-123', 'Test Assembly', [createTestPart()]);

      const assembly = useAssemblyEditingStore.getState().saveEditingAssembly();

      expect(assembly!.id).toBe('assembly-123');
    });

    it('normalizes part positions in the saved assembly', () => {
      useAssemblyEditingStore
        .getState()
        .startEditingAssembly('assembly-123', 'Test Assembly', [
          createTestPart({ position: { x: 10, y: 0, z: 0 } }),
          createTestPart({ position: { x: 30, y: 0, z: 0 } })
        ]);

      const assembly = useAssemblyEditingStore.getState().saveEditingAssembly();

      // Parts should be centered
      const sumX = assembly!.parts.reduce((sum, p) => sum + p.relativePosition.x, 0);
      expect(sumX).toBeCloseTo(0, 5);
    });

    it('returns null when no parts in workspace', () => {
      useAssemblyEditingStore.getState().startEditingAssembly('assembly-123', 'Test Assembly', [createTestPart()]);

      // Delete all parts
      const partId = useProjectStore.getState().parts[0].id;
      useProjectStore.getState().deletePart(partId);

      const assembly = useAssemblyEditingStore.getState().saveEditingAssembly();

      expect(assembly).toBeNull();
    });

    it('embeds stock data in assembly parts', () => {
      const projectStore = useProjectStore.getState();
      const stockId = projectStore.addStock({
        name: 'Test Plywood',
        length: 96,
        width: 48,
        thickness: 0.75,
        color: '#c4a574'
      });

      const partWithStock = createTestPart({ stockId, name: 'Part with Stock' });

      useAssemblyEditingStore.getState().startEditingAssembly('assembly-123', 'Test Assembly', [partWithStock]);

      const assembly = useAssemblyEditingStore.getState().saveEditingAssembly();

      expect(assembly).not.toBeNull();
      expect(assembly!.parts[0].embeddedStock).toBeDefined();
      expect(assembly!.parts[0].embeddedStock!.name).toBe('Test Plywood');
      expect(assembly!.parts[0].embeddedStock!.thickness).toBe(0.75);
      expect(assembly!.parts[0].embeddedStock!.color).toBe('#c4a574');
    });

    it('includes groups and group members in saved assembly', () => {
      const part1 = createTestPart({ name: 'Part 1' });
      const part2 = createTestPart({ name: 'Part 2' });
      const group = createTestGroup({ name: 'Test Group' });
      const groupMember1 = createTestGroupMember(group.id, part1.id);
      const groupMember2 = createTestGroupMember(group.id, part2.id);

      useAssemblyEditingStore
        .getState()
        .startEditingAssembly(
          'assembly-123',
          'Grouped Assembly',
          [part1, part2],
          [group],
          [groupMember1, groupMember2]
        );

      const assembly = useAssemblyEditingStore.getState().saveEditingAssembly();

      expect(assembly).not.toBeNull();
      expect(assembly!.groups).toHaveLength(1);
      expect(assembly!.groups[0].name).toBe('Test Group');
      expect(assembly!.groupMembers).toHaveLength(2);
    });
  });

  describe('cancelEditingAssembly', () => {
    it('does nothing when not in editing mode', () => {
      expect(useAssemblyEditingStore.getState().isEditingAssembly).toBe(false);

      useAssemblyEditingStore.getState().cancelEditingAssembly();

      expect(useAssemblyEditingStore.getState().isEditingAssembly).toBe(false);
    });

    it('exits editing mode', () => {
      useAssemblyEditingStore.getState().startEditingAssembly('assembly-123', 'Test', [createTestPart()]);

      useAssemblyEditingStore.getState().cancelEditingAssembly();

      const state = useAssemblyEditingStore.getState();
      expect(state.isEditingAssembly).toBe(false);
      expect(state.editingAssemblyId).toBeNull();
      expect(state.editingAssemblyName).toBe('');
    });

    it('keeps snapshot for potential restore', () => {
      useProjectStore.getState().addPart({ name: 'Original Part' });
      useAssemblyEditingStore.getState().startEditingAssembly('assembly-123', 'Test', [createTestPart()]);

      useAssemblyEditingStore.getState().cancelEditingAssembly();

      // Snapshot should still be available for restorePreviousProject
      expect(useAssemblyEditingStore.getState().previousProjectSnapshot).not.toBeNull();
    });
  });

  describe('restorePreviousProject', () => {
    it('restores project state from snapshot', () => {
      const projectStore = useProjectStore.getState();

      // Set up initial state
      projectStore.addPart({ name: 'Part A' });
      projectStore.addPart({ name: 'Part B' });
      projectStore.addStock({ name: 'Stock X' });

      // Enter and exit editing mode
      useAssemblyEditingStore
        .getState()
        .startEditingAssembly('assembly-123', 'Test', [createTestPart({ name: 'Temp' })]);
      useAssemblyEditingStore.getState().cancelEditingAssembly();

      // Workspace now has only 'Temp' part
      expect(useProjectStore.getState().parts.some((p) => p.name === 'Part A')).toBe(false);

      // Restore
      useAssemblyEditingStore.getState().restorePreviousProject();

      const state = useProjectStore.getState();
      expect(state.parts.some((p) => p.name === 'Part A')).toBe(true);
      expect(state.parts.some((p) => p.name === 'Part B')).toBe(true);
      expect(state.stocks.some((s) => s.name === 'Stock X')).toBe(true);
    });

    it('clears snapshot after restore', () => {
      useProjectStore.getState().addPart({ name: 'Original' });
      useAssemblyEditingStore.getState().startEditingAssembly('assembly-123', 'Test', [createTestPart()]);
      useAssemblyEditingStore.getState().cancelEditingAssembly();

      useAssemblyEditingStore.getState().restorePreviousProject();

      expect(useAssemblyEditingStore.getState().previousProjectSnapshot).toBeNull();
    });

    it('clears assembly editing state', () => {
      useProjectStore.getState().addPart({ name: 'Original' });
      useAssemblyEditingStore.getState().startEditingAssembly('assembly-123', 'Test', [createTestPart()]);
      useAssemblyEditingStore.getState().cancelEditingAssembly();

      useAssemblyEditingStore.getState().restorePreviousProject();

      const state = useAssemblyEditingStore.getState();
      expect(state.isEditingAssembly).toBe(false);
      expect(state.editingAssemblyId).toBeNull();
    });
  });

  describe('startFreshAfterAssemblyEdit', () => {
    it('creates a new project', () => {
      useProjectStore.getState().addPart({ name: 'Part A' });
      useAssemblyEditingStore.getState().startEditingAssembly('assembly-123', 'Test', [createTestPart()]);
      useAssemblyEditingStore.getState().cancelEditingAssembly();

      useAssemblyEditingStore.getState().startFreshAfterAssemblyEdit();

      const state = useProjectStore.getState();
      expect(state.parts).toHaveLength(0);
      expect(state.stocks).toHaveLength(0);
      // Project name could be 'New Project' or 'Untitled Project' depending on defaults
      expect(state.projectName).toMatch(/^(New|Untitled) Project$/);
    });

    it('clears assembly editing state', () => {
      useAssemblyEditingStore.getState().startEditingAssembly('assembly-123', 'Test', [createTestPart()]);
      useAssemblyEditingStore.getState().cancelEditingAssembly();

      useAssemblyEditingStore.getState().startFreshAfterAssemblyEdit();

      const state = useAssemblyEditingStore.getState();
      expect(state.isEditingAssembly).toBe(false);
      expect(state.editingAssemblyId).toBeNull();
      expect(state.previousProjectSnapshot).toBeNull();
    });
  });
});
