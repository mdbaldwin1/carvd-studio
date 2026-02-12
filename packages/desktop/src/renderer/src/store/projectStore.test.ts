import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectStore, validatePartsForCutList } from './projectStore';
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

        const state = useProjectStore.getState();
        expect(state.selectedPartIds).toContain(partId);
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

        expect(useProjectStore.getState().selectedPartIds).toContain(partId);

        store.deletePart(partId);

        expect(useProjectStore.getState().selectedPartIds).not.toContain(partId);
      });

      it('removes the part from reference parts', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart();
        store.addToReferences([partId]);

        expect(useProjectStore.getState().referencePartIds).toContain(partId);

        store.deletePart(partId);

        expect(useProjectStore.getState().referencePartIds).not.toContain(partId);
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

        store.selectParts([part1Id, part2Id]);
        store.deleteSelectedParts();

        const state = useProjectStore.getState();
        expect(state.parts).toHaveLength(1);
        expect(state.parts[0].name).toBe('Part 3');
      });

      it('does nothing when no parts are selected', () => {
        const store = useProjectStore.getState();
        store.addPart();
        store.clearSelection();

        store.deleteSelectedParts();

        expect(useProjectStore.getState().parts).toHaveLength(1);
      });
    });

    describe('delete confirmation flow', () => {
      describe('requestDeleteParts', () => {
        it('sets pending delete parts', () => {
          const store = useProjectStore.getState();
          const part1Id = store.addPart({ name: 'Part 1' });
          const part2Id = store.addPart({ name: 'Part 2' });

          store.requestDeleteParts([part1Id, part2Id]);

          expect(useProjectStore.getState().pendingDeletePartIds).toEqual([part1Id, part2Id]);
        });

        it('does not delete parts immediately', () => {
          const store = useProjectStore.getState();
          const partId = store.addPart();

          store.requestDeleteParts([partId]);

          expect(useProjectStore.getState().parts).toHaveLength(1);
        });
      });

      describe('confirmDeleteParts', () => {
        it('deletes pending parts', () => {
          const store = useProjectStore.getState();
          const part1Id = store.addPart({ name: 'Part 1' });
          const part2Id = store.addPart({ name: 'Part 2' });
          store.addPart({ name: 'Part 3' });
          store.requestDeleteParts([part1Id, part2Id]);

          store.confirmDeleteParts();

          const state = useProjectStore.getState();
          expect(state.parts).toHaveLength(1);
          expect(state.parts[0].name).toBe('Part 3');
        });

        it('clears pending delete list', () => {
          const store = useProjectStore.getState();
          const partId = store.addPart();
          store.requestDeleteParts([partId]);

          store.confirmDeleteParts();

          expect(useProjectStore.getState().pendingDeletePartIds).toBeNull();
        });

        it('does nothing when no pending parts', () => {
          const store = useProjectStore.getState();
          store.addPart();

          store.confirmDeleteParts();

          expect(useProjectStore.getState().parts).toHaveLength(1);
        });
      });

      describe('cancelDeleteParts', () => {
        it('clears pending delete list without deleting', () => {
          const store = useProjectStore.getState();
          const partId = store.addPart();
          store.requestDeleteParts([partId]);

          store.cancelDeleteParts();

          const state = useProjectStore.getState();
          expect(state.parts).toHaveLength(1);
          expect(state.pendingDeletePartIds).toBeNull();
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

        store.selectParts([part1Id, part2Id]);
        const newIds = store.duplicateSelectedParts();

        const state = useProjectStore.getState();
        expect(state.parts).toHaveLength(4);
        expect(newIds).toHaveLength(2);
      });
    });
  });

  // ============================================================
  // Selection
  // ============================================================

  describe('selection', () => {
    describe('selectPart', () => {
      it('selects a single part', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart();
        store.clearSelection();

        store.selectPart(partId);

        expect(useProjectStore.getState().selectedPartIds).toEqual([partId]);
      });

      it('replaces previous selection', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart();
        const part2Id = store.addPart();

        store.selectPart(part1Id);
        store.selectPart(part2Id);

        expect(useProjectStore.getState().selectedPartIds).toEqual([part2Id]);
      });

      it('clears selection when called with null', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart();
        store.selectPart(partId);

        store.selectPart(null);

        expect(useProjectStore.getState().selectedPartIds).toEqual([]);
      });
    });

    describe('togglePartSelection', () => {
      it('adds a part to selection if not selected', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart();
        const part2Id = store.addPart();

        store.selectPart(part1Id);
        store.togglePartSelection(part2Id);

        expect(useProjectStore.getState().selectedPartIds).toContain(part1Id);
        expect(useProjectStore.getState().selectedPartIds).toContain(part2Id);
      });

      it('removes a part from selection if already selected', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart();
        const part2Id = store.addPart();

        store.selectParts([part1Id, part2Id]);
        store.togglePartSelection(part1Id);

        expect(useProjectStore.getState().selectedPartIds).not.toContain(part1Id);
        expect(useProjectStore.getState().selectedPartIds).toContain(part2Id);
      });
    });

    describe('selectParts', () => {
      it('selects multiple parts', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart();
        const part2Id = store.addPart();
        const part3Id = store.addPart();

        store.selectParts([part1Id, part2Id]);

        const selected = useProjectStore.getState().selectedPartIds;
        expect(selected).toContain(part1Id);
        expect(selected).toContain(part2Id);
        expect(selected).not.toContain(part3Id);
      });
    });

    describe('clearSelection', () => {
      it('clears all selected parts', () => {
        const store = useProjectStore.getState();
        store.addPart();
        store.addPart();

        store.clearSelection();

        expect(useProjectStore.getState().selectedPartIds).toEqual([]);
      });
    });
  });

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

        store.selectParts([part1Id, part2Id]);
        store.assignStockToSelectedParts(stockId);

        const state = useProjectStore.getState();
        expect(state.parts.find((p) => p.id === part1Id)?.stockId).toBe(stockId);
        expect(state.parts.find((p) => p.id === part2Id)?.stockId).toBe(stockId);
      });

      it('updates part color to match stock', () => {
        const store = useProjectStore.getState();
        const stockId = store.addStock({ color: '#ff0000' });
        const partId = store.addPart({ color: '#000000' });

        store.selectPart(partId);
        store.assignStockToSelectedParts(stockId);

        const part = useProjectStore.getState().parts.find((p) => p.id === partId);
        expect(part?.color).toBe('#ff0000');
      });

      it('unassigns stock when called with null', () => {
        const store = useProjectStore.getState();
        const stockId = store.addStock();
        const partId = store.addPart({ stockId });

        store.selectPart(partId);
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

        expect(useProjectStore.getState().selectedGroupIds).toContain(groupId);
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

    describe('group selection', () => {
      it('toggles group selection', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Test Part' });
        const groupId = store.createGroup('Test Group', [{ id: partId, type: 'part' }]);

        store.clearSelection();
        store.toggleGroupSelection(groupId);

        expect(useProjectStore.getState().selectedGroupIds).toContain(groupId);

        store.toggleGroupSelection(groupId);

        expect(useProjectStore.getState().selectedGroupIds).not.toContain(groupId);
      });

      it('clears group selection', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Test Part' });
        const groupId = store.createGroup('Test Group', [{ id: partId, type: 'part' }]);

        store.selectGroup(groupId);
        expect(useProjectStore.getState().selectedGroupIds).toHaveLength(1);

        store.clearGroupSelection();

        expect(useProjectStore.getState().selectedGroupIds).toHaveLength(0);
      });
    });

    describe('group editing mode', () => {
      it('enters group editing mode', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Test Part' });
        const groupId = store.createGroup('Test Group', [{ id: partId, type: 'part' }]);

        store.enterGroup(groupId);

        const state = useProjectStore.getState();
        expect(state.editingGroupId).toBe(groupId);
        expect(state.selectedGroupIds).toHaveLength(0);
        expect(state.selectedPartIds).toHaveLength(0);
      });

      it('exits group editing mode', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Test Part' });
        const groupId = store.createGroup('Test Group', [{ id: partId, type: 'part' }]);

        store.enterGroup(groupId);
        store.exitGroup();

        expect(useProjectStore.getState().editingGroupId).toBeNull();
      });

      it('clears part selection when exiting group', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Test Part' });
        const groupId = store.createGroup('Test Group', [{ id: partId, type: 'part' }]);

        store.enterGroup(groupId);
        store.selectPart(partId);
        store.exitGroup();

        expect(useProjectStore.getState().selectedPartIds).toHaveLength(0);
      });
    });

    describe('group expand/collapse', () => {
      it('toggles group expanded state', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Test Part' });
        const groupId = store.createGroup('Test Group', [{ id: partId, type: 'part' }]);

        // First collapse if auto-expanded
        store.collapseGroup(groupId);
        expect(useProjectStore.getState().expandedGroupIds).not.toContain(groupId);

        // Toggle to expand
        store.toggleGroupExpanded(groupId);
        expect(useProjectStore.getState().expandedGroupIds).toContain(groupId);

        // Toggle to collapse
        store.toggleGroupExpanded(groupId);
        expect(useProjectStore.getState().expandedGroupIds).not.toContain(groupId);
      });

      it('expands a specific group', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Test Part' });
        const groupId = store.createGroup('Test Group', [{ id: partId, type: 'part' }]);

        store.expandGroup(groupId);

        expect(useProjectStore.getState().expandedGroupIds).toContain(groupId);
      });

      it('does not duplicate when expanding already expanded group', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Test Part' });
        const groupId = store.createGroup('Test Group', [{ id: partId, type: 'part' }]);

        store.expandGroup(groupId);
        store.expandGroup(groupId);

        const expandedCount = useProjectStore.getState().expandedGroupIds.filter((id) => id === groupId).length;
        expect(expandedCount).toBe(1);
      });

      it('collapses a specific group', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Test Part' });
        const groupId = store.createGroup('Test Group', [{ id: partId, type: 'part' }]);

        store.expandGroup(groupId);
        store.collapseGroup(groupId);

        expect(useProjectStore.getState().expandedGroupIds).not.toContain(groupId);
      });

      it('expands all groups', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart({ name: 'Part 1' });
        const part2Id = store.addPart({ name: 'Part 2' });
        const group1Id = store.createGroup('Group 1', [{ id: part1Id, type: 'part' }]);
        const group2Id = store.createGroup('Group 2', [{ id: part2Id, type: 'part' }]);

        store.expandAllGroups();

        const state = useProjectStore.getState();
        expect(state.expandedGroupIds).toContain(group1Id);
        expect(state.expandedGroupIds).toContain(group2Id);
      });

      it('collapses all groups', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart({ name: 'Part 1' });
        const part2Id = store.addPart({ name: 'Part 2' });
        const group1Id = store.createGroup('Group 1', [{ id: part1Id, type: 'part' }]);
        const group2Id = store.createGroup('Group 2', [{ id: part2Id, type: 'part' }]);

        store.expandAllGroups();
        store.collapseAllGroups();

        expect(useProjectStore.getState().expandedGroupIds).toHaveLength(0);
      });
    });
  });

  // ============================================================
  // Clipboard
  // ============================================================

  describe('clipboard', () => {
    describe('copySelectedParts', () => {
      it('copies selected parts to clipboard', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Test Part' });
        store.selectPart(partId);

        store.copySelectedParts();

        const state = useProjectStore.getState();
        expect(state.clipboard.parts).toHaveLength(1);
        expect(state.clipboard.parts[0].name).toBe('Test Part');
      });

      it('copies group structure with parts', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart({ name: 'Part 1' });
        const part2Id = store.addPart({ name: 'Part 2' });
        const groupId = store.createGroup('Test Group', [
          { id: part1Id, type: 'part' },
          { id: part2Id, type: 'part' }
        ]);

        // Select the group
        store.selectGroup(groupId);
        store.copySelectedParts();

        const state = useProjectStore.getState();
        expect(state.clipboard.parts).toHaveLength(2);
        expect(state.clipboard.groups).toHaveLength(1);
        expect(state.clipboard.groupMembers).toHaveLength(2);
      });
    });

    describe('pasteClipboard', () => {
      it('creates new parts from clipboard', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Original' });
        store.selectPart(partId);
        store.copySelectedParts();

        const newIds = store.pasteClipboard();

        const state = useProjectStore.getState();
        expect(state.parts).toHaveLength(2);
        expect(newIds).toHaveLength(1);
        expect(newIds[0]).not.toBe(partId);
      });

      it('offsets pasted parts from originals', () => {
        const store = useProjectStore.getState();
        store.addPart({ position: { x: 0, y: 0, z: 0 } });
        store.copySelectedParts();

        store.pasteClipboard();

        const state = useProjectStore.getState();
        const originalPart = state.parts[0];
        const pastedPart = state.parts[1];

        // Pasted part should be offset
        expect(pastedPart.position.x).not.toBe(originalPart.position.x);
      });

      it('selects pasted parts', () => {
        const store = useProjectStore.getState();
        const originalId = store.addPart();
        store.selectPart(originalId);
        store.copySelectedParts();

        const newIds = store.pasteClipboard();

        const state = useProjectStore.getState();
        expect(state.selectedPartIds).toEqual(newIds);
      });
    });

    describe('pasteAtPosition', () => {
      it('pastes parts centered at the specified position', () => {
        const store = useProjectStore.getState();
        store.addPart({
          name: 'Test Part',
          position: { x: 0, y: 0.375, z: 0 }
        });
        store.copySelectedParts();

        const newIds = store.pasteAtPosition({ x: 50, y: 0, z: 50 });

        const state = useProjectStore.getState();
        expect(newIds).toHaveLength(1);
        const pastedPart = state.parts.find((p) => p.id === newIds[0]);
        expect(pastedPart?.position.x).toBeCloseTo(50);
        expect(pastedPart?.position.z).toBeCloseTo(50);
      });

      it('maintains relative positions when pasting multiple parts', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart({
          name: 'Part 1',
          position: { x: 0, y: 0.375, z: 0 }
        });
        const part2Id = store.addPart({
          name: 'Part 2',
          position: { x: 10, y: 0.375, z: 0 }
        });
        store.selectParts([part1Id, part2Id]);
        store.copySelectedParts();

        store.pasteAtPosition({ x: 100, y: 0, z: 100 });

        const state = useProjectStore.getState();
        const pastedParts = state.parts.slice(2); // Last two parts
        const xDiff = pastedParts[1].position.x - pastedParts[0].position.x;
        expect(xDiff).toBeCloseTo(10); // Same relative distance
      });

      it('returns empty array when clipboard is empty', () => {
        const store = useProjectStore.getState();

        const newIds = store.pasteAtPosition({ x: 50, y: 0, z: 50 });

        expect(newIds).toHaveLength(0);
      });

      it('selects pasted parts', () => {
        const store = useProjectStore.getState();
        store.addPart({ name: 'Test Part' });
        store.copySelectedParts();

        const newIds = store.pasteAtPosition({ x: 50, y: 0, z: 50 });

        const state = useProjectStore.getState();
        expect(state.selectedPartIds).toEqual(newIds);
      });
    });
  });

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
  // View State
  // ============================================================

  describe('view state', () => {
    describe('setDisplayMode', () => {
      it('changes display mode to exploded', () => {
        const store = useProjectStore.getState();

        store.setDisplayMode('exploded');

        expect(useProjectStore.getState().displayMode).toBe('exploded');
      });

      it('changes display mode to assembled', () => {
        useProjectStore.setState({ displayMode: 'exploded' });
        const store = useProjectStore.getState();

        store.setDisplayMode('assembled');

        expect(useProjectStore.getState().displayMode).toBe('assembled');
      });
    });

    describe('setShowGrid', () => {
      it('shows the grid', () => {
        useProjectStore.setState({ showGrid: false });
        const store = useProjectStore.getState();

        store.setShowGrid(true);

        expect(useProjectStore.getState().showGrid).toBe(true);
      });

      it('hides the grid', () => {
        useProjectStore.setState({ showGrid: true });
        const store = useProjectStore.getState();

        store.setShowGrid(false);

        expect(useProjectStore.getState().showGrid).toBe(false);
      });
    });

    describe('setSnapToPartsEnabled', () => {
      it('enables snap to parts', () => {
        useProjectStore.setState({ snapToPartsEnabled: false });
        const store = useProjectStore.getState();

        store.setSnapToPartsEnabled(true);

        expect(useProjectStore.getState().snapToPartsEnabled).toBe(true);
      });

      it('disables snap to parts', () => {
        useProjectStore.setState({ snapToPartsEnabled: true });
        const store = useProjectStore.getState();

        store.setSnapToPartsEnabled(false);

        expect(useProjectStore.getState().snapToPartsEnabled).toBe(false);
      });
    });

    describe('setActiveSnapLines', () => {
      it('sets active snap lines', () => {
        const store = useProjectStore.getState();
        const snapLines = [{ start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 }, color: '#ff0000' }];

        store.setActiveSnapLines(snapLines);

        expect(useProjectStore.getState().activeSnapLines).toEqual(snapLines);
      });

      it('clears active snap lines', () => {
        const store = useProjectStore.getState();
        store.setActiveSnapLines([{ start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 }, color: '#ff0000' }]);

        store.setActiveSnapLines([]);

        expect(useProjectStore.getState().activeSnapLines).toHaveLength(0);
      });
    });

    describe('setReferencePartIds', () => {
      it('sets reference part IDs directly', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart();
        const part2Id = store.addPart();

        store.setReferencePartIds([part1Id, part2Id]);

        expect(useProjectStore.getState().referencePartIds).toEqual([part1Id, part2Id]);
      });

      it('replaces existing reference part IDs', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart();
        const part2Id = store.addPart();
        const part3Id = store.addPart();
        store.setReferencePartIds([part1Id, part2Id]);

        store.setReferencePartIds([part3Id]);

        expect(useProjectStore.getState().referencePartIds).toEqual([part3Id]);
      });
    });
  });

  // ============================================================
  // Reference Parts
  // ============================================================

  describe('reference parts', () => {
    describe('addToReferences', () => {
      it('adds parts to reference list', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart();
        const part2Id = store.addPart();

        store.addToReferences([part1Id, part2Id]);

        expect(useProjectStore.getState().referencePartIds).toContain(part1Id);
        expect(useProjectStore.getState().referencePartIds).toContain(part2Id);
      });
    });

    describe('removeFromReferences', () => {
      it('removes parts from reference list', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart();
        store.addToReferences([partId]);

        store.removeFromReferences([partId]);

        expect(useProjectStore.getState().referencePartIds).not.toContain(partId);
      });
    });

    describe('toggleReference', () => {
      it('toggles reference status', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart();

        store.toggleReference([partId]);
        expect(useProjectStore.getState().referencePartIds).toContain(partId);

        store.toggleReference([partId]);
        expect(useProjectStore.getState().referencePartIds).not.toContain(partId);
      });
    });

    describe('clearReferences', () => {
      it('clears all reference parts', () => {
        const store = useProjectStore.getState();
        const part1Id = store.addPart();
        const part2Id = store.addPart();
        store.addToReferences([part1Id, part2Id]);

        store.clearReferences();

        expect(useProjectStore.getState().referencePartIds).toHaveLength(0);
      });
    });
  });

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

    describe('openCutListModal', () => {
      it('opens the cut list modal', () => {
        const store = useProjectStore.getState();

        store.openCutListModal();

        expect(useProjectStore.getState().cutListModalOpen).toBe(true);
      });
    });

    describe('closeCutListModal', () => {
      it('closes the cut list modal', () => {
        const store = useProjectStore.getState();
        store.openCutListModal();

        store.closeCutListModal();

        expect(useProjectStore.getState().cutListModalOpen).toBe(false);
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

      store.selectPart(partId);
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

      store.clearSelection();
      store.selectGroup(groupId);
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

        store.selectParts([part1Id, part2Id]);
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

        store.selectParts([part1Id, part2Id]);
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
        store.clearSelection();

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

        store.clearSelection();
        store.selectGroup(groupId);
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
        store.selectParts([part1Id]);
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
        store.selectParts([partId]);
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
        store.clearSelection();
        store.selectGroup(groupId);
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

    describe('save assembly modal', () => {
      it('opens the save assembly modal', () => {
        const store = useProjectStore.getState();
        expect(store.saveAssemblyModalOpen).toBe(false);

        store.openSaveAssemblyModal();

        expect(useProjectStore.getState().saveAssemblyModalOpen).toBe(true);
      });

      it('closes the save assembly modal', () => {
        const store = useProjectStore.getState();
        store.openSaveAssemblyModal();

        store.closeSaveAssemblyModal();

        expect(useProjectStore.getState().saveAssemblyModalOpen).toBe(false);
      });
    });
  });

  // ============================================================
  // Assembly Editing Mode
  // ============================================================

  describe('assembly editing', () => {
    describe('startEditingAssembly', () => {
      it('enters assembly editing mode', () => {
        const store = useProjectStore.getState();

        store.startEditingAssembly('assembly-123', 'Test Assembly', [createTestPart({ id: 'part-1', name: 'Shelf' })]);

        const state = useProjectStore.getState();
        expect(state.isEditingAssembly).toBe(true);
        expect(state.editingAssemblyId).toBe('assembly-123');
        expect(state.editingAssemblyName).toBe('Test Assembly');
      });

      it('saves previous project state snapshot', () => {
        const store = useProjectStore.getState();
        store.addPart({ name: 'Existing Part' });
        store.addStock({ name: 'Existing Stock' });

        store.startEditingAssembly('assembly-123', 'Test Assembly', [createTestPart({ id: 'part-1' })]);

        const state = useProjectStore.getState();
        expect(state.previousProjectSnapshot).not.toBeNull();
        expect(state.previousProjectSnapshot!.parts.some((p) => p.name === 'Existing Part')).toBe(true);
      });

      it('loads assembly parts into workspace', () => {
        const store = useProjectStore.getState();
        const assemblyParts = [
          createTestPart({ id: 'part-1', name: 'Assembly Part 1' }),
          createTestPart({ id: 'part-2', name: 'Assembly Part 2' })
        ];

        store.startEditingAssembly('assembly-123', 'Test Assembly', assemblyParts);

        const state = useProjectStore.getState();
        expect(state.parts).toHaveLength(2);
        expect(state.parts[0].name).toBe('Assembly Part 1');
        expect(state.parts[1].name).toBe('Assembly Part 2');
      });

      it('merges embedded stocks with existing stocks', () => {
        const store = useProjectStore.getState();
        const existingStockId = store.addStock({ name: 'Existing Stock' });
        const embeddedStock = createTestStock({ id: 'embedded-1', name: 'Embedded Stock' });

        store.startEditingAssembly('assembly-123', 'Test Assembly', [createTestPart()], [], [], [embeddedStock]);

        const state = useProjectStore.getState();
        expect(state.stocks.some((s) => s.id === existingStockId)).toBe(true);
        expect(state.stocks.some((s) => s.name === 'Embedded Stock')).toBe(true);
      });

      it('updates project name to indicate editing mode', () => {
        const store = useProjectStore.getState();

        store.startEditingAssembly('assembly-123', 'Drawer Assembly', [createTestPart()]);

        expect(useProjectStore.getState().projectName).toContain('Drawer Assembly');
      });

      it('expands all groups when loading assembly with groups', () => {
        const store = useProjectStore.getState();
        const part1 = createTestPart({ name: 'Part 1' });
        const part2 = createTestPart({ name: 'Part 2' });
        const group = createTestGroup({ name: 'Test Group' });
        const groupMember = createTestGroupMember(group.id, part1.id);

        store.startEditingAssembly('assembly-123', 'Assembly with Groups', [part1, part2], [group], [groupMember]);

        const state = useProjectStore.getState();
        expect(state.groups).toHaveLength(1);
        expect(state.expandedGroupIds).toContain(group.id);
      });

      it('clears selection and UI state when entering edit mode', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart({ name: 'Selected Part' });
        store.selectPart(partId);
        store.addToReferences([partId]);

        store.startEditingAssembly('assembly-123', 'Test Assembly', [createTestPart()]);

        const state = useProjectStore.getState();
        expect(state.selectedPartIds).toHaveLength(0);
        expect(state.referencePartIds).toHaveLength(0);
        expect(state.editingGroupId).toBeNull();
      });
    });

    describe('saveEditingAssembly', () => {
      it('returns null when not in editing mode', () => {
        const store = useProjectStore.getState();

        const result = store.saveEditingAssembly();

        expect(result).toBeNull();
      });

      it('creates assembly from current workspace parts', () => {
        const store = useProjectStore.getState();
        store.startEditingAssembly('assembly-123', 'Test Assembly', [createTestPart({ name: 'Original Part' })]);

        // Modify the workspace
        store.addPart({ name: 'New Part' });

        const assembly = store.saveEditingAssembly();

        expect(assembly).not.toBeNull();
        expect(assembly!.parts).toHaveLength(2);
        expect(assembly!.parts.some((p) => p.name === 'New Part')).toBe(true);
      });

      it('preserves the assembly ID', () => {
        const store = useProjectStore.getState();
        store.startEditingAssembly('assembly-123', 'Test Assembly', [createTestPart()]);

        const assembly = store.saveEditingAssembly();

        expect(assembly!.id).toBe('assembly-123');
      });

      it('normalizes part positions in the saved assembly', () => {
        const store = useProjectStore.getState();
        store.startEditingAssembly('assembly-123', 'Test Assembly', [
          createTestPart({ position: { x: 10, y: 0, z: 0 } }),
          createTestPart({ position: { x: 30, y: 0, z: 0 } })
        ]);

        const assembly = store.saveEditingAssembly();

        // Parts should be centered
        const sumX = assembly!.parts.reduce((sum, p) => sum + p.relativePosition.x, 0);
        expect(sumX).toBeCloseTo(0, 5);
      });

      it('returns null when no parts in workspace', () => {
        const store = useProjectStore.getState();
        store.startEditingAssembly('assembly-123', 'Test Assembly', [createTestPart()]);

        // Delete all parts
        const partId = useProjectStore.getState().parts[0].id;
        store.deletePart(partId);

        const assembly = store.saveEditingAssembly();

        expect(assembly).toBeNull();
      });

      it('embeds stock data in assembly parts', () => {
        const store = useProjectStore.getState();
        const stockId = store.addStock({
          name: 'Test Plywood',
          length: 96,
          width: 48,
          thickness: 0.75,
          color: '#c4a574'
        });

        const partWithStock = createTestPart({ stockId, name: 'Part with Stock' });

        store.startEditingAssembly('assembly-123', 'Test Assembly', [partWithStock]);

        const assembly = store.saveEditingAssembly();

        expect(assembly).not.toBeNull();
        expect(assembly!.parts[0].embeddedStock).toBeDefined();
        expect(assembly!.parts[0].embeddedStock!.name).toBe('Test Plywood');
        expect(assembly!.parts[0].embeddedStock!.thickness).toBe(0.75);
        expect(assembly!.parts[0].embeddedStock!.color).toBe('#c4a574');
      });

      it('includes groups and group members in saved assembly', () => {
        const store = useProjectStore.getState();
        const part1 = createTestPart({ name: 'Part 1' });
        const part2 = createTestPart({ name: 'Part 2' });
        const group = createTestGroup({ name: 'Test Group' });
        const groupMember1 = createTestGroupMember(group.id, part1.id);
        const groupMember2 = createTestGroupMember(group.id, part2.id);

        store.startEditingAssembly(
          'assembly-123',
          'Grouped Assembly',
          [part1, part2],
          [group],
          [groupMember1, groupMember2]
        );

        const assembly = store.saveEditingAssembly();

        expect(assembly).not.toBeNull();
        expect(assembly!.groups).toHaveLength(1);
        expect(assembly!.groups[0].name).toBe('Test Group');
        expect(assembly!.groupMembers).toHaveLength(2);
      });
    });

    describe('cancelEditingAssembly', () => {
      it('does nothing when not in editing mode', () => {
        // Force exit any editing mode first
        const store = useProjectStore.getState();
        if (store.isEditingAssembly) {
          store.cancelEditingAssembly();
        }

        // Now verify we're not in editing mode
        expect(useProjectStore.getState().isEditingAssembly).toBe(false);

        // Calling cancelEditingAssembly when not editing should be safe
        useProjectStore.getState().cancelEditingAssembly();

        // State should remain not in editing mode
        expect(useProjectStore.getState().isEditingAssembly).toBe(false);
      });

      it('exits editing mode', () => {
        const store = useProjectStore.getState();
        store.startEditingAssembly('assembly-123', 'Test', [createTestPart()]);

        store.cancelEditingAssembly();

        const state = useProjectStore.getState();
        expect(state.isEditingAssembly).toBe(false);
        expect(state.editingAssemblyId).toBeNull();
        expect(state.editingAssemblyName).toBe('');
      });

      it('keeps snapshot for potential restore', () => {
        const store = useProjectStore.getState();
        store.addPart({ name: 'Original Part' });
        store.startEditingAssembly('assembly-123', 'Test', [createTestPart()]);

        store.cancelEditingAssembly();

        // Snapshot should still be available for restorePreviousProject
        expect(useProjectStore.getState().previousProjectSnapshot).not.toBeNull();
      });
    });

    describe('restorePreviousProject', () => {
      it('restores project state from snapshot', () => {
        const store = useProjectStore.getState();

        // Set up initial state
        store.addPart({ name: 'Part A' });
        store.addPart({ name: 'Part B' });
        store.addStock({ name: 'Stock X' });

        // Enter and exit editing mode
        store.startEditingAssembly('assembly-123', 'Test', [createTestPart({ name: 'Temp' })]);
        store.cancelEditingAssembly();

        // Workspace now has only 'Temp' part
        expect(useProjectStore.getState().parts.some((p) => p.name === 'Part A')).toBe(false);

        // Restore
        store.restorePreviousProject();

        const state = useProjectStore.getState();
        expect(state.parts.some((p) => p.name === 'Part A')).toBe(true);
        expect(state.parts.some((p) => p.name === 'Part B')).toBe(true);
        expect(state.stocks.some((s) => s.name === 'Stock X')).toBe(true);
      });

      it('clears snapshot after restore', () => {
        const store = useProjectStore.getState();
        store.addPart({ name: 'Original' });
        store.startEditingAssembly('assembly-123', 'Test', [createTestPart()]);
        store.cancelEditingAssembly();

        store.restorePreviousProject();

        expect(useProjectStore.getState().previousProjectSnapshot).toBeNull();
      });

      it('clears assembly editing state', () => {
        const store = useProjectStore.getState();
        store.addPart({ name: 'Original' });
        store.startEditingAssembly('assembly-123', 'Test', [createTestPart()]);
        store.cancelEditingAssembly();

        store.restorePreviousProject();

        const state = useProjectStore.getState();
        expect(state.isEditingAssembly).toBe(false);
        expect(state.editingAssemblyId).toBeNull();
      });
    });

    describe('startFreshAfterAssemblyEdit', () => {
      it('creates a new project', () => {
        const store = useProjectStore.getState();
        store.addPart({ name: 'Part A' });
        store.startEditingAssembly('assembly-123', 'Test', [createTestPart()]);
        store.cancelEditingAssembly();

        store.startFreshAfterAssemblyEdit();

        const state = useProjectStore.getState();
        expect(state.parts).toHaveLength(0);
        expect(state.stocks).toHaveLength(0);
        // Project name could be 'New Project' or 'Untitled Project' depending on defaults
        expect(state.projectName).toMatch(/^(New|Untitled) Project$/);
      });

      it('clears assembly editing state', () => {
        const store = useProjectStore.getState();
        store.startEditingAssembly('assembly-123', 'Test', [createTestPart()]);
        store.cancelEditingAssembly();

        store.startFreshAfterAssemblyEdit();

        const state = useProjectStore.getState();
        expect(state.isEditingAssembly).toBe(false);
        expect(state.editingAssemblyId).toBeNull();
        expect(state.previousProjectSnapshot).toBeNull();
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

      store.selectPart(partId);
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

      store.selectPart(partId);
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

      store.selectPart(partId);
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

      store.clearSelection();
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

      store.selectPart(partId);
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

      store.selectPart(partId);
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

      store.selectParts([partId1, partId2]);
      store.resetSelectedPartsToStock();

      const state = useProjectStore.getState();
      const part1 = state.parts.find((p) => p.id === partId1);
      const part2 = state.parts.find((p) => p.id === partId2);
      expect(part1?.color).toBe('#ff0000');
      expect(part2?.color).toBe('#ff0000');
    });
  });

  // ============================================================
  // UI State Actions
  // ============================================================

  describe('UI state', () => {
    describe('setHoveredPart', () => {
      it('sets the hovered part ID', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart();

        store.setHoveredPart(partId);

        expect(useProjectStore.getState().hoveredPartId).toBe(partId);
      });

      it('clears hovered part when set to null', () => {
        const store = useProjectStore.getState();
        const partId = store.addPart();
        store.setHoveredPart(partId);

        store.setHoveredPart(null);

        expect(useProjectStore.getState().hoveredPartId).toBeNull();
      });
    });

    describe('setTransformMode', () => {
      it('sets transform mode to translate', () => {
        const store = useProjectStore.getState();

        store.setTransformMode('translate');

        expect(useProjectStore.getState().transformMode).toBe('translate');
      });

      it('sets transform mode to rotate', () => {
        const store = useProjectStore.getState();

        store.setTransformMode('rotate');

        expect(useProjectStore.getState().transformMode).toBe('rotate');
      });

      it('sets transform mode to scale', () => {
        const store = useProjectStore.getState();

        store.setTransformMode('scale');

        expect(useProjectStore.getState().transformMode).toBe('scale');
      });
    });

    describe('setActiveDragDelta', () => {
      it('sets the active drag delta', () => {
        const store = useProjectStore.getState();
        const delta = { x: 10, y: 5, z: 3 };

        store.setActiveDragDelta(delta);

        expect(useProjectStore.getState().activeDragDelta).toEqual(delta);
      });

      it('clears drag delta when set to null', () => {
        const store = useProjectStore.getState();
        store.setActiveDragDelta({ x: 10, y: 5, z: 3 });

        store.setActiveDragDelta(null);

        expect(useProjectStore.getState().activeDragDelta).toBeNull();
      });
    });

    describe('setSelectionBox', () => {
      it('sets selection box coordinates', () => {
        const store = useProjectStore.getState();
        const box = { x1: 0, y1: 0, x2: 100, y2: 100 };

        store.setSelectionBox(box);

        expect(useProjectStore.getState().selectionBox).toEqual(box);
      });

      it('clears selection box when set to null', () => {
        const store = useProjectStore.getState();
        store.setSelectionBox({ x1: 0, y1: 0, x2: 100, y2: 100 });

        store.setSelectionBox(null);

        expect(useProjectStore.getState().selectionBox).toBeNull();
      });
    });

    describe('toggleGrainDirection', () => {
      it('toggles showGrainDirection from false to true', () => {
        useProjectStore.setState({ showGrainDirection: false });
        const store = useProjectStore.getState();

        store.toggleGrainDirection();

        expect(useProjectStore.getState().showGrainDirection).toBe(true);
      });

      it('toggles showGrainDirection from true to false', () => {
        useProjectStore.setState({ showGrainDirection: true });
        const store = useProjectStore.getState();

        store.toggleGrainDirection();

        expect(useProjectStore.getState().showGrainDirection).toBe(false);
      });
    });
  });

  // ============================================================
  // Context Menu Actions
  // ============================================================

  describe('context menu', () => {
    describe('openContextMenu', () => {
      it('opens context menu with part data', () => {
        const store = useProjectStore.getState();
        const menuData = {
          type: 'part' as const,
          x: 100,
          y: 200,
          partId: 'part-123'
        };

        store.openContextMenu(menuData);

        expect(useProjectStore.getState().contextMenu).toEqual(menuData);
      });

      it('opens context menu with group data', () => {
        const store = useProjectStore.getState();
        const menuData = {
          type: 'group' as const,
          x: 150,
          y: 250,
          groupId: 'group-456'
        };

        store.openContextMenu(menuData);

        expect(useProjectStore.getState().contextMenu).toEqual(menuData);
      });
    });

    describe('closeContextMenu', () => {
      it('closes the context menu', () => {
        const store = useProjectStore.getState();
        store.openContextMenu({
          type: 'part',
          x: 100,
          y: 200,
          partId: 'part-123'
        });

        store.closeContextMenu();

        expect(useProjectStore.getState().contextMenu).toBeNull();
      });
    });
  });

  // ============================================================
  // Camera Actions
  // ============================================================

  describe('camera actions', () => {
    describe('requestCenterCamera', () => {
      it('sets centerCameraRequested to true', () => {
        const store = useProjectStore.getState();
        expect(store.centerCameraRequested).toBe(false);

        store.requestCenterCamera();

        expect(useProjectStore.getState().centerCameraRequested).toBe(true);
      });
    });

    describe('requestCenterCameraAtOrigin', () => {
      it('sets centerCameraAtOriginRequested to true', () => {
        const store = useProjectStore.getState();
        expect(store.centerCameraAtOriginRequested).toBe(false);

        store.requestCenterCameraAtOrigin();

        expect(useProjectStore.getState().centerCameraAtOriginRequested).toBe(true);
      });
    });

    describe('requestCenterCameraAtPosition', () => {
      it('sets the position to center camera at', () => {
        const store = useProjectStore.getState();
        const position = { x: 10, y: 5, z: 20 };

        store.requestCenterCameraAtPosition(position);

        expect(useProjectStore.getState().centerCameraAtPosition).toEqual(position);
      });
    });

    describe('clearCenterCameraRequest', () => {
      it('clears all camera request flags', () => {
        const store = useProjectStore.getState();
        store.requestCenterCamera();
        store.requestCenterCameraAtOrigin();
        store.requestCenterCameraAtPosition({ x: 10, y: 5, z: 20 });

        store.clearCenterCameraRequest();

        const state = useProjectStore.getState();
        expect(state.centerCameraRequested).toBe(false);
        expect(state.centerCameraAtOriginRequested).toBe(false);
        expect(state.centerCameraAtPosition).toBeNull();
      });
    });

    describe('setCameraViewVectors', () => {
      it('sets camera view vectors', () => {
        const store = useProjectStore.getState();
        const vectors = {
          position: { x: 10, y: 20, z: 30 },
          target: { x: 0, y: 0, z: 0 }
        };

        store.setCameraViewVectors(vectors);

        expect(useProjectStore.getState().cameraViewVectors).toEqual(vectors);
      });

      it('clears camera view vectors when set to null', () => {
        const store = useProjectStore.getState();
        store.setCameraViewVectors({
          position: { x: 10, y: 20, z: 30 },
          target: { x: 0, y: 0, z: 0 }
        });

        store.setCameraViewVectors(null);

        expect(useProjectStore.getState().cameraViewVectors).toBeNull();
      });
    });
  });

  // ============================================================
  // Toast Actions
  // ============================================================

  describe('toast notifications', () => {
    describe('showToast', () => {
      it('sets toast message', () => {
        const store = useProjectStore.getState();

        store.showToast('Test notification');

        const toast = useProjectStore.getState().toast;
        expect(toast?.message).toBe('Test notification');
        expect(toast?.id).toBeDefined();
      });

      it('replaces existing toast', () => {
        const store = useProjectStore.getState();
        store.showToast('First message');
        const firstToastId = useProjectStore.getState().toast?.id;

        store.showToast('Second message');

        const toast = useProjectStore.getState().toast;
        expect(toast?.message).toBe('Second message');
        expect(toast?.id).not.toBe(firstToastId);
      });
    });

    describe('clearToast', () => {
      it('clears the toast', () => {
        const store = useProjectStore.getState();
        store.showToast('Test message');

        store.clearToast();

        expect(useProjectStore.getState().toast).toBeNull();
      });
    });
  });

  // ============================================================
  // Thumbnail Actions
  // ============================================================

  describe('thumbnail actions', () => {
    describe('clearManualThumbnail', () => {
      it('clears the manual thumbnail', () => {
        useProjectStore.setState({
          manualThumbnail: {
            data: 'base64data',
            width: 400,
            height: 300,
            generatedAt: new Date().toISOString(),
            manuallySet: true
          }
        });
        const store = useProjectStore.getState();

        store.clearManualThumbnail();

        expect(useProjectStore.getState().manualThumbnail).toBeNull();
      });
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
