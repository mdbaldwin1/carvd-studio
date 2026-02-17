import { describe, it, expect, beforeEach } from 'vitest';
import { useClipboardStore } from './clipboardStore';
import { useProjectStore } from './projectStore';
import { useSelectionStore } from './selectionStore';

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
