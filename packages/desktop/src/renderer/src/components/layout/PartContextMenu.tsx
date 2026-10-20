import { useMemo } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useClipboardStore } from '../../store/clipboardStore';
import { useLicenseStore } from '../../store/licenseStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useSnapStore } from '../../store/snapStore';
import { useUIStore } from '../../store/uiStore';
import { useCameraStore } from '../../store/cameraStore';
import { usePartCutsEditingStore } from '../../store/partCutsEditingStore';
import { getFeatureLimits } from '../../utils/featureLimits';
import { analytics } from '../../utils/analytics';
import { bucketCount } from '../../../../shared/analytics';
import { getContainingGroupId, resolveExplicitSelectedPartIds } from '../../utils/interactionSelection';
import { resolveTenonAndMortiseParts } from '../../utils/fitJoinery';
import { planHousingFit, resolveHousingRoles } from '../../utils/fitHousing';

/** Name the cut being fitted, so the action says what it will actually do. */
const HOUSING_LABELS: Record<string, string> = {
  dado: 'Dado',
  stopped_dado: 'Stopped Dado',
  groove: 'Groove',
  stopped_groove: 'Stopped Groove',
  half_lap: 'Half Lap'
};

/**
 * Half an inch is the depth a 3/8" dowel is usually taken into each half of a
 * joint. It is a starting point the operator edits, not a rule.
 */
const DEFAULT_TRANSFER_DEPTH = 0.5;
import { MenuPanel, MenuItemButton, MenuSeparator, MenuLabel, MenuSub } from '../ui/context-menu';

interface PartContextMenuProps {
  menuRef: React.RefObject<HTMLDivElement | null>;
  x: number;
  y: number;
  onClose: () => void;
}

export function PartContextMenu({ menuRef, x, y, onClose }: PartContextMenuProps) {
  const selectedPartIds = useSelectionStore((s) => s.selectedPartIds);
  const parts = useProjectStore((s) => s.parts);
  const stocks = useProjectStore((s) => s.stocks);
  const copySelectedParts = useClipboardStore((s) => s.copySelectedParts);
  const copyPartCuts = useClipboardStore((s) => s.copyPartCuts);
  const pastePartCutsToParts = useClipboardStore((s) => s.pastePartCutsToParts);
  const cutsClipboard = useClipboardStore((s) => s.cutsClipboard);
  const requestDeleteParts = useUIStore((s) => s.requestDeleteParts);
  const requestDeleteGroups = useUIStore((s) => s.requestDeleteGroups);
  const resetSelectedPartsToStock = useProjectStore((s) => s.resetSelectedPartsToStock);
  const transferHolesToMate = useProjectStore((s) => s.transferHolesToMate);
  const fitTenonsToMortise = useProjectStore((s) => s.fitTenonsToMortise);
  const fitHousingToPart = useProjectStore((s) => s.fitHousingToPart);
  const boreThroughAssembly = useProjectStore((s) => s.boreThroughAssembly);
  const requestCenterCamera = useCameraStore((s) => s.requestCenterCamera);
  const referencePartIds = useSnapStore((s) => s.referencePartIds);
  const toggleReference = useSnapStore((s) => s.toggleReference);
  const clearReferences = useSnapStore((s) => s.clearReferences);
  const groupMembers = useProjectStore((s) => s.groupMembers);
  const groups = useProjectStore((s) => s.groups);
  const selectedGroupIds = useSelectionStore((s) => s.selectedGroupIds);
  const editingGroupId = useSelectionStore((s) => s.editingGroupId);
  const createGroup = useProjectStore((s) => s.createGroup);
  const removeFromGroup = useProjectStore((s) => s.removeFromGroup);
  const addToGroup = useProjectStore((s) => s.addToGroup);
  const mergeGroups = useProjectStore((s) => s.mergeGroups);
  const openSaveAssemblyModal = useUIStore((s) => s.openSaveAssemblyModal);
  const showToast = useUIStore((s) => s.showToast);
  const licenseMode = useLicenseStore((s) => s.licenseMode);
  const isEditingPartCuts = usePartCutsEditingStore((s) => s.isEditingPartCuts);
  const startEditingPartCuts = usePartCutsEditingStore((s) => s.startEditingPartCuts);
  const limits = getFeatureLimits(licenseMode);
  const canUseAssemblies = limits.canUseAssemblies;
  const canUseGroups = limits.canUseGroups;

  // Calculate effective selected part IDs (includes parts from selected groups)
  const effectiveSelectedPartIds = useMemo(() => {
    return resolveExplicitSelectedPartIds({ selectedPartIds, selectedGroupIds }, groupMembers);
  }, [selectedPartIds, selectedGroupIds, groupMembers]);

  const hasGroupSelection = selectedGroupIds.length > 0;
  if (selectedPartIds.length === 0 && !hasGroupSelection) return null;

  const isMultiSelect = effectiveSelectedPartIds.length > 1;
  const singleSelectedPart =
    selectedPartIds.length === 1 && selectedGroupIds.length === 0
      ? (parts.find((part) => part.id === selectedPartIds[0]) ?? null)
      : null;

  // Only worth offering once there is something to mark across.
  const singleSelectedPartHasHoles =
    singleSelectedPart?.features?.some((feature) => feature.enabled && feature.kind === 'circular_cut') ?? false;

  // Only a through hole has anything behind it to drill.
  const singleSelectedPartHasThroughHoles =
    singleSelectedPart?.features?.some(
      (feature) => feature.enabled && feature.kind === 'circular_cut' && feature.parameters.depthMode === 'through'
    ) ?? false;

  // Two parts, one with tenons and one with mortises: the joint can be fitted.
  const tenonMortisePair =
    selectedPartIds.length === 2 && selectedGroupIds.length === 0
      ? (() => {
          const first = parts.find((part) => part.id === selectedPartIds[0]);
          const second = parts.find((part) => part.id === selectedPartIds[1]);
          return first && second ? resolveTenonAndMortiseParts(first, second) : null;
        })()
      : null;

  // Two parts where one is channelled and the other faces that channel: the
  // dado or groove can be cut to the piece going into it.
  const housingPair =
    selectedPartIds.length === 2 && selectedGroupIds.length === 0
      ? (() => {
          const first = parts.find((part) => part.id === selectedPartIds[0]);
          const second = parts.find((part) => part.id === selectedPartIds[1]);
          return first && second ? resolveHousingRoles(first, second, stocks) : null;
        })()
      : null;
  const housingPlan = housingPair ? planHousingFit(housingPair.shelfPart, housingPair.housingPart, stocks) : null;

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

  const handleCopyCuts = () => {
    if (!singleSelectedPart) return;
    const copied = copyPartCuts(singleSelectedPart.id);
    showToast(
      copied
        ? `Copied ${singleSelectedPart.features!.length} cut${singleSelectedPart.features!.length === 1 ? '' : 's'} from "${singleSelectedPart.name}"`
        : 'This part has no cuts to copy',
      copied ? 'success' : 'warning'
    );
    onClose();
  };

  const handlePasteCuts = () => {
    const applied = pastePartCutsToParts(effectiveSelectedPartIds);
    showToast(
      applied > 0 ? `Applied cuts to ${applied} part${applied === 1 ? '' : 's'}` : 'No parts selected to receive cuts',
      applied > 0 ? 'success' : 'warning'
    );
    onClose();
  };

  const handleDelete = () => {
    if (selectedGroupIds.length > 0) {
      requestDeleteGroups(selectedGroupIds);
    }
    // Then request delete any directly selected parts (that weren't in deleted groups)
    if (selectedPartIds.length > 0) {
      requestDeleteParts(selectedPartIds);
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
      useProjectStore.getState().deleteGroup(groupToUngroup, 'ungroup', isInEditMode ? editingGroupId : null);
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

  /**
   * Dowel centres. The parts are already together on the bench, so marking
   * across the joint line is one action on holes that already exist.
   */
  const handleTransferHoles = () => {
    if (!singleSelectedPart) {
      showToast('Select the part you bored', 'warning');
      onClose();
      return;
    }
    const marked = transferHolesToMate(singleSelectedPart.id, DEFAULT_TRANSFER_DEPTH);
    if (marked > 0) {
      showToast(`Marked ${marked} hole${marked === 1 ? '' : 's'} on the mating part`, 'success');
    }
    onClose();
  };

  /**
   * Clamp up and drill through. Works from a through hole only, because a
   * blind hole is where the bit stopped.
   */
  const handleBoreThrough = () => {
    if (!singleSelectedPart) {
      showToast('Select the part you bored', 'warning');
      onClose();
      return;
    }
    const drilled = boreThroughAssembly(singleSelectedPart.id);
    if (drilled > 0) {
      showToast(`Bored ${drilled} hole${drilled === 1 ? '' : 's'} through the assembly`, 'success');
    }
    onClose();
  };

  /**
   * Cut the tenon to the mortise. The mortise is the harder half to alter once
   * it is made, so it is the tenon that gets fitted.
   */
  const handleFitTenon = () => {
    if (!tenonMortisePair) {
      onClose();
      return;
    }
    const fitted = fitTenonsToMortise(tenonMortisePair.tenonPart.id, tenonMortisePair.mortisePart.id);
    if (fitted > 0) {
      showToast(`Fitted ${fitted} tenon${fitted === 1 ? '' : 's'} to the mortise`, 'success');
    }
    onClose();
  };

  /**
   * Cut the dado to the shelf. A shelf's thickness is the stock you bought, so
   * the housing is the half that moves.
   */
  const handleFitHousing = () => {
    if (!housingPair) {
      onClose();
      return;
    }
    if (fitHousingToPart(housingPair.shelfPart.id, housingPair.housingPart.id)) {
      showToast('Cut the housing to fit', 'success');
    }
    onClose();
  };

  const handleEditCuts = () => {
    if (isEditingPartCuts) {
      showToast('Finish editing part cuts first', 'warning');
      onClose();
      return;
    }
    if (!singleSelectedPart) {
      showToast('Select exactly one part to edit cuts', 'warning');
      onClose();
      return;
    }
    startEditingPartCuts(singleSelectedPart.id, singleSelectedPart.name, singleSelectedPart.features);
    analytics.capture('part_cuts_opened', {
      source: 'context_menu',
      operation_count_bucket: bucketCount(singleSelectedPart.features?.length ?? 0)
    });
    onClose();
  };

  return (
    <MenuPanel ref={menuRef} x={x} y={y}>
      <MenuLabel>
        {selectedGroupIds.length > 0 && selectedPartIds.length > 0
          ? `${selectedPartIds.length} part${selectedPartIds.length === 1 ? '' : 's'}, ${selectedGroupIds.length} group${selectedGroupIds.length === 1 ? '' : 's'}`
          : selectedGroupIds.length > 0
            ? `${selectedGroupIds.length} group${selectedGroupIds.length === 1 ? '' : 's'} selected`
            : isMultiSelect
              ? `${effectiveSelectedPartIds.length} parts selected`
              : '1 part selected'}
      </MenuLabel>
      <MenuItemButton onClick={handleCenter}>Center View</MenuItemButton>
      <MenuItemButton onClick={handleCopy}>Copy</MenuItemButton>
      {singleSelectedPart && <MenuItemButton onClick={handleEditCuts}>Edit Part Cuts...</MenuItemButton>}
      {singleSelectedPartHasHoles && (
        <MenuItemButton onClick={handleTransferHoles}>Transfer Holes to Mating Part</MenuItemButton>
      )}
      {singleSelectedPartHasThroughHoles && (
        <MenuItemButton onClick={handleBoreThrough}>Bore Through Assembly</MenuItemButton>
      )}
      {tenonMortisePair && <MenuItemButton onClick={handleFitTenon}>Fit Tenon to Mortise</MenuItemButton>}
      {housingPlan && (
        <MenuItemButton onClick={handleFitHousing}>
          Fit {HOUSING_LABELS[housingPlan.cutType] ?? 'Housing'} to Mating Part
        </MenuItemButton>
      )}
      {singleSelectedPart && (singleSelectedPart.features?.length ?? 0) > 0 && (
        <MenuItemButton onClick={handleCopyCuts}>Copy Cuts</MenuItemButton>
      )}
      {cutsClipboard && cutsClipboard.length > 0 && effectiveSelectedPartIds.length > 0 && (
        <MenuItemButton onClick={handlePasteCuts}>
          Paste Cuts ({effectiveSelectedPartIds.length} part{effectiveSelectedPartIds.length === 1 ? '' : 's'})
        </MenuItemButton>
      )}
      <MenuItemButton
        onClick={handleSaveAsAssembly}
        disabled={!canUseAssemblies}
        title={!canUseAssemblies ? 'Upgrade to use assemblies' : undefined}
      >
        Save as Assembly
      </MenuItemButton>
      <MenuItemButton
        onClick={handleResetToStock}
        disabled={!hasStockAssigned}
        title={hasStockAssigned ? undefined : 'No stock assigned to selected parts'}
      >
        Reset to Stock
      </MenuItemButton>
      <MenuSeparator />
      <MenuItemButton onClick={handleToggleReference}>
        {allAreReferences ? 'Clear Reference' : someAreReferences ? 'Set All as Reference' : 'Set as Reference'} (R)
      </MenuItemButton>
      {hasOtherReferences && <MenuItemButton onClick={handleClearAllReferences}>Clear All References</MenuItemButton>}
      {canCreateGroup && (
        <MenuItemButton
          onClick={handleGroup}
          disabled={!canUseGroups}
          title={!canUseGroups ? 'Upgrade to use groups' : undefined}
        >
          Create Group (G)
        </MenuItemButton>
      )}
      {isInEditMode && (partsInGroups.length > 0 || selectedGroupIds.length > 0) && (
        <MenuItemButton onClick={handleRemoveFromGroup}>
          Remove from Group ({partsInGroups.length + selectedGroupIds.length})
        </MenuItemButton>
      )}
      {groupToUngroupObj && (
        <MenuItemButton onClick={handleUngroup}>Ungroup &quot;{groupToUngroupObj.name}&quot;</MenuItemButton>
      )}
      {canAddToGroup && (
        <>
          {targetGroupsForAdd.length === 1 ? (
            <MenuItemButton onClick={() => handleAddToGroup(targetGroupsForAdd[0]!.id)}>
              Add to &quot;{targetGroupsForAdd[0]!.name}&quot; ({ungroupedPartIds.length})
            </MenuItemButton>
          ) : (
            <MenuSub label={`Add to Group (${ungroupedPartIds.length}) \u25B8`}>
              {targetGroupsForAdd.map((group) => (
                <MenuItemButton key={group!.id} onClick={() => handleAddToGroup(group!.id)}>
                  {group!.name}
                </MenuItemButton>
              ))}
            </MenuSub>
          )}
        </>
      )}
      {canMergeGroups && (
        <MenuSub label={`Merge Groups (${selectedGroupIds.length}) \u25B8`}>
          <MenuItemButton onClick={() => handleMergeGroups('top-level')}>Top Level (Preserve Structure)</MenuItemButton>
          <MenuItemButton onClick={() => handleMergeGroups('deep')}>Deep (Flatten to Parts)</MenuItemButton>
        </MenuSub>
      )}
      {canAddGroupsToGroup && targetGroupsForGroupAdd.length > 0 && (
        <MenuSub label="Add to Group &#9656;">
          {targetGroupsForGroupAdd.map((group) => (
            <MenuItemButton key={group.id} onClick={() => handleAddGroupsToGroup(group.id)}>
              Add to &quot;{group.name}&quot;
            </MenuItemButton>
          ))}
        </MenuSub>
      )}
      <MenuSeparator />
      <MenuItemButton variant="danger" onClick={handleDelete}>
        Delete
      </MenuItemButton>
    </MenuPanel>
  );
}
