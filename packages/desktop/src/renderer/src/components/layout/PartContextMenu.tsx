import { useMemo } from 'react';
import { useProjectStore, getContainingGroupId, getAllDescendantPartIds } from '../../store/projectStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useUIStore } from '../../store/uiStore';
import { useCameraStore } from '../../store/cameraStore';
import { getFeatureLimits } from '../../utils/featureLimits';

interface PartContextMenuProps {
  menuRef: React.RefObject<HTMLDivElement>;
  x: number;
  y: number;
  onClose: () => void;
}

export function PartContextMenu({ menuRef, x, y, onClose }: PartContextMenuProps) {
  const selectedPartIds = useSelectionStore((s) => s.selectedPartIds);
  const parts = useProjectStore((s) => s.parts);
  const copySelectedParts = useProjectStore((s) => s.copySelectedParts);
  const deleteSelectedParts = useProjectStore((s) => s.deleteSelectedParts);
  const resetSelectedPartsToStock = useProjectStore((s) => s.resetSelectedPartsToStock);
  const requestCenterCamera = useCameraStore((s) => s.requestCenterCamera);
  const referencePartIds = useProjectStore((s) => s.referencePartIds);
  const toggleReference = useProjectStore((s) => s.toggleReference);
  const clearReferences = useProjectStore((s) => s.clearReferences);
  const groupMembers = useProjectStore((s) => s.groupMembers);
  const groups = useProjectStore((s) => s.groups);
  const selectedGroupIds = useSelectionStore((s) => s.selectedGroupIds);
  const editingGroupId = useSelectionStore((s) => s.editingGroupId);
  const createGroup = useProjectStore((s) => s.createGroup);
  const removeFromGroup = useProjectStore((s) => s.removeFromGroup);
  const deleteGroup = useProjectStore((s) => s.deleteGroup);
  const addToGroup = useProjectStore((s) => s.addToGroup);
  const mergeGroups = useProjectStore((s) => s.mergeGroups);
  const openSaveAssemblyModal = useUIStore((s) => s.openSaveAssemblyModal);
  const licenseMode = useProjectStore((s) => s.licenseMode);
  const limits = getFeatureLimits(licenseMode);
  const canUseAssemblies = limits.canUseAssemblies;
  const canUseGroups = limits.canUseGroups;

  // Calculate effective selected part IDs (includes parts from selected groups)
  const effectiveSelectedPartIds = useMemo(() => {
    const partIds = new Set(selectedPartIds);
    for (const groupId of selectedGroupIds) {
      const groupPartIds = getAllDescendantPartIds(groupId, groupMembers);
      groupPartIds.forEach((id) => partIds.add(id));
    }
    return [...partIds];
  }, [selectedPartIds, selectedGroupIds, groupMembers]);

  const hasGroupSelection = selectedGroupIds.length > 0;
  if (selectedPartIds.length === 0 && !hasGroupSelection) return null;

  const isMultiSelect = effectiveSelectedPartIds.length > 1;

  // Check if any selected part has a stock assigned
  const selectedParts = parts.filter((p) => effectiveSelectedPartIds.includes(p.id));
  const hasStockAssigned = selectedParts.some((p) => p.stockId !== null);

  // Check reference status of selected parts
  const allAreReferences = effectiveSelectedPartIds.every((id) => referencePartIds.includes(id));
  const someAreReferences = effectiveSelectedPartIds.some((id) => referencePartIds.includes(id));
  const hasOtherReferences = referencePartIds.some((id) => !effectiveSelectedPartIds.includes(id));

  // Check group membership of selected parts
  const partsInGroups = selectedPartIds.filter((id) => getContainingGroupId(id, groupMembers) !== null);
  const isInEditMode = editingGroupId !== null;

  // For "Create Group": collect ungrouped parts + selected groups
  const ungroupedPartIds = selectedPartIds.filter((id) => getContainingGroupId(id, groupMembers) === null);
  const canCreateGroup = ungroupedPartIds.length + selectedGroupIds.length >= 2;

  // For "Ungroup": find the group to ungroup
  const groupToUngroup = selectedGroupIds.length === 1 ? selectedGroupIds[0] : null;
  const groupToUngroupObj = groupToUngroup ? groups.find((g) => g.id === groupToUngroup) : null;

  // For "Add to Group": show when ungrouped parts are selected AND at least one group is selected
  const canAddToGroup = ungroupedPartIds.length > 0 && selectedGroupIds.length > 0;
  const targetGroupsForAdd = selectedGroupIds.map((id) => groups.find((g) => g.id === id)).filter(Boolean);

  // For "Merge Groups": show when 2+ groups are selected
  const canMergeGroups = selectedGroupIds.length >= 2;

  // For "Add Groups to Group": show when 2+ groups are selected
  const canAddGroupsToGroup = selectedGroupIds.length >= 2;
  const targetGroupsForGroupAdd = canAddGroupsToGroup ? groups.filter((g) => selectedGroupIds.includes(g.id)) : [];

  const handleCopy = () => {
    copySelectedParts();
    onClose();
  };

  const handleDelete = () => {
    // Delete selected groups first (recursive mode deletes group and all contents)
    for (const groupId of selectedGroupIds) {
      deleteGroup(groupId, 'recursive');
    }
    // Then delete any directly selected parts (that weren't in deleted groups)
    if (selectedPartIds.length > 0) {
      deleteSelectedParts();
    }
    onClose();
  };

  const handleCenter = () => {
    requestCenterCamera();
    onClose();
  };

  const handleResetToStock = () => {
    resetSelectedPartsToStock();
    onClose();
  };

  const handleGroup = () => {
    // Build members list: ungrouped parts + selected groups
    const members: Array<{ id: string; type: 'part' | 'group' }> = [
      ...ungroupedPartIds.map((id) => ({ id, type: 'part' as const })),
      ...selectedGroupIds.map((id) => ({ id, type: 'group' as const }))
    ];
    if (members.length >= 2) {
      createGroup(`Group ${groups.length + 1}`, members);
    }
    onClose();
  };

  const handleRemoveFromGroup = () => {
    // Remove selected parts from their groups
    if (partsInGroups.length > 0) {
      removeFromGroup(partsInGroups, 'part');
    }
    // Remove selected child groups from the parent (they stay as groups, just not nested)
    if (selectedGroupIds.length > 0 && isInEditMode) {
      removeFromGroup(selectedGroupIds, 'group');
    }
    onClose();
  };

  const handleUngroup = () => {
    if (groupToUngroup) {
      // If we're in edit mode, pass the parent group so children move to parent instead of top-level
      deleteGroup(groupToUngroup, 'ungroup', isInEditMode ? editingGroupId : null);
    }
    onClose();
  };

  const handleAddToGroup = (targetGroupId: string) => {
    // Add ungrouped parts to the target group
    if (ungroupedPartIds.length > 0) {
      addToGroup(targetGroupId, ungroupedPartIds, 'part');
    }
    onClose();
  };

  const handleMergeGroups = (mode: 'top-level' | 'deep') => {
    if (selectedGroupIds.length >= 2) {
      mergeGroups(selectedGroupIds, mode);
    }
    onClose();
  };

  const handleAddGroupsToGroup = (targetGroupId: string) => {
    // Add all OTHER selected groups to the target group
    const groupsToAdd = selectedGroupIds.filter((id) => id !== targetGroupId);
    if (groupsToAdd.length > 0) {
      addToGroup(targetGroupId, groupsToAdd, 'group');
    }
    onClose();
  };

  const handleToggleReference = () => {
    toggleReference(effectiveSelectedPartIds);
    onClose();
  };

  const handleClearAllReferences = () => {
    clearReferences();
    onClose();
  };

  const handleSaveAsAssembly = () => {
    openSaveAssemblyModal();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 1000
      }}
    >
      <div className="context-menu-header">
        {selectedGroupIds.length > 0 && selectedPartIds.length > 0
          ? `${selectedPartIds.length} part${selectedPartIds.length === 1 ? '' : 's'}, ${selectedGroupIds.length} group${selectedGroupIds.length === 1 ? '' : 's'}`
          : selectedGroupIds.length > 0
            ? `${selectedGroupIds.length} group${selectedGroupIds.length === 1 ? '' : 's'} selected`
            : isMultiSelect
              ? `${effectiveSelectedPartIds.length} parts selected`
              : '1 part selected'}
      </div>
      <button className="context-menu-item" onClick={handleCenter}>
        Center View
      </button>
      <button className="context-menu-item" onClick={handleCopy}>
        Copy
      </button>
      <button
        className="context-menu-item"
        onClick={handleSaveAsAssembly}
        disabled={!canUseAssemblies}
        title={!canUseAssemblies ? 'Upgrade to use assemblies' : undefined}
      >
        Save as Assembly
      </button>
      <button
        className="context-menu-item"
        onClick={handleResetToStock}
        disabled={!hasStockAssigned}
        title={hasStockAssigned ? undefined : 'No stock assigned to selected parts'}
      >
        Reset to Stock
      </button>
      <div className="context-menu-divider" />
      <button className="context-menu-item" onClick={handleToggleReference}>
        {allAreReferences ? 'Clear Reference' : someAreReferences ? 'Set All as Reference' : 'Set as Reference'} (R)
      </button>
      {hasOtherReferences && (
        <button className="context-menu-item" onClick={handleClearAllReferences}>
          Clear All References
        </button>
      )}
      {canCreateGroup && (
        <button
          className="context-menu-item"
          onClick={handleGroup}
          disabled={!canUseGroups}
          title={!canUseGroups ? 'Upgrade to use groups' : undefined}
        >
          Create Group (G)
        </button>
      )}
      {isInEditMode && (partsInGroups.length > 0 || selectedGroupIds.length > 0) && (
        <button className="context-menu-item" onClick={handleRemoveFromGroup}>
          Remove from Group ({partsInGroups.length + selectedGroupIds.length})
        </button>
      )}
      {groupToUngroupObj && (
        <button className="context-menu-item" onClick={handleUngroup}>
          Ungroup "{groupToUngroupObj.name}"
        </button>
      )}
      {canAddToGroup && (
        <>
          {targetGroupsForAdd.length === 1 ? (
            <button className="context-menu-item" onClick={() => handleAddToGroup(targetGroupsForAdd[0]!.id)}>
              Add to "{targetGroupsForAdd[0]!.name}" ({ungroupedPartIds.length})
            </button>
          ) : (
            <div className="context-menu-submenu">
              <button className="context-menu-item context-menu-item-has-submenu">
                Add to Group ({ungroupedPartIds.length}) ▸
              </button>
              <div className="context-menu-submenu-items">
                {targetGroupsForAdd.map((group) => (
                  <button key={group!.id} className="context-menu-item" onClick={() => handleAddToGroup(group!.id)}>
                    {group!.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      {canMergeGroups && (
        <div className="context-menu-submenu">
          <button className="context-menu-item context-menu-item-has-submenu">
            Merge Groups ({selectedGroupIds.length}) ▸
          </button>
          <div className="context-menu-submenu-items">
            <button className="context-menu-item" onClick={() => handleMergeGroups('top-level')}>
              Top Level (Preserve Structure)
            </button>
            <button className="context-menu-item" onClick={() => handleMergeGroups('deep')}>
              Deep (Flatten to Parts)
            </button>
          </div>
        </div>
      )}
      {canAddGroupsToGroup && targetGroupsForGroupAdd.length > 0 && (
        <div className="context-menu-submenu">
          <button className="context-menu-item context-menu-item-has-submenu">Add to Group ▸</button>
          <div className="context-menu-submenu-items">
            {targetGroupsForGroupAdd.map((group) => (
              <button key={group.id} className="context-menu-item" onClick={() => handleAddGroupsToGroup(group.id)}>
                Add to "{group.name}"
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="context-menu-divider" />
      <button className="context-menu-item context-menu-item-danger" onClick={handleDelete}>
        Delete
      </button>
    </div>
  );
}
