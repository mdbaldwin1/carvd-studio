import { describe, it, expect, beforeEach } from 'vitest';
import { useClipboardStore } from './clipboardStore';
import { useProjectStore } from './projectStore';
import { useSelectionStore } from './selectionStore';
import { useLicenseStore } from './licenseStore';
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
  useClipboardStore.setState({
    clipboard: { parts: [], groups: [], groupMembers: [] }
  });
  useLicenseStore.setState({ licenseMode: 'trial' });
  useUIStore.setState({ toast: null });
};

describe('clipboardStore', () => {
  beforeEach(() => {
    resetStores();
  });

  // ============================================================
  // clearClipboard
  // ============================================================

  describe('clearClipboard', () => {
    it('resets clipboard to empty state', () => {
      useClipboardStore.setState({
        clipboard: {
          parts: [
            {
              id: 'p1',
              name: 'Part',
              length: 10,
              width: 5,
              thickness: 0.75,
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              color: '#8B4513',
              stockId: null,
              grainDirection: 'length'
            }
          ],
          groups: [],
          groupMembers: []
        }
      });

      useClipboardStore.getState().clearClipboard();

      const { clipboard } = useClipboardStore.getState();
      expect(clipboard.parts).toHaveLength(0);
      expect(clipboard.groups).toHaveLength(0);
      expect(clipboard.groupMembers).toHaveLength(0);
    });
  });

  // ============================================================
  // copySelectedParts
  // ============================================================

  describe('copySelectedParts', () => {
    it('copies selected parts to clipboard', () => {
      const partId = useProjectStore.getState().addPart({ name: 'Test Part' });
      useSelectionStore.getState().selectPart(partId);

      useClipboardStore.getState().copySelectedParts();

      const { clipboard } = useClipboardStore.getState();
      expect(clipboard.parts).toHaveLength(1);
      expect(clipboard.parts[0].name).toBe('Test Part');
    });

    it('copies group structure with parts', () => {
      const store = useProjectStore.getState();
      const part1Id = store.addPart({ name: 'Part 1' });
      const part2Id = store.addPart({ name: 'Part 2' });
      store.createGroup('Test Group', [
        { id: part1Id, type: 'part' },
        { id: part2Id, type: 'part' }
      ]);

      // Select the group
      const groupId = useProjectStore.getState().groups[0].id;
      useSelectionStore.getState().selectGroup(groupId);
      useClipboardStore.getState().copySelectedParts();

      const { clipboard } = useClipboardStore.getState();
      expect(clipboard.parts).toHaveLength(2);
      expect(clipboard.groups).toHaveLength(1);
      expect(clipboard.groupMembers).toHaveLength(2);
    });
  });

  // ============================================================
  // pasteClipboard
  // ============================================================

  describe('pasteClipboard', () => {
    it('creates new parts from clipboard', () => {
      const partId = useProjectStore.getState().addPart({ name: 'Original' });
      useSelectionStore.getState().selectPart(partId);
      useClipboardStore.getState().copySelectedParts();

      const newIds = useClipboardStore.getState().pasteClipboard();

      const state = useProjectStore.getState();
      expect(state.parts).toHaveLength(2);
      expect(newIds).toHaveLength(1);
      expect(newIds[0]).not.toBe(partId);
    });

    it('offsets pasted parts from originals', () => {
      useProjectStore.getState().addPart({ position: { x: 0, y: 0, z: 0 } });
      useClipboardStore.getState().copySelectedParts();

      useClipboardStore.getState().pasteClipboard();

      const state = useProjectStore.getState();
      const originalPart = state.parts[0];
      const pastedPart = state.parts[1];

      // Pasted part should be offset
      expect(pastedPart.position.x).not.toBe(originalPart.position.x);
    });

    it('selects pasted parts', () => {
      const originalId = useProjectStore.getState().addPart();
      useSelectionStore.getState().selectPart(originalId);
      useClipboardStore.getState().copySelectedParts();

      const newIds = useClipboardStore.getState().pasteClipboard();

      expect(useSelectionStore.getState().selectedPartIds).toEqual(newIds);
    });
  });

  // ============================================================
  // pasteAtPosition
  // ============================================================

  describe('pasteAtPosition', () => {
    it('pastes parts centered at the specified position', () => {
      useProjectStore.getState().addPart({
        name: 'Test Part',
        position: { x: 0, y: 0.375, z: 0 }
      });
      useClipboardStore.getState().copySelectedParts();

      const newIds = useClipboardStore.getState().pasteAtPosition({ x: 50, y: 0, z: 50 });

      const state = useProjectStore.getState();
      expect(newIds).toHaveLength(1);
      const pastedPart = state.parts.find((p) => p.id === newIds[0]);
      expect(pastedPart?.position.x).toBeCloseTo(50);
      expect(pastedPart?.position.z).toBeCloseTo(50);
    });

    it('maintains relative positions when pasting multiple parts', () => {
      const part1Id = useProjectStore.getState().addPart({
        name: 'Part 1',
        position: { x: 0, y: 0.375, z: 0 }
      });
      const part2Id = useProjectStore.getState().addPart({
        name: 'Part 2',
        position: { x: 10, y: 0.375, z: 0 }
      });
      useSelectionStore.getState().selectParts([part1Id, part2Id]);
      useClipboardStore.getState().copySelectedParts();

      useClipboardStore.getState().pasteAtPosition({ x: 100, y: 0, z: 100 });

      const state = useProjectStore.getState();
      const pastedParts = state.parts.slice(2); // Last two parts
      const xDiff = pastedParts[1].position.x - pastedParts[0].position.x;
      expect(xDiff).toBeCloseTo(10); // Same relative distance
    });

    it('returns empty array when clipboard is empty', () => {
      const newIds = useClipboardStore.getState().pasteAtPosition({ x: 50, y: 0, z: 50 });

      expect(newIds).toHaveLength(0);
    });

    it('selects pasted parts', () => {
      useProjectStore.getState().addPart({ name: 'Test Part' });
      useClipboardStore.getState().copySelectedParts();

      const newIds = useClipboardStore.getState().pasteAtPosition({ x: 50, y: 0, z: 50 });

      expect(useSelectionStore.getState().selectedPartIds).toEqual(newIds);
    });
  });

  // ============================================================
  // Copy toast messages
  // ============================================================

  describe('copy toast messages', () => {
    it('shows singular part toast for one part', () => {
      const partId = useProjectStore.getState().addPart({ name: 'Solo Part' });
      useSelectionStore.getState().selectPart(partId);

      useClipboardStore.getState().copySelectedParts();

      expect(useUIStore.getState().toast?.message).toBe('Copied 1 part');
    });

    it('shows plural parts toast for multiple parts', () => {
      const id1 = useProjectStore.getState().addPart({ name: 'Part A' });
      const id2 = useProjectStore.getState().addPart({ name: 'Part B' });
      useSelectionStore.getState().selectParts([id1, id2]);

      useClipboardStore.getState().copySelectedParts();

      expect(useUIStore.getState().toast?.message).toBe('Copied 2 parts');
    });

    it('shows group toast when copying a group with parts', () => {
      const store = useProjectStore.getState();
      const p1 = store.addPart({ name: 'P1' });
      const p2 = store.addPart({ name: 'P2' });
      store.createGroup('Group A', [
        { id: p1, type: 'part' },
        { id: p2, type: 'part' }
      ]);

      const groupId = useProjectStore.getState().groups[0].id;
      useSelectionStore.getState().selectGroup(groupId);
      useClipboardStore.getState().copySelectedParts();

      expect(useUIStore.getState().toast?.message).toBe('Copied 2 parts in 1 group');
    });

    it('shows plural groups toast for multiple groups', () => {
      const store = useProjectStore.getState();
      const p1 = store.addPart({ name: 'P1' });
      const p2 = store.addPart({ name: 'P2' });
      const p3 = store.addPart({ name: 'P3' });
      store.createGroup('Group A', [{ id: p1, type: 'part' }]);
      store.createGroup('Group B', [{ id: p2, type: 'part' }]);

      const groups = useProjectStore.getState().groups;
      useSelectionStore.setState({
        selectedGroupIds: groups.map((g) => g.id),
        selectedPartIds: [p3]
      });
      useClipboardStore.getState().copySelectedParts();

      expect(useUIStore.getState().toast?.message).toBe('Copied 3 parts in 2 groups');
    });
  });

  // ============================================================
  // License check: pasteClipboard
  // ============================================================

  describe('license limits on paste', () => {
    it('pasteClipboard returns empty array when clipboard is empty', () => {
      const result = useClipboardStore.getState().pasteClipboard();
      expect(result).toHaveLength(0);
    });

    it('pasteClipboard blocks paste when part limit reached in free mode', () => {
      // Add parts up to the free limit (10)
      const store = useProjectStore.getState();
      for (let i = 0; i < 10; i++) {
        store.addPart({ name: `Part ${i}` });
      }
      // Copy one of them
      const partId = useProjectStore.getState().parts[0].id;
      useSelectionStore.getState().selectPart(partId);
      useClipboardStore.getState().copySelectedParts();

      // Switch to free mode
      useLicenseStore.setState({ licenseMode: 'free' });

      const result = useClipboardStore.getState().pasteClipboard();

      expect(result).toHaveLength(0);
      expect(useProjectStore.getState().parts).toHaveLength(10); // No new parts added
      expect(useUIStore.getState().toast?.message).toBeDefined();
    });

    it('pasteAtPosition blocks paste when part limit reached in free mode', () => {
      const store = useProjectStore.getState();
      for (let i = 0; i < 10; i++) {
        store.addPart({ name: `Part ${i}` });
      }
      const partId = useProjectStore.getState().parts[0].id;
      useSelectionStore.getState().selectPart(partId);
      useClipboardStore.getState().copySelectedParts();

      useLicenseStore.setState({ licenseMode: 'free' });

      const result = useClipboardStore.getState().pasteAtPosition({ x: 50, y: 0, z: 50 });

      expect(result).toHaveLength(0);
      expect(useProjectStore.getState().parts).toHaveLength(10);
    });
  });

  // ============================================================
  // Group paste: copy name behavior
  // ============================================================

  describe('paste copy name behavior', () => {
    it('appends (copy) to top-level part names only', () => {
      const store = useProjectStore.getState();
      const p1 = store.addPart({ name: 'Top Part' });
      useSelectionStore.getState().selectPart(p1);
      useClipboardStore.getState().copySelectedParts();

      useClipboardStore.getState().pasteClipboard();

      const parts = useProjectStore.getState().parts;
      expect(parts[1].name).toContain('(copy)');
    });

    it('preserves child part names in group paste without (copy) suffix', () => {
      const store = useProjectStore.getState();
      const p1 = store.addPart({ name: 'Child Part' });
      store.createGroup('My Group', [{ id: p1, type: 'part' }]);

      const groupId = useProjectStore.getState().groups[0].id;
      useSelectionStore.getState().selectGroup(groupId);
      useClipboardStore.getState().copySelectedParts();

      useClipboardStore.getState().pasteClipboard();

      const parts = useProjectStore.getState().parts;
      const pastedPart = parts.find((p) => p.id !== p1 && p.name === 'Child Part');
      expect(pastedPart).toBeDefined();
    });

    it('appends (copy) to top-level group name only', () => {
      const store = useProjectStore.getState();
      const p1 = store.addPart({ name: 'P1' });
      store.createGroup('Outer', [{ id: p1, type: 'part' }]);

      const groupId = useProjectStore.getState().groups[0].id;
      useSelectionStore.getState().selectGroup(groupId);
      useClipboardStore.getState().copySelectedParts();

      useClipboardStore.getState().pasteClipboard();

      const groups = useProjectStore.getState().groups;
      const pastedGroup = groups.find((g) => g.id !== groupId);
      expect(pastedGroup?.name).toContain('(copy)');
    });
  });

  // ============================================================
  // Paste with groups: selection behavior
  // ============================================================

  describe('paste group selection', () => {
    it('selects top-level groups instead of individual parts after paste', () => {
      const store = useProjectStore.getState();
      const p1 = store.addPart({ name: 'P1' });
      const p2 = store.addPart({ name: 'P2' });
      store.createGroup('Group', [
        { id: p1, type: 'part' },
        { id: p2, type: 'part' }
      ]);

      const groupId = useProjectStore.getState().groups[0].id;
      useSelectionStore.getState().selectGroup(groupId);
      useClipboardStore.getState().copySelectedParts();

      useClipboardStore.getState().pasteClipboard();

      const { selectedPartIds, selectedGroupIds } = useSelectionStore.getState();
      // When groups are pasted, groups are selected instead of individual parts
      expect(selectedGroupIds).toHaveLength(1);
      expect(selectedGroupIds[0]).not.toBe(groupId);
      expect(selectedPartIds).toHaveLength(0);
    });

    it('expands pasted groups in the hierarchy', () => {
      const store = useProjectStore.getState();
      const p1 = store.addPart({ name: 'P1' });
      store.createGroup('Group', [{ id: p1, type: 'part' }]);

      const groupId = useProjectStore.getState().groups[0].id;
      useSelectionStore.getState().selectGroup(groupId);
      useClipboardStore.getState().copySelectedParts();

      useClipboardStore.getState().pasteClipboard();

      const { expandedGroupIds } = useSelectionStore.getState();
      const pastedGroupId = useProjectStore
        .getState()
        .groups.find((g) => g.id !== groupId)?.id;
      expect(expandedGroupIds).toContain(pastedGroupId);
    });
  });

  // ============================================================
  // pasteClipboard updates clipboard for subsequent pastes
  // ============================================================

  describe('clipboard update after paste', () => {
    it('updates clipboard positions so subsequent paste offsets further', () => {
      const partId = useProjectStore.getState().addPart({
        name: 'Part',
        position: { x: 0, y: 0.375, z: 0 }
      });
      useSelectionStore.getState().selectPart(partId);
      useClipboardStore.getState().copySelectedParts();

      // First paste
      useClipboardStore.getState().pasteClipboard();
      const afterFirstPaste = useProjectStore.getState().parts;
      const firstPastedX = afterFirstPaste[1].position.x;

      // Second paste
      useClipboardStore.getState().pasteClipboard();
      const afterSecondPaste = useProjectStore.getState().parts;
      const secondPastedX = afterSecondPaste[2].position.x;

      // Each paste should offset further
      expect(secondPastedX).toBeGreaterThan(firstPastedX);
    });
  });

  // ============================================================
  // pasteClipboard marks project dirty and cut list stale
  // ============================================================

  describe('paste side effects', () => {
    it('marks project as dirty after paste', () => {
      const partId = useProjectStore.getState().addPart({ name: 'Part' });
      useSelectionStore.getState().selectPart(partId);
      useClipboardStore.getState().copySelectedParts();

      // Reset dirty flag
      useProjectStore.setState({ isDirty: false });

      useClipboardStore.getState().pasteClipboard();

      expect(useProjectStore.getState().isDirty).toBe(true);
    });

    it('marks project as dirty after pasteAtPosition', () => {
      const partId = useProjectStore.getState().addPart({ name: 'Part' });
      useSelectionStore.getState().selectPart(partId);
      useClipboardStore.getState().copySelectedParts();

      useProjectStore.setState({ isDirty: false });

      useClipboardStore.getState().pasteAtPosition({ x: 10, y: 0, z: 10 });

      expect(useProjectStore.getState().isDirty).toBe(true);
    });
  });

  // ============================================================
  // Nested group copy/paste
  // ============================================================

  describe('nested group copy/paste', () => {
    it('copies nested groups recursively', () => {
      const store = useProjectStore.getState();
      const p1 = store.addPart({ name: 'Inner Part' });
      store.createGroup('Inner Group', [{ id: p1, type: 'part' }]);

      const innerGroupId = useProjectStore.getState().groups[0].id;
      const p2 = store.addPart({ name: 'Outer Part' });

      store.createGroup('Outer Group', [
        { id: innerGroupId, type: 'group' },
        { id: p2, type: 'part' }
      ]);

      const outerGroupId = useProjectStore.getState().groups.find(
        (g) => g.name === 'Outer Group'
      )!.id;
      useSelectionStore.getState().selectGroup(outerGroupId);
      useClipboardStore.getState().copySelectedParts();

      const { clipboard } = useClipboardStore.getState();
      expect(clipboard.groups).toHaveLength(2);
      expect(clipboard.parts).toHaveLength(2);
      // Should have group members for both groups
      expect(clipboard.groupMembers.length).toBeGreaterThanOrEqual(3);
    });

    it('pastes nested groups with new IDs and correct structure', () => {
      const store = useProjectStore.getState();
      const p1 = store.addPart({ name: 'Inner Part' });
      store.createGroup('Inner Group', [{ id: p1, type: 'part' }]);

      const innerGroupId = useProjectStore.getState().groups[0].id;
      const p2 = store.addPart({ name: 'Outer Part' });

      store.createGroup('Outer Group', [
        { id: innerGroupId, type: 'group' },
        { id: p2, type: 'part' }
      ]);

      const outerGroupId = useProjectStore.getState().groups.find(
        (g) => g.name === 'Outer Group'
      )!.id;
      useSelectionStore.getState().selectGroup(outerGroupId);
      useClipboardStore.getState().copySelectedParts();

      useClipboardStore.getState().pasteClipboard();

      const state = useProjectStore.getState();
      // Should have 4 parts total (2 original + 2 pasted)
      expect(state.parts).toHaveLength(4);
      // Should have 4 groups total (2 original + 2 pasted)
      expect(state.groups).toHaveLength(4);
    });
  });

  // ============================================================
  // pasteAtPosition with groups
  // ============================================================

  describe('pasteAtPosition with groups', () => {
    it('pastes group at position and selects group instead of parts', () => {
      const store = useProjectStore.getState();
      const p1 = store.addPart({ name: 'P1', position: { x: 0, y: 0.375, z: 0 } });
      store.createGroup('G1', [{ id: p1, type: 'part' }]);

      const groupId = useProjectStore.getState().groups[0].id;
      useSelectionStore.getState().selectGroup(groupId);
      useClipboardStore.getState().copySelectedParts();

      useClipboardStore.getState().pasteAtPosition({ x: 50, y: 0, z: 50 });

      const { selectedGroupIds, selectedPartIds } = useSelectionStore.getState();
      expect(selectedGroupIds).toHaveLength(1);
      expect(selectedPartIds).toHaveLength(0);
    });
  });

  // ============================================================
  // Cross-store: newProject clears clipboard
  // ============================================================

  describe('cross-store cleanup', () => {
    it('newProject clears clipboard', () => {
      const partId = useProjectStore.getState().addPart({ name: 'Test' });
      useSelectionStore.getState().selectPart(partId);
      useClipboardStore.getState().copySelectedParts();
      expect(useClipboardStore.getState().clipboard.parts).toHaveLength(1);

      useProjectStore.getState().newProject();

      expect(useClipboardStore.getState().clipboard.parts).toHaveLength(0);
    });
  });
});
