import { Button } from '@renderer/components/ui/button';
import { SidebarContent, SidebarFooter, Sidebar as SidebarShell } from '@renderer/components/ui/sidebar';
import { ConfirmDialog } from '@renderer/components/common/ConfirmDialog';
import { useProjectStore } from '@renderer/store/projectStore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AddAssemblyModal } from '@renderer/components/assembly/AddAssemblyModal';
import { AddStockModal } from '@renderer/components/stock/AddStockModal';
import { EditStockModal } from '@renderer/components/stock/EditStockModal';
import { AssembliesSection } from '@renderer/components/layout/sidebar/AssembliesSection';
import { PartsSection } from '@renderer/components/layout/sidebar/PartsSection';
import { StockSection } from '@renderer/components/layout/sidebar/StockSection';
import { STOCK_COLORS } from '@renderer/constants';
import { useAssemblyLibrary } from '@renderer/hooks/useAssemblyLibrary';
import { useStockLibrary } from '@renderer/hooks/useStockLibrary';
import { useAssemblyEditingStore } from '@renderer/store/assemblyEditingStore';
import { useLicenseStore } from '@renderer/store/licenseStore';
import { useSelectionStore } from '@renderer/store/selectionStore';
import { useUIStore } from '@renderer/store/uiStore';
import { Stock } from '@renderer/types';
import { getFeatureLimits } from '@renderer/utils/featureLimits';

export interface SidebarProps {
  onOpenProjectSettings: () => void;
  onOpenCutList: () => void;
  onCreateNewAssembly?: () => void;
  onShowLicenseModal?: () => void;
}

export function AppSidebar({
  onOpenProjectSettings,
  onOpenCutList,
  onCreateNewAssembly,
  onShowLicenseModal
}: SidebarProps) {
  const parts = useProjectStore((s) => s.parts);
  const projectStocks = useProjectStore((s) => s.stocks);
  const projectAssemblies = useProjectStore((s) => s.assemblies);
  const units = useProjectStore((s) => s.units);
  const isEditingAssembly = useAssemblyEditingStore((s) => s.isEditingAssembly);
  const licenseMode = useLicenseStore((s) => s.licenseMode);
  const canUseAssemblies = getFeatureLimits(licenseMode).canUseAssemblies;
  const addPart = useProjectStore((s) => s.addPart);
  const addProjectStock = useProjectStore((s) => s.addStock);
  const updateProjectStock = useProjectStore((s) => s.updateStock);
  const deleteProjectStock = useProjectStore((s) => s.deleteStock);
  const deleteProjectAssembly = useProjectStore((s) => s.deleteAssembly);
  const selectPart = useSelectionStore((s) => s.selectPart);
  const selectParts = useSelectionStore((s) => s.selectParts);
  const togglePartSelection = useSelectionStore((s) => s.togglePartSelection);
  const requestDeleteParts = useUIStore((s) => s.requestDeleteParts);
  const showToast = useUIStore((s) => s.showToast);
  const selectedSidebarStockId = useUIStore((s) => s.selectedSidebarStockId);
  const toggleSelectedSidebarStockId = useUIStore((s) => s.toggleSelectedSidebarStockId);
  const setSelectedSidebarStockId = useUIStore((s) => s.setSelectedSidebarStockId);
  const duplicatePart = useProjectStore((s) => s.duplicatePart);
  const cutList = useProjectStore((s) => s.cutList);

  // App-level stock library (persisted)
  const {
    stocks: libraryStocks,
    addStock: addLibraryStock,
    updateStock: updateLibraryStock,
    deleteStock: deleteLibraryStock
  } = useStockLibrary();

  // App-level assembly library (persisted)
  const { assemblies: libraryAssemblies, deleteAssembly: deleteLibraryAssembly } = useAssemblyLibrary();

  // Use library or project stocks/assemblies based on editing mode
  const stocks = isEditingAssembly ? libraryStocks : projectStocks;
  const assemblies = isEditingAssembly ? libraryAssemblies : projectAssemblies;
  const updateStock = isEditingAssembly ? updateLibraryStock : updateProjectStock;
  const deleteStock = isEditingAssembly ? deleteLibraryStock : deleteProjectStock;
  const deleteAssembly = isEditingAssembly ? deleteLibraryAssembly : deleteProjectAssembly;

  // Modal state
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [isCreateStockModalOpen, setIsCreateStockModalOpen] = useState(false);
  const [isAddAssemblyModalOpen, setIsAddAssemblyModalOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [stockToDelete, setStockToDelete] = useState<{ stock: Stock; partCount: number } | null>(null);

  // Collapsed sections state (assemblies collapsed by default, stock open)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    stock: false,
    assemblies: false,
    parts: false
  });

  // Search state for sidebar sections
  const [searchOpen, setSearchOpen] = useState<Record<string, boolean>>({});
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const toggleSearch = (section: string) => {
    setSearchOpen((prev) => {
      const isOpening = !prev[section];
      // Clear search term when closing
      if (!isOpening) {
        setSearchTerms((t) => ({ ...t, [section]: '' }));
      }
      return { ...prev, [section]: isOpening };
    });
  };

  // Track the anchor point for shift-click range selection
  const lastClickedIdRef = useRef<string | null>(null);

  const handleAddPart = () => {
    const colorIndex = parts.length % STOCK_COLORS.length;
    // Find the next available part number by checking existing "Part N" names
    const existingNumbers = parts
      .map((p) => {
        const match = p.name.match(/^Part (\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

    addPart({
      position: {
        x: (parts.length % 5) * 6,
        y: 0.375,
        z: Math.floor(parts.length / 5) * 6
      },
      color: STOCK_COLORS[colorIndex],
      name: `Part ${nextNumber}`
    });
  };

  const handleDeleteStock = (stock: Stock) => {
    const partCount = parts.filter((p) => p.stockId === stock.id).length;
    if (partCount > 0) {
      // Show confirmation dialog
      setStockToDelete({ stock, partCount });
    } else {
      // No parts assigned, delete immediately
      deleteStock(stock.id);
    }
  };

  useEffect(() => {
    if (selectedSidebarStockId && !stocks.some((stock) => stock.id === selectedSidebarStockId)) {
      setSelectedSidebarStockId(null);
    }
  }, [selectedSidebarStockId, stocks, setSelectedSidebarStockId]);

  const confirmDeleteStock = () => {
    if (stockToDelete) {
      deleteStock(stockToDelete.stock.id);
      setStockToDelete(null);
    }
  };

  // Read store state imperatively for a stable callback reference
  const handlePartClick = useCallback(
    (partId: string, e: React.MouseEvent) => {
      const isMac = window.navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
      const isModKey = isMac ? e.metaKey : e.ctrlKey;
      const currentParts = useProjectStore.getState().parts;
      const currentSelectedPartIds = useSelectionStore.getState().selectedPartIds;

      if (e.shiftKey && lastClickedIdRef.current) {
        const lastIndex = currentParts.findIndex((p) => p.id === lastClickedIdRef.current);
        const currentIndex = currentParts.findIndex((p) => p.id === partId);

        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          const rangeIds = currentParts.slice(start, end + 1).map((p) => p.id);
          const newSelection = [...new Set([...currentSelectedPartIds, ...rangeIds])];
          selectParts(newSelection);
          lastClickedIdRef.current = partId;
        } else {
          // Anchor is stale (part deleted/moved) - fall back to single selection.
          selectPart(partId);
          lastClickedIdRef.current = partId;
        }
      } else if (isModKey) {
        togglePartSelection(partId);
        lastClickedIdRef.current = partId;
      } else {
        selectPart(partId);
        lastClickedIdRef.current = partId;
      }
    },
    [selectPart, selectParts, togglePartSelection]
  );

  const handleDeletePart = useCallback(
    (partId: string) => {
      requestDeleteParts([partId]);
    },
    [requestDeleteParts]
  );

  return (
    <SidebarShell className="sidebar">
      <SidebarContent>
        <StockSection
          isCollapsed={collapsedSections.stock}
          onOpenChange={(open) => {
            setCollapsedSections((prev) => ({ ...prev, stock: !open }));
            if (!open) {
              setSearchOpen((s) => ({ ...s, stock: false }));
              setSearchTerms((t) => ({ ...t, stock: '' }));
            }
          }}
          searchOpen={!!searchOpen.stock}
          searchTerm={searchTerms.stock || ''}
          onToggleSearch={() => {
            if (!searchOpen.stock && collapsedSections.stock) {
              setCollapsedSections((prev) => ({ ...prev, stock: false }));
            }
            toggleSearch('stock');
          }}
          onSearchChange={(value) => setSearchTerms((t) => ({ ...t, stock: value }))}
          isEditingAssembly={isEditingAssembly}
          stocks={stocks}
          parts={parts}
          selectedStockId={selectedSidebarStockId}
          units={units}
          onOpenCreateStock={() => setIsCreateStockModalOpen(true)}
          onOpenAddStock={() => setIsAddStockModalOpen(true)}
          onEditStock={setEditingStock}
          onDeleteStock={handleDeleteStock}
          onSelectStock={toggleSelectedSidebarStockId}
        />

        <AssembliesSection
          isCollapsed={collapsedSections.assemblies}
          onOpenChange={(open) => {
            setCollapsedSections((prev) => ({ ...prev, assemblies: !open }));
            if (!open) {
              setSearchOpen((s) => ({ ...s, assemblies: false }));
              setSearchTerms((t) => ({ ...t, assemblies: '' }));
            }
          }}
          searchOpen={!!searchOpen.assemblies}
          searchTerm={searchTerms.assemblies || ''}
          onToggleSearch={() => {
            if (!searchOpen.assemblies && collapsedSections.assemblies) {
              setCollapsedSections((prev) => ({ ...prev, assemblies: false }));
            }
            toggleSearch('assemblies');
          }}
          onSearchChange={(value) => setSearchTerms((t) => ({ ...t, assemblies: value }))}
          isEditingAssembly={isEditingAssembly}
          canUseAssemblies={canUseAssemblies}
          assemblies={assemblies}
          onShowLicenseModal={onShowLicenseModal}
          onOpenAddAssembly={() => setIsAddAssemblyModalOpen(true)}
          onDeleteAssembly={deleteAssembly}
        />

        <PartsSection
          isCollapsed={collapsedSections.parts}
          onOpenChange={(open) => {
            setCollapsedSections((prev) => ({ ...prev, parts: !open }));
            if (!open) {
              setSearchOpen((s) => ({ ...s, parts: false }));
              setSearchTerms((t) => ({ ...t, parts: '' }));
            }
          }}
          searchOpen={!!searchOpen.parts}
          searchTerm={searchTerms.parts || ''}
          onToggleSearch={() => {
            if (!searchOpen.parts && collapsedSections.parts) {
              setCollapsedSections((prev) => ({ ...prev, parts: false }));
            }
            toggleSearch('parts');
          }}
          onSearchChange={(value) => setSearchTerms((t) => ({ ...t, parts: value }))}
          partsCount={parts.length}
          onAddPart={handleAddPart}
          onPartClick={handlePartClick}
          onDuplicate={(partId) => {
            duplicatePart(partId);
          }}
          onDelete={handleDeletePart}
        />
      </SidebarContent>

      {/* Add Stock from Library Modal (for project mode) */}
      <AddStockModal
        isOpen={isAddStockModalOpen}
        onClose={() => setIsAddStockModalOpen(false)}
        onAddStock={addProjectStock}
        stockLibrary={libraryStocks}
        onAddToLibrary={addLibraryStock}
      />

      {/* Create Stock Modal (for assembly editing mode) */}
      <EditStockModal
        isOpen={isCreateStockModalOpen}
        onClose={() => setIsCreateStockModalOpen(false)}
        stock={null}
        onUpdateStock={(id, updates) => {
          // Create new stock with the updates
          const newStock: Stock = {
            id,
            name: updates.name || 'New Stock',
            length: updates.length || 96,
            width: updates.width || 48,
            thickness: updates.thickness || 0.75,
            grainDirection: updates.grainDirection || 'length',
            pricingUnit: updates.pricingUnit || 'per_item',
            pricePerUnit: updates.pricePerUnit || 50,
            color: updates.color || STOCK_COLORS[libraryStocks.length % STOCK_COLORS.length]
          };
          addLibraryStock(newStock);
          showToast('Stock added to library', 'success');
        }}
        createMode={true}
      />

      {/* Edit Stock Modal */}
      <EditStockModal
        isOpen={editingStock !== null}
        onClose={() => setEditingStock(null)}
        stock={editingStock}
        onUpdateStock={updateStock}
      />

      {/* Delete Stock Confirmation */}
      <ConfirmDialog
        isOpen={stockToDelete !== null}
        title="Delete Stock?"
        message={
          stockToDelete
            ? `"${stockToDelete.stock.name}" is assigned to ${stockToDelete.partCount} part${stockToDelete.partCount !== 1 ? 's' : ''}. Deleting it will unassign those parts. Continue?`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeleteStock}
        onCancel={() => setStockToDelete(null)}
      />

      {/* Add Assembly from Library Modal */}
      <AddAssemblyModal
        isOpen={isAddAssemblyModalOpen}
        onClose={() => setIsAddAssemblyModalOpen(false)}
        assemblyLibrary={libraryAssemblies}
        onAddToProject={(assembly) => {
          // Just add the assembly to project - stock resolution happens when it's placed
          // via placeAssembly which handles project → library → embedded fallback
          const addAssembly = useProjectStore.getState().addAssembly;
          addAssembly(assembly);
        }}
        onCreateNew={onCreateNewAssembly}
      />

      {/* Bottom Section - hidden during assembly editing */}
      {!isEditingAssembly && (
        <SidebarFooter>
          <Button size="sm" className="flex w-full justify-center" onClick={onOpenCutList}>
            {!cutList ? 'Generate Cut List' : cutList.isStale ? 'Regenerate Cut List' : 'View Cut List'}
          </Button>
          <Button variant="ghost" size="sm" className="flex w-full justify-center" onClick={onOpenProjectSettings}>
            Project Settings
          </Button>
        </SidebarFooter>
      )}
    </SidebarShell>
  );
}
