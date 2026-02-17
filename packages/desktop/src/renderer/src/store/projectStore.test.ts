import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useProjectStore,
  validatePartsForCutList,
  getContainingGroupId,
  getAllDescendantPartIds,
  getAllDescendantGroupIds,
  getAncestorGroupIds,
  isDescendantOf
} from './projectStore';
import { useLicenseStore } from './licenseStore';
import { useAssemblyEditingStore } from './assemblyEditingStore';
import { useSelectionStore } from './selectionStore';
import { useSnapStore } from './snapStore';
import { useUIStore } from './uiStore';
import {
  createTestPart,
  createTestStock,
  createTestGroup,
  createTestGroupMember,
  createTestProject,
  createTestAssembly,
  createNestedGroupStructure,
  createDefaultStockConstraints
} from '../../../../tests/helpers/factories';
import type { Assembly } from '../types';

// Helper to reset store state before each test
const resetStore = () => {
  const store = useProjectStore.getState();
  store.newProject();
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
};

describe('projectStore', () => {
  beforeEach(() => {
    resetStore();
  });

  // ============================================================
  // Part CRUD Operations
  // ============================================================

  describe('parts', () => {
    describe('addPart', () => {
      it('creates a new part with default values', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart();

        const state = useProjectStore.getState();
        expect(state.parts).toHaveLength(1);
        expect(state.parts[0].id).toBe(partId);
        expect(state.parts[0].name).toBe('New Part');
        expect(state.parts[0].length).toBe(24);
        expect(state.parts[0].width).toBe(12);
        expect(state.parts[0].thickness).toBe(0.75);
      });

      it('creates a part with custom values', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({
          name: 'Custom Part',
          length: 48,
          width: 24,
          thickness: 1.5
        });

        const state = useProjectStore.getState();
        const part = state.parts.find((p) => p.id === partId);
        expect(part?.name).toBe('Custom Part');
        expect(part?.length).toBe(48);
        expect(part?.width).toBe(24);
        expect(part?.thickness).toBe(1.5);
      });

      it('selects the new part after creation', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart();

        expect(useSelectionStore.getState().selectedPartIds).toContain(partId);
      });

      it('marks the project as dirty', () => {
        const store = useProjectStore.getState();
        expect(store.isDirty).toBe(false);

        store.addPart();

        const state = useProjectStore.getState();
        expect(state.isDirty).toBe(true);
      });
    });

    describe('updatePart', () => {
      it('updates a single part property', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Original' });

        store.updatePart(partId, { name: 'Updated' });

        const state = useProjectStore.getState();
        const part = state.parts.find((p) => p.id === partId);
        expect(part?.name).toBe('Updated');
      });

      it('updates multiple properties at once', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart();

        store.updatePart(partId, {
          name: 'Updated Part',
          length: 36,
          width: 18
        });

        const state = useProjectStore.getState();
        const part = state.parts.find((p) => p.id === partId);
        expect(part?.name).toBe('Updated Part');
        expect(part?.length).toBe(36);
        expect(part?.width).toBe(18);
      });

      it('does not affect other parts', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart({ name: 'Part 1' });
        const part2Id = store.addPart({ name: 'Part 2' });

        store.updatePart(part1Id, { name: 'Updated Part 1' });

        const state = useProjectStore.getState();
        const part2 = state.parts.find((p) => p.id === part2Id);
        expect(part2?.name).toBe('Part 2');
      });
    });

    describe('updateParts', () => {
      it('updates multiple parts with the same changes', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart({ name: 'Part 1' });
        const part2Id = store.addPart({ name: 'Part 2' });

        store.updateParts([part1Id, part2Id], { color: '#ff0000' });

        const state = useProjectStore.getState();
        expect(state.parts.find((p) => p.id === part1Id)?.color).toBe('#ff0000');
        expect(state.parts.find((p) => p.id === part2Id)?.color).toBe('#ff0000');
      });
    });

    describe('batchUpdateParts', () => {
      it('updates multiple parts with different changes each', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart({ name: 'Part 1', color: '#ffffff' });
        const part2Id = store.addPart({ name: 'Part 2', color: '#ffffff' });

        store.batchUpdateParts([
          { id: part1Id, changes: { color: '#ff0000', length: 30 } },
          { id: part2Id, changes: { color: '#00ff00', width: 18 } }
        ]);

        const state = useProjectStore.getState();
        const part1 = state.parts.find((p) => p.id === part1Id);
        const part2 = state.parts.find((p) => p.id === part2Id);
        expect(part1?.color).toBe('#ff0000');
        expect(part1?.length).toBe(30);
        expect(part2?.color).toBe('#00ff00');
        expect(part2?.width).toBe(18);
      });

      it('marks project as dirty', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart();
        store.markClean();

        store.batchUpdateParts([{ id: partId, changes: { name: 'Updated' } }]);

        expect(useProjectStore.getState().isDirty).toBe(true);
      });

      it('ignores updates for non-existent parts', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Real Part' });

        store.batchUpdateParts([
          { id: partId, changes: { name: 'Updated' } },
          { id: 'non-existent', changes: { name: 'Ghost' } }
        ]);

        const state = useProjectStore.getState();
        expect(state.parts).toHaveLength(1);
        expect(state.parts[0].name).toBe('Updated');
      });
    });

    describe('deletePart', () => {
      it('removes a part from the store', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart();

        expect(useProjectStore.getState().parts).toHaveLength(1);

        store.deletePart(partId);

        expect(useProjectStore.getState().parts).toHaveLength(0);
      });

      it('removes the part from selection', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart();

        expect(useSelectionStore.getState().selectedPartIds).toContain(partId);

        store.deletePart(partId);

        expect(useSelectionStore.getState().selectedPartIds).not.toContain(partId);
      });

      it('removes the part from reference parts', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart();
        useSnapStore.getState().addToReferences([partId]);

        expect(useSnapStore.getState().referencePartIds).toContain(partId);

        store.deletePart(partId);

        expect(useSnapStore.getState().referencePartIds).not.toContain(partId);
      });

      it('removes the part from group memberships', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart();
        const groupId = store.createGroup('Test Group', [{ id: partId, type: 'part' }]);

        expect(useProjectStore.getState().groupMembers).toHaveLength(1);

        store.deletePart(partId);

        expect(useProjectStore.getState().groupMembers).toHaveLength(0);
      });
    });

    describe('deleteSelectedParts', () => {
      it('removes all selected parts', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart({ name: 'Part 1' });
        const part2Id = store.addPart({ name: 'Part 2' });
        store.addPart({ name: 'Part 3' });

        useSelectionStore.getState().selectParts([part1Id, part2Id]);
        store.deleteSelectedParts();

        const state = useProjectStore.getState();
        expect(state.parts).toHaveLength(1);
        expect(state.parts[0].name).toBe('Part 3');
      });

      it('does nothing when no parts are selected', () => {
        const store = useProjectStore.getState();
        store.addPart();
        useSelectionStore.getState().clearSelection();

        store.deleteSelectedParts();

        expect(useProjectStore.getState().parts).toHaveLength(1);
      });
    });

    describe('delete confirmation flow', () => {
      describe('confirmDeleteParts', () => {
        it('deletes pending parts', () => {
          const store = useProjectStore.getState();
          const part1Id = store.addPart({ name: 'Part 1' });
          const part2Id = store.addPart({ name: 'Part 2' });
          store.addPart({ name: 'Part 3' });
          useUIStore.getState().requestDeleteParts([part1Id, part2Id]);

          store.confirmDeleteParts();

          const state = useProjectStore.getState();
          expect(state.parts).toHaveLength(1);
          expect(state.parts[0].name).toBe('Part 3');
        });

        it('clears pending delete list', () => {
          const store = useProjectStore.getState();
          const partId = store.addPart();
          useUIStore.getState().requestDeleteParts([partId]);

          store.confirmDeleteParts();

          expect(useUIStore.getState().pendingDeletePartIds).toBeNull();
        });

        it('does nothing when no pending parts', () => {
          const store = useProjectStore.getState();
          store.addPart();

          store.confirmDeleteParts();

          expect(useProjectStore.getState().parts).toHaveLength(1);
        });
      });
    });

    describe('duplicatePart', () => {
      it('creates a copy of a part with a new id', () => {
        const store = useProjectStore.getState();
        const originalId = store.addPart({
          name: 'Original',
          length: 30,
          width: 15
        });

        const duplicateId = store.duplicatePart(originalId);

        const state = useProjectStore.getState();
        expect(state.parts).toHaveLength(2);
        expect(duplicateId).not.toBe(originalId);

        const duplicate = state.parts.find((p) => p.id === duplicateId);
        expect(duplicate?.name).toBe('Original (copy)');
        expect(duplicate?.length).toBe(30);
        expect(duplicate?.width).toBe(15);
      });

      it('generates smart copy names', () => {
        const store = useProjectStore.getState();
        const originalId = store.addPart({ name: 'Test Part' });

        const copy1Id = store.duplicatePart(originalId);
        const copy2Id = store.duplicatePart(copy1Id!);
        const copy3Id = store.duplicatePart(copy2Id!);

        const state = useProjectStore.getState();
        expect(state.parts.find((p) => p.id === copy1Id)?.name).toBe('Test Part (copy)');
        expect(state.parts.find((p) => p.id === copy2Id)?.name).toBe('Test Part (copy 2)');
        expect(state.parts.find((p) => p.id === copy3Id)?.name).toBe('Test Part (copy 3)');
      });

      it('returns null for non-existent part', () => {
        const store = useProjectStore.getState();
        const result = store.duplicatePart('non-existent-id');
        expect(result).toBeNull();
      });
    });

    describe('duplicateSelectedParts', () => {
      it('duplicates all selected parts', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart({ name: 'Part 1' });
        const part2Id = store.addPart({ name: 'Part 2' });

        useSelectionStore.getState().selectParts([part1Id, part2Id]);
        const newIds = store.duplicateSelectedParts();

        const state = useProjectStore.getState();
        expect(state.parts).toHaveLength(4);
        expect(newIds).toHaveLength(2);
      });
    });
  });

  // Selection tests moved to selectionStore.test.ts

  // ============================================================
  // Stocks
  // ============================================================

  describe('stocks', () => {
    describe('addStock', () => {
      it('creates a new stock with default values', () => {
        const store = useProjectStore.getState();
        const stockId = store.addStock();

        const state = useProjectStore.getState();
        expect(state.stocks).toHaveLength(1);
        expect(state.stocks[0].id).toBe(stockId);
        expect(state.stocks[0].name).toBe('New Stock');
      });

      it('creates a stock with custom values', () => {
        const store = useProjectStore.getState();
        const stockId = store.addStock({
          name: '3/4" Plywood',
          length: 96,
          width: 48,
          thickness: 0.75
        });

        const state = useProjectStore.getState();
        const stock = state.stocks.find((s) => s.id === stockId);
        expect(stock?.name).toBe('3/4" Plywood');
        expect(stock?.length).toBe(96);
        expect(stock?.width).toBe(48);
      });
    });

    describe('updateStock', () => {
      it('updates stock properties', () => {
        const store = useProjectStore.getState();
        const stockId = store.addStock({ name: 'Original' });

        store.updateStock(stockId, { name: 'Updated', pricePerUnit: 10 });

        const state = useProjectStore.getState();
        const stock = state.stocks.find((s) => s.id === stockId);
        expect(stock?.name).toBe('Updated');
        expect(stock?.pricePerUnit).toBe(10);
      });
    });

    describe('deleteStock', () => {
      it('removes a stock from the store', () => {
        const store = useProjectStore.getState();
        const stockId = store.addStock();

        store.deleteStock(stockId);

        expect(useProjectStore.getState().stocks).toHaveLength(0);
      });

      it('unassigns stock from parts using it', () => {
        const store = useProjectStore.getState();
        const stockId = store.addStock();
        const partId = store.addPart({ stockId });

        store.deleteStock(stockId);

        const part = useProjectStore.getState().parts.find((p) => p.id === partId);
        expect(part?.stockId).toBeNull();
      });
    });

    describe('assignStockToSelectedParts', () => {
      it('assigns stock to all selected parts', () => {
        const store = useProjectStore.getState();
        const stockId = store.addStock({ color: '#ff0000' });
        const part1Id = store.addPart();
        const part2Id = store.addPart();

        useSelectionStore.getState().selectParts([part1Id, part2Id]);
        store.assignStockToSelectedParts(stockId);

        const state = useProjectStore.getState();
        expect(state.parts.find((p) => p.id === part1Id)?.stockId).toBe(stockId);
        expect(state.parts.find((p) => p.id === part2Id)?.stockId).toBe(stockId);
      });

      it('updates part color to match stock', () => {
        const store = useProjectStore.getState();
        const stockId = store.addStock({ color: '#ff0000' });
        const partId = store.addPart({ color: '#000000' });

        useSelectionStore.getState().selectPart(partId);
        store.assignStockToSelectedParts(stockId);

        const part = useProjectStore.getState().parts.find((p) => p.id === partId);
        expect(part?.color).toBe('#ff0000');
      });

      it('unassigns stock when called with null', () => {
        const store = useProjectStore.getState();
        const stockId = store.addStock();
        const partId = store.addPart({ stockId });

        useSelectionStore.getState().selectPart(partId);
        store.assignStockToSelectedParts(null);

        const part = useProjectStore.getState().parts.find((p) => p.id === partId);
        expect(part?.stockId).toBeNull();
      });
    });
  });

  // ============================================================
  // Groups
  // ============================================================

  describe('groups', () => {
    describe('createGroup', () => {
      it('creates a group with specified members', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart({ name: 'Part 1' });
        const part2Id = store.addPart({ name: 'Part 2' });

        const groupId = store.createGroup('Test Group', [
          { id: part1Id, type: 'part' },
          { id: part2Id, type: 'part' }
        ]);

        const state = useProjectStore.getState();
        expect(state.groups).toHaveLength(1);
        expect(state.groups[0].id).toBe(groupId);
        expect(state.groups[0].name).toBe('Test Group');
        expect(state.groupMembers).toHaveLength(2);
      });

      it('selects the new group after creation', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart();

        const groupId = store.createGroup('Test Group', [{ id: partId, type: 'part' }]);

        expect(useSelectionStore.getState().selectedGroupIds).toContain(groupId);
      });
    });

    describe('renameGroup', () => {
      it('updates the group name', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart();
        const groupId = store.createGroup('Original Name', [{ id: partId, type: 'part' }]);

        store.renameGroup(groupId, 'New Name');

        const group = useProjectStore.getState().groups.find((g) => g.id === groupId);
        expect(group?.name).toBe('New Name');
      });
    });

    describe('deleteGroup - ungroup mode', () => {
      it('removes the group but keeps parts', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart();
        const part2Id = store.addPart();
        const groupId = store.createGroup('Test Group', [
          { id: part1Id, type: 'part' },
          { id: part2Id, type: 'part' }
        ]);

        store.deleteGroup(groupId, 'ungroup');

        const state = useProjectStore.getState();
        expect(state.groups).toHaveLength(0);
        expect(state.parts).toHaveLength(2);
        expect(state.groupMembers).toHaveLength(0);
      });
    });

    describe('deleteGroup - recursive mode', () => {
      it('removes the group and all nested parts', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart();
        const part2Id = store.addPart();
        const groupId = store.createGroup('Test Group', [
          { id: part1Id, type: 'part' },
          { id: part2Id, type: 'part' }
        ]);

        store.deleteGroup(groupId, 'recursive');

        const state = useProjectStore.getState();
        expect(state.groups).toHaveLength(0);
        expect(state.parts).toHaveLength(0);
      });
    });

    describe('nested groups', () => {
      it('supports groups containing other groups', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart({ name: 'Part 1' });
        const part2Id = store.addPart({ name: 'Part 2' });

        const innerGroupId = store.createGroup('Inner Group', [{ id: part1Id, type: 'part' }]);
        const outerGroupId = store.createGroup('Outer Group', [
          { id: innerGroupId, type: 'group' },
          { id: part2Id, type: 'part' }
        ]);

        const state = useProjectStore.getState();
        expect(state.groups).toHaveLength(2);
        expect(state.groupMembers).toHaveLength(3); // 1 in inner, 2 in outer
      });
    });

    describe('addToGroup', () => {
      it('adds parts to an existing group', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart({ name: 'Part 1' });
        const part2Id = store.addPart({ name: 'Part 2' });
        const part3Id = store.addPart({ name: 'Part 3' });
        const groupId = store.createGroup('Test Group', [{ id: part1Id, type: 'part' }]);

        store.addToGroup(groupId, [part2Id, part3Id], 'part');

        const state = useProjectStore.getState();
        const groupMemberIds = state.groupMembers.filter((gm) => gm.groupId === groupId).map((gm) => gm.memberId);
        expect(groupMemberIds).toContain(part1Id);
        expect(groupMemberIds).toContain(part2Id);
        expect(groupMemberIds).toContain(part3Id);
      });

      it('adds a group to another group', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart({ name: 'Part 1' });
        const part2Id = store.addPart({ name: 'Part 2' });
        const innerGroupId = store.createGroup('Inner Group', [{ id: part1Id, type: 'part' }]);
        const outerGroupId = store.createGroup('Outer Group', [{ id: part2Id, type: 'part' }]);

        store.addToGroup(outerGroupId, [innerGroupId], 'group');

        const state = useProjectStore.getState();
        const outerGroupMembers = state.groupMembers.filter((gm) => gm.groupId === outerGroupId);
        expect(outerGroupMembers.some((gm) => gm.memberId === innerGroupId && gm.memberType === 'group')).toBe(true);
      });

      it('does not add duplicates', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Part 1' });
        const groupId = store.createGroup('Test Group', [{ id: partId, type: 'part' }]);
        const initialMemberCount = useProjectStore.getState().groupMembers.length;

        store.addToGroup(groupId, [partId], 'part');

        expect(useProjectStore.getState().groupMembers).toHaveLength(initialMemberCount);
      });
    });

    describe('removeFromGroup', () => {
      it('removes parts from their group', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart({ name: 'Part 1' });
        const part2Id = store.addPart({ name: 'Part 2' });
        const groupId = store.createGroup('Test Group', [
          { id: part1Id, type: 'part' },
          { id: part2Id, type: 'part' }
        ]);

        store.removeFromGroup([part1Id], 'part');

        const state = useProjectStore.getState();
        const groupMemberIds = state.groupMembers.filter((gm) => gm.groupId === groupId).map((gm) => gm.memberId);
        expect(groupMemberIds).not.toContain(part1Id);
        expect(groupMemberIds).toContain(part2Id);
      });

      it('removes groups from their parent group', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Part 1' });
        const innerGroupId = store.createGroup('Inner Group', [{ id: partId, type: 'part' }]);
        const outerGroupId = store.createGroup('Outer Group', [{ id: innerGroupId, type: 'group' }]);

        store.removeFromGroup([innerGroupId], 'group');

        const state = useProjectStore.getState();
        const outerGroupMembers = state.groupMembers.filter((gm) => gm.groupId === outerGroupId);
        expect(outerGroupMembers).toHaveLength(0);
        // Inner group still exists, just not in outer group
        expect(state.groups.find((g) => g.id === innerGroupId)).toBeDefined();
      });
    });

    // Group selection, editing, and expand/collapse tests moved to selectionStore.test.ts
  });

  // Clipboard tests moved to clipboardStore.test.ts

  // ============================================================
  // Project Operations
  // ============================================================

  describe('project', () => {
    describe('newProject', () => {
      it('resets the store to initial state', () => {
        const store = useProjectStore.getState();
        store.addPart();
        store.addStock();
        store.markDirty();

        store.newProject();

        const state = useProjectStore.getState();
        expect(state.parts).toHaveLength(0);
        expect(state.stocks).toHaveLength(0);
        expect(state.isDirty).toBe(false);
        expect(state.projectName).toBe('Untitled Project');
      });

      it('accepts default settings', () => {
        const store = useProjectStore.getState();

        store.newProject({
          units: 'metric',
          gridSize: 1
        });

        const state = useProjectStore.getState();
        expect(state.units).toBe('metric');
        expect(state.gridSize).toBe(1);
      });
    });

    describe('loadProject', () => {
      it('loads project data into the store', () => {
        const store = useProjectStore.getState();
        const project = createTestProject({
          name: 'Loaded Project',
          parts: [createTestPart({ name: 'Loaded Part' })],
          stocks: [createTestStock({ name: 'Loaded Stock' })]
        });

        store.loadProject(project, '/path/to/file.carvd');

        const state = useProjectStore.getState();
        expect(state.projectName).toBe('Loaded Project');
        expect(state.parts).toHaveLength(1);
        expect(state.parts[0].name).toBe('Loaded Part');
        expect(state.stocks).toHaveLength(1);
        expect(state.filePath).toBe('/path/to/file.carvd');
        expect(state.isDirty).toBe(false);
      });
    });

    describe('markDirty / markClean', () => {
      it('tracks unsaved changes', () => {
        const store = useProjectStore.getState();

        expect(store.isDirty).toBe(false);

        store.markDirty();
        expect(useProjectStore.getState().isDirty).toBe(true);

        store.markClean();
        expect(useProjectStore.getState().isDirty).toBe(false);
      });
    });
  });

  // ============================================================
  // Project Settings
  // ============================================================

  describe('project settings', () => {
    it('updates project name', () => {
      const store = useProjectStore.getState();
      store.setProjectName('My Project');
      expect(useProjectStore.getState().projectName).toBe('My Project');
    });

    it('updates units', () => {
      const store = useProjectStore.getState();
      store.setProjectUnits('metric');
      expect(useProjectStore.getState().units).toBe('metric');
    });

    it('updates grid size', () => {
      const store = useProjectStore.getState();
      store.setProjectGridSize(0.25);
      expect(useProjectStore.getState().gridSize).toBe(0.25);
    });

    it('updates kerf width', () => {
      const store = useProjectStore.getState();
      store.setKerfWidth(0.1875);
      expect(useProjectStore.getState().kerfWidth).toBe(0.1875);
    });

    it('updates overage factor', () => {
      const store = useProjectStore.getState();
      store.setOverageFactor(0.15);
      expect(useProjectStore.getState().overageFactor).toBe(0.15);
    });

    it('updates project notes', () => {
      const store = useProjectStore.getState();
      store.setProjectNotes('These are my project notes');
      expect(useProjectStore.getState().projectNotes).toBe('These are my project notes');
    });

    it('updates stock constraints', () => {
      const store = useProjectStore.getState();
      const constraints = {
        constrainDimensions: false,
        constrainGrain: true,
        constrainColor: false,
        preventOverlap: true
      };

      store.setStockConstraints(constraints);

      expect(useProjectStore.getState().stockConstraints).toEqual(constraints);
    });

    it('updates file path', () => {
      const store = useProjectStore.getState();

      store.setFilePath('/path/to/project.carvd');

      expect(useProjectStore.getState().filePath).toBe('/path/to/project.carvd');
    });

    it('clears file path', () => {
      const store = useProjectStore.getState();
      store.setFilePath('/path/to/project.carvd');

      store.setFilePath(null);

      expect(useProjectStore.getState().filePath).toBeNull();
    });
  });

  // ============================================================
  // View State (snap state tests moved to snapStore.test.ts)
  // ============================================================

  // ============================================================
  // Snap Guides
  // ============================================================

  describe('snap guides', () => {
    describe('addSnapGuide', () => {
      it('creates a new snap guide', () => {
        const store = useProjectStore.getState();
        const guideId = store.addSnapGuide('x', 10, 'Test Guide');

        const state = useProjectStore.getState();
        expect(state.snapGuides).toHaveLength(1);
        expect(state.snapGuides[0].id).toBe(guideId);
        expect(state.snapGuides[0].axis).toBe('x');
        expect(state.snapGuides[0].position).toBe(10);
        expect(state.snapGuides[0].label).toBe('Test Guide');
      });
    });

    describe('removeSnapGuide', () => {
      it('removes a snap guide', () => {
        const store = useProjectStore.getState();
        const guideId = store.addSnapGuide('x', 10);

        store.removeSnapGuide(guideId);

        expect(useProjectStore.getState().snapGuides).toHaveLength(0);
      });
    });

    describe('clearSnapGuides', () => {
      it('removes all snap guides', () => {
        const store = useProjectStore.getState();
        store.addSnapGuide('x', 10);
        store.addSnapGuide('y', 20);
        store.addSnapGuide('z', 30);

        store.clearSnapGuides();

        expect(useProjectStore.getState().snapGuides).toHaveLength(0);
      });
    });
  });

  // ============================================================
  // Cut List
  // ============================================================

  describe('cut list', () => {
    describe('setCutList', () => {
      it('stores a cut list', () => {
        const store = useProjectStore.getState();
        const mockCutList = {
          id: 'test-cut-list',
          generatedAt: new Date().toISOString(),
          projectModifiedAt: new Date().toISOString(),
          isStale: false,
          instructions: [],
          stockBoards: [],
          statistics: {
            totalParts: 0,
            totalStockBoards: 0,
            totalBoardFeet: 0,
            totalWasteSquareInches: 0,
            wastePercentage: 0,
            estimatedCost: 0,
            totalWasteCost: 0,
            byStock: []
          },
          bypassedIssues: [],
          skippedParts: [],
          kerfWidth: 0.125,
          overageFactor: 0.1
        } as any;

        store.setCutList(mockCutList);

        expect(useProjectStore.getState().cutList).toBe(mockCutList);
      });
    });

    describe('markCutListStale', () => {
      it('marks the cut list as stale when parts change', () => {
        const store = useProjectStore.getState();
        store.setCutList({
          id: 'test',
          isStale: false
        } as any);

        store.markCutListStale();

        expect(useProjectStore.getState().cutList?.isStale).toBe(true);
      });
    });

    describe('clearCutList', () => {
      it('removes the cut list', () => {
        const store = useProjectStore.getState();
        store.setCutList({ id: 'test' } as any);

        store.clearCutList();

        expect(useProjectStore.getState().cutList).toBeNull();
      });
    });
  });

  // ============================================================
  // Custom Shopping Items
  // ============================================================

  describe('custom shopping items', () => {
    describe('addCustomShoppingItem', () => {
      it('adds a custom item to the shopping list', () => {
        const store = useProjectStore.getState();

        const itemId = store.addCustomShoppingItem({
          name: 'Wood Glue',
          quantity: 2,
          unitPrice: 8.99,
          category: 'Supplies'
        });

        const state = useProjectStore.getState();
        expect(itemId).toBeDefined();
        expect(state.customShoppingItems).toHaveLength(1);
        expect(state.customShoppingItems[0].name).toBe('Wood Glue');
        expect(state.customShoppingItems[0].quantity).toBe(2);
        expect(state.customShoppingItems[0].unitPrice).toBe(8.99);
      });

      it('marks project as dirty', () => {
        const store = useProjectStore.getState();
        store.newProject();
        expect(useProjectStore.getState().isDirty).toBe(false);

        store.addCustomShoppingItem({
          name: 'Screws',
          quantity: 1,
          unitPrice: 5.99
        });

        expect(useProjectStore.getState().isDirty).toBe(true);
      });
    });

    describe('updateCustomShoppingItem', () => {
      it('updates an existing item', () => {
        const store = useProjectStore.getState();
        const itemId = store.addCustomShoppingItem({
          name: 'Nails',
          quantity: 1,
          unitPrice: 3.99
        });

        store.updateCustomShoppingItem(itemId, { quantity: 5 });

        const item = useProjectStore.getState().customShoppingItems.find((i) => i.id === itemId);
        expect(item?.quantity).toBe(5);
        expect(item?.name).toBe('Nails'); // Unchanged
      });

      it('updates multiple properties at once', () => {
        const store = useProjectStore.getState();
        const itemId = store.addCustomShoppingItem({
          name: 'Hinges',
          quantity: 2,
          unitPrice: 4.99
        });

        store.updateCustomShoppingItem(itemId, {
          name: 'Cabinet Hinges',
          quantity: 4,
          unitPrice: 6.99
        });

        const item = useProjectStore.getState().customShoppingItems.find((i) => i.id === itemId);
        expect(item?.name).toBe('Cabinet Hinges');
        expect(item?.quantity).toBe(4);
        expect(item?.unitPrice).toBe(6.99);
      });
    });

    describe('deleteCustomShoppingItem', () => {
      it('removes an item from the list', () => {
        const store = useProjectStore.getState();
        const itemId = store.addCustomShoppingItem({
          name: 'Brackets',
          quantity: 4,
          unitPrice: 2.5
        });

        store.deleteCustomShoppingItem(itemId);

        expect(useProjectStore.getState().customShoppingItems).toHaveLength(0);
      });

      it('does not affect other items', () => {
        const store = useProjectStore.getState();
        const item1Id = store.addCustomShoppingItem({
          name: 'Item 1',
          quantity: 1,
          unitPrice: 1.0
        });
        const item2Id = store.addCustomShoppingItem({
          name: 'Item 2',
          quantity: 2,
          unitPrice: 2.0
        });

        store.deleteCustomShoppingItem(item1Id);

        const state = useProjectStore.getState();
        expect(state.customShoppingItems).toHaveLength(1);
        expect(state.customShoppingItems[0].id).toBe(item2Id);
      });
    });
  });

  // ============================================================
  // Move Selected Parts
  // ============================================================

  describe('moveSelectedParts', () => {
    it('moves selected parts by the given delta', () => {
      const store = useProjectStore.getState();
      const partId = store.addPart({
        position: { x: 0, y: 0, z: 0 }
      });

      useSelectionStore.getState().selectPart(partId);
      store.moveSelectedParts({ x: 5, y: 10, z: 15 });

      const part = useProjectStore.getState().parts.find((p) => p.id === partId);
      expect(part?.position).toEqual({ x: 5, y: 10, z: 15 });
    });

    it('moves all parts in a selected group', () => {
      const store = useProjectStore.getState();
      const part1Id = store.addPart({ position: { x: 0, y: 0, z: 0 } });
      const part2Id = store.addPart({ position: { x: 10, y: 0, z: 0 } });
      const groupId = store.createGroup('Test Group', [
        { id: part1Id, type: 'part' },
        { id: part2Id, type: 'part' }
      ]);

      useSelectionStore.getState().clearSelection();
      useSelectionStore.getState().selectGroup(groupId);
      store.moveSelectedParts({ x: 5, y: 5, z: 5 });

      const state = useProjectStore.getState();
      const part1 = state.parts.find((p) => p.id === part1Id);
      const part2 = state.parts.find((p) => p.id === part2Id);

      expect(part1?.position).toEqual({ x: 5, y: 5, z: 5 });
      expect(part2?.position).toEqual({ x: 15, y: 5, z: 5 });
    });
  });

  // ============================================================
  // Assemblies
  // ============================================================

  describe('assemblies', () => {
    describe('addAssembly', () => {
      it('adds an assembly to the store', () => {
        const store = useProjectStore.getState();
        const assembly = createTestAssembly({ name: 'Test Assembly' });

        store.addAssembly(assembly);

        const state = useProjectStore.getState();
        expect(state.assemblies).toHaveLength(1);
        expect(state.assemblies[0].name).toBe('Test Assembly');
      });

      it('marks project as dirty', () => {
        const store = useProjectStore.getState();
        expect(store.isDirty).toBe(false);

        store.addAssembly(createTestAssembly());

        expect(useProjectStore.getState().isDirty).toBe(true);
      });
    });

    describe('updateAssembly', () => {
      it('updates assembly properties', () => {
        const store = useProjectStore.getState();
        const assembly = createTestAssembly({ name: 'Original' });
        store.addAssembly(assembly);

        store.updateAssembly(assembly.id, { name: 'Updated' });

        const updated = useProjectStore.getState().assemblies[0];
        expect(updated.name).toBe('Updated');
      });

      it('preserves non-updated properties', () => {
        const store = useProjectStore.getState();
        const assembly = createTestAssembly({
          name: 'Original',
          description: 'Test description'
        });
        store.addAssembly(assembly);

        store.updateAssembly(assembly.id, { name: 'Updated' });

        const updated = useProjectStore.getState().assemblies[0];
        expect(updated.description).toBe('Test description');
      });
    });

    describe('deleteAssembly', () => {
      it('removes an assembly from the store', () => {
        const store = useProjectStore.getState();
        const assembly = createTestAssembly();
        store.addAssembly(assembly);
        expect(useProjectStore.getState().assemblies).toHaveLength(1);

        store.deleteAssembly(assembly.id);

        expect(useProjectStore.getState().assemblies).toHaveLength(0);
      });

      it('does not affect other assemblies', () => {
        const store = useProjectStore.getState();
        const assembly1 = createTestAssembly({ name: 'Assembly 1' });
        const assembly2 = createTestAssembly({ name: 'Assembly 2' });
        store.addAssembly(assembly1);
        store.addAssembly(assembly2);

        store.deleteAssembly(assembly1.id);

        const state = useProjectStore.getState();
        expect(state.assemblies).toHaveLength(1);
        expect(state.assemblies[0].name).toBe('Assembly 2');
      });
    });

    describe('createAssemblyFromSelection', () => {
      it('creates assembly from selected parts', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart({
          name: 'Part 1',
          length: 24,
          width: 12,
          position: { x: 0, y: 0, z: 0 }
        });
        const part2Id = store.addPart({
          name: 'Part 2',
          length: 24,
          width: 12,
          position: { x: 30, y: 0, z: 0 }
        });

        useSelectionStore.getState().selectParts([part1Id, part2Id]);
        const assembly = store.createAssemblyFromSelection('My Assembly', 'A test assembly');

        expect(assembly).not.toBeNull();
        expect(assembly!.name).toBe('My Assembly');
        expect(assembly!.description).toBe('A test assembly');
        expect(assembly!.parts).toHaveLength(2);
      });

      it('normalizes part positions relative to assembly center', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart({
          position: { x: 10, y: 0, z: 0 }
        });
        const part2Id = store.addPart({
          position: { x: 30, y: 0, z: 0 }
        });

        useSelectionStore.getState().selectParts([part1Id, part2Id]);
        const assembly = store.createAssemblyFromSelection('Test');

        // Parts should be centered around origin
        // Original center was (20, 0, 0), so:
        // Part 1 relative position: (10-20, 0, 0) = (-10, 0, 0)
        // Part 2 relative position: (30-20, 0, 0) = (10, 0, 0)
        expect(assembly!.parts[0].relativePosition.x).toBe(-10);
        expect(assembly!.parts[1].relativePosition.x).toBe(10);
      });

      it('returns null when nothing is selected', () => {
        const store = useProjectStore.getState();
        useSelectionStore.getState().clearSelection();

        const assembly = store.createAssemblyFromSelection('Test');

        expect(assembly).toBeNull();
      });

      it('includes groups and group members in the assembly', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart({ name: 'Part 1' });
        const part2Id = store.addPart({ name: 'Part 2' });
        const groupId = store.createGroup('Test Group', [
          { id: part1Id, type: 'part' },
          { id: part2Id, type: 'part' }
        ]);

        useSelectionStore.getState().clearSelection();
        useSelectionStore.getState().selectGroup(groupId);
        const assembly = store.createAssemblyFromSelection('Grouped Assembly');

        expect(assembly!.groups.length).toBeGreaterThan(0);
        expect(assembly!.groupMembers.length).toBeGreaterThan(0);
      });

      it('stores stock ID reference in assembly parts', () => {
        const store = useProjectStore.getState();
        const stockId = store.addStock({ name: 'Test Stock' });
        const partId = store.addPart({ name: 'Part with Stock' });
        store.assignStockToSelectedParts(stockId); // Part is auto-selected on creation

        const assembly = store.createAssemblyFromSelection('Stock Assembly');

        expect(assembly!.parts[0].stockId).toBe(stockId);
      });
    });

    describe('placeAssembly', () => {
      it('places assembly parts into the workspace', () => {
        const store = useProjectStore.getState();

        // Create and save an assembly
        const part1Id = store.addPart({
          name: 'Shelf',
          position: { x: 0, y: 0, z: 0 }
        });
        useSelectionStore.getState().selectParts([part1Id]);
        const assembly = store.createAssemblyFromSelection('Shelf Assembly');
        store.addAssembly(assembly!);

        // Clear workspace
        store.deletePart(part1Id);
        expect(useProjectStore.getState().parts).toHaveLength(0);

        // Place assembly
        const newPartIds = store.placeAssembly(assembly!.id, { x: 10, y: 5, z: 0 });

        expect(newPartIds).toHaveLength(1);
        const placedPart = useProjectStore.getState().parts[0];
        expect(placedPart.name).toBe('Shelf');
        expect(placedPart.position.x).toBe(10);
        // Y position includes the part's relative position from assembly (center-based)
        expect(placedPart.position.y).toBeCloseTo(5, 0);
      });

      it('returns empty array for non-existent assembly', () => {
        const store = useProjectStore.getState();
        const newPartIds = store.placeAssembly('non-existent-id', { x: 0, y: 0, z: 0 });
        expect(newPartIds).toHaveLength(0);
      });

      it('preserves part properties when placing', () => {
        const store = useProjectStore.getState();

        const partId = store.addPart({
          name: 'Custom Part',
          length: 48,
          width: 24,
          thickness: 1.5,
          color: '#ff0000',
          grainSensitive: true,
          grainDirection: 'width'
        });
        useSelectionStore.getState().selectParts([partId]);
        const assembly = store.createAssemblyFromSelection('Custom Assembly');
        store.addAssembly(assembly!);
        store.deletePart(partId);

        store.placeAssembly(assembly!.id, { x: 0, y: 0, z: 0 });

        const placedPart = useProjectStore.getState().parts[0];
        expect(placedPart.length).toBe(48);
        expect(placedPart.width).toBe(24);
        expect(placedPart.thickness).toBe(1.5);
        expect(placedPart.color).toBe('#ff0000');
        expect(placedPart.grainSensitive).toBe(true);
        expect(placedPart.grainDirection).toBe('width');
      });

      it('creates new groups when placing grouped assembly', () => {
        const store = useProjectStore.getState();

        const part1Id = store.addPart({ name: 'Part 1' });
        const part2Id = store.addPart({ name: 'Part 2' });
        const groupId = store.createGroup('Test Group', [
          { id: part1Id, type: 'part' },
          { id: part2Id, type: 'part' }
        ]);
        useSelectionStore.getState().clearSelection();
        useSelectionStore.getState().selectGroup(groupId);
        const assembly = store.createAssemblyFromSelection('Grouped');
        store.addAssembly(assembly!);

        // Clear workspace
        store.deleteGroup(groupId, 'recursive');

        // Place assembly
        store.placeAssembly(assembly!.id, { x: 0, y: 0, z: 0 });

        const state = useProjectStore.getState();
        expect(state.parts.length).toBeGreaterThan(0);
        expect(state.groups.length).toBeGreaterThan(0);
        expect(state.groupMembers.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================
  // Reset Parts to Stock
  // ============================================================

  describe('resetSelectedPartsToStock', () => {
    it('resets selected parts color to match stock', () => {
      const store = useProjectStore.getState();
      const stockId = store.addStock({
        name: 'Red Stock',
        color: '#ff0000',
        grainDirection: 'length'
      });
      const partId = store.addPart({
        name: 'Custom Color Part',
        stockId,
        color: '#0000ff' // Different color
      });

      useSelectionStore.getState().selectPart(partId);
      store.resetSelectedPartsToStock();

      const part = useProjectStore.getState().parts.find((p) => p.id === partId);
      expect(part?.color).toBe('#ff0000');
    });

    it('resets grain direction to match stock', () => {
      const store = useProjectStore.getState();
      const stockId = store.addStock({
        name: 'Length Grain Stock',
        color: '#d4a574',
        grainDirection: 'length'
      });
      const partId = store.addPart({
        name: 'Width Grain Part',
        stockId,
        grainDirection: 'width' // Different grain
      });

      useSelectionStore.getState().selectPart(partId);
      store.resetSelectedPartsToStock();

      const part = useProjectStore.getState().parts.find((p) => p.id === partId);
      expect(part?.grainDirection).toBe('length');
    });

    it('preserves part grain direction when stock has no grain', () => {
      const store = useProjectStore.getState();
      const stockId = store.addStock({
        name: 'MDF',
        color: '#d4a574',
        grainDirection: 'none'
      });
      const partId = store.addPart({
        name: 'Grain Part',
        stockId,
        grainDirection: 'width'
      });

      useSelectionStore.getState().selectPart(partId);
      store.resetSelectedPartsToStock();

      const part = useProjectStore.getState().parts.find((p) => p.id === partId);
      expect(part?.grainDirection).toBe('width'); // Preserved
    });

    it('does nothing when no parts are selected', () => {
      const store = useProjectStore.getState();
      const stockId = store.addStock({ name: 'Stock', color: '#ff0000' });
      const partId = store.addPart({
        name: 'Part',
        stockId,
        color: '#0000ff'
      });

      useSelectionStore.getState().clearSelection();
      store.resetSelectedPartsToStock();

      const part = useProjectStore.getState().parts.find((p) => p.id === partId);
      expect(part?.color).toBe('#0000ff'); // Unchanged
    });

    it('skips parts without stock assigned', () => {
      const store = useProjectStore.getState();
      const partId = store.addPart({
        name: 'No Stock Part',
        stockId: null,
        color: '#0000ff'
      });

      useSelectionStore.getState().selectPart(partId);
      store.resetSelectedPartsToStock();

      const part = useProjectStore.getState().parts.find((p) => p.id === partId);
      expect(part?.color).toBe('#0000ff'); // Unchanged
    });

    it('skips parts with non-existent stock', () => {
      const store = useProjectStore.getState();
      const partId = store.addPart({
        name: 'Bad Stock Part',
        stockId: 'non-existent-stock',
        color: '#0000ff'
      });

      useSelectionStore.getState().selectPart(partId);
      store.resetSelectedPartsToStock();

      const part = useProjectStore.getState().parts.find((p) => p.id === partId);
      expect(part?.color).toBe('#0000ff'); // Unchanged
    });

    it('resets multiple selected parts', () => {
      const store = useProjectStore.getState();
      const stockId = store.addStock({
        name: 'Stock',
        color: '#ff0000',
        grainDirection: 'length'
      });
      const partId1 = store.addPart({ name: 'Part 1', stockId, color: '#0000ff' });
      const partId2 = store.addPart({ name: 'Part 2', stockId, color: '#00ff00' });

      useSelectionStore.getState().selectParts([partId1, partId2]);
      store.resetSelectedPartsToStock();

      const state = useProjectStore.getState();
      const part1 = state.parts.find((p) => p.id === partId1);
      const part2 = state.parts.find((p) => p.id === partId2);
      expect(part1?.color).toBe('#ff0000');
      expect(part2?.color).toBe('#ff0000');
    });
  });

  // UI state tests (setHoveredPart, setTransformMode, setActiveDragDelta, setSelectionBox) moved to selectionStore.test.ts

  // Camera actions moved to cameraStore.test.ts

  // ============================================================
  // mergeGroups
  // ============================================================

  describe('mergeGroups', () => {
    describe('top-level mode', () => {
      it('merges two groups into a new group', () => {
        const store = useProjectStore.getState();
        const p1 = store.addPart({ name: 'Part 1' });
        const p2 = store.addPart({ name: 'Part 2' });
        const g1 = store.createGroup('Group A', [{ id: p1, type: 'part' }]);
        const g2 = store.createGroup('Group B', [{ id: p2, type: 'part' }]);

        const mergedId = store.mergeGroups([g1!, g2!], 'top-level');

        expect(mergedId).not.toBeNull();
        const state = useProjectStore.getState();
        // Original groups should be removed
        expect(state.groups.find((g) => g.id === g1)).toBeUndefined();
        expect(state.groups.find((g) => g.id === g2)).toBeUndefined();
        // Merged group should exist
        const merged = state.groups.find((g) => g.id === mergedId);
        expect(merged).toBeDefined();
        expect(merged?.name).toContain('Merged');
      });

      it('names merged group from 2 groups with both names', () => {
        const store = useProjectStore.getState();
        const p1 = store.addPart({ name: 'P1' });
        const p2 = store.addPart({ name: 'P2' });
        const g1 = store.createGroup('Alpha', [{ id: p1, type: 'part' }]);
        const g2 = store.createGroup('Beta', [{ id: p2, type: 'part' }]);

        const mergedId = store.mergeGroups([g1!, g2!], 'top-level');

        const merged = useProjectStore.getState().groups.find((g) => g.id === mergedId);
        expect(merged?.name).toBe('Alpha & Beta Merged');
      });

      it('names merged group from 3+ groups with count', () => {
        const store = useProjectStore.getState();
        const p1 = store.addPart({ name: 'P1' });
        const p2 = store.addPart({ name: 'P2' });
        const p3 = store.addPart({ name: 'P3' });
        const g1 = store.createGroup('Alpha', [{ id: p1, type: 'part' }]);
        const g2 = store.createGroup('Beta', [{ id: p2, type: 'part' }]);
        const g3 = store.createGroup('Gamma', [{ id: p3, type: 'part' }]);

        const mergedId = store.mergeGroups([g1!, g2!, g3!], 'top-level');

        const merged = useProjectStore.getState().groups.find((g) => g.id === mergedId);
        expect(merged?.name).toBe('Alpha & 2 others Merged');
      });

      it('preserves nested groups in top-level mode', () => {
        const store = useProjectStore.getState();
        const p1 = store.addPart({ name: 'P1' });
        const p2 = store.addPart({ name: 'P2' });
        const inner = store.createGroup('Inner', [{ id: p1, type: 'part' }]);
        const g1 = store.createGroup('Outer', [{ id: inner!, type: 'group' }]);
        const g2 = store.createGroup('Other', [{ id: p2, type: 'part' }]);

        const mergedId = store.mergeGroups([g1!, g2!], 'top-level');

        const state = useProjectStore.getState();
        // Inner group should still exist as a member of the merged group
        expect(state.groups.find((g) => g.id === inner)).toBeDefined();
        const mergedMembers = state.groupMembers.filter((gm) => gm.groupId === mergedId);
        expect(mergedMembers.some((m) => m.memberId === inner && m.memberType === 'group')).toBe(true);
      });

      it('returns null when fewer than 2 groups provided', () => {
        const store = useProjectStore.getState();
        const p1 = store.addPart({ name: 'P1' });
        const g1 = store.createGroup('Only One', [{ id: p1, type: 'part' }]);

        expect(store.mergeGroups([g1!], 'top-level')).toBeNull();
        expect(store.mergeGroups([], 'top-level')).toBeNull();
      });

      it('selects and expands the merged group', () => {
        const store = useProjectStore.getState();
        const p1 = store.addPart({ name: 'P1' });
        const p2 = store.addPart({ name: 'P2' });
        const g1 = store.createGroup('G1', [{ id: p1, type: 'part' }]);
        const g2 = store.createGroup('G2', [{ id: p2, type: 'part' }]);

        const mergedId = store.mergeGroups([g1!, g2!], 'top-level');

        const { selectedGroupIds, expandedGroupIds } = useSelectionStore.getState();
        expect(selectedGroupIds).toContain(mergedId);
        expect(expandedGroupIds).toContain(mergedId);
      });

      it('marks project as dirty', () => {
        const store = useProjectStore.getState();
        const p1 = store.addPart({ name: 'P1' });
        const p2 = store.addPart({ name: 'P2' });
        const g1 = store.createGroup('G1', [{ id: p1, type: 'part' }]);
        const g2 = store.createGroup('G2', [{ id: p2, type: 'part' }]);
        useProjectStore.setState({ isDirty: false });

        store.mergeGroups([g1!, g2!], 'top-level');

        expect(useProjectStore.getState().isDirty).toBe(true);
      });
    });

    describe('deep mode', () => {
      it('flattens nested groups into parts', () => {
        const store = useProjectStore.getState();
        const p1 = store.addPart({ name: 'Inner Part' });
        const p2 = store.addPart({ name: 'Outer Part' });
        const inner = store.createGroup('Inner', [{ id: p1, type: 'part' }]);
        const g1 = store.createGroup('Outer', [{ id: inner!, type: 'group' }]);
        const g2 = store.createGroup('Other', [{ id: p2, type: 'part' }]);

        const mergedId = store.mergeGroups([g1!, g2!], 'deep');

        const state = useProjectStore.getState();
        // Inner group should be removed in deep mode
        expect(state.groups.find((g) => g.id === inner)).toBeUndefined();
        // Merged group should have only parts (no groups)
        const mergedMembers = state.groupMembers.filter((gm) => gm.groupId === mergedId);
        expect(mergedMembers.every((m) => m.memberType === 'part')).toBe(true);
        expect(mergedMembers).toHaveLength(2);
      });

      it('removes original groups and nested groups', () => {
        const store = useProjectStore.getState();
        const p1 = store.addPart({ name: 'P1' });
        const p2 = store.addPart({ name: 'P2' });
        const inner = store.createGroup('Inner', [{ id: p1, type: 'part' }]);
        const g1 = store.createGroup('Wrapper', [{ id: inner!, type: 'group' }]);
        const g2 = store.createGroup('Other', [{ id: p2, type: 'part' }]);

        store.mergeGroups([g1!, g2!], 'deep');

        const state = useProjectStore.getState();
        expect(state.groups.find((g) => g.id === g1)).toBeUndefined();
        expect(state.groups.find((g) => g.id === g2)).toBeUndefined();
        expect(state.groups.find((g) => g.id === inner)).toBeUndefined();
      });
    });

    describe('license checks', () => {
      it('blocks merge in free mode', () => {
        const store = useProjectStore.getState();
        const p1 = store.addPart({ name: 'P1' });
        const p2 = store.addPart({ name: 'P2' });
        const g1 = store.createGroup('G1', [{ id: p1, type: 'part' }]);
        const g2 = store.createGroup('G2', [{ id: p2, type: 'part' }]);

        useLicenseStore.setState({ licenseMode: 'free' });

        const result = store.mergeGroups([g1!, g2!], 'top-level');

        expect(result).toBeNull();
        // Original groups should still exist
        const state = useProjectStore.getState();
        expect(state.groups.find((g) => g.id === g1)).toBeDefined();
        expect(state.groups.find((g) => g.id === g2)).toBeDefined();
      });
    });
  });

  // ============================================================
  // removeFromGroup: empty group cleanup
  // ============================================================

  describe('removeFromGroup - empty group cleanup', () => {
    it('removes the group when last member is removed', () => {
      const store = useProjectStore.getState();
      const partId = store.addPart({ name: 'Solo Part' });
      const groupId = store.createGroup('Singleton Group', [{ id: partId, type: 'part' }]);

      store.removeFromGroup([partId], 'part');

      const state = useProjectStore.getState();
      expect(state.groups.find((g) => g.id === groupId)).toBeUndefined();
      expect(state.groupMembers.filter((gm) => gm.groupId === groupId)).toHaveLength(0);
    });

    it('deselects the removed empty group', () => {
      const store = useProjectStore.getState();
      const partId = store.addPart({ name: 'Solo Part' });
      const groupId = store.createGroup('Singleton Group', [{ id: partId, type: 'part' }]);
      useSelectionStore.setState({ selectedGroupIds: [groupId!] });

      store.removeFromGroup([partId], 'part');

      expect(useSelectionStore.getState().selectedGroupIds).not.toContain(groupId);
    });

    it('clears editingGroupId if the empty group was being edited', () => {
      const store = useProjectStore.getState();
      const partId = store.addPart({ name: 'Solo Part' });
      const groupId = store.createGroup('Singleton Group', [{ id: partId, type: 'part' }]);
      useSelectionStore.setState({ editingGroupId: groupId! });

      store.removeFromGroup([partId], 'part');

      expect(useSelectionStore.getState().editingGroupId).toBeNull();
    });

    it('removes empty group from expandedGroupIds', () => {
      const store = useProjectStore.getState();
      const partId = store.addPart({ name: 'Solo Part' });
      const groupId = store.createGroup('Singleton Group', [{ id: partId, type: 'part' }]);
      useSelectionStore.setState({ expandedGroupIds: [groupId!] });

      store.removeFromGroup([partId], 'part');

      expect(useSelectionStore.getState().expandedGroupIds).not.toContain(groupId);
    });

    it('keeps non-empty groups when one member is removed', () => {
      const store = useProjectStore.getState();
      const p1 = store.addPart({ name: 'Part 1' });
      const p2 = store.addPart({ name: 'Part 2' });
      const groupId = store.createGroup('Multi', [
        { id: p1, type: 'part' },
        { id: p2, type: 'part' }
      ]);

      store.removeFromGroup([p1], 'part');

      const state = useProjectStore.getState();
      expect(state.groups.find((g) => g.id === groupId)).toBeDefined();
      expect(state.groupMembers.filter((gm) => gm.groupId === groupId)).toHaveLength(1);
    });
  });
});

// ============================================================
// Exported utility functions
// ============================================================

describe('projectStore utility functions', () => {
  describe('getContainingGroupId', () => {
    it('returns groupId for a part that belongs to a group', () => {
      const groupMembers = [createTestGroupMember('g1', 'p1', 'part'), createTestGroupMember('g1', 'p2', 'part')];

      expect(getContainingGroupId('p1', groupMembers)).toBe('g1');
    });

    it('returns null for an ungrouped part', () => {
      const groupMembers = [createTestGroupMember('g1', 'p1', 'part')];

      expect(getContainingGroupId('p999', groupMembers)).toBeNull();
    });

    it('returns null for empty groupMembers', () => {
      expect(getContainingGroupId('p1', [])).toBeNull();
    });
  });

  describe('getAllDescendantPartIds', () => {
    it('returns direct part members', () => {
      const groupMembers = [createTestGroupMember('g1', 'p1', 'part'), createTestGroupMember('g1', 'p2', 'part')];

      const result = getAllDescendantPartIds('g1', groupMembers);
      expect(result).toEqual(expect.arrayContaining(['p1', 'p2']));
      expect(result).toHaveLength(2);
    });

    it('returns nested parts from subgroups', () => {
      const groupMembers = [
        createTestGroupMember('outer', 'inner', 'group'),
        createTestGroupMember('inner', 'p1', 'part'),
        createTestGroupMember('inner', 'p2', 'part')
      ];

      const result = getAllDescendantPartIds('outer', groupMembers);
      expect(result).toEqual(expect.arrayContaining(['p1', 'p2']));
      expect(result).toHaveLength(2);
    });

    it('returns empty array for a group with no members', () => {
      expect(getAllDescendantPartIds('g1', [])).toHaveLength(0);
    });
  });

  describe('getAllDescendantGroupIds', () => {
    it('returns the group itself plus nested groups', () => {
      const groupMembers = [
        createTestGroupMember('outer', 'inner', 'group'),
        createTestGroupMember('inner', 'deep', 'group'),
        createTestGroupMember('deep', 'p1', 'part')
      ];

      const result = getAllDescendantGroupIds('outer', groupMembers);
      expect(result).toEqual(expect.arrayContaining(['outer', 'inner', 'deep']));
      expect(result).toHaveLength(3);
    });

    it('returns just the group itself when no nested groups', () => {
      const groupMembers = [createTestGroupMember('g1', 'p1', 'part')];

      const result = getAllDescendantGroupIds('g1', groupMembers);
      expect(result).toEqual(['g1']);
    });
  });

  describe('getAncestorGroupIds', () => {
    it('returns ancestor chain for a deeply nested part', () => {
      const groupMembers = [
        createTestGroupMember('outer', 'inner', 'group'),
        createTestGroupMember('inner', 'p1', 'part')
      ];

      const result = getAncestorGroupIds('p1', groupMembers);
      expect(result).toEqual(['inner', 'outer']);
    });

    it('returns single group for a directly grouped part', () => {
      const groupMembers = [createTestGroupMember('g1', 'p1', 'part')];

      const result = getAncestorGroupIds('p1', groupMembers);
      expect(result).toEqual(['g1']);
    });

    it('returns empty array for ungrouped part', () => {
      expect(getAncestorGroupIds('p1', [])).toHaveLength(0);
    });
  });

  describe('isDescendantOf', () => {
    it('returns true for same group', () => {
      expect(isDescendantOf('g1', 'g1', [])).toBe(true);
    });

    it('returns true for direct child group', () => {
      const groupMembers = [createTestGroupMember('parent', 'child', 'group')];

      expect(isDescendantOf('child', 'parent', groupMembers)).toBe(true);
    });

    it('returns true for deeply nested group', () => {
      const groupMembers = [
        createTestGroupMember('outer', 'inner', 'group'),
        createTestGroupMember('inner', 'deep', 'group')
      ];

      expect(isDescendantOf('deep', 'outer', groupMembers)).toBe(true);
    });

    it('returns false for unrelated groups', () => {
      const groupMembers = [createTestGroupMember('g1', 'p1', 'part'), createTestGroupMember('g2', 'p2', 'part')];

      expect(isDescendantOf('g2', 'g1', groupMembers)).toBe(false);
    });

    it('returns false for parent checking against child (wrong direction)', () => {
      const groupMembers = [createTestGroupMember('parent', 'child', 'group')];

      expect(isDescendantOf('parent', 'child', groupMembers)).toBe(false);
    });
  });
});

describe('validatePartsForCutList', () => {
  describe('stock assignment validation', () => {
    it('returns error when part has no stock assigned', () => {
      const parts = [createTestPart({ name: 'Unassigned Part', stockId: null })];
      const stocks: any[] = [];

      const issues = validatePartsForCutList(parts, stocks);

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('no_stock');
      expect(issues[0].severity).toBe('error');
      expect(issues[0].partName).toBe('Unassigned Part');
    });

    it('returns error when assigned stock not found', () => {
      const parts = [createTestPart({ name: 'Orphan Part', stockId: 'non-existent-id' })];
      const stocks: any[] = [];

      const issues = validatePartsForCutList(parts, stocks);

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('no_stock');
      expect(issues[0].message).toContain('not found');
    });

    it('returns no issues for valid part-stock assignment', () => {
      const stock = createTestStock({
        id: 'stock-1',
        length: 96,
        width: 48,
        thickness: 0.75
      });
      const parts = [
        createTestPart({
          name: 'Valid Part',
          stockId: 'stock-1',
          length: 24,
          width: 12,
          thickness: 0.75
        })
      ];

      const issues = validatePartsForCutList(parts, [stock]);

      expect(issues).toHaveLength(0);
    });
  });

  describe('thickness validation', () => {
    it('returns error when part thickness exceeds stock thickness', () => {
      const stock = createTestStock({
        id: 'stock-1',
        thickness: 0.75
      });
      const parts = [
        createTestPart({
          name: 'Thick Part',
          stockId: 'stock-1',
          thickness: 1.5
        })
      ];

      const issues = validatePartsForCutList(parts, [stock]);

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('exceeds_thickness');
      expect(issues[0].severity).toBe('error');
    });

    it('allows part with thickness equal to stock', () => {
      const stock = createTestStock({
        id: 'stock-1',
        length: 96,
        width: 48,
        thickness: 0.75
      });
      const parts = [
        createTestPart({
          name: 'Exact Thickness',
          stockId: 'stock-1',
          length: 24,
          width: 12,
          thickness: 0.75
        })
      ];

      const issues = validatePartsForCutList(parts, [stock]);

      expect(issues.filter((i) => i.type === 'exceeds_thickness')).toHaveLength(0);
    });
  });

  describe('dimension validation', () => {
    it('returns error when part dimensions exceed stock dimensions', () => {
      const stock = createTestStock({
        id: 'stock-1',
        length: 48,
        width: 24,
        thickness: 0.75
      });
      const parts = [
        createTestPart({
          name: 'Oversized Part',
          stockId: 'stock-1',
          length: 60,
          width: 30,
          thickness: 0.75
        })
      ];

      const issues = validatePartsForCutList(parts, [stock]);

      expect(issues.some((i) => i.type === 'exceeds_dimensions')).toBe(true);
    });

    it('includes extra length and width in dimension check', () => {
      const stock = createTestStock({
        id: 'stock-1',
        length: 48,
        width: 24,
        thickness: 0.75
      });
      const parts = [
        createTestPart({
          name: 'Part with Extra',
          stockId: 'stock-1',
          length: 46,
          width: 22,
          thickness: 0.75,
          extraLength: 5, // Makes it 51" total
          extraWidth: 5 // Makes it 27" total
        })
      ];

      const issues = validatePartsForCutList(parts, [stock]);

      expect(issues.some((i) => i.type === 'exceeds_dimensions')).toBe(true);
    });

    it('allows rotation for non-grain-sensitive parts', () => {
      const stock = createTestStock({
        id: 'stock-1',
        length: 96,
        width: 12,
        thickness: 0.75
      });
      const parts = [
        createTestPart({
          name: 'Rotatable Part',
          stockId: 'stock-1',
          length: 10, // Would be 10" x 48" - fits rotated (48 < 96, 10 < 12)
          width: 48,
          thickness: 0.75,
          grainSensitive: false
        })
      ];

      const issues = validatePartsForCutList(parts, [stock]);

      // Should not have dimension error because it can be rotated
      expect(issues.filter((i) => i.type === 'exceeds_dimensions')).toHaveLength(0);
    });

    it('does not allow rotation for grain-sensitive parts', () => {
      const stock = createTestStock({
        id: 'stock-1',
        length: 96,
        width: 12,
        thickness: 0.75
      });
      const parts = [
        createTestPart({
          name: 'Grain Sensitive Part',
          stockId: 'stock-1',
          length: 10,
          width: 48, // Exceeds stock width of 12"
          thickness: 0.75,
          grainSensitive: true
        })
      ];

      const issues = validatePartsForCutList(parts, [stock]);

      // Should have dimension error because rotation not allowed
      expect(issues.some((i) => i.type === 'exceeds_dimensions')).toBe(true);
    });

    it('allows glue-up panels that exceed width only', () => {
      const stock = createTestStock({
        id: 'stock-1',
        length: 96,
        width: 12,
        thickness: 0.75
      });
      const parts = [
        createTestPart({
          name: 'Glue-Up Panel',
          stockId: 'stock-1',
          length: 48, // Fits within stock length
          width: 36, // Exceeds stock width but glue-up
          thickness: 0.75,
          glueUpPanel: { boardCount: 3, boardWidth: 12 }
        })
      ];

      const issues = validatePartsForCutList(parts, [stock]);

      // Should not have dimension error for glue-up that only exceeds width
      expect(issues.filter((i) => i.type === 'exceeds_dimensions')).toHaveLength(0);
    });

    it('returns error for glue-up panels that exceed length', () => {
      const stock = createTestStock({
        id: 'stock-1',
        length: 48,
        width: 12,
        thickness: 0.75
      });
      const parts = [
        createTestPart({
          name: 'Long Glue-Up Panel',
          stockId: 'stock-1',
          length: 60, // Exceeds stock length
          width: 36,
          thickness: 0.75,
          glueUpPanel: { boardCount: 3, boardWidth: 12 }
        })
      ];

      const issues = validatePartsForCutList(parts, [stock]);

      // Should have error because length exceeds stock
      expect(issues.some((i) => i.type === 'exceeds_dimensions')).toBe(true);
    });
  });

  describe('grain direction validation', () => {
    it('returns warning for grain mismatch', () => {
      const stock = createTestStock({
        id: 'stock-1',
        length: 96,
        width: 48,
        thickness: 0.75,
        grainDirection: 'length'
      });
      const parts = [
        createTestPart({
          name: 'Mismatched Grain',
          stockId: 'stock-1',
          length: 24,
          width: 12,
          thickness: 0.75,
          grainSensitive: true,
          grainDirection: 'width' // Doesn't match stock's 'length'
        })
      ];

      const issues = validatePartsForCutList(parts, [stock]);

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('grain_mismatch');
      expect(issues[0].severity).toBe('warning');
    });

    it('does not warn when grain directions match', () => {
      const stock = createTestStock({
        id: 'stock-1',
        length: 96,
        width: 48,
        thickness: 0.75,
        grainDirection: 'length'
      });
      const parts = [
        createTestPart({
          name: 'Matching Grain',
          stockId: 'stock-1',
          length: 24,
          width: 12,
          thickness: 0.75,
          grainSensitive: true,
          grainDirection: 'length'
        })
      ];

      const issues = validatePartsForCutList(parts, [stock]);

      expect(issues.filter((i) => i.type === 'grain_mismatch')).toHaveLength(0);
    });

    it('does not warn for non-grain-sensitive parts', () => {
      const stock = createTestStock({
        id: 'stock-1',
        length: 96,
        width: 48,
        thickness: 0.75,
        grainDirection: 'length'
      });
      const parts = [
        createTestPart({
          name: 'Non-Grain Part',
          stockId: 'stock-1',
          length: 24,
          width: 12,
          thickness: 0.75,
          grainSensitive: false,
          grainDirection: 'width' // Different but should not warn
        })
      ];

      const issues = validatePartsForCutList(parts, [stock]);

      expect(issues.filter((i) => i.type === 'grain_mismatch')).toHaveLength(0);
    });
  });

  describe('multiple parts validation', () => {
    it('validates all parts and aggregates issues', () => {
      const stock = createTestStock({
        id: 'stock-1',
        length: 48,
        width: 24,
        thickness: 0.75
      });
      const parts = [
        createTestPart({ name: 'Part 1', stockId: null }), // No stock
        createTestPart({ name: 'Part 2', stockId: 'stock-1', thickness: 2 }), // Exceeds thickness
        createTestPart({ name: 'Part 3', stockId: 'stock-1', length: 24, width: 12, thickness: 0.75 }) // Valid
      ];

      const issues = validatePartsForCutList(parts, [stock]);

      expect(issues).toHaveLength(2);
      expect(issues.some((i) => i.partName === 'Part 1')).toBe(true);
      expect(issues.some((i) => i.partName === 'Part 2')).toBe(true);
      expect(issues.some((i) => i.partName === 'Part 3')).toBe(false);
    });

    it('returns empty array for empty parts list', () => {
      const issues = validatePartsForCutList([], []);
      expect(issues).toHaveLength(0);
    });
  });
});
