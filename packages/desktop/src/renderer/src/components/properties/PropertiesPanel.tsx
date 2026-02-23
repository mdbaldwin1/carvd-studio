import { Button } from '@renderer/components/ui/button';
import { MultiSelectionProperties } from '@renderer/components/properties/MultiSelectionProperties';
import { NoSelectionProperties } from '@renderer/components/properties/NoSelectionProperties';
import { SinglePartAdvancedCard } from '@renderer/components/properties/SinglePartAdvancedCard';
import { SinglePartBasicsCard } from '@renderer/components/properties/SinglePartBasicsCard';
import { SinglePartMaterialCard } from '@renderer/components/properties/SinglePartMaterialCard';
import { SinglePartNotesCard } from '@renderer/components/properties/SinglePartNotesCard';
import { SingleGroupProperties } from '@renderer/components/properties/SingleGroupProperties';
import { EditStockModal } from '@renderer/components/stock/EditStockModal';
import { useEffectiveStockConstraints } from '@renderer/hooks/useEffectiveStockConstraints';
import { useStockLibrary } from '@renderer/hooks/useStockLibrary';
import { useAssemblyEditingStore } from '@renderer/store/assemblyEditingStore';
import { useCameraStore } from '@renderer/store/cameraStore';
import { useLicenseStore } from '@renderer/store/licenseStore';
import { getAllDescendantPartIds, getContainingGroupId, useProjectStore } from '@renderer/store/projectStore';
import { useSelectionStore } from '@renderer/store/selectionStore';
import { useSnapStore } from '@renderer/store/snapStore';
import { useUIStore } from '@renderer/store/uiStore';
import { Stock } from '@renderer/types';
import { getDocsUrl } from '@renderer/utils/docsLinks';
import { getFeatureLimits } from '@renderer/utils/featureLimits';
import { useMemo, useRef, useState } from 'react';
import {
  buildStockDataFromUpdates,
  getConstraintWarnings,
  getOverlappingParts,
  wouldPartOverlap
} from './propertiesLogic';

export function PropertiesPanel() {
  const parts = useProjectStore((s) => s.parts);
  const projectStocks = useProjectStore((s) => s.stocks);
  const addProjectStock = useProjectStore((s) => s.addStock);
  const isEditingAssembly = useAssemblyEditingStore((s) => s.isEditingAssembly);
  const selectedPartIds = useSelectionStore((s) => s.selectedPartIds);
  const selectedGroupIds = useSelectionStore((s) => s.selectedGroupIds);
  const groups = useProjectStore((s) => s.groups);
  const units = useProjectStore((s) => s.units);
  const updatePart = useProjectStore((s) => s.updatePart);
  const renameGroup = useProjectStore((s) => s.renameGroup);
  const requestDeleteParts = useUIStore((s) => s.requestDeleteParts);
  const openSaveAssemblyModal = useUIStore((s) => s.openSaveAssemblyModal);
  const showToast = useUIStore((s) => s.showToast);
  const deleteGroup = useProjectStore((s) => s.deleteGroup);
  const createGroup = useProjectStore((s) => s.createGroup);
  const addToGroup = useProjectStore((s) => s.addToGroup);
  const removeFromGroup = useProjectStore((s) => s.removeFromGroup);
  const mergeGroups = useProjectStore((s) => s.mergeGroups);
  const duplicateSelectedParts = useProjectStore((s) => s.duplicateSelectedParts);
  const assignStockToSelectedParts = useProjectStore((s) => s.assignStockToSelectedParts);
  const groupMembers = useProjectStore((s) => s.groupMembers);
  const editingGroupId = useSelectionStore((s) => s.editingGroupId);
  const requestCenterCamera = useCameraStore((s) => s.requestCenterCamera);
  const toggleReference = useSnapStore((s) => s.toggleReference);
  const referencePartIds = useSnapStore((s) => s.referencePartIds);
  const licenseMode = useLicenseStore((s) => s.licenseMode);
  const limits = getFeatureLimits(licenseMode);
  const canUseAssemblies = limits.canUseAssemblies;
  const canUseGroups = limits.canUseGroups;
  const constraints = useEffectiveStockConstraints();

  // State for "Add New Stock..." modal
  const [isCreateStockModalOpen, setIsCreateStockModalOpen] = useState(false);
  const lastOverlapToastAtRef = useRef(0);

  // Use library stocks when editing assembly (merged with project stocks to resolve references),
  // project stocks otherwise
  const { stocks: libraryStocks, addStock: addLibraryStock } = useStockLibrary();
  const stocks = isEditingAssembly
    ? // Merge library stocks with project stocks, preferring library stocks for duplicates
      [...libraryStocks, ...projectStocks.filter((ps) => !libraryStocks.some((ls) => ls.id === ps.id))]
    : projectStocks;

  const isMac = window.navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  // Handle stock assignment with inheritance
  const handleStockAssignment = (partId: string, stockId: string | null) => {
    if (stockId === null) {
      // Unassign stock
      updatePart(partId, { stockId: null });
    } else {
      const stock = stocks.find((s) => s.id === stockId);
      if (stock) {
        // Assign stock and inherit color + grain direction
        updatePart(partId, {
          stockId,
          color: stock.color,
          grainDirection: stock.grainDirection === 'none' ? 'length' : stock.grainDirection
        });
      }
    }
  };

  // Handle creating a new stock and assigning it to selected parts
  const handleCreateStockAndAssign = (_id: string, updates: Partial<Stock>) => {
    const stockData = buildStockDataFromUpdates(updates, stocks.length);

    // Add to project or library depending on mode and get the actual ID
    let actualStockId: string;
    if (isEditingAssembly) {
      // Library stocks are added with their own ID generation
      const newStock: Stock = { ...stockData, id: crypto.randomUUID() } as Stock;
      addLibraryStock(newStock);
      actualStockId = newStock.id;
    } else {
      // addProjectStock returns the actual ID of the created stock
      actualStockId = addProjectStock(stockData);
    }

    // Assign to all selected parts using the actual stock ID
    // Use assignStockToSelectedParts for all cases because it uses get().stocks
    // which has the freshly added stock, while handleStockAssignment uses the
    // component's stocks which may be stale (React hasn't re-rendered yet)
    if (selectedPartIds.length > 0) {
      assignStockToSelectedParts(actualStockId);
    }
  };

  // Helper to count direct members in a group
  const countGroupMembers = (groupId: string): number => {
    return groupMembers.filter((gm) => gm.groupId === groupId).length;
  };

  const effectiveSelectedPartIds = useMemo(() => {
    const partIds = new Set(selectedPartIds);
    for (const groupId of selectedGroupIds) {
      const groupPartIds = getAllDescendantPartIds(groupId, groupMembers);
      groupPartIds.forEach((id) => partIds.add(id));
    }
    return [...partIds];
  }, [groupMembers, selectedGroupIds, selectedPartIds]);

  const ungroupedPartIds = selectedPartIds.filter((id) => getContainingGroupId(id, groupMembers) === null);
  const partsInGroups = selectedPartIds.filter((id) => getContainingGroupId(id, groupMembers) !== null);
  const isInEditMode = editingGroupId !== null;
  const allAreReferences =
    effectiveSelectedPartIds.length > 0 && effectiveSelectedPartIds.every((id) => referencePartIds.includes(id));
  const someAreReferences =
    effectiveSelectedPartIds.length > 0 && effectiveSelectedPartIds.some((id) => referencePartIds.includes(id));

  const handleCreateGroup = () => {
    const members: Array<{ id: string; type: 'part' | 'group' }> = [
      ...ungroupedPartIds.map((id) => ({ id, type: 'part' as const })),
      ...selectedGroupIds.map((id) => ({ id, type: 'group' as const }))
    ];
    if (members.length < 2) return;
    createGroup(`Group ${groups.length + 1}`, members);
  };

  const handleDeleteSelection = () => {
    for (const groupId of selectedGroupIds) {
      deleteGroup(groupId, 'recursive');
    }
    if (selectedPartIds.length > 0) {
      requestDeleteParts(selectedPartIds);
    }
  };

  const handleRemoveFromGroup = () => {
    if (partsInGroups.length > 0) {
      removeFromGroup(partsInGroups, 'part');
    }
    if (isInEditMode && selectedGroupIds.length > 0) {
      removeFromGroup(selectedGroupIds, 'group');
    }
  };

  // No selection at all
  if (selectedPartIds.length === 0 && selectedGroupIds.length === 0) {
    return <NoSelectionProperties modKey={modKey} />;
  }

  // Single group selected (no parts)
  if (selectedGroupIds.length === 1 && selectedPartIds.length === 0) {
    const selectedGroup = groups.find((g) => g.id === selectedGroupIds[0]);
    if (selectedGroup) {
      const memberCount = countGroupMembers(selectedGroup.id);
      return (
        <SingleGroupProperties
          group={{ id: selectedGroup.id, name: selectedGroup.name }}
          memberCount={memberCount}
          isReferenceActive={allAreReferences}
          canUseAssemblies={canUseAssemblies}
          canRemoveFromParent={isInEditMode && selectedGroup.id !== editingGroupId}
          modKey={modKey}
          onRenameGroup={renameGroup}
          onCenterView={requestCenterCamera}
          onSaveAsAssembly={openSaveAssemblyModal}
          onToggleReference={() => {
            const groupPartIds = getAllDescendantPartIds(selectedGroup.id, groupMembers);
            if (groupPartIds.length > 0) {
              toggleReference(groupPartIds);
            }
          }}
          onRemoveFromParent={(groupId) => removeFromGroup([groupId], 'group')}
          onUngroup={(groupId) => deleteGroup(groupId, 'ungroup', editingGroupId ?? null)}
          onDeleteGroup={(groupId) => deleteGroup(groupId, 'recursive', null)}
        />
      );
    }
  }

  // Multiple groups selected (no parts)
  if (selectedGroupIds.length > 1 && selectedPartIds.length === 0) {
    const selectedGroups = groups.filter((g) => selectedGroupIds.includes(g.id));
    return (
      <aside className="properties-panel">
        <h2>Properties</h2>
        <div className="properties-card">
          <p className="text-sm mb-3 text-text">{selectedGroupIds.length} groups selected</p>
          <div className="property-group flex flex-wrap gap-1.5">
            <Button variant="secondary" size="sm" onClick={requestCenterCamera}>
              Center View
            </Button>
            <Button variant="secondary" size="sm" onClick={openSaveAssemblyModal} disabled={!canUseAssemblies}>
              Save as Assembly
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => toggleReference(effectiveSelectedPartIds)}
              disabled={effectiveSelectedPartIds.length === 0}
            >
              {allAreReferences ? 'Clear Reference' : someAreReferences ? 'Set All as Reference' : 'Set as Reference'}
            </Button>
          </div>
          <div className="property-group flex flex-wrap gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => mergeGroups(selectedGroupIds, 'top-level')}
              disabled={!canUseGroups}
            >
              Merge (Preserve Structure)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => mergeGroups(selectedGroupIds, 'deep')}
              disabled={!canUseGroups}
            >
              Merge (Flatten to Parts)
            </Button>
            {isInEditMode && (
              <Button variant="secondary" size="sm" onClick={handleRemoveFromGroup}>
                Remove from Group
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={handleDeleteSelection}>
              Delete Selection
            </Button>
          </div>
          <div className="property-group">
            <p className="text-[11px] mb-2 text-text-muted">Add selected groups into:</p>
            <div className="flex flex-wrap gap-1.5">
              {selectedGroups.map((group) => (
                <Button
                  key={group.id}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const groupsToAdd = selectedGroupIds.filter((id) => id !== group.id);
                    if (groupsToAdd.length > 0) {
                      addToGroup(group.id, groupsToAdd, 'group');
                    }
                  }}
                >
                  {group.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // Mixed selection (parts and groups)
  if (selectedGroupIds.length > 0 && selectedPartIds.length > 0) {
    const targetGroupsForAdd = selectedGroupIds.map((id) => groups.find((g) => g.id === id)).filter(Boolean);
    const canCreateGroup = ungroupedPartIds.length + selectedGroupIds.length >= 2;
    return (
      <aside className="properties-panel">
        <h2>Properties</h2>
        <div className="properties-card">
          <p className="text-sm mb-3 text-text">
            {selectedPartIds.length} part{selectedPartIds.length !== 1 ? 's' : ''}, {selectedGroupIds.length} group
            {selectedGroupIds.length !== 1 ? 's' : ''} selected
          </p>
          <div className="property-group flex flex-wrap gap-1.5">
            <Button variant="secondary" size="sm" onClick={requestCenterCamera}>
              Center View
            </Button>
            <Button variant="secondary" size="sm" onClick={openSaveAssemblyModal} disabled={!canUseAssemblies}>
              Save as Assembly
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => toggleReference(effectiveSelectedPartIds)}
              disabled={effectiveSelectedPartIds.length === 0}
            >
              {allAreReferences ? 'Clear Reference' : someAreReferences ? 'Set All as Reference' : 'Set as Reference'}
            </Button>
          </div>
          <div className="property-group flex flex-wrap gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCreateGroup}
              disabled={!canUseGroups || !canCreateGroup}
            >
              Create Group
            </Button>
            {isInEditMode && (partsInGroups.length > 0 || selectedGroupIds.length > 0) && (
              <Button variant="secondary" size="sm" onClick={handleRemoveFromGroup}>
                Remove from Group
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={handleDeleteSelection}>
              Delete Selection
            </Button>
          </div>
          {ungroupedPartIds.length > 0 && targetGroupsForAdd.length > 0 && (
            <div className="property-group">
              <p className="text-[11px] mb-2 text-text-muted">Add ungrouped parts to:</p>
              <div className="flex flex-wrap gap-1.5">
                {targetGroupsForAdd.map((group) => (
                  <Button
                    key={group!.id}
                    variant="outline"
                    size="sm"
                    onClick={() => addToGroup(group!.id, ungroupedPartIds, 'part')}
                  >
                    {group!.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    );
  }

  // Multiple selection (parts only)
  if (selectedPartIds.length > 1) {
    return (
      <MultiSelectionProperties
        selectedPartIds={selectedPartIds}
        selectedGroupIds={selectedGroupIds}
        parts={parts}
        stocks={stocks}
        units={units}
        isCreateStockModalOpen={isCreateStockModalOpen}
        onOpenCreateStockModal={() => setIsCreateStockModalOpen(true)}
        onCloseCreateStockModal={() => setIsCreateStockModalOpen(false)}
        onAssignStockToSelectedParts={assignStockToSelectedParts}
        onDuplicateSelectedParts={duplicateSelectedParts}
        onRequestDeleteParts={requestDeleteParts}
        onCreateStockAndAssign={handleCreateStockAndAssign}
      />
    );
  }

  // Single selection
  const selectedPart = parts.find((p) => p.id === selectedPartIds[0]);
  if (!selectedPart) {
    return (
      <aside className="properties-panel">
        <h2>Properties</h2>
        <div className="properties-card">
          <p className="text-text-muted text-xs italic">Select a part to edit properties</p>
        </div>
      </aside>
    );
  }

  // Constraint enforcement helpers
  const assignedStock = selectedPart.stockId ? stocks.find((s) => s.id === selectedPart.stockId) : null;
  const isDimensionConstrained = constraints.constrainDimensions && !!assignedStock;
  const isGrainConstrained = constraints.constrainGrain && !!assignedStock && assignedStock.grainDirection !== 'none';
  const isColorConstrained = constraints.constrainColor && !!assignedStock;

  // Calculate max dimensions based on stock (if constrained)
  // Glue-up panels can exceed stock width (they'll be made from multiple boards)
  const maxLength = isDimensionConstrained && assignedStock ? assignedStock.length : undefined;
  const maxWidth =
    isDimensionConstrained && assignedStock && !selectedPart.glueUpPanel ? assignedStock.width : undefined;
  const maxThickness = isDimensionConstrained && assignedStock ? assignedStock.thickness : undefined;

  // Dimension change handlers that enforce constraints
  const handleLengthChange = (length: number) => {
    if (isDimensionConstrained && maxLength && length > maxLength) {
      length = maxLength;
    }
    updatePart(selectedPart.id, { length });
  };

  const handleWidthChange = (width: number) => {
    // Glue-up panels can exceed stock width
    if (isDimensionConstrained && maxWidth && width > maxWidth && !selectedPart.glueUpPanel) {
      width = maxWidth;
    }
    updatePart(selectedPart.id, { width });
  };

  const handleThicknessChange = (thickness: number) => {
    if (isDimensionConstrained && maxThickness && thickness > maxThickness) {
      thickness = maxThickness;
    }
    updatePart(selectedPart.id, {
      thickness,
      position: { ...selectedPart.position, y: thickness / 2 }
    });
  };

  // Check if a position change would cause overlap
  const wouldOverlap = (newPosition: { x: number; y: number; z: number }) => {
    return wouldPartOverlap(selectedPart, newPosition, parts);
  };

  // Position change handlers that prevent overlap when enabled
  const handlePositionXChange = (x: number) => {
    const newPosition = { ...selectedPart.position, x };
    if (constraints.preventOverlap && wouldOverlap(newPosition)) {
      notifyOverlapBlocked();
      return;
    }
    updatePart(selectedPart.id, { position: newPosition });
  };

  const handlePositionYChange = (y: number) => {
    const newPosition = { ...selectedPart.position, y };
    if (constraints.preventOverlap && wouldOverlap(newPosition)) {
      notifyOverlapBlocked();
      return;
    }
    updatePart(selectedPart.id, { position: newPosition });
  };

  const handlePositionZChange = (z: number) => {
    const newPosition = { ...selectedPart.position, z };
    if (constraints.preventOverlap && wouldOverlap(newPosition)) {
      notifyOverlapBlocked();
      return;
    }
    updatePart(selectedPart.id, { position: newPosition });
  };

  const notifyOverlapBlocked = () => {
    const now = Date.now();
    if (now - lastOverlapToastAtRef.current > 1200) {
      showToast('Position update blocked: overlap prevention is enabled.', 'info');
      lastOverlapToastAtRef.current = now;
    }
  };
  const selectedPartWarnings = getConstraintWarnings(selectedPart, stocks, units);
  const overlappingParts = getOverlappingParts(selectedPart, parts);

  return (
    <aside className="properties-panel">
      <h2>Properties</h2>
      <SinglePartBasicsCard
        selectedPart={selectedPart}
        units={units}
        isDimensionConstrained={isDimensionConstrained}
        assignedStock={assignedStock}
        onNameChange={(name) => updatePart(selectedPart.id, { name })}
        onLengthChange={handleLengthChange}
        onWidthChange={handleWidthChange}
        onThicknessChange={handleThicknessChange}
        onPositionXChange={handlePositionXChange}
        onPositionYChange={handlePositionYChange}
        onPositionZChange={handlePositionZChange}
      />

      <SinglePartMaterialCard
        selectedPart={selectedPart}
        stocks={stocks}
        units={units}
        warnings={selectedPartWarnings}
        isColorConstrained={isColorConstrained}
        isGrainConstrained={isGrainConstrained}
        assignedStock={assignedStock}
        onStockChange={(stockId) => handleStockAssignment(selectedPart.id, stockId)}
        onOpenCreateStock={() => setIsCreateStockModalOpen(true)}
        onColorChange={(color) => updatePart(selectedPart.id, { color })}
        onGrainChange={(value) => {
          if (value === 'none') {
            updatePart(selectedPart.id, { grainSensitive: false });
          } else {
            updatePart(selectedPart.id, {
              grainSensitive: true,
              grainDirection: value as 'length' | 'width'
            });
          }
        }}
      />

      <SinglePartNotesCard
        notes={selectedPart.notes || ''}
        onNotesChange={(notes) => updatePart(selectedPart.id, { notes })}
      />

      <SinglePartAdvancedCard
        selectedPart={selectedPart}
        assignedStock={assignedStock}
        overlappingParts={overlappingParts}
        onIgnoreOverlapChange={(checked) => updatePart(selectedPart.id, { ignoreOverlap: checked })}
        onGlueUpPanelChange={(checked) => updatePart(selectedPart.id, { glueUpPanel: checked })}
        onExtraLengthChange={(extraLength) => updatePart(selectedPart.id, { extraLength: extraLength || undefined })}
        onExtraWidthChange={(extraWidth) => updatePart(selectedPart.id, { extraWidth: extraWidth || undefined })}
      />

      <div className="property-group properties-learn-more">
        <a
          href="#"
          className="text-accent no-underline text-xs hover:underline hover:text-accent-hover transition-colors duration-150"
          onClick={(e) => {
            e.preventDefault();
            window.electronAPI?.openExternal?.(getDocsUrl('parts'));
          }}
        >
          Learn more about working with parts
        </a>
      </div>

      {/* Create Stock Modal for assignment */}
      <EditStockModal
        isOpen={isCreateStockModalOpen}
        onClose={() => setIsCreateStockModalOpen(false)}
        stock={null}
        onUpdateStock={handleCreateStockAndAssign}
        createMode={true}
        defaultDimensions={{
          length: selectedPart.length,
          width: selectedPart.width,
          thickness: selectedPart.thickness
        }}
      />
    </aside>
  );
}
