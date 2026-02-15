import React, { useEffect, useLayoutEffect, useRef, useMemo, useState } from 'react';
import {
  useProjectStore,
  getContainingGroupId,
  getAllDescendantPartIds,
  captureCanvas
} from '../../store/projectStore';
import { getFeatureLimits } from '../../utils/featureLimits';

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
  const captureManualThumbnail = useProjectStore((s) => s.captureManualThumbnail);
  const isEditingAssembly = useProjectStore((s) => s.isEditingAssembly);
  const licenseMode = useProjectStore((s) => s.licenseMode);
  const limits = getFeatureLimits(licenseMode);
  const canUseAssemblies = limits.canUseAssemblies;
  const canUseGroups = limits.canUseGroups;

  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState<{ x: number; y: number } | null>(null);

  // Adjust menu position to stay within viewport bounds
  useLayoutEffect(() => {
    if (!contextMenu || !menuRef.current) {
      setAdjustedPosition(null);
      return;
    }

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const padding = 8; // Minimum distance from viewport edge

    let newX = contextMenu.x;
    let newY = contextMenu.y;

    // Check right edge
    if (newX + rect.width > window.innerWidth - padding) {
      newX = window.innerWidth - rect.width - padding;
    }
    // Check bottom edge
    if (newY + rect.height > window.innerHeight - padding) {
      newY = window.innerHeight - rect.height - padding;
    }
    // Check left edge
    if (newX < padding) {
      newX = padding;
    }
    // Check top edge
    if (newY < padding) {
      newY = padding;
    }

    // Only update if position changed
    if (newX !== contextMenu.x || newY !== contextMenu.y) {
      setAdjustedPosition({ x: newX, y: newY });
    } else {
      setAdjustedPosition(null);
    }
  }, [contextMenu]);

  // Get the effective position (adjusted or original)
  const menuX = adjustedPosition?.x ?? contextMenu?.x ?? 0;
  const menuY = adjustedPosition?.y ?? contextMenu?.y ?? 0;

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

    const handleExportImage = async () => {
      await captureCanvas();
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

    const handleCaptureThumbnail = async () => {
      await captureManualThumbnail();
      closeContextMenu();
    };

    return (
      <div
        ref={menuRef}
        className="context-menu"
        style={{
          position: 'fixed',
          left: menuX,
          top: menuY,
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
        <button className="context-menu-item" onClick={handleExportImage}>
          Export as Image
        </button>
        <button className="context-menu-item" onClick={handleCaptureThumbnail}>
          Capture Thumbnail
        </button>
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
          left: menuX,
          top: menuY,
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

  // For "Add Groups to Group": show when 2+ groups are selected
  // Lists the selected groups as targets - clicking one adds all OTHER selected groups to it
  const canAddGroupsToGroup = selectedGroupIds.length >= 2;
  const targetGroupsForGroupAdd = canAddGroupsToGroup ? groups.filter((g) => selectedGroupIds.includes(g.id)) : [];

  const handleCopy = () => {
    copySelectedParts();
    closeContextMenu();
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

  const handleAddGroupsToGroup = (targetGroupId: string) => {
    // Add all OTHER selected groups to the target group
    const groupsToAdd = selectedGroupIds.filter((id) => id !== targetGroupId);
    if (groupsToAdd.length > 0) {
      addToGroup(targetGroupId, groupsToAdd, 'group');
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
