import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Clipboard, PartFeature } from '../types';
import { canAddPart, getBlockedMessage } from '../utils/featureLimits';
import { useProjectStore, generateCopyName } from './projectStore';
import { useLicenseStore } from './licenseStore';
import { useSelectionStore } from './selectionStore';
import { useUIStore } from './uiStore';
import { clonePartFeature, clonePartFeatures, normalizePart } from '../utils/partFeatures';
import { resolveSelectedGroupIdsWithDescendants } from '../utils/interactionSelection';
import { buildWorkspaceSceneGraph } from '../interaction/sceneGraph';

function cloneFeaturesForPartPaste(
  features: PartFeature[] | undefined,
  partIdMap: Map<string, string>,
  jointIdMap: Map<string, string>
): PartFeature[] | undefined {
  if (!features) return undefined;
  return features.map((feature) => {
    const cloned = clonePartFeature(feature);
    cloned.id = uuidv4();
    const dowel = cloned.metadata?.dowelJoint as
      | { jointId: string; matePartId: string; [key: string]: unknown }
      | undefined;
    if (!dowel) return cloned;
    const mappedMateId = partIdMap.get(dowel.matePartId);
    if (!mappedMateId) {
      const metadata = { ...cloned.metadata };
      delete metadata.dowelJoint;
      cloned.metadata = Object.keys(metadata).length > 0 ? metadata : undefined;
      return cloned;
    }
    let mappedJointId = jointIdMap.get(dowel.jointId);
    if (!mappedJointId) {
      mappedJointId = uuidv4();
      jointIdMap.set(dowel.jointId, mappedJointId);
    }
    cloned.metadata = {
      ...cloned.metadata,
      dowelJoint: { ...dowel, jointId: mappedJointId, matePartId: mappedMateId }
    };
    return cloned;
  });
}

interface ClipboardStoreState {
  clipboard: Clipboard;
  cutsClipboard: PartFeature[] | null;

  // Actions
  copySelectedParts: () => void;
  pasteClipboard: () => string[];
  pasteAtPosition: (position: { x: number; y: number; z: number }) => string[];
  clearClipboard: () => void;
  copyPartCuts: (partId: string) => boolean;
  pastePartCutsToParts: (partIds: string[]) => number;
}

export const useClipboardStore = create<ClipboardStoreState>((set, get) => ({
  clipboard: { parts: [], groups: [], groupMembers: [] },
  cutsClipboard: null,

  copyPartCuts: (partId) => {
    const part = useProjectStore.getState().parts.find((p) => p.id === partId);
    if (!part || !part.features || part.features.length === 0) return false;
    set({ cutsClipboard: clonePartFeatures(part.features) });
    return true;
  },

  pastePartCutsToParts: (partIds) => {
    const { cutsClipboard } = get();
    if (!cutsClipboard || cutsClipboard.length === 0 || partIds.length === 0) return 0;
    const { parts, batchUpdateParts } = useProjectStore.getState();
    const targets = parts.filter((p) => partIds.includes(p.id));
    if (targets.length === 0) return 0;

    // Each target gets its own feature instances so later edits stay
    // independent; conflict analysis re-runs per part on its own dimensions.
    batchUpdateParts(
      targets.map((target) => ({
        id: target.id,
        changes: {
          features: cutsClipboard.map((feature) => {
            const cloned = clonePartFeature(feature);
            cloned.id = uuidv4();
            if (cloned.metadata?.dowelJoint !== undefined) {
              const metadata = { ...cloned.metadata };
              delete metadata.dowelJoint;
              cloned.metadata = Object.keys(metadata).length > 0 ? metadata : undefined;
            }
            return cloned;
          })
        }
      }))
    );
    return targets.length;
  },

  copySelectedParts: () => {
    const { parts, groups, groupMembers } = useProjectStore.getState();
    const { selectedPartIds, selectedGroupIds } = useSelectionStore.getState();

    // ADR-008: build a one-shot scene graph from current project state. This
    // is the "non-React" pattern for sceneGraph use — Zustand actions don't
    // have access to React hooks, so we construct the adapter inline. The
    // build is cheap and only happens on copy (an infrequent user action).
    const sceneGraph = buildWorkspaceSceneGraph({ parts, groups, groupMembers });

    // Collect all parts to copy (directly selected + parts from selected groups)
    const partIdsToCopy = new Set(selectedPartIds);

    // Collect all groups to copy (selected groups + their descendants)
    const groupIdsToCopy = new Set(resolveSelectedGroupIdsWithDescendants(selectedGroupIds, groupMembers));

    // Add all parts from copied groups
    for (const groupId of groupIdsToCopy) {
      const groupPartIds = sceneGraph.descendantPartIds(groupId);
      groupPartIds.forEach((id) => partIdsToCopy.add(id));
    }

    // Filter data to copy
    const copiedParts = parts.filter((p) => partIdsToCopy.has(p.id));
    const copiedGroups = groups.filter((g) => groupIdsToCopy.has(g.id));
    const copiedGroupMembers = groupMembers.filter((gm) => groupIdsToCopy.has(gm.groupId));

    // Deep clone to prevent mutation of original objects
    set({
      clipboard: {
        parts: copiedParts.map((p) => normalizePart(p)),
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
    const partIdMap = new Map(clipboard.parts.map((part) => [part.id, uuidv4()])); // oldId -> newId
    const groupIdMap = new Map<string, string>(); // oldId -> newId
    const jointIdMap = new Map<string, string>();

    // Create new parts with new IDs and offset positions
    // Only top-level parts (not in any group) get "(copy)" appended
    const newParts = clipboard.parts.map((part) => {
      const newId = partIdMap.get(part.id)!;
      const isChild = childPartIds.has(part.id);
      return normalizePart({
        ...part,
        id: newId,
        name: isChild ? part.name : generateCopyName(part.name),
        position: {
          x: part.position.x + 2,
          y: part.position.y,
          z: part.position.z + 2
        },
        features: cloneFeaturesForPartPaste(part.features, partIdMap, jointIdMap)
      });
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
      parts: newParts.map((part) => normalizePart(part)),
      groups: newGroups.map((group) => ({ ...group })),
      groupMembers: newGroupMembers.map((groupMember) => ({ ...groupMember }))
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
    const partIdMap = new Map(clipboard.parts.map((part) => [part.id, uuidv4()]));
    const groupIdMap = new Map<string, string>();
    const jointIdMap = new Map<string, string>();

    // Create new parts centered at the clicked position
    // Only top-level parts (not in any group) get "(copy)" appended
    const newParts = clipboard.parts.map((part) => {
      const newId = partIdMap.get(part.id)!;
      const isChild = childPartIds.has(part.id);
      return normalizePart({
        ...part,
        id: newId,
        name: isChild ? part.name : generateCopyName(part.name),
        position: {
          x: position.x + (part.position.x - centerX),
          y: part.position.y,
          z: position.z + (part.position.z - centerZ)
        },
        features: cloneFeaturesForPartPaste(part.features, partIdMap, jointIdMap)
      });
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
