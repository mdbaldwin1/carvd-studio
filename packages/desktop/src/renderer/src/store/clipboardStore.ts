import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Clipboard } from '../types';
import { canAddPart, getBlockedMessage } from '../utils/featureLimits';
import { useProjectStore, generateCopyName, getAllDescendantPartIds } from './projectStore';
import { useLicenseStore } from './licenseStore';
import { useSelectionStore } from './selectionStore';
import { useUIStore } from './uiStore';

interface ClipboardStoreState {
  clipboard: Clipboard;

  // Actions
  copySelectedParts: () => void;
  pasteClipboard: () => string[];
  pasteAtPosition: (position: { x: number; y: number; z: number }) => string[];
  clearClipboard: () => void;
}

export const useClipboardStore = create<ClipboardStoreState>((set, get) => ({
  clipboard: { parts: [], groups: [], groupMembers: [] },

  copySelectedParts: () => {
    const { parts, groups, groupMembers } = useProjectStore.getState();
    const { selectedPartIds, selectedGroupIds } = useSelectionStore.getState();

    // Collect all parts to copy (directly selected + parts from selected groups)
    const partIdsToCopy = new Set(selectedPartIds);

    // Helper to collect all descendant groups recursively
    const collectDescendantGroupIds = (groupId: string, collected: Set<string>) => {
      collected.add(groupId);
      const childGroups = groupMembers.filter((gm) => gm.groupId === groupId && gm.memberType === 'group');
      for (const child of childGroups) {
        collectDescendantGroupIds(child.memberId, collected);
      }
    };

    // Collect all groups to copy (selected groups + their descendants)
    const groupIdsToCopy = new Set<string>();
    for (const groupId of selectedGroupIds) {
      collectDescendantGroupIds(groupId, groupIdsToCopy);
    }

    // Add all parts from copied groups
    for (const groupId of groupIdsToCopy) {
      const groupPartIds = getAllDescendantPartIds(groupId, groupMembers);
      groupPartIds.forEach((id) => partIdsToCopy.add(id));
    }

    // Filter data to copy
    const copiedParts = parts.filter((p) => partIdsToCopy.has(p.id));
    const copiedGroups = groups.filter((g) => groupIdsToCopy.has(g.id));
    const copiedGroupMembers = groupMembers.filter((gm) => groupIdsToCopy.has(gm.groupId));

    // Deep clone to prevent mutation of original objects
    set({
      clipboard: {
        parts: copiedParts.map((p) => ({ ...p })),
        groups: copiedGroups.map((g) => ({ ...g })),
        groupMembers: copiedGroupMembers.map((gm) => ({ ...gm }))
      }
    });

    // Show toast notification
    const partCount = copiedParts.length;
    const groupCount = copiedGroups.length;
    if (groupCount > 0) {
      useUIStore
        .getState()
        .showToast(
          `Copied ${partCount} part${partCount === 1 ? '' : 's'} in ${groupCount} group${groupCount === 1 ? '' : 's'}`,
          'success'
        );
    } else {
      useUIStore.getState().showToast(`Copied ${partCount} part${partCount === 1 ? '' : 's'}`, 'success');
    }
  },

  pasteClipboard: () => {
    const { clipboard } = get();
    const { parts } = useProjectStore.getState();
    const { licenseMode } = useLicenseStore.getState();
    if (clipboard.parts.length === 0) return [];

    // Check license limits before pasting
    if (!canAddPart(licenseMode, parts.length + clipboard.parts.length - 1)) {
      useUIStore.getState().showToast(getBlockedMessage('addPart'), 'warning');
      return [];
    }

    // Identify child items (parts/groups that are members of any group)
    // Only top-level items get "(copy)" appended to their names
    const childPartIds = new Set(
      clipboard.groupMembers.filter((gm) => gm.memberType === 'part').map((gm) => gm.memberId)
    );
    const childGroupIds = new Set(
      clipboard.groupMembers.filter((gm) => gm.memberType === 'group').map((gm) => gm.memberId)
    );

    // Create ID mapping for parts and groups
    const partIdMap = new Map<string, string>(); // oldId -> newId
    const groupIdMap = new Map<string, string>(); // oldId -> newId

    // Create new parts with new IDs and offset positions
    // Only top-level parts (not in any group) get "(copy)" appended
    const newParts = clipboard.parts.map((part) => {
      const newId = uuidv4();
      partIdMap.set(part.id, newId);
      const isChild = childPartIds.has(part.id);
      return {
        ...part,
        id: newId,
        name: isChild ? part.name : generateCopyName(part.name),
        position: {
          x: part.position.x + 2,
          y: part.position.y,
          z: part.position.z + 2
        }
      };
    });

    // Create new groups with new IDs
    // Only top-level groups (not nested in other groups) get "(copy)" appended
    const newGroups = clipboard.groups.map((group) => {
      const newId = uuidv4();
      groupIdMap.set(group.id, newId);
      const isChild = childGroupIds.has(group.id);
      return {
        ...group,
        id: newId,
        name: isChild ? group.name : generateCopyName(group.name)
      };
    });

    // Create new group members with mapped IDs
    const newGroupMembers = clipboard.groupMembers.map((gm) => ({
      id: uuidv4(),
      groupId: groupIdMap.get(gm.groupId) || gm.groupId,
      memberType: gm.memberType,
      memberId:
        gm.memberType === 'part'
          ? partIdMap.get(gm.memberId) || gm.memberId
          : groupIdMap.get(gm.memberId) || gm.memberId
    }));

    const newPartIds = newParts.map((p) => p.id);
    const newGroupIds = newGroups.map((g) => g.id);

    // Find top-level groups (groups that aren't members of other copied groups)
    const topLevelGroupIds = newGroups
      .filter((g) => !childGroupIds.has(clipboard.groups.find((og) => groupIdMap.get(og.id) === g.id)?.id || ''))
      .map((g) => g.id);

    // Update clipboard for subsequent pastes (with updated positions)
    const updatedClipboard: Clipboard = {
      parts: newParts,
      groups: newGroups,
      groupMembers: newGroupMembers
    };

    // Update project state with new parts/groups
    const projectState = useProjectStore.getState();
    useProjectStore.setState({
      parts: [...projectState.parts, ...newParts],
      groups: [...projectState.groups, ...newGroups],
      groupMembers: [...projectState.groupMembers, ...newGroupMembers],
      isDirty: true
    });

    // Update clipboard with new positions for subsequent pastes
    set({ clipboard: updatedClipboard });

    useSelectionStore.setState((state) => ({
      selectedPartIds: topLevelGroupIds.length > 0 ? [] : newPartIds,
      selectedGroupIds: topLevelGroupIds,
      expandedGroupIds: [...state.expandedGroupIds, ...newGroupIds]
    }));

    useProjectStore.getState().markCutListStale();
    return newPartIds;
  },

  pasteAtPosition: (position) => {
    const { clipboard } = get();
    const { parts } = useProjectStore.getState();
    const { licenseMode } = useLicenseStore.getState();
    if (clipboard.parts.length === 0) return [];

    // Check license limits before pasting
    if (!canAddPart(licenseMode, parts.length + clipboard.parts.length - 1)) {
      useUIStore.getState().showToast(getBlockedMessage('addPart'), 'warning');
      return [];
    }

    // Identify child items (parts/groups that are members of any group)
    // Only top-level items get "(copy)" appended to their names
    const childPartIds = new Set(
      clipboard.groupMembers.filter((gm) => gm.memberType === 'part').map((gm) => gm.memberId)
    );
    const childGroupIds = new Set(
      clipboard.groupMembers.filter((gm) => gm.memberType === 'group').map((gm) => gm.memberId)
    );

    // Calculate the center of the clipboard parts
    let minX = Infinity,
      maxX = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;
    for (const part of clipboard.parts) {
      minX = Math.min(minX, part.position.x);
      maxX = Math.max(maxX, part.position.x);
      minZ = Math.min(minZ, part.position.z);
      maxZ = Math.max(maxZ, part.position.z);
    }
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // Create ID mapping for parts and groups
    const partIdMap = new Map<string, string>();
    const groupIdMap = new Map<string, string>();

    // Create new parts centered at the clicked position
    // Only top-level parts (not in any group) get "(copy)" appended
    const newParts = clipboard.parts.map((part) => {
      const newId = uuidv4();
      partIdMap.set(part.id, newId);
      const isChild = childPartIds.has(part.id);
      return {
        ...part,
        id: newId,
        name: isChild ? part.name : generateCopyName(part.name),
        position: {
          x: position.x + (part.position.x - centerX),
          y: part.position.y,
          z: position.z + (part.position.z - centerZ)
        }
      };
    });

    // Create new groups with new IDs
    // Only top-level groups (not nested in other groups) get "(copy)" appended
    const newGroups = clipboard.groups.map((group) => {
      const newId = uuidv4();
      groupIdMap.set(group.id, newId);
      const isChild = childGroupIds.has(group.id);
      return {
        ...group,
        id: newId,
        name: isChild ? group.name : generateCopyName(group.name)
      };
    });

    // Create new group members with mapped IDs
    const newGroupMembers = clipboard.groupMembers.map((gm) => ({
      id: uuidv4(),
      groupId: groupIdMap.get(gm.groupId) || gm.groupId,
      memberType: gm.memberType,
      memberId:
        gm.memberType === 'part'
          ? partIdMap.get(gm.memberId) || gm.memberId
          : groupIdMap.get(gm.memberId) || gm.memberId
    }));

    const newPartIds = newParts.map((p) => p.id);
    const newGroupIds = newGroups.map((g) => g.id);

    // Find top-level groups
    const topLevelGroupIds = newGroups
      .filter((g) => !childGroupIds.has(clipboard.groups.find((og) => groupIdMap.get(og.id) === g.id)?.id || ''))
      .map((g) => g.id);

    // Update project state with new parts/groups
    const projectState = useProjectStore.getState();
    useProjectStore.setState({
      parts: [...projectState.parts, ...newParts],
      groups: [...projectState.groups, ...newGroups],
      groupMembers: [...projectState.groupMembers, ...newGroupMembers],
      isDirty: true
    });

    useSelectionStore.setState((state) => ({
      selectedPartIds: topLevelGroupIds.length > 0 ? [] : newPartIds,
      selectedGroupIds: topLevelGroupIds,
      expandedGroupIds: [...state.expandedGroupIds, ...newGroupIds]
    }));

    useProjectStore.getState().markCutListStale();
    return newPartIds;
  },

  clearClipboard: () => {
    set({ clipboard: { parts: [], groups: [], groupMembers: [] } });
  }
}));
