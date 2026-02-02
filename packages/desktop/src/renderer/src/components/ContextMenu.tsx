/* global HTMLDivElement, Node */
import React, { useEffect, useRef, useMemo } from 'react';
import { useProjectStore, getContainingGroupId, getAllDescendantPartIds } from '../store/projectStore';

export function ContextMenu() {
  const contextMenu = useProjectStore((s) => s.contextMenu);
  const selectedPartIds = useProjectStore((s) => s.selectedPartIds);
  const parts = useProjectStore((s) => s.parts);
  const clipboard = useProjectStore((s) => s.clipboard);
  const closeContextMenu = useProjectStore((s) => s.closeContextMenu);
  const copySelectedParts = useProjectStore((s) => s.copySelectedParts);
  const deleteSelectedParts = useProjectStore((s) => s.deleteSelectedParts);
  const resetSelectedPartsToStock = useProjectStore((s) => s.resetSelectedPartsToStock);
  const requestCenterCamera = useProjectStore((s) => s.requestCenterCamera);
  const requestCenterCameraAtOrigin = useProjectStore((s) => s.requestCenterCameraAtOrigin);
  const requestCenterCameraAtPosition = useProjectStore((s) => s.requestCenterCameraAtPosition);
  const pasteAtPosition = useProjectStore((s) => s.pasteAtPosition);
  const referencePartIds = useProjectStore((s) => s.referencePartIds);
  const toggleReference = useProjectStore((s) => s.toggleReference);
  const clearReferences = useProjectStore((s) => s.clearReferences);
  const addSnapGuide = useProjectStore((s) => s.addSnapGuide);
  const snapGuides = useProjectStore((s) => s.snapGuides);
  const removeSnapGuide = useProjectStore((s) => s.removeSnapGuide);
  const clearSnapGuides = useProjectStore((s) => s.clearSnapGuides);
  const groupMembers = useProjectStore((s) => s.groupMembers);
  const groups = useProjectStore((s) => s.groups);
  const selectedGroupIds = useProjectStore((s) => s.selectedGroupIds);
  const editingGroupId = useProjectStore((s) => s.editingGroupId);
  const createGroup = useProjectStore((s) => s.createGroup);
  const removeFromGroup = useProjectStore((s) => s.removeFromGroup);
  const deleteGroup = useProjectStore((s) => s.deleteGroup);
  const addToGroup = useProjectStore((s) => s.addToGroup);
  const mergeGroups = useProjectStore((s) => s.mergeGroups);
  const openSaveAssemblyModal = useProjectStore((s) => s.openSaveAssemblyModal);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeContextMenu();
      }
    };

    // Use setTimeout to avoid closing immediately from the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu, closeContextMenu]);

  // Calculate effective selected part IDs (includes parts from selected groups)
  // Must be called before any early returns to follow Rules of Hooks
  const effectiveSelectedPartIds = useMemo(() => {
    const partIds = new Set(selectedPartIds);
    for (const groupId of selectedGroupIds) {
      const groupPartIds = getAllDescendantPartIds(groupId, groupMembers);
      groupPartIds.forEach((id) => partIds.add(id));
    }
    return [...partIds];
  }, [selectedPartIds, selectedGroupIds, groupMembers]);

  if (!contextMenu) return null;

  // Background context menu
  if (contextMenu.type === 'background') {
    const hasClipboard = clipboard.parts.length > 0;
    const hasGuides = snapGuides.length > 0;
    const worldPos = contextMenu.worldPosition;

    const handleResetView = () => {
      requestCenterCameraAtOrigin();
      closeContextMenu();
    };

    const handleCenterViewHere = () => {
      if (worldPos) {
        requestCenterCameraAtPosition(worldPos);
      }
      closeContextMenu();
    };

    const handlePasteHere = () => {
      if (worldPos) {
        pasteAtPosition(worldPos);
      }
      closeContextMenu();
    };

    const handleAddXGuide = () => {
      if (worldPos) {
        addSnapGuide('x', worldPos.x);
      }
      closeContextMenu();
    };

    const handleAddYGuide = () => {
      if (worldPos) {
        addSnapGuide('y', worldPos.y);
      }
      closeContextMenu();
    };

    const handleAddZGuide = () => {
      if (worldPos) {
        addSnapGuide('z', worldPos.z);
      }
      closeContextMenu();
    };

    const handleClearGuides = () => {
      clearSnapGuides();
      closeContextMenu();
    };

    return (
      <div
        ref={menuRef}
        className="context-menu"
        style={{
          position: 'fixed',
          left: contextMenu.x,
          top: contextMenu.y,
          zIndex: 1000
        }}
      >
        <button className="context-menu-item" onClick={handleResetView}>
          Reset View
        </button>
        <button className="context-menu-item" onClick={handleCenterViewHere} disabled={!worldPos}>
          Center View Here
        </button>
        {hasClipboard && (
          <button className="context-menu-item" onClick={handlePasteHere}>
            Paste Here
          </button>
        )}
        <div className="context-menu-divider" />
        <div className="context-menu-header">Snap Guides</div>
        <button className="context-menu-item" onClick={handleAddXGuide} disabled={!worldPos}>
          Add X Guide Here
        </button>
        <button className="context-menu-item" onClick={handleAddYGuide} disabled={!worldPos}>
          Add Y Guide Here
        </button>
        <button className="context-menu-item" onClick={handleAddZGuide} disabled={!worldPos}>
          Add Z Guide Here
        </button>
        {hasGuides && (
          <button className="context-menu-item context-menu-item-danger" onClick={handleClearGuides}>
            Clear All Guides ({snapGuides.length})
          </button>
        )}
      </div>
    );
  }

  // Guide context menu - for individual guide management
  if (contextMenu.type === 'guide' && contextMenu.guideId) {
    const guide = snapGuides.find((g) => g.id === contextMenu.guideId);
    if (!guide) return null;

    const axisLabels = { x: 'X', y: 'Y', z: 'Z' };

    const handleDeleteGuide = () => {
      removeSnapGuide(contextMenu.guideId!);
      closeContextMenu();
    };

    const handleClearAllGuides = () => {
      clearSnapGuides();
      closeContextMenu();
    };

    return (
      <div
        ref={menuRef}
        className="context-menu"
        style={{
          position: 'fixed',
          left: contextMenu.x,
          top: contextMenu.y,
          zIndex: 1000
        }}
      >
        <div className="context-menu-header">
          {axisLabels[guide.axis]} Guide at {guide.position.toFixed(2)}"
        </div>
        <button className="context-menu-item context-menu-item-danger" onClick={handleDeleteGuide}>
          Delete This Guide
        </button>
        {snapGuides.length > 1 && (
          <button className="context-menu-item context-menu-item-danger" onClick={handleClearAllGuides}>
            Clear All Guides ({snapGuides.length})
          </button>
        )}
      </div>
    );
  }

  // Part context menu - requires selection (either direct or via group)
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

  // For "Ungroup": find the group to ungroup (either a selected child group or the containing group of selected parts)
  // When in edit mode and a child group is selected, ungrouping should move its members to the parent (editingGroupId)
  const groupToUngroup = selectedGroupIds.length === 1 ? selectedGroupIds[0] : null;
  const groupToUngroupObj = groupToUngroup ? groups.find((g) => g.id === groupToUngroup) : null;

  // For "Add to Group": show when ungrouped parts are selected AND at least one group is selected
  // The ungrouped parts will be added to one of the selected groups
  const canAddToGroup = ungroupedPartIds.length > 0 && selectedGroupIds.length > 0;
  const targetGroupsForAdd = selectedGroupIds.map((id) => groups.find((g) => g.id === id)).filter(Boolean);

  // For "Merge Groups": show when 2+ groups are selected
  const canMergeGroups = selectedGroupIds.length >= 2;

  const handleCopy = () => {
    copySelectedParts();
    closeContextMenu();
  };

  const handleDelete = () => {
    deleteSelectedParts();
    closeContextMenu();
  };

  const handleCenter = () => {
    requestCenterCamera();
    closeContextMenu();
  };

  const handleResetToStock = () => {
    resetSelectedPartsToStock();
    closeContextMenu();
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
    closeContextMenu();
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
    closeContextMenu();
  };

  const handleUngroup = () => {
    if (groupToUngroup) {
      // If we're in edit mode, pass the parent group so children move to parent instead of top-level
      deleteGroup(groupToUngroup, 'ungroup', isInEditMode ? editingGroupId : null);
    }
    closeContextMenu();
  };

  const handleAddToGroup = (targetGroupId: string) => {
    // Add ungrouped parts to the target group
    if (ungroupedPartIds.length > 0) {
      addToGroup(targetGroupId, ungroupedPartIds, 'part');
    }
    closeContextMenu();
  };

  const handleMergeGroups = (mode: 'top-level' | 'deep') => {
    if (selectedGroupIds.length >= 2) {
      mergeGroups(selectedGroupIds, mode);
    }
    closeContextMenu();
  };

  const handleToggleReference = () => {
    toggleReference(effectiveSelectedPartIds);
    closeContextMenu();
  };

  const handleClearAllReferences = () => {
    clearReferences();
    closeContextMenu();
  };

  const handleSaveAsAssembly = () => {
    openSaveAssemblyModal();
    closeContextMenu();
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: contextMenu.x,
        top: contextMenu.y,
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
      <button className="context-menu-item" onClick={handleSaveAsAssembly}>
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
        <button className="context-menu-item" onClick={handleGroup}>
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
            <button
              className="context-menu-item"
              onClick={() => handleAddToGroup(targetGroupsForAdd[0]!.id)}
            >
              Add to "{targetGroupsForAdd[0]!.name}" ({ungroupedPartIds.length})
            </button>
          ) : (
            <div className="context-menu-submenu">
              <button className="context-menu-item context-menu-item-has-submenu">
                Add to Group ({ungroupedPartIds.length}) ▸
              </button>
              <div className="context-menu-submenu-items">
                {targetGroupsForAdd.map((group) => (
                  <button
                    key={group!.id}
                    className="context-menu-item"
                    onClick={() => handleAddToGroup(group!.id)}
                  >
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
      <div className="context-menu-divider" />
      <button className="context-menu-item context-menu-item-danger" onClick={handleDelete}>
        Delete
      </button>
    </div>
  );
}
