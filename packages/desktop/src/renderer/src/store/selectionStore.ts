import { create } from 'zustand';
import { useProjectStore, isDescendantOf } from './projectStore';

interface SelectionStoreState {
  // Part selection
  selectedPartIds: string[];
  hoveredPartId: string | null;
  transformMode: 'translate' | 'scale';
  activeDragDelta: { x: number; y: number; z: number } | null;
  selectionBox: {
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null;

  // Group selection
  selectedGroupIds: string[];
  expandedGroupIds: string[];
  editingGroupId: string | null;

  // Actions - Part selection
  selectPart: (id: string | null) => void;
  togglePartSelection: (id: string) => void;
  selectParts: (ids: string[]) => void;
  clearSelection: () => void;

  // Actions - Hover/UI
  setHoveredPart: (id: string | null) => void;
  setTransformMode: (mode: 'translate' | 'scale') => void;
  setActiveDragDelta: (delta: { x: number; y: number; z: number } | null) => void;
  setSelectionBox: (box: { start: { x: number; y: number }; end: { x: number; y: number } } | null) => void;

  // Actions - Group selection
  selectGroup: (groupId: string) => void;
  toggleGroupSelection: (groupId: string) => void;
  clearGroupSelection: () => void;

  // Actions - Group editing
  enterGroup: (groupId: string) => void;
  exitGroup: () => void;

  // Actions - Group expand/collapse
  toggleGroupExpanded: (groupId: string) => void;
  expandGroup: (groupId: string) => void;
  collapseGroup: (groupId: string) => void;
  expandAllGroups: () => void;
  collapseAllGroups: () => void;
}

export const useSelectionStore = create<SelectionStoreState>((set, get) => ({
  selectedPartIds: [],
  hoveredPartId: null,
  transformMode: 'translate',
  activeDragDelta: null,
  selectionBox: null,
  selectedGroupIds: [],
  expandedGroupIds: [],
  editingGroupId: null,

  // Part selection actions
  selectPart: (id) => {
    set({ selectedPartIds: id ? [id] : [], selectedGroupIds: [] });
  },

  togglePartSelection: (id) => {
    set((state) => {
      if (state.selectedPartIds.includes(id)) {
        return { selectedPartIds: state.selectedPartIds.filter((pid) => pid !== id) };
      } else {
        return { selectedPartIds: [...state.selectedPartIds, id] };
      }
    });
  },

  selectParts: (ids) => {
    set({ selectedPartIds: ids, selectedGroupIds: [] });
  },

  clearSelection: () => {
    // Clear selection only - preserve group editing context
    // Use exitGroup() or Escape key to exit group editing mode
    set({ selectedPartIds: [], selectedGroupIds: [] });
  },

  // Hover/UI actions
  setHoveredPart: (id) => set({ hoveredPartId: id }),
  setTransformMode: (mode) => set({ transformMode: mode }),
  setActiveDragDelta: (delta) => set({ activeDragDelta: delta }),
  setSelectionBox: (box) => set({ selectionBox: box }),

  // Group selection actions
  selectGroup: (groupId) => {
    const { editingGroupId } = get();
    const { groupMembers } = useProjectStore.getState();

    // Check if the group being selected is a descendant of the current editing group
    // If so, keep editingGroupId unchanged so user can drill into nested groups
    let newEditingGroupId: string | null = null;

    if (editingGroupId !== null) {
      // Check if groupId is inside editingGroupId (descendant)
      if (isDescendantOf(groupId, editingGroupId, groupMembers) && groupId !== editingGroupId) {
        newEditingGroupId = editingGroupId; // Stay in the parent group
      }
    }

    set({
      selectedGroupIds: [groupId],
      selectedPartIds: [], // Clear part selection when selecting a group
      editingGroupId: newEditingGroupId
    });
  },

  toggleGroupSelection: (groupId) => {
    set((state) => {
      if (state.selectedGroupIds.includes(groupId)) {
        return { selectedGroupIds: state.selectedGroupIds.filter((id) => id !== groupId) };
      } else {
        // Preserve existing part selection when shift+clicking to add a group
        return {
          selectedGroupIds: [...state.selectedGroupIds, groupId],
          editingGroupId: null
        };
      }
    });
  },

  clearGroupSelection: () => {
    set({ selectedGroupIds: [] });
  },

  // Group editing mode (Figma-style)
  enterGroup: (groupId) => {
    set({
      editingGroupId: groupId,
      selectedGroupIds: [], // Clear group selection
      selectedPartIds: [] // Clear part selection - user can now select individual parts
    });
  },

  exitGroup: () => {
    const { editingGroupId } = get();
    if (!editingGroupId) return;

    const { groupMembers } = useProjectStore.getState();

    // Find the parent group of the current editing group
    const parentMembership = groupMembers.find((gm) => gm.memberType === 'group' && gm.memberId === editingGroupId);
    const parentGroupId = parentMembership ? parentMembership.groupId : null;

    set({
      editingGroupId: parentGroupId, // Step back one level (null if at top level)
      selectedPartIds: [] // Clear part selection when exiting
    });
  },

  // Group expand/collapse actions
  toggleGroupExpanded: (groupId) => {
    set((state) => {
      if (state.expandedGroupIds.includes(groupId)) {
        return { expandedGroupIds: state.expandedGroupIds.filter((id) => id !== groupId) };
      } else {
        return { expandedGroupIds: [...state.expandedGroupIds, groupId] };
      }
    });
  },

  expandGroup: (groupId) => {
    set((state) => {
      if (state.expandedGroupIds.includes(groupId)) return {};
      return { expandedGroupIds: [...state.expandedGroupIds, groupId] };
    });
  },

  collapseGroup: (groupId) => {
    set((state) => ({
      expandedGroupIds: state.expandedGroupIds.filter((id) => id !== groupId)
    }));
  },

  expandAllGroups: () => {
    const { groups } = useProjectStore.getState();
    set({ expandedGroupIds: groups.map((g) => g.id) });
  },

  collapseAllGroups: () => {
    set({ expandedGroupIds: [] });
  }
}));

// Bridge: when selection changes, update reference distances in projectStore
// Located here (not in projectStore) to avoid circular module initialization issues
let _prevSelectedPartIds: string[] = [];
let _prevSelectedGroupIds: string[] = [];
useSelectionStore.subscribe((state) => {
  if (state.selectedPartIds !== _prevSelectedPartIds || state.selectedGroupIds !== _prevSelectedGroupIds) {
    _prevSelectedPartIds = state.selectedPartIds;
    _prevSelectedGroupIds = state.selectedGroupIds;
    useProjectStore.getState().updateReferenceDistances();
  }
});
