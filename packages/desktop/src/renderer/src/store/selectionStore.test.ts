import { describe, it, expect, beforeEach } from 'vitest';
import { useSelectionStore } from './selectionStore';
import { useProjectStore } from './projectStore';
import { useSnapStore } from './snapStore';
import { useUIStore } from './uiStore';

// Helper to reset store state before each test
const resetStores = () => {
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
};

describe('selectionStore', () => {
  beforeEach(() => {
    resetStores();
  });

  // ============================================================
  // Part Selection
  // ============================================================

  describe('selection', () => {
    describe('selectPart', () => {
      it('selects a single part', () => {
        const partId = useProjectStore.getState().addPart();
        useSelectionStore.getState().clearSelection();

        useSelectionStore.getState().selectPart(partId);

        expect(useSelectionStore.getState().selectedPartIds).toEqual([partId]);
      });

      it('replaces previous selection', () => {
        const part1Id = useProjectStore.getState().addPart();
        const part2Id = useProjectStore.getState().addPart();

        useSelectionStore.getState().selectPart(part1Id);
        useSelectionStore.getState().selectPart(part2Id);

        expect(useSelectionStore.getState().selectedPartIds).toEqual([part2Id]);
      });

      it('clears selection when called with null', () => {
        const partId = useProjectStore.getState().addPart();
        useSelectionStore.getState().selectPart(partId);

        useSelectionStore.getState().selectPart(null);

        expect(useSelectionStore.getState().selectedPartIds).toEqual([]);
      });
    });

    describe('togglePartSelection', () => {
      it('adds a part to selection if not selected', () => {
        const part1Id = useProjectStore.getState().addPart();
        const part2Id = useProjectStore.getState().addPart();

        useSelectionStore.getState().selectPart(part1Id);
        useSelectionStore.getState().togglePartSelection(part2Id);

        expect(useSelectionStore.getState().selectedPartIds).toContain(part1Id);
        expect(useSelectionStore.getState().selectedPartIds).toContain(part2Id);
      });

      it('removes a part from selection if already selected', () => {
        const part1Id = useProjectStore.getState().addPart();
        const part2Id = useProjectStore.getState().addPart();

        useSelectionStore.getState().selectParts([part1Id, part2Id]);
        useSelectionStore.getState().togglePartSelection(part1Id);

        expect(useSelectionStore.getState().selectedPartIds).not.toContain(part1Id);
        expect(useSelectionStore.getState().selectedPartIds).toContain(part2Id);
      });
    });

    describe('selectParts', () => {
      it('selects multiple parts', () => {
        const part1Id = useProjectStore.getState().addPart();
        const part2Id = useProjectStore.getState().addPart();
        const part3Id = useProjectStore.getState().addPart();

        useSelectionStore.getState().selectParts([part1Id, part2Id]);

        const selected = useSelectionStore.getState().selectedPartIds;
        expect(selected).toContain(part1Id);
        expect(selected).toContain(part2Id);
        expect(selected).not.toContain(part3Id);
      });
    });

    describe('clearSelection', () => {
      it('clears all selected parts', () => {
        useProjectStore.getState().addPart();
        useProjectStore.getState().addPart();

        useSelectionStore.getState().clearSelection();

        expect(useSelectionStore.getState().selectedPartIds).toEqual([]);
      });
    });
  });

  // ============================================================
  // Group Selection & Editing
  // ============================================================

  describe('groups', () => {
    describe('group selection', () => {
      it('toggles group selection', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Test Part' });
        const groupId = store.createGroup('Test Group', [{ id: partId, type: 'part' }]);

        useSelectionStore.getState().clearSelection();
        useSelectionStore.getState().toggleGroupSelection(groupId);

        expect(useSelectionStore.getState().selectedGroupIds).toContain(groupId);

        useSelectionStore.getState().toggleGroupSelection(groupId);

        expect(useSelectionStore.getState().selectedGroupIds).not.toContain(groupId);
      });

      it('clears group selection', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Test Part' });
        const groupId = store.createGroup('Test Group', [{ id: partId, type: 'part' }]);

        useSelectionStore.getState().selectGroup(groupId);
        expect(useSelectionStore.getState().selectedGroupIds).toHaveLength(1);

        useSelectionStore.getState().clearGroupSelection();

        expect(useSelectionStore.getState().selectedGroupIds).toHaveLength(0);
      });

      it('keeps editing context when selecting the currently edited group', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Test Part' });
        const groupId = store.createGroup('Test Group', [{ id: partId, type: 'part' }]);

        useSelectionStore.getState().enterGroup(groupId);
        useSelectionStore.getState().selectGroup(groupId);

        expect(useSelectionStore.getState().editingGroupId).toBe(groupId);
      });

      it('keeps parent editing context when shift-selecting nested groups', () => {
        const store = useProjectStore.getState();
        const partA = store.addPart({ name: 'Part A' });
        const partB = store.addPart({ name: 'Part B' });
        const partC = store.addPart({ name: 'Part C' });
        const childA = store.createGroup('Child A', [{ id: partA, type: 'part' }]);
        const childB = store.createGroup('Child B', [{ id: partB, type: 'part' }]);
        const parent = store.createGroup('Parent', [
          { id: childA, type: 'group' },
          { id: childB, type: 'group' },
          { id: partC, type: 'part' }
        ]);

        useSelectionStore.getState().enterGroup(parent);
        useSelectionStore.getState().toggleGroupSelection(childA);
        useSelectionStore.getState().toggleGroupSelection(childB);

        const state = useSelectionStore.getState();
        expect(state.editingGroupId).toBe(parent);
        expect(state.selectedGroupIds).toContain(childA);
        expect(state.selectedGroupIds).toContain(childB);
      });
    });

    describe('group editing mode', () => {
      it('enters group editing mode', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Test Part' });
        const groupId = store.createGroup('Test Group', [{ id: partId, type: 'part' }]);

        useSelectionStore.getState().enterGroup(groupId);

        const state = useSelectionStore.getState();
        expect(state.editingGroupId).toBe(groupId);
        expect(state.selectedGroupIds).toHaveLength(0);
        expect(state.selectedPartIds).toHaveLength(0);
      });

      it('exits group editing mode', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Test Part' });
        const groupId = store.createGroup('Test Group', [{ id: partId, type: 'part' }]);

        useSelectionStore.getState().enterGroup(groupId);
        useSelectionStore.getState().exitGroup();

        expect(useSelectionStore.getState().editingGroupId).toBeNull();
      });

      it('clears part selection when exiting group', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Test Part' });
        const groupId = store.createGroup('Test Group', [{ id: partId, type: 'part' }]);

        useSelectionStore.getState().enterGroup(groupId);
        useSelectionStore.getState().selectPart(partId);
        useSelectionStore.getState().exitGroup();

        expect(useSelectionStore.getState().selectedPartIds).toHaveLength(0);
      });
    });

    describe('group expand/collapse', () => {
      it('toggles group expanded state', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Test Part' });
        const groupId = store.createGroup('Test Group', [{ id: partId, type: 'part' }]);

        // First collapse if auto-expanded
        useSelectionStore.getState().collapseGroup(groupId);
        expect(useSelectionStore.getState().expandedGroupIds).not.toContain(groupId);

        // Toggle to expand
        useSelectionStore.getState().toggleGroupExpanded(groupId);
        expect(useSelectionStore.getState().expandedGroupIds).toContain(groupId);

        // Toggle to collapse
        useSelectionStore.getState().toggleGroupExpanded(groupId);
        expect(useSelectionStore.getState().expandedGroupIds).not.toContain(groupId);
      });

      it('expands a specific group', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Test Part' });
        const groupId = store.createGroup('Test Group', [{ id: partId, type: 'part' }]);

        useSelectionStore.getState().expandGroup(groupId);

        expect(useSelectionStore.getState().expandedGroupIds).toContain(groupId);
      });

      it('does not duplicate when expanding already expanded group', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Test Part' });
        const groupId = store.createGroup('Test Group', [{ id: partId, type: 'part' }]);

        useSelectionStore.getState().expandGroup(groupId);
        useSelectionStore.getState().expandGroup(groupId);

        const expandedCount = useSelectionStore.getState().expandedGroupIds.filter((id) => id === groupId).length;
        expect(expandedCount).toBe(1);
      });

      it('collapses a specific group', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Test Part' });
        const groupId = store.createGroup('Test Group', [{ id: partId, type: 'part' }]);

        useSelectionStore.getState().expandGroup(groupId);
        useSelectionStore.getState().collapseGroup(groupId);

        expect(useSelectionStore.getState().expandedGroupIds).not.toContain(groupId);
      });

      it('expands all groups', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart({ name: 'Part 1' });
        const part2Id = store.addPart({ name: 'Part 2' });
        const group1Id = store.createGroup('Group 1', [{ id: part1Id, type: 'part' }]);
        const group2Id = store.createGroup('Group 2', [{ id: part2Id, type: 'part' }]);

        useSelectionStore.getState().expandAllGroups();

        const state = useSelectionStore.getState();
        expect(state.expandedGroupIds).toContain(group1Id);
        expect(state.expandedGroupIds).toContain(group2Id);
      });

      it('collapses all groups', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart({ name: 'Part 1' });
        const part2Id = store.addPart({ name: 'Part 2' });
        store.createGroup('Group 1', [{ id: part1Id, type: 'part' }]);
        store.createGroup('Group 2', [{ id: part2Id, type: 'part' }]);

        useSelectionStore.getState().expandAllGroups();
        useSelectionStore.getState().collapseAllGroups();

        expect(useSelectionStore.getState().expandedGroupIds).toHaveLength(0);
      });
    });
  });

  // ============================================================
  // UI State Actions
  // ============================================================

  describe('UI state', () => {
    describe('setHoveredPart', () => {
      it('sets the hovered part ID', () => {
        const partId = useProjectStore.getState().addPart();

        useSelectionStore.getState().setHoveredPart(partId);

        expect(useSelectionStore.getState().hoveredPartId).toBe(partId);
      });

      it('clears hovered part when set to null', () => {
        const partId = useProjectStore.getState().addPart();
        useSelectionStore.getState().setHoveredPart(partId);

        useSelectionStore.getState().setHoveredPart(null);

        expect(useSelectionStore.getState().hoveredPartId).toBeNull();
      });
    });

    describe('setTransformMode', () => {
      it('sets transform mode to translate', () => {
        useSelectionStore.getState().setTransformMode('translate');

        expect(useSelectionStore.getState().transformMode).toBe('translate');
      });

      it('sets transform mode to rotate', () => {
        useSelectionStore.getState().setTransformMode('rotate');

        expect(useSelectionStore.getState().transformMode).toBe('rotate');
      });

      it('sets transform mode to scale', () => {
        useSelectionStore.getState().setTransformMode('scale');

        expect(useSelectionStore.getState().transformMode).toBe('scale');
      });
    });

    describe('setActiveDragDelta', () => {
      it('sets the active drag delta', () => {
        const delta = { x: 10, y: 5, z: 3 };

        useSelectionStore.getState().setActiveDragDelta(delta);

        expect(useSelectionStore.getState().activeDragDelta).toEqual(delta);
      });

      it('clears drag delta when set to null', () => {
        useSelectionStore.getState().setActiveDragDelta({ x: 10, y: 5, z: 3 });

        useSelectionStore.getState().setActiveDragDelta(null);

        expect(useSelectionStore.getState().activeDragDelta).toBeNull();
      });
    });

    describe('setSelectionBox', () => {
      it('sets selection box coordinates', () => {
        const box = { x1: 0, y1: 0, x2: 100, y2: 100 };

        useSelectionStore.getState().setSelectionBox(box);

        expect(useSelectionStore.getState().selectionBox).toEqual(box);
      });

      it('clears selection box when set to null', () => {
        useSelectionStore.getState().setSelectionBox({ x1: 0, y1: 0, x2: 100, y2: 100 });

        useSelectionStore.getState().setSelectionBox(null);

        expect(useSelectionStore.getState().selectionBox).toBeNull();
      });
    });
  });
});
