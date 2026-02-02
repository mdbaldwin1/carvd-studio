import { Canvas } from '@react-three/fiber';
import { ChevronDown, ChevronRight, Library, Redo2, Settings, Undo2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { AddAssemblyModal } from './components/AddAssemblyModal';
import { AddStockModal } from './components/AddStockModal';
import { AppSettingsModal } from './components/AppSettingsModal';
import { AssemblyEditingBanner } from './components/AssemblyEditingBanner';
import { AssemblyEditingExitDialog } from './components/AssemblyEditingExitDialog';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ContextMenu } from './components/ContextMenu';
import { CutListModal } from './components/CutListModal';
import { EditStockModal } from './components/EditStockModal';
import { useMenuCommands } from './hooks/useMenuCommands';
import { FractionInput } from './components/FractionInput';
import { HierarchicalPartsList } from './components/HierarchicalPartsList';
import { ImportToLibraryDialog } from './components/ImportToLibraryDialog';
import { LicenseActivationModal } from './components/LicenseActivationModal';
import { ProjectSettingsModal } from './components/ProjectSettingsModal';
import { RecoveryDialog } from './components/RecoveryDialog';
import { SaveAssemblyModal } from './components/SaveAssemblyModal';
import { StockLibraryModal } from './components/StockLibraryModal';
import { Toast } from './components/Toast';
import { Workspace } from './components/Workspace';
import { WelcomeTutorial } from './components/WelcomeTutorial';
import { STOCK_COLORS } from './constants';
import { useAppSettings } from './hooks/useAppSettings';
import { useAutoRecovery } from './hooks/useAutoRecovery';
import { useAssemblyEditing } from './hooks/useAssemblyEditing';
import { useAssemblyLibrary } from './hooks/useAssemblyLibrary';
import { useEffectiveStockConstraints } from './hooks/useEffectiveStockConstraints';
import { useDevTools } from './hooks/useDevTools';
import { useFileOperations } from './hooks/useFileOperations';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useLibraryImportCheck } from './hooks/useLibraryImportCheck';
import { useStockLibrary } from './hooks/useStockLibrary';
import { useProjectStore } from './store/projectStore';
import { Assembly, Stock } from './types';
import { formatMeasurementWithUnit } from './utils/fractions';
import { getPartBounds } from './utils/snapToPartsUtil';
import { generateSeedProject } from './utils/seedData';

// Selection box overlay (rendered outside Canvas for correct positioning)
function SelectionBox() {
  const selectionBox = useProjectStore((s) => s.selectionBox);

  if (!selectionBox) return null;

  const { start, end } = selectionBox;
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return (
    <div
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        border: '1px dashed #3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        pointerEvents: 'none',
        zIndex: 100
      }}
    />
  );
}

// Contextual hotkey hints bar
function HotkeyHints({ show }: { show: boolean }) {
  const selectedPartIds = useProjectStore((s) => s.selectedPartIds);
  const selectedGroupIds = useProjectStore((s) => s.selectedGroupIds);
  const clipboard = useProjectStore((s) => s.clipboard);

  const isMac = window.navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  if (!show) return null;

  let hints: { key: string; action: string }[] = [];
  const hasSelection = selectedPartIds.length > 0 || selectedGroupIds.length > 0;
  const totalSelected = selectedPartIds.length + selectedGroupIds.length;

  if (!hasSelection) {
    // No selection
    hints = [
      { key: `${modKey}+A`, action: 'Select All' },
      { key: `${modKey}+Drag`, action: 'Box Select' },
      { key: 'Shift+Click', action: 'Multi-select' }
    ];
    if (clipboard.parts.length > 0) {
      hints.push({ key: `${modKey}+V`, action: 'Paste' });
    }
  } else if (totalSelected === 1) {
    // Single selection (part or group)
    hints = [
      { key: 'Arrows', action: 'Nudge' },
      { key: 'X / Y / Z', action: 'Rotate' },
      { key: `${modKey}+C`, action: 'Copy' },
      { key: 'Shift+D', action: 'Duplicate' },
      { key: 'R', action: 'Reference' },
      { key: 'Del', action: 'Delete' },
      { key: 'F', action: 'Focus' },
      { key: 'Esc', action: 'Deselect' }
    ];
  } else {
    // Multi-selection (can create group)
    hints = [
      { key: 'Arrows', action: 'Nudge' },
      { key: 'X / Y / Z', action: 'Rotate' },
      { key: `${modKey}+C`, action: 'Copy' },
      { key: 'Shift+D', action: 'Duplicate' },
      { key: 'G', action: 'Group' },
      { key: `${modKey}+Shift+G`, action: 'Ungroup' },
      { key: 'R', action: 'Reference' },
      { key: 'Del', action: 'Delete' },
      { key: 'Esc', action: 'Deselect' }
    ];
  }

  // Camera hints (always shown, but compact)
  const cameraHints: { key: string; action: string }[] = [
    { key: 'Drag', action: 'Orbit' },
    { key: 'Scroll', action: 'Zoom' },
    { key: 'Home', action: 'Reset' },
    { key: `${modKey}+Z`, action: 'Undo' },
    { key: `${modKey}+Shift+Z`, action: 'Redo' }
  ];

  return (
    <div className="hotkey-hints-container">
      <div className="hotkey-hints">
        {hints.map((hint, index) => (
          <span key={index} className="hotkey-hint">
            <kbd>{hint.key}</kbd>
            <span>{hint.action}</span>
          </span>
        ))}
      </div>
      <div className="hotkey-hints hotkey-hints-camera">
        {cameraHints.map((hint, index) => (
          <span key={index} className="hotkey-hint">
            <kbd>{hint.key}</kbd>
            <span>{hint.action}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

interface SidebarProps {
  onOpenProjectSettings: () => void;
  onOpenCutList: () => void;
}

function Sidebar({ onOpenProjectSettings, onOpenCutList }: SidebarProps) {
  const parts = useProjectStore((s) => s.parts);
  const projectStocks = useProjectStore((s) => s.stocks);
  const projectAssemblies = useProjectStore((s) => s.assemblies);
  const selectedPartIds = useProjectStore((s) => s.selectedPartIds);
  const units = useProjectStore((s) => s.units);
  const isEditingAssembly = useProjectStore((s) => s.isEditingAssembly);
  const addPart = useProjectStore((s) => s.addPart);
  const addProjectStock = useProjectStore((s) => s.addStock);
  const updateProjectStock = useProjectStore((s) => s.updateStock);
  const deleteProjectStock = useProjectStore((s) => s.deleteStock);
  const deleteProjectAssembly = useProjectStore((s) => s.deleteAssembly);
  const selectPart = useProjectStore((s) => s.selectPart);
  const selectParts = useProjectStore((s) => s.selectParts);
  const togglePartSelection = useProjectStore((s) => s.togglePartSelection);
  const requestDeleteParts = useProjectStore((s) => s.requestDeleteParts);
  const duplicatePart = useProjectStore((s) => s.duplicatePart);
  const showToast = useProjectStore((s) => s.showToast);
  const cutList = useProjectStore((s) => s.cutList);

  // App-level stock library (persisted)
  const {
    stocks: libraryStocks,
    addStock: addLibraryStock,
    updateStock: updateLibraryStock,
    deleteStock: deleteLibraryStock
  } = useStockLibrary();

  // App-level assembly library (persisted)
  const {
    assemblies: libraryAssemblies,
    deleteAssembly: deleteLibraryAssembly
  } = useAssemblyLibrary();

  // Use library or project stocks/assemblies based on editing mode
  const stocks = isEditingAssembly ? libraryStocks : projectStocks;
  const assemblies = isEditingAssembly ? libraryAssemblies : projectAssemblies;
  const addStock = isEditingAssembly ? addLibraryStock : addProjectStock;
  const updateStock = isEditingAssembly ? updateLibraryStock : updateProjectStock;
  const deleteStock = isEditingAssembly ? deleteLibraryStock : deleteProjectStock;
  const deleteAssembly = isEditingAssembly ? deleteLibraryAssembly : deleteProjectAssembly;

  // Modal state
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [isCreateStockModalOpen, setIsCreateStockModalOpen] = useState(false);
  const [isAddAssemblyModalOpen, setIsAddAssemblyModalOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [stockToDelete, setStockToDelete] = useState<{ stock: Stock; partCount: number } | null>(null);

  // Collapsed sections state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
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

  const handleAddStockToProject = (stock: Stock) => {
    addStock(stock);
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

  const confirmDeleteStock = () => {
    if (stockToDelete) {
      deleteStock(stockToDelete.stock.id);
      setStockToDelete(null);
    }
  };

  const handlePartClick = (partId: string, e: React.MouseEvent) => {
    const isMac = window.navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
    const isModKey = isMac ? e.metaKey : e.ctrlKey;

    if (e.shiftKey && lastClickedIdRef.current) {
      // Shift+click: Select range from last clicked to current, adding to existing selection
      const lastIndex = parts.findIndex((p) => p.id === lastClickedIdRef.current);
      const currentIndex = parts.findIndex((p) => p.id === partId);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = parts.slice(start, end + 1).map((p) => p.id);

        // Always add range to existing selection (like Finder does after cmd+click)
        const newSelection = [...new Set([...selectedPartIds, ...rangeIds])];
        selectParts(newSelection);
      }
      // Don't update lastClickedIdRef on shift-click to allow extending selection
    } else if (isModKey) {
      // Cmd/Ctrl+click: Toggle individual item in selection
      togglePartSelection(partId);
      lastClickedIdRef.current = partId;
    } else {
      // Regular click: Single select (replace selection)
      selectPart(partId);
      lastClickedIdRef.current = partId;
    }
  };

  return (
    <aside className="sidebar">
      {/* Stock Section */}
      <section className={`sidebar-section ${collapsedSections.stock ? 'collapsed' : ''}`}>
        <div
          className="section-header"
          onClick={() => toggleSection('stock')}
          title={collapsedSections.stock ? 'Expand' : 'Collapse'}
        >
          <span className="section-collapse-btn">
            {collapsedSections.stock ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
          </span>
          <h2>{isEditingAssembly ? 'Stock Library' : 'Stock'}</h2>
          <button
            className="btn btn-icon-sm btn-ghost btn-secondary"
            onClick={(e) => {
              e.stopPropagation();
              if (isEditingAssembly) {
                // Open create stock modal for library
                setIsCreateStockModalOpen(true);
              } else {
                // Open add-from-library modal for project
                setIsAddStockModalOpen(true);
              }
            }}
            title={isEditingAssembly ? 'Add New Stock to Library' : 'Add Stock from Library'}
          >
            +
          </button>
        </div>
        <div className="section-content">
          <div className="section-content-inner">
            {stocks.length === 0 ? (
              <p className="placeholder-text">
                {isEditingAssembly ? 'No stock in library. Click + to create.' : 'No stock yet. Click + to add.'}
              </p>
            ) : (
              <ul className="stock-list">
                {stocks.map((stock) => {
                  const partCount = parts.filter((p) => p.stockId === stock.id).length;
                  return (
                    <li
                      key={stock.id}
                      className="stock-item"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/carvd-stock', stock.id);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      title={`Drag onto canvas to create part\n${formatMeasurementWithUnit(stock.length, units)} × ${formatMeasurementWithUnit(stock.width, units)} × ${formatMeasurementWithUnit(stock.thickness, units)}${!isEditingAssembly ? `\n${partCount} part${partCount !== 1 ? 's' : ''} assigned` : ''}`}
                    >
                      <span className="stock-color" style={{ backgroundColor: stock.color }} />
                      <span className="stock-name">{stock.name}</span>
                      {!isEditingAssembly && partCount > 0 && <span className="stock-part-count">{partCount}</span>}
                      <span className="stock-thickness">{formatMeasurementWithUnit(stock.thickness, units)}</span>
                      <div className="stock-actions">
                        <button
                          className="btn btn-icon-sm btn-ghost btn-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingStock(stock);
                          }}
                          title={isEditingAssembly ? 'Edit library stock' : 'Edit stock'}
                        >
                          ✎
                        </button>
                        <button
                          className="btn btn-icon-sm btn-ghost btn-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStock(stock);
                          }}
                          title={isEditingAssembly ? 'Delete from library' : 'Remove from project'}
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Assemblies Section */}
      <section className={`sidebar-section ${collapsedSections.assemblies ? 'collapsed' : ''}`}>
        <div
          className="section-header"
          onClick={() => toggleSection('assemblies')}
          title={collapsedSections.assemblies ? 'Expand' : 'Collapse'}
        >
          <span className="section-collapse-btn">
            {collapsedSections.assemblies ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
          </span>
          <h2>{isEditingAssembly ? 'Assembly Library' : 'Assemblies'}</h2>
          {isEditingAssembly ? (
            <button
              className="btn btn-icon-sm btn-ghost btn-secondary"
              disabled
              onClick={(e) => e.stopPropagation()}
              title="Finish editing current assembly first"
            >
              +
            </button>
          ) : (
            <button
              className="btn btn-icon-sm btn-ghost btn-secondary"
              onClick={(e) => {
                e.stopPropagation();
                setIsAddAssemblyModalOpen(true);
              }}
              title="Add Assembly from Library"
            >
              +
            </button>
          )}
        </div>
        <div className="section-content">
          <div className="section-content-inner">
            {assemblies.length === 0 ? (
              <p className="placeholder-text">
                {isEditingAssembly ? 'No assemblies in library yet.' : 'No assemblies yet. Click + to add from library.'}
              </p>
            ) : (
              <ul className="assembly-list">
                {assemblies.map((assembly) => (
                  <li
                    key={assembly.id}
                    className="assembly-item"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/carvd-assembly', assembly.id);
                      e.dataTransfer.setData('application/carvd-assembly-source', isEditingAssembly ? 'library' : 'project');
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    title={`Drag onto canvas to place\n${assembly.parts.length} part${assembly.parts.length !== 1 ? 's' : ''}${assembly.description ? `\n${assembly.description}` : ''}`}
                  >
                    <span className="assembly-icon">📦</span>
                    <span className="assembly-name">{assembly.name}</span>
                    <span className="assembly-count">{assembly.parts.length}</span>
                    <button
                      className="btn btn-icon-sm btn-ghost btn-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAssembly(assembly.id);
                      }}
                      title={isEditingAssembly ? 'Delete from library' : 'Remove from project'}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Parts Section */}
      <section className={`sidebar-section ${collapsedSections.parts ? 'collapsed' : ''}`}>
        <div
          className="section-header"
          onClick={() => toggleSection('parts')}
          title={collapsedSections.parts ? 'Expand' : 'Collapse'}
        >
          <span className="section-collapse-btn">
            {collapsedSections.parts ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
          </span>
          <h2>Parts</h2>
          <button
            className="btn btn-icon-sm btn-ghost btn-secondary"
            onClick={(e) => {
              e.stopPropagation();
              handleAddPart();
            }}
            title="Add Part"
          >
            +
          </button>
        </div>
        <div className="section-content">
          <div className="section-content-inner">
            <HierarchicalPartsList
              onPartClick={handlePartClick}
              onDuplicate={duplicatePart}
              onDelete={(partId) => requestDeleteParts([partId])}
            />
          </div>
        </div>
      </section>

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
          showToast('Stock added to library');
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
      />

      {/* Bottom Section - hidden during assembly editing */}
      {!isEditingAssembly && (
        <section className="sidebar-section sidebar-section-bottom">
          <button className="btn btn-sm btn-filled btn-primary sidebar-settings-btn" onClick={onOpenCutList}>
            {!cutList ? 'Generate Cut List' : cutList.isStale ? 'Regenerate Cut List' : 'View Cut List'}
          </button>
          <button className="btn btn-sm btn-ghost btn-secondary sidebar-settings-btn" onClick={onOpenProjectSettings}>
            Project Settings
          </button>
        </section>
      )}
    </aside>
  );
}

function PropertiesPanel() {
  const parts = useProjectStore((s) => s.parts);
  const projectStocks = useProjectStore((s) => s.stocks);
  const addProjectStock = useProjectStore((s) => s.addStock);
  const isEditingAssembly = useProjectStore((s) => s.isEditingAssembly);
  const selectedPartIds = useProjectStore((s) => s.selectedPartIds);
  const selectedGroupIds = useProjectStore((s) => s.selectedGroupIds);
  const groups = useProjectStore((s) => s.groups);
  const units = useProjectStore((s) => s.units);
  const updatePart = useProjectStore((s) => s.updatePart);
  const renameGroup = useProjectStore((s) => s.renameGroup);
  const requestDeleteParts = useProjectStore((s) => s.requestDeleteParts);
  const deleteGroup = useProjectStore((s) => s.deleteGroup);
  const duplicateSelectedParts = useProjectStore((s) => s.duplicateSelectedParts);
  const assignStockToSelectedParts = useProjectStore((s) => s.assignStockToSelectedParts);
  const groupMembers = useProjectStore((s) => s.groupMembers);
  const constraints = useEffectiveStockConstraints();

  // State for "Add New Stock..." modal
  const [isCreateStockModalOpen, setIsCreateStockModalOpen] = useState(false);

  // Use library stocks when editing assembly (merged with project stocks to resolve references),
  // project stocks otherwise
  const { stocks: libraryStocks, addStock: addLibraryStock } = useStockLibrary();
  const stocks = isEditingAssembly
    ? // Merge library stocks with project stocks, preferring library stocks for duplicates
      [...libraryStocks, ...projectStocks.filter((ps) => !libraryStocks.some((ls) => ls.id === ps.id))]
    : projectStocks;

  const isMac = window.navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  // Check stock constraint violations for a part (warnings always shown regardless of settings)
  const getConstraintWarnings = (part: typeof parts[0]): string[] => {
    const warnings: string[] = [];
    if (!part.stockId) return warnings;

    const stock = stocks.find((s) => s.id === part.stockId);
    if (!stock) return warnings;

    // Check dimension constraints (always warn, regardless of setting)
    const partLength = part.length + (part.extraLength || 0);
    const partWidth = part.width + (part.extraWidth || 0);

    // Check if part fits in stock (considering both orientations)
    const fitsNormal = partLength <= stock.length && partWidth <= stock.width;
    const fitsRotated = partLength <= stock.width && partWidth <= stock.length;

    if (!fitsNormal && !fitsRotated) {
      // Glue-up panels can exceed width (they'll be made from multiple boards)
      // Only show warning if length also exceeds or if not a glue-up panel
      if (part.glueUpPanel && partLength <= stock.length) {
        // This is a valid glue-up panel - no warning needed
      } else {
        warnings.push(`Part dimensions (${formatMeasurementWithUnit(partLength, units)} × ${formatMeasurementWithUnit(partWidth, units)}) exceed stock (${formatMeasurementWithUnit(stock.length, units)} × ${formatMeasurementWithUnit(stock.width, units)})`);
      }
    }

    // Check thickness
    if (part.thickness > stock.thickness) {
      warnings.push(`Part thickness (${formatMeasurementWithUnit(part.thickness, units)}) exceeds stock (${formatMeasurementWithUnit(stock.thickness, units)})`);
    }

    // Check grain constraints (always warn, regardless of setting)
    if (part.grainSensitive && stock.grainDirection !== 'none') {
      if (part.grainDirection !== stock.grainDirection) {
        warnings.push(`Part grain (${part.grainDirection}) doesn't match stock grain (${stock.grainDirection})`);
      }
    }

    return warnings;
  };

  // Calculate axis-aligned bounding box for a part (considering rotation)
  const getPartAABB = (part: typeof parts[0]) => {
    // Use proper rotation-aware bounds calculation
    const bounds = getPartBounds(part);
    return {
      minX: bounds.minX,
      maxX: bounds.maxX,
      minY: bounds.minY,
      maxY: bounds.maxY,
      minZ: bounds.minZ,
      maxZ: bounds.maxZ
    };
  };

  // Check if two AABBs overlap
  const aabbsOverlap = (a: ReturnType<typeof getPartAABB>, b: ReturnType<typeof getPartAABB>) => {
    // Small epsilon for floating point comparison
    const epsilon = 0.001;
    return (
      a.minX < b.maxX - epsilon && a.maxX > b.minX + epsilon &&
      a.minY < b.maxY - epsilon && a.maxY > b.minY + epsilon &&
      a.minZ < b.maxZ - epsilon && a.maxZ > b.minZ + epsilon
    );
  };

  // Check for overlapping parts (always check, regardless of setting)
  const getOverlappingParts = (part: typeof parts[0]): string[] => {
    const overlapping: string[] = [];
    const partAABB = getPartAABB(part);

    for (const other of parts) {
      if (other.id === part.id) continue;
      const otherAABB = getPartAABB(other);
      if (aabbsOverlap(partAABB, otherAABB)) {
        overlapping.push(other.name);
      }
    }

    return overlapping;
  };

  // Handle stock assignment with inheritance
  const handleStockAssignment = (partId: string, stockId: string | null) => {
    // Special value to trigger "Add New Stock..." modal
    if (stockId === '___create___') {
      setIsCreateStockModalOpen(true);
      return;
    }
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
    const stockData: Partial<Stock> = {
      name: updates.name || 'New Stock',
      length: updates.length || 96,
      width: updates.width || 48,
      thickness: updates.thickness || 0.75,
      grainDirection: updates.grainDirection || 'length',
      pricingUnit: updates.pricingUnit || 'per_item',
      pricePerUnit: updates.pricePerUnit || 50,
      color: updates.color || STOCK_COLORS[stocks.length % STOCK_COLORS.length]
    };

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

  // No selection at all
  if (selectedPartIds.length === 0 && selectedGroupIds.length === 0) {
    return (
      <aside className="properties-panel">
        <h2>Properties</h2>
        <p className="placeholder-text">Select a part or group to edit properties</p>
        <p className="hint">Shift+click to select multiple, {modKey}+drag for box select</p>
      </aside>
    );
  }

  // Single group selected (no parts)
  if (selectedGroupIds.length === 1 && selectedPartIds.length === 0) {
    const selectedGroup = groups.find((g) => g.id === selectedGroupIds[0]);
    if (selectedGroup) {
      const memberCount = countGroupMembers(selectedGroup.id);
      return (
        <aside className="properties-panel">
          <h2>Group Properties</h2>

          <div className="property-group">
            <label>Name</label>
            <input
              type="text"
              value={selectedGroup.name}
              onChange={(e) => renameGroup(selectedGroup.id, e.target.value)}
            />
          </div>

          <div className="property-group">
            <p className="selection-info">{memberCount} member{memberCount !== 1 ? 's' : ''}</p>
          </div>

          <div className="property-group btn-group">
            <button
              className="btn btn-sm btn-filled btn-secondary"
              onClick={() => deleteGroup(selectedGroup.id, 'ungroup', null)}
            >
              Ungroup
            </button>
            <button
              className="btn btn-sm btn-filled btn-danger"
              onClick={() => deleteGroup(selectedGroup.id, 'recursive', null)}
            >
              Delete Group
            </button>
          </div>
          <p className="hint">
            Double-click group to edit individual parts
            <br />
            {modKey}+Shift+G to ungroup
          </p>
        </aside>
      );
    }
  }

  // Multiple groups selected (no parts)
  if (selectedGroupIds.length > 1 && selectedPartIds.length === 0) {
    return (
      <aside className="properties-panel">
        <h2>Properties</h2>
        <p className="selection-info">{selectedGroupIds.length} groups selected</p>
        <p className="hint">
          Press G to merge into a new group
          <br />
          {modKey}+Shift+G to ungroup all
        </p>
      </aside>
    );
  }

  // Mixed selection (parts and groups)
  if (selectedGroupIds.length > 0 && selectedPartIds.length > 0) {
    return (
      <aside className="properties-panel">
        <h2>Properties</h2>
        <p className="selection-info">
          {selectedPartIds.length} part{selectedPartIds.length !== 1 ? 's' : ''}, {selectedGroupIds.length} group{selectedGroupIds.length !== 1 ? 's' : ''} selected
        </p>
        <p className="hint">
          Press G to group selection
          <br />
          Press Delete to remove all
        </p>
      </aside>
    );
  }

  // Multiple selection (parts only)
  if (selectedPartIds.length > 1) {
    // Check if all selected parts have the same stock assigned
    const selectedParts = parts.filter((p) => selectedPartIds.includes(p.id));
    const stockIds = selectedParts.map((p) => p.stockId);
    const allSameStock = stockIds.every((id) => id === stockIds[0]);
    const commonStockId = allSameStock ? stockIds[0] : null;

    return (
      <aside className="properties-panel">
        <h2>Properties</h2>
        <p className="selection-info">{selectedPartIds.length} parts selected</p>

        <div className="property-group">
          <label>Assign Stock to All</label>
          <select
            value={allSameStock ? commonStockId || '' : ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '___create___') {
                setIsCreateStockModalOpen(true);
              } else {
                assignStockToSelectedParts(value || null);
              }
            }}
          >
            <option value="">{allSameStock ? 'No stock assigned' : '(Mixed)'}</option>
            {stocks.map((stock) => (
              <option key={stock.id} value={stock.id}>
                {stock.name} ({formatMeasurementWithUnit(stock.thickness, units)})
              </option>
            ))}
            <option value="___create___">+ Add New Stock...</option>
          </select>
          <p className="hint">Assigns stock to all selected parts</p>
        </div>

        <div className="property-group btn-group">
          <button className="btn btn-sm btn-filled btn-secondary" onClick={duplicateSelectedParts}>
            Duplicate All
          </button>
          <button className="btn btn-sm btn-filled btn-danger" onClick={() => requestDeleteParts(selectedPartIds)}>
            Delete All
          </button>
        </div>
        <p className="hint">
          Press Delete to remove selected parts
          <br />
          {modKey}+C to copy, {modKey}+V to paste
        </p>

        {/* Create Stock Modal for assignment */}
        <EditStockModal
          isOpen={isCreateStockModalOpen}
          onClose={() => setIsCreateStockModalOpen(false)}
          stock={null}
          onUpdateStock={handleCreateStockAndAssign}
          createMode={true}
        />
      </aside>
    );
  }

  // Single selection
  const selectedPart = parts.find((p) => p.id === selectedPartIds[0]);
  if (!selectedPart) {
    return (
      <aside className="properties-panel">
        <h2>Properties</h2>
        <p className="placeholder-text">Select a part to edit properties</p>
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
  const maxWidth = isDimensionConstrained && assignedStock && !selectedPart.glueUpPanel ? assignedStock.width : undefined;
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
    const testPart = { ...selectedPart, position: newPosition };
    const testAABB = getPartAABB(testPart);

    for (const other of parts) {
      if (other.id === selectedPart.id) continue;
      const otherAABB = getPartAABB(other);
      if (aabbsOverlap(testAABB, otherAABB)) {
        return true;
      }
    }
    return false;
  };

  // Position change handlers that prevent overlap when enabled
  const handlePositionXChange = (x: number) => {
    const newPosition = { ...selectedPart.position, x };
    if (constraints.preventOverlap && wouldOverlap(newPosition)) {
      return; // Don't update if it would cause overlap
    }
    updatePart(selectedPart.id, { position: newPosition });
  };

  const handlePositionYChange = (y: number) => {
    const newPosition = { ...selectedPart.position, y };
    if (constraints.preventOverlap && wouldOverlap(newPosition)) {
      return; // Don't update if it would cause overlap
    }
    updatePart(selectedPart.id, { position: newPosition });
  };

  const handlePositionZChange = (z: number) => {
    const newPosition = { ...selectedPart.position, z };
    if (constraints.preventOverlap && wouldOverlap(newPosition)) {
      return; // Don't update if it would cause overlap
    }
    updatePart(selectedPart.id, { position: newPosition });
  };

  return (
    <aside className="properties-panel">
      <h2>Properties</h2>

      <div className="property-group">
        <label>Name</label>
        <input
          type="text"
          value={selectedPart.name}
          onChange={(e) => updatePart(selectedPart.id, { name: e.target.value })}
        />
      </div>

      <div className="property-group">
        <label>Dimensions (L × W × T)</label>
        <div className="dimension-inputs">
          <FractionInput
            value={selectedPart.length}
            onChange={handleLengthChange}
            min={0.5}
          />
          <span>×</span>
          <FractionInput
            value={selectedPart.width}
            onChange={handleWidthChange}
            min={0.5}
          />
          <span>×</span>
          <FractionInput
            value={selectedPart.thickness}
            onChange={handleThicknessChange}
            min={0.25}
          />
        </div>
        {isDimensionConstrained && assignedStock && (
          <p className="hint">Max: {formatMeasurementWithUnit(assignedStock.length, units)} × {formatMeasurementWithUnit(assignedStock.width, units)} × {formatMeasurementWithUnit(assignedStock.thickness, units)} (from {assignedStock.name})</p>
        )}
      </div>

      <div className="property-group">
        <label>Position (X, Y, Z)</label>
        <div className="dimension-inputs">
          <FractionInput
            value={selectedPart.position.x}
            onChange={handlePositionXChange}
          />
          <span>,</span>
          <FractionInput
            value={selectedPart.position.y}
            onChange={handlePositionYChange}
          />
          <span>,</span>
          <FractionInput
            value={selectedPart.position.z}
            onChange={handlePositionZChange}
          />
        </div>
        <p className="hint">Use arrow keys to nudge (Shift = 1")</p>
      </div>

      <div className="property-group">
        <label>Stock</label>
        <select
          value={selectedPart.stockId || ''}
          onChange={(e) => handleStockAssignment(selectedPart.id, e.target.value || null)}
        >
          <option value="">No stock assigned</option>
          {stocks.map((stock) => (
            <option key={stock.id} value={stock.id}>
              {stock.name} ({formatMeasurementWithUnit(stock.thickness, units)})
            </option>
          ))}
          <option value="___create___">+ Add New Stock...</option>
        </select>
        {selectedPart.stockId && <p className="hint">Color and grain inherited from stock</p>}
        {(() => {
          const warnings = getConstraintWarnings(selectedPart);
          if (warnings.length === 0) return null;
          return (
            <div className="constraint-warnings">
              {warnings.map((warning, index) => (
                <p key={index} className="constraint-warning">{warning}</p>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Overlap warnings */}
      {(() => {
        const overlapping = getOverlappingParts(selectedPart);
        if (overlapping.length === 0) return null;
        return (
          <div className="property-group">
            <div className="constraint-warnings overlap-warnings">
              <p className="constraint-warning">
                Overlaps with: {overlapping.join(', ')}
              </p>
            </div>
          </div>
        );
      })()}

      <div className="property-group">
        <label>Color</label>
        <input
          type="color"
          value={selectedPart.color}
          onChange={(e) => updatePart(selectedPart.id, { color: e.target.value })}
          disabled={isColorConstrained}
        />
        {isColorConstrained && <p className="hint">Locked to stock color ({assignedStock?.name})</p>}
      </div>

      <div className="property-group">
        <label className={isGrainConstrained ? 'disabled' : ''}>
          <input
            type="checkbox"
            checked={selectedPart.grainSensitive}
            onChange={(e) => updatePart(selectedPart.id, { grainSensitive: e.target.checked })}
            disabled={isGrainConstrained}
          />{' '}
          Grain Sensitive
        </label>
        <p className="hint">If checked, part won't be rotated during cut optimization</p>
        {isGrainConstrained && <p className="hint">Locked by stock grain constraint ({assignedStock?.name})</p>}

        {selectedPart.grainSensitive && (
          <div className="grain-direction">
            <label>Grain Direction</label>
            <div className="radio-group">
              <label className={isGrainConstrained ? 'disabled' : ''}>
                <input
                  type="radio"
                  name={`grain-${selectedPart.id}`}
                  checked={selectedPart.grainDirection === 'length'}
                  onChange={() => updatePart(selectedPart.id, { grainDirection: 'length' })}
                  disabled={isGrainConstrained}
                />{' '}
                Along Length ({formatMeasurementWithUnit(selectedPart.length, units)})
              </label>
              <label className={isGrainConstrained ? 'disabled' : ''}>
                <input
                  type="radio"
                  name={`grain-${selectedPart.id}`}
                  checked={selectedPart.grainDirection === 'width'}
                  onChange={() => updatePart(selectedPart.id, { grainDirection: 'width' })}
                  disabled={isGrainConstrained}
                />{' '}
                Along Width ({formatMeasurementWithUnit(selectedPart.width, units)})
              </label>
            </div>
            {isGrainConstrained && <p className="hint">Locked to {assignedStock?.grainDirection} (from {assignedStock?.name})</p>}
          </div>
        )}
      </div>

      {/* Glue-Up Panel option - for wide panels that exceed stock width */}
      {assignedStock && (
        <div className="property-group">
          <label>
            <input
              type="checkbox"
              checked={selectedPart.glueUpPanel || false}
              onChange={(e) => updatePart(selectedPart.id, { glueUpPanel: e.target.checked })}
            />{' '}
            Glue-Up Panel
          </label>
          <p className="hint">Wide panel made by edge-gluing multiple boards</p>
          {selectedPart.glueUpPanel && (() => {
            const cutWidth = selectedPart.width + (selectedPart.extraWidth || 0);
            const boardsNeeded = Math.ceil(cutWidth / assignedStock.width);
            return (
              <p className="hint glue-up-info">
                Requires {boardsNeeded} board{boardsNeeded !== 1 ? 's' : ''} of {assignedStock.name}
              </p>
            );
          })()}
        </div>
      )}

      <div className="property-group">
        <label>Notes</label>
        <textarea
          className="part-notes-textarea"
          value={selectedPart.notes || ''}
          onChange={(e) => updatePart(selectedPart.id, { notes: e.target.value })}
          placeholder="Fabrication notes (edge banding, joinery, etc.)"
          rows={3}
        />
      </div>

      <details className="property-group joinery-adjustments">
        <summary>
          Joinery Adjustments
          {(selectedPart.extraLength || selectedPart.extraWidth) && (
            <span className="joinery-indicator">●</span>
          )}
        </summary>
        <p className="hint joinery-description">
          Add extra material for joinery (tenons, dado insertions, etc.). These values affect the cut list but not the 3D visualization.
        </p>
        <div className="joinery-inputs">
          <div className="joinery-input-row">
            <label>Extra Length</label>
            <FractionInput
              value={selectedPart.extraLength || 0}
              onChange={(extraLength) => updatePart(selectedPart.id, { extraLength: extraLength || undefined })}
              min={0}
            />
          </div>
          <div className="joinery-input-row">
            <label>Extra Width</label>
            <FractionInput
              value={selectedPart.extraWidth || 0}
              onChange={(extraWidth) => updatePart(selectedPart.id, { extraWidth: extraWidth || undefined })}
              min={0}
            />
          </div>
        </div>
      </details>

      {/* Create Stock Modal for assignment */}
      <EditStockModal
        isOpen={isCreateStockModalOpen}
        onClose={() => setIsCreateStockModalOpen(false)}
        stock={null}
        onUpdateStock={handleCreateStockAndAssign}
        createMode={true}
      />
    </aside>
  );
}

function UndoRedoButtons() {
  const undo = useStore(useProjectStore.temporal, (state) => state.undo);
  const redo = useStore(useProjectStore.temporal, (state) => state.redo);
  const pastStates = useStore(useProjectStore.temporal, (state) => state.pastStates);
  const futureStates = useStore(useProjectStore.temporal, (state) => state.futureStates);

  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  return (
    <div className="undo-redo-buttons">
      <button
        className="btn btn-icon-sm btn-outlined btn-secondary"
        onClick={() => undo()}
        disabled={!canUndo}
        title="Undo (Cmd+Z)"
      >
        <Undo2 size={18} />
      </button>
      <button
        className="btn btn-icon-sm btn-outlined btn-secondary"
        onClick={() => redo()}
        disabled={!canRedo}
        title="Redo (Cmd+Shift+Z)"
      >
        <Redo2 size={18} />
      </button>
    </div>
  );
}

function DisplayToolbar() {
  const displayMode = useProjectStore((s) => s.displayMode);
  const showGrid = useProjectStore((s) => s.showGrid);
  const showGrainDirection = useProjectStore((s) => s.showGrainDirection);
  const snapToPartsEnabled = useProjectStore((s) => s.snapToPartsEnabled);
  const referencePartIds = useProjectStore((s) => s.referencePartIds);
  const setDisplayMode = useProjectStore((s) => s.setDisplayMode);
  const setShowGrid = useProjectStore((s) => s.setShowGrid);
  const toggleGrainDirection = useProjectStore((s) => s.toggleGrainDirection);
  const setSnapToPartsEnabled = useProjectStore((s) => s.setSnapToPartsEnabled);
  const clearReferences = useProjectStore((s) => s.clearReferences);

  return (
    <div className="display-toolbar">
      <div className="display-toolbar-group">
        <button
          className={displayMode === 'solid' ? 'active' : ''}
          onClick={() => setDisplayMode('solid')}
          title="Solid view"
        >
          Solid
        </button>
        <button
          className={displayMode === 'wireframe' ? 'active' : ''}
          onClick={() => setDisplayMode('wireframe')}
          title="Wireframe view"
        >
          Wire
        </button>
        <button
          className={displayMode === 'translucent' ? 'active' : ''}
          onClick={() => setDisplayMode('translucent')}
          title="Translucent view"
        >
          Ghost
        </button>
      </div>
      <div className="display-toolbar-divider" />
      <div className="display-toolbar-group">
        <button className={showGrid ? 'toggle-active' : ''} onClick={() => setShowGrid(!showGrid)} title="Toggle grid">
          Grid
        </button>
        <button
          className={showGrainDirection ? 'toggle-active' : ''}
          onClick={toggleGrainDirection}
          title="Toggle grain direction arrows"
        >
          Grain
        </button>
        <button
          className={snapToPartsEnabled ? 'toggle-active' : ''}
          onClick={() => setSnapToPartsEnabled(!snapToPartsEnabled)}
          title="Snap to parts (align edges and centers)"
        >
          Snap
        </button>
        {referencePartIds.length > 0 && (
          <button
            className="reference-indicator"
            onClick={clearReferences}
            title={`${referencePartIds.length} reference part${referencePartIds.length === 1 ? '' : 's'} - Click to clear (Esc)`}
          >
            Ref: {referencePartIds.length}
          </button>
        )}
      </div>
    </div>
  );
}

function CanvasWithDrop() {
  const stocks = useProjectStore((s) => s.stocks);
  const parts = useProjectStore((s) => s.parts);
  const assemblies = useProjectStore((s) => s.assemblies);
  const addPart = useProjectStore((s) => s.addPart);
  const addStock = useProjectStore((s) => s.addStock);
  const addAssembly = useProjectStore((s) => s.addAssembly);
  const placeAssembly = useProjectStore((s) => s.placeAssembly);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropType, setDropType] = useState<'stock' | 'assembly' | null>(null);
  const { settings: appSettings } = useAppSettings();
  const { assemblies: assemblyLibrary } = useAssemblyLibrary();
  const { stocks: stockLibrary } = useStockLibrary();

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/carvd-stock')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
      setDropType('stock');
    } else if (e.dataTransfer.types.includes('application/carvd-assembly')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
      setDropType('assembly');
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
    setDropType(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setDropType(null);

    // Check for stock drop
    const stockId = e.dataTransfer.getData('application/carvd-stock');
    if (stockId) {
      const stock = stocks.find((s) => s.id === stockId);
      if (!stock) return;

      // Find next available part number
      const existingNumbers = parts
        .map((p) => {
          const match = p.name.match(/^Part (\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((n) => n > 0);
      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

      // Create part with stock properties
      addPart({
        name: `Part ${nextNumber}`,
        length: stock.length,
        width: stock.width,
        thickness: stock.thickness,
        position: {
          x: (parts.length % 5) * 6,
          y: stock.thickness / 2,
          z: Math.floor(parts.length / 5) * 6
        },
        stockId: stock.id,
        color: stock.color,
        grainDirection: stock.grainDirection === 'none' ? 'length' : stock.grainDirection,
        grainSensitive: stock.grainDirection !== 'none'
      });
      return;
    }

    // Check for assembly drop
    const assemblyId = e.dataTransfer.getData('application/carvd-assembly');
    if (assemblyId) {
      const source = e.dataTransfer.getData('application/carvd-assembly-source');

      // Find the assembly (from project or library)
      let assembly = assemblies.find((c) => c.id === assemblyId);

      // If not in project, check library and add to project first
      if (!assembly && source === 'library') {
        assembly = assemblyLibrary.find((c) => c.id === assemblyId);
        if (assembly) {
          // Add library assembly to project before placing
          addAssembly(assembly);
        }
      }

      if (!assembly) return;

      // Place the assembly at a grid position
      // Stock resolution (project → library → embedded) is handled by placeAssembly
      const position = {
        x: (parts.length % 5) * 6,
        y: 0, // Y is calculated relative to each part's thickness
        z: Math.floor(parts.length / 5) * 6
      };

      placeAssembly(assembly.id, position, stockLibrary);
    }
  };

  return (
    <div
      className={`canvas-container ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Canvas camera={{ position: [30, 30, 30], fov: 50 }} gl={{ antialias: true }}>
        <Workspace />
      </Canvas>
      <DisplayToolbar />
      <HotkeyHints show={appSettings.showHotkeyHints} />
      {isDragOver && (
        <div className="drop-indicator">
          <span>{dropType === 'assembly' ? 'Drop to place assembly' : 'Drop to create part'}</span>
        </div>
      )}
    </div>
  );
}

function App() {
  useKeyboardShortcuts();
  useDevTools(); // Dev tools for testing (only active in dev mode)

  // File operations - UnsavedChangesDialogComponent for handling unsaved changes
  const { UnsavedChangesDialogComponent } = useFileOperations();

  // Auto-recovery for crash protection
  const {
    hasRecovery,
    recoveryInfo,
    restoreRecovery,
    discardRecovery
  } = useAutoRecovery();

  // Library import check - detects project items not in library
  const {
    showImportDialog,
    missingStocks,
    missingAssemblies,
    handleImport: handleLibraryImport,
    handleSkip: handleLibraryImportSkip
  } = useLibraryImportCheck();

  // Assembly editing mode
  const {
    isEditingAssembly,
    editingAssemblyName,
    showExitDialog: showAssemblyExitDialog,
    isCreatingNew: isCreatingNewAssembly,
    startEditing: startAssemblyEditing,
    startCreatingNew: startCreatingNewAssembly,
    saveAndExit: saveAssemblyAndExit,
    discardAndExit: discardAssemblyAndExit,
    cancelExit: cancelAssemblyExit,
    requestExit: requestAssemblyExit
  } = useAssemblyEditing();

  // Platform detection for custom title bar
  const [platform, setPlatform] = useState<string>('');
  useEffect(() => {
    window.electronAPI.getPlatform().then(setPlatform);
  }, []);

  // License management
  const [isLicenseValid, setIsLicenseValid] = useState<boolean | null>(null); // null = checking, true = valid, false = invalid
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [licenseData, setLicenseData] = useState<{
    licenseEmail: string | null;
    licenseOrderId: string | null;
    licenseActivatedAt: string | null;
  }>({
    licenseEmail: null,
    licenseOrderId: null,
    licenseActivatedAt: null
  });

  // Check license on app start
  useEffect(() => {
    const checkLicense = async () => {
      try {
        const result = await window.electronAPI.checkLicenseValid();
        const data = await window.electronAPI.getLicenseData();

        setLicenseData({
          licenseEmail: data.licenseEmail,
          licenseOrderId: data.licenseOrderId,
          licenseActivatedAt: data.licenseActivatedAt
        });

        if (result.valid) {
          setIsLicenseValid(true);
          setShowLicenseModal(false);
        } else {
          setIsLicenseValid(false);
          setShowLicenseModal(true);
        }
      } catch (error) {
        console.error('Failed to check license:', error);
        setIsLicenseValid(false);
        setShowLicenseModal(true);
      }
    };

    checkLicense();
  }, []);

  // Welcome tutorial management
  const [showTutorial, setShowTutorial] = useState(false);
  const loadProject = useProjectStore((s) => s.loadProject);

  // Check if welcome tutorial should be shown on first run
  useEffect(() => {
    const checkWelcome = async () => {
      try {
        const hasCompletedWelcome = await window.electronAPI.getHasCompletedWelcome();
        if (!hasCompletedWelcome && isLicenseValid === true) {
          // Load sample project for tutorial
          const sampleProject = generateSeedProject();
          loadProject(sampleProject);
          setShowTutorial(true);
        }
      } catch (error) {
        console.error('Failed to check welcome status:', error);
      }
    };

    // Only check after license is validated
    if (isLicenseValid !== null) {
      checkWelcome();
    }
  }, [isLicenseValid, loadProject]);

  const handleTutorialComplete = async () => {
    setShowTutorial(false);
    try {
      await window.electronAPI.setHasCompletedWelcome(true);
    } catch (error) {
      console.error('Failed to save welcome completion:', error);
    }
  };

  const handleLicenseActivate = async (licenseKey: string) => {
    try {
      const result = await window.electronAPI.verifyLicense(licenseKey);
      if (result.valid) {
        const data = await window.electronAPI.getLicenseData();
        setLicenseData({
          licenseEmail: data.licenseEmail,
          licenseOrderId: data.licenseOrderId,
          licenseActivatedAt: data.licenseActivatedAt
        });
        setIsLicenseValid(true);
        setShowLicenseModal(false);
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Invalid license key' };
      }
    } catch (error) {
      return { success: false, error: 'Failed to verify license' };
    }
  };

  const handleLicenseDeactivate = async () => {
    try {
      await window.electronAPI.deactivateLicense();
      setLicenseData({
        licenseEmail: null,
        licenseOrderId: null,
        licenseActivatedAt: null
      });
      setIsLicenseValid(false);
      setShowLicenseModal(true);
    } catch (error) {
      console.error('Failed to deactivate license:', error);
    }
  };

  // Project name and dirty state for header
  const projectName = useProjectStore((s) => s.projectName);
  const isDirty = useProjectStore((s) => s.isDirty);

  // Part deletion confirmation
  const parts = useProjectStore((s) => s.parts);
  const pendingDeletePartIds = useProjectStore((s) => s.pendingDeletePartIds);
  const confirmDeleteParts = useProjectStore((s) => s.confirmDeleteParts);
  const cancelDeleteParts = useProjectStore((s) => s.cancelDeleteParts);

  // Cut list modal
  const openCutListModal = useProjectStore((s) => s.openCutListModal);

  // App settings
  const { settings: appSettings, updateSettings: updateAppSettings } = useAppSettings();

  // Apply theme based on settings
  useEffect(() => {
    const applyTheme = (theme: 'light' | 'dark' | 'system') => {
      let effectiveTheme: 'light' | 'dark';
      if (theme === 'system') {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        effectiveTheme = prefersDark ? 'dark' : 'light';
      } else {
        effectiveTheme = theme;
      }
      document.documentElement.setAttribute('data-theme', effectiveTheme);

      // Update title bar overlay colors for Windows/Linux
      const overlayColors =
        effectiveTheme === 'dark'
          ? { color: '#242424', symbolColor: '#ffffff' }
          : { color: '#ffffff', symbolColor: '#1a1a1a' };
      window.electronAPI.setTitleBarOverlay(overlayColors);
    };

    applyTheme(appSettings.theme);

    // Listen for system theme changes if using system preference
    if (appSettings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [appSettings.theme]);

  // Handle confirm before delete setting
  // When confirmBeforeDelete is false, immediately delete without dialog
  useEffect(() => {
    if (pendingDeletePartIds && !appSettings.confirmBeforeDelete) {
      // Skip confirmation, delete immediately
      confirmDeleteParts();
    }
  }, [pendingDeletePartIds, appSettings.confirmBeforeDelete, confirmDeleteParts]);

  // Modal state
  const [isStockLibraryOpen, setIsStockLibraryOpen] = useState(false);
  const [isAppSettingsOpen, setIsAppSettingsOpen] = useState(false);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);

  const {
    stocks: stockLibrary,
    addStock: addToLibrary,
    updateStock: updateLibraryStock,
    deleteStock: deleteLibraryStock
  } = useStockLibrary();

  const {
    assemblies: assemblyLibrary,
    updateAssembly: updateLibraryAssembly,
    deleteAssembly: deleteLibraryAssembly
  } = useAssemblyLibrary();

  // Native menu commands handler
  useMenuCommands({
    onOpenSettings: () => setIsAppSettingsOpen(true)
  });

  // Get names of parts pending deletion for the confirmation message
  const pendingDeletePartNames = pendingDeletePartIds
    ? parts.filter((p) => pendingDeletePartIds.includes(p.id)).map((p) => p.name)
    : [];

  return (
    <div className="app">
      <header className={`app-header ${platform ? `platform-${platform}` : ''}`}>
        <div className="header-left">
          <div className="header-title">
            <span className="app-name">Carvd Studio</span>
            <span className="title-separator">/</span>
            <span className="project-name">{projectName}{isDirty && <span className="dirty-indicator"> •</span>}</span>
          </div>
        </div>
        <div className="header-actions">
          <div className="header-actions-group">
            <UndoRedoButtons />
          </div>
          <div className="header-divider" />
          <div className="header-actions-group">
            <button
              className="btn btn-icon-sm btn-outlined btn-secondary"
              onClick={() => setIsStockLibraryOpen(true)}
              title="Stock Library"
            >
              <Library size={18} />
            </button>
            <button
              className="btn btn-icon-sm btn-outlined btn-secondary"
              onClick={() => setIsAppSettingsOpen(true)}
              title="App Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>
      {/* Assembly Editing Banner */}
      {isEditingAssembly && (
        <AssemblyEditingBanner
          assemblyName={editingAssemblyName}
          isCreatingNew={isCreatingNewAssembly}
          onSave={saveAssemblyAndExit}
          onCancel={requestAssemblyExit}
        />
      )}
      <main className="app-main">
        <Sidebar onOpenProjectSettings={() => setIsProjectSettingsOpen(true)} onOpenCutList={openCutListModal} />
        <CanvasWithDrop />
        <PropertiesPanel />
      </main>
      <ContextMenu />
      <SelectionBox />
      <Toast />
      <StockLibraryModal
        isOpen={isStockLibraryOpen}
        onClose={() => setIsStockLibraryOpen(false)}
        stocks={stockLibrary}
        onAddStock={addToLibrary}
        onUpdateStock={updateLibraryStock}
        onDeleteStock={deleteLibraryStock}
        assemblies={assemblyLibrary}
        onUpdateAssembly={updateLibraryAssembly}
        onDeleteAssembly={deleteLibraryAssembly}
        onEditAssemblyIn3D={startAssemblyEditing}
        onCreateNewAssembly={startCreatingNewAssembly}
      />

      {/* Delete Part(s) Confirmation - only shown when confirmBeforeDelete is enabled */}
      <ConfirmDialog
        isOpen={pendingDeletePartIds !== null && appSettings.confirmBeforeDelete}
        title={pendingDeletePartIds?.length === 1 ? 'Delete Part?' : 'Delete Parts?'}
        message={
          pendingDeletePartIds?.length === 1
            ? `Are you sure you want to delete "${pendingDeletePartNames[0]}"?`
            : `Are you sure you want to delete ${pendingDeletePartIds?.length} parts?`
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeleteParts}
        onCancel={cancelDeleteParts}
      />

      {/* License Activation Modal */}
      <LicenseActivationModal
        isOpen={showLicenseModal}
        onActivate={handleLicenseActivate}
      />

      {/* App Settings Modal */}
      <AppSettingsModal
        isOpen={isAppSettingsOpen}
        onClose={() => setIsAppSettingsOpen(false)}
        settings={appSettings}
        onUpdateSettings={updateAppSettings}
        licenseData={licenseData}
        onDeactivateLicense={handleLicenseDeactivate}
      />

      {/* Project Settings Modal */}
      <ProjectSettingsModal isOpen={isProjectSettingsOpen} onClose={() => setIsProjectSettingsOpen(false)} />

      {/* Save Assembly Modal */}
      <SaveAssemblyModalWrapper />

      {/* Cut List Modal */}
      <CutListModalWrapper />

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialogComponent />

      {/* Auto-Recovery Dialog */}
      <RecoveryDialog
        isOpen={hasRecovery}
        recoveryInfo={recoveryInfo}
        onRestore={restoreRecovery}
        onDiscard={discardRecovery}
      />

      {/* Import to Library Dialog */}
      <ImportToLibraryDialog
        isOpen={showImportDialog}
        missingStocks={missingStocks}
        missingAssemblies={missingAssemblies}
        onImport={handleLibraryImport}
        onSkip={handleLibraryImportSkip}
      />

      {/* Assembly Editing Exit Dialog */}
      <AssemblyEditingExitDialog
        isOpen={showAssemblyExitDialog}
        assemblyName={editingAssemblyName}
        isCreatingNew={isCreatingNewAssembly}
        onSave={saveAssemblyAndExit}
        onDiscard={discardAssemblyAndExit}
        onCancel={cancelAssemblyExit}
      />

      {/* Welcome Tutorial (first-run experience) */}
      {showTutorial && <WelcomeTutorial onComplete={handleTutorialComplete} />}
    </div>
  );
}

function SaveAssemblyModalWrapper() {
  const saveAssemblyModalOpen = useProjectStore((s) => s.saveAssemblyModalOpen);
  const closeSaveAssemblyModal = useProjectStore((s) => s.closeSaveAssemblyModal);
  const addAssembly = useProjectStore((s) => s.addAssembly);
  const { addAssembly: addToLibrary } = useAssemblyLibrary();

  const handleSave = (assembly: Assembly, addToLibrary_: boolean) => {
    // Add to project
    addAssembly(assembly);

    // Optionally add to app-level library
    if (addToLibrary_) {
      addToLibrary(assembly);
    }
  };

  return (
    <SaveAssemblyModal
      isOpen={saveAssemblyModalOpen}
      onClose={closeSaveAssemblyModal}
      onSave={handleSave}
    />
  );
}

function CutListModalWrapper() {
  const cutListModalOpen = useProjectStore((s) => s.cutListModalOpen);
  const closeCutListModal = useProjectStore((s) => s.closeCutListModal);

  return (
    <CutListModal
      isOpen={cutListModalOpen}
      onClose={closeCutListModal}
    />
  );
}

export default App;
