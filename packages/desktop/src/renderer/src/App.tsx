import { Canvas } from '@react-three/fiber';
import { ChevronDown, ChevronRight, Library, Redo2, Save, Search, Settings, Sun, Undo2, X } from 'lucide-react';
import { ColorPicker } from './components/common/ColorPicker';
import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { AddAssemblyModal } from './components/assembly/AddAssemblyModal';
import { AddStockModal } from './components/stock/AddStockModal';
import { StartScreen } from './components/project/StartScreen';
import { NewProjectDialog } from './components/project/NewProjectDialog';
import { AssemblyEditingBanner } from './components/assembly/AssemblyEditingBanner';
import { AssemblyEditingExitDialog } from './components/assembly/AssemblyEditingExitDialog';
import { TemplateEditingBanner } from './components/template/TemplateEditingBanner';
import {
  TemplateSetupDialog,
  TemplateSaveDialog,
  TemplateDiscardDialog
} from './components/template/TemplateEditingExitDialog';
import { UpdateNotificationBanner } from './components/update/UpdateNotificationBanner';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { ContextMenu } from './components/layout/ContextMenu';
import { EditStockModal } from './components/stock/EditStockModal';
import { useMenuCommands } from './hooks/useMenuCommands';
import { FractionInput } from './components/common/FractionInput';
import { HelpTooltip } from './components/common/HelpTooltip';
import { HierarchicalPartsList } from './components/parts-list/HierarchicalPartsList';
import { ImportToLibraryDialog } from './components/parts-list/ImportToLibraryDialog';
import { RecoveryDialog } from './components/project/RecoveryDialog';
import { Toast } from './components/common/Toast';
import { TrialBanner } from './components/licensing/TrialBanner';
import { TrialExpiredModal } from './components/licensing/TrialExpiredModal';
import { Workspace } from './components/workspace/Workspace';
import { STOCK_COLORS } from './constants';
import { logger } from './utils/logger';
import { getFeatureLimits } from './utils/featureLimits';
import { useAppSettings } from './hooks/useAppSettings';
import { useAutoRecovery } from './hooks/useAutoRecovery';
import { useAutoSave } from './hooks/useAutoSave';
import { useAssemblyEditing } from './hooks/useAssemblyEditing';
import { useAssemblyLibrary } from './hooks/useAssemblyLibrary';
import { useTemplateEditing } from './hooks/useTemplateEditing';
import { useEffectiveStockConstraints } from './hooks/useEffectiveStockConstraints';
import { useDevTools } from './hooks/useDevTools';
import { useFileOperations } from './hooks/useFileOperations';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useLibraryImportCheck } from './hooks/useLibraryImportCheck';
import { useLicenseStatus } from './hooks/useLicenseStatus';
import { useStockLibrary } from './hooks/useStockLibrary';
import { useProjectStore } from './store/projectStore';
import { useSelectionStore } from './store/selectionStore';
import { useUIStore } from './store/uiStore';
import { useCameraStore } from './store/cameraStore';
import { useSnapStore } from './store/snapStore';
import { useAssemblyEditingStore } from './store/assemblyEditingStore';
import { useClipboardStore } from './store/clipboardStore';
import { useLicenseStore } from './store/licenseStore';
import { Assembly, LightingMode, Project, Stock } from './types';
import { formatMeasurementWithUnit } from './utils/fractions';
import { getPartBounds } from './utils/snapToPartsUtil';
import { generateSeedProject } from './utils/seedData';

// Lazy-loaded modal components (deferred until first use)
const LazyAboutModal = React.lazy(() =>
  import('./components/settings/AboutModal').then((m) => ({ default: m.AboutModal }))
);
const LazyAppSettingsModal = React.lazy(() =>
  import('./components/settings/AppSettingsModal').then((m) => ({ default: m.AppSettingsModal }))
);
const LazyCutListModalWrapper = React.lazy(() =>
  import('./components/stock/CutListModalWrapper').then((m) => ({ default: m.CutListModalWrapper }))
);
const LazyImportAppStateModal = React.lazy(() =>
  import('./components/project/ImportAppStateModal').then((m) => ({ default: m.ImportAppStateModal }))
);
const LazyLicenseActivationModal = React.lazy(() =>
  import('./components/licensing/LicenseActivationModal').then((m) => ({
    default: m.LicenseActivationModal
  }))
);
const LazyProjectSettingsModal = React.lazy(() =>
  import('./components/project/ProjectSettingsModal').then((m) => ({ default: m.ProjectSettingsModal }))
);
const LazySaveAssemblyModalWrapper = React.lazy(() =>
  import('./components/assembly/SaveAssemblyModalWrapper').then((m) => ({
    default: m.SaveAssemblyModalWrapper
  }))
);
const LazyStockLibraryModal = React.lazy(() =>
  import('./components/stock/StockLibraryModal').then((m) => ({ default: m.StockLibraryModal }))
);
const LazyTemplateBrowserModal = React.lazy(() =>
  import('./components/template/TemplateBrowserModal').then((m) => ({ default: m.TemplateBrowserModal }))
);
const LazyTemplatesScreen = React.lazy(() =>
  import('./components/template/TemplatesScreen').then((m) => ({ default: m.TemplatesScreen }))
);
const LazyWelcomeTutorial = React.lazy(() =>
  import('./components/tutorial/WelcomeTutorial').then((m) => ({ default: m.WelcomeTutorial }))
);

// Selection box overlay (rendered outside Canvas for correct positioning)
function SelectionBox() {
  const selectionBox = useSelectionStore((s) => s.selectionBox);

  if (!selectionBox) return null;

  const { start, end } = selectionBox;
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return (
    <div
      className="fixed border border-dashed border-primary bg-primary-bg pointer-events-none z-[100]"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`
      }}
    />
  );
}

// Contextual hotkey hints bar
function HotkeyHints({ show }: { show: boolean }) {
  const selectedPartIds = useSelectionStore((s) => s.selectedPartIds);
  const selectedGroupIds = useSelectionStore((s) => s.selectedGroupIds);
  const clipboard = useClipboardStore((s) => s.clipboard);

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
  onCreateNewAssembly?: () => void;
  onShowLicenseModal?: () => void;
}

function Sidebar({ onOpenProjectSettings, onOpenCutList, onCreateNewAssembly, onShowLicenseModal }: SidebarProps) {
  const parts = useProjectStore((s) => s.parts);
  const projectStocks = useProjectStore((s) => s.stocks);
  const projectAssemblies = useProjectStore((s) => s.assemblies);
  const selectedPartIds = useSelectionStore((s) => s.selectedPartIds);
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
  const duplicatePart = useProjectStore((s) => s.duplicatePart);
  const showToast = useUIStore((s) => s.showToast);
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

  // Collapsed sections state (assemblies collapsed by default, stock open)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    stock: false,
    assemblies: true
  });
  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

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
            className={`btn btn-icon-sm btn-ghost btn-secondary ${searchOpen.stock ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleSearch('stock');
            }}
            title="Search"
          >
            <Search size={12} />
          </button>
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
        {searchOpen.stock && (
          <div className="section-search">
            <input
              type="text"
              placeholder="Search stock..."
              value={searchTerms.stock || ''}
              onChange={(e) => setSearchTerms((t) => ({ ...t, stock: e.target.value }))}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
            {searchTerms.stock && (
              <button
                className="section-search-clear"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchTerms((t) => ({ ...t, stock: '' }));
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}
        <div className="section-content">
          <div className="section-content-inner">
            {stocks.length === 0 ? (
              <p className="text-text-muted text-xs italic">
                {isEditingAssembly ? 'No stock in library. Click + to create.' : 'No stock yet. Click + to add.'}
              </p>
            ) : (
              <ul className="list-none m-0 mx-[-12px] flex-1 overflow-y-auto min-h-0">
                {stocks
                  .filter(
                    (stock) => !searchTerms.stock || stock.name.toLowerCase().includes(searchTerms.stock.toLowerCase())
                  )
                  .map((stock) => {
                    const partCount = parts.filter((p) => p.stockId === stock.id).length;
                    return (
                      <li
                        key={stock.id}
                        className="group/stock flex items-center gap-2 py-2 px-3 cursor-grab transition-colors duration-100 select-none hover:bg-surface-hover active:cursor-grabbing"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/carvd-stock', stock.id);
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        title={`Drag onto canvas to create part\n${formatMeasurementWithUnit(stock.length, units)} × ${formatMeasurementWithUnit(stock.width, units)} × ${formatMeasurementWithUnit(stock.thickness, units)}${!isEditingAssembly ? `\n${partCount} part${partCount !== 1 ? 's' : ''} assigned` : ''}`}
                      >
                        <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: stock.color }} />
                        <span className="flex-1 text-xs truncate">{stock.name}</span>
                        {!isEditingAssembly && partCount > 0 && (
                          <span className="text-[10px] bg-border text-text py-px px-1.5 rounded-full min-w-4 text-center">
                            {partCount}
                          </span>
                        )}
                        <span className="text-[10px] text-text-muted">
                          {formatMeasurementWithUnit(stock.thickness, units)}
                        </span>
                        <div className="flex gap-0.5 opacity-0 group-hover/stock:opacity-100 transition-opacity duration-100">
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
          <button
            className={`btn btn-icon-sm btn-ghost btn-secondary ${searchOpen.assemblies ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleSearch('assemblies');
            }}
            title="Search"
          >
            <Search size={12} />
          </button>
          {canUseAssemblies &&
            (isEditingAssembly ? (
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
            ))}
        </div>
        {searchOpen.assemblies && (
          <div className="section-search">
            <input
              type="text"
              placeholder="Search assemblies..."
              value={searchTerms.assemblies || ''}
              onChange={(e) => setSearchTerms((t) => ({ ...t, assemblies: e.target.value }))}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
            {searchTerms.assemblies && (
              <button
                className="section-search-clear"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchTerms((t) => ({ ...t, assemblies: '' }));
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}
        <div className="section-content">
          <div className="section-content-inner">
            {!canUseAssemblies ? (
              <p className="text-text-muted text-xs italic">
                Assemblies require a license.{' '}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onShowLicenseModal?.();
                  }}
                >
                  Upgrade
                </a>
              </p>
            ) : assemblies.length === 0 ? (
              <p className="text-text-muted text-xs italic">
                {isEditingAssembly
                  ? 'No assemblies in library yet.'
                  : 'No assemblies yet. Click + to add from library.'}
              </p>
            ) : (
              <ul className="list-none m-0 mx-[-12px] flex-1 overflow-y-auto min-h-0">
                {assemblies
                  .filter(
                    (assembly) =>
                      !searchTerms.assemblies ||
                      assembly.name.toLowerCase().includes(searchTerms.assemblies.toLowerCase())
                  )
                  .map((assembly) => (
                    <li
                      key={assembly.id}
                      className="flex items-center gap-2 py-2 px-3 cursor-grab transition-colors duration-100 select-none hover:bg-surface-hover active:cursor-grabbing"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/carvd-assembly', assembly.id);
                        e.dataTransfer.setData(
                          'application/carvd-assembly-source',
                          isEditingAssembly ? 'library' : 'project'
                        );
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      title={`Drag onto canvas to place\n${assembly.parts.length} part${assembly.parts.length !== 1 ? 's' : ''}${assembly.description ? `\n${assembly.description}` : ''}`}
                    >
                      {assembly.thumbnailData ? (
                        <img
                          src={`data:image/png;base64,${assembly.thumbnailData.data}`}
                          alt=""
                          className="w-8 h-6 object-cover rounded-sm shrink-0 bg-bg-tertiary"
                        />
                      ) : (
                        <span className="text-sm shrink-0">{assembly.thumbnail || '📦'}</span>
                      )}
                      <span className="flex-1 text-xs truncate">{assembly.name}</span>
                      <span className="text-[10px] bg-border text-text py-px px-1.5 rounded-full min-w-4 text-center">
                        {assembly.parts.length}
                      </span>
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
            className={`btn btn-icon-sm btn-ghost btn-secondary ${searchOpen.parts ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleSearch('parts');
            }}
            title="Search"
          >
            <Search size={12} />
          </button>
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
        {searchOpen.parts && (
          <div className="section-search">
            <input
              type="text"
              placeholder="Search parts..."
              value={searchTerms.parts || ''}
              onChange={(e) => setSearchTerms((t) => ({ ...t, parts: e.target.value }))}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
            {searchTerms.parts && (
              <button
                className="section-search-clear"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchTerms((t) => ({ ...t, parts: '' }));
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}
        <div className="section-content">
          <div className="section-content-inner">
            <HierarchicalPartsList
              onPartClick={handlePartClick}
              searchFilter={searchTerms.parts}
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
        onCreateNew={onCreateNewAssembly}
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
  const isEditingAssembly = useAssemblyEditingStore((s) => s.isEditingAssembly);
  const selectedPartIds = useSelectionStore((s) => s.selectedPartIds);
  const selectedGroupIds = useSelectionStore((s) => s.selectedGroupIds);
  const groups = useProjectStore((s) => s.groups);
  const units = useProjectStore((s) => s.units);
  const updatePart = useProjectStore((s) => s.updatePart);
  const renameGroup = useProjectStore((s) => s.renameGroup);
  const requestDeleteParts = useUIStore((s) => s.requestDeleteParts);
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
  const getConstraintWarnings = (part: (typeof parts)[0]): string[] => {
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
        warnings.push(
          `Part dimensions (${formatMeasurementWithUnit(partLength, units)} × ${formatMeasurementWithUnit(partWidth, units)}) exceed stock (${formatMeasurementWithUnit(stock.length, units)} × ${formatMeasurementWithUnit(stock.width, units)})`
        );
      }
    }

    // Check thickness
    if (part.thickness > stock.thickness) {
      warnings.push(
        `Part thickness (${formatMeasurementWithUnit(part.thickness, units)}) exceeds stock (${formatMeasurementWithUnit(stock.thickness, units)})`
      );
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
  const getPartAABB = (part: (typeof parts)[0]) => {
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
      a.minX < b.maxX - epsilon &&
      a.maxX > b.minX + epsilon &&
      a.minY < b.maxY - epsilon &&
      a.maxY > b.minY + epsilon &&
      a.minZ < b.maxZ - epsilon &&
      a.maxZ > b.minZ + epsilon
    );
  };

  // Check for overlapping parts (always check, regardless of setting)
  // Returns empty array if the part has ignoreOverlap flag set
  const getOverlappingParts = (part: (typeof parts)[0]): string[] => {
    // Skip overlap checking if the part has ignoreOverlap flag
    if (part.ignoreOverlap) {
      return [];
    }

    const overlapping: string[] = [];
    const partAABB = getPartAABB(part);

    for (const other of parts) {
      if (other.id === part.id) continue;
      // Skip parts that have ignoreOverlap flag set
      if (other.ignoreOverlap) continue;
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
        <p className="text-text-muted text-xs italic">Select a part or group to edit properties</p>
        <p className="text-[11px] text-text-muted mt-1">Shift+click to select multiple, {modKey}+drag for box select</p>
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
            <p className="text-sm mb-3 text-text">
              {memberCount} member{memberCount !== 1 ? 's' : ''}
            </p>
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
          <p className="text-[11px] text-text-muted mt-1">
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
        <p className="text-sm mb-3 text-text">{selectedGroupIds.length} groups selected</p>
        <p className="text-[11px] text-text-muted mt-1">
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
        <p className="text-sm mb-3 text-text">
          {selectedPartIds.length} part{selectedPartIds.length !== 1 ? 's' : ''}, {selectedGroupIds.length} group
          {selectedGroupIds.length !== 1 ? 's' : ''} selected
        </p>
        <p className="text-[11px] text-text-muted mt-1">
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
        <p className="text-sm mb-3 text-text">{selectedPartIds.length} parts selected</p>

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
        </div>

        <div className="property-group btn-group">
          <button className="btn btn-sm btn-filled btn-secondary" onClick={duplicateSelectedParts}>
            Duplicate All
          </button>
          <button className="btn btn-sm btn-filled btn-danger" onClick={() => requestDeleteParts(selectedPartIds)}>
            Delete All
          </button>
        </div>

        {/* Create Stock Modal for assignment */}
        <EditStockModal
          isOpen={isCreateStockModalOpen}
          onClose={() => setIsCreateStockModalOpen(false)}
          stock={null}
          onUpdateStock={handleCreateStockAndAssign}
          createMode={true}
          defaultDimensions={
            selectedParts[0]
              ? {
                  length: selectedParts[0].length,
                  width: selectedParts[0].width,
                  thickness: selectedParts[0].thickness
                }
              : undefined
          }
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
        <p className="text-text-muted text-xs italic">Select a part to edit properties</p>
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
        <div className="dimension-inputs flex items-center gap-1">
          <FractionInput
            key={`${selectedPart.id}-length`}
            value={selectedPart.length}
            onChange={handleLengthChange}
            min={0.5}
          />
          <span>×</span>
          <FractionInput
            key={`${selectedPart.id}-width`}
            value={selectedPart.width}
            onChange={handleWidthChange}
            min={0.5}
          />
          <span>×</span>
          <FractionInput
            key={`${selectedPart.id}-thickness`}
            value={selectedPart.thickness}
            onChange={handleThicknessChange}
            min={0.25}
          />
        </div>
        {isDimensionConstrained && assignedStock && (
          <p className="text-[11px] text-text-muted mt-1">
            Max: {formatMeasurementWithUnit(assignedStock.length, units)} ×{' '}
            {formatMeasurementWithUnit(assignedStock.width, units)} ×{' '}
            {formatMeasurementWithUnit(assignedStock.thickness, units)} (from {assignedStock.name})
          </p>
        )}
      </div>

      <details className="property-group collapsible-section">
        <summary>
          Position (X, Y, Z)
          <HelpTooltip
            text="Use arrow keys to nudge selected parts. Hold Shift for 1 inch increments."
            docsSection="shortcuts"
            inline
          />
        </summary>
        <div className="collapsible-content">
          <div className="flex items-center gap-1">
            <FractionInput
              key={`${selectedPart.id}-posX`}
              value={selectedPart.position.x}
              onChange={handlePositionXChange}
            />
            <span>,</span>
            <FractionInput
              key={`${selectedPart.id}-posY`}
              value={selectedPart.position.y}
              onChange={handlePositionYChange}
            />
            <span>,</span>
            <FractionInput
              key={`${selectedPart.id}-posZ`}
              value={selectedPart.position.z}
              onChange={handlePositionZChange}
            />
          </div>
        </div>
      </details>

      <div className="property-group">
        <div className="flex items-center gap-1">
          <label>Stock</label>
          <HelpTooltip
            text="Assign a stock material to this part. Color and grain direction are inherited from the assigned stock."
            docsSection="stock"
          />
        </div>
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
        {(() => {
          const warnings = getConstraintWarnings(selectedPart);
          if (warnings.length === 0) return null;
          return (
            <div className="mt-2 mb-2 p-2 bg-warning-bg border border-warning rounded">
              {warnings.map((warning, index) => (
                <p key={index} className="text-[11px] text-warning m-0 py-0.5 leading-snug before:content-['⚠\_']">
                  {warning}
                </p>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Overlap warnings and settings */}
      {(() => {
        const overlapping = getOverlappingParts(selectedPart);
        return (
          <div className="property-group">
            {overlapping.length > 0 && !selectedPart.ignoreOverlap && (
              <div className="mt-2 mb-2 p-2 bg-warning-bg border border-warning rounded">
                <p className="text-[11px] text-warning m-0 py-0.5 leading-snug before:content-['⚠\_']">
                  Overlaps with: {overlapping.join(', ')}
                </p>
              </div>
            )}
            <label>
              <input
                type="checkbox"
                checked={selectedPart.ignoreOverlap || false}
                onChange={(e) => updatePart(selectedPart.id, { ignoreOverlap: e.target.checked })}
              />{' '}
              Allow Overlap
              <HelpTooltip
                text="If checked, this part can overlap with other parts without showing warnings. Useful for intentional overlaps like notched shelves."
                docsSection="parts"
                inline
              />
            </label>
          </div>
        );
      })()}

      <div className="property-group">
        <div className="flex items-center gap-1">
          <label>Color</label>
          {isColorConstrained && (
            <HelpTooltip
              text={`Color is locked to the assigned stock (${assignedStock?.name}). Disable "Constrain Color" in Project Settings to customize.`}
              docsSection="settings"
            />
          )}
        </div>
        {isColorConstrained ? (
          <input type="color" value={selectedPart.color} disabled />
        ) : (
          <ColorPicker value={selectedPart.color} onChange={(color) => updatePart(selectedPart.id, { color })} />
        )}
      </div>

      <div className="property-group">
        <div className="flex items-center gap-1">
          <label>Grain Direction</label>
          <HelpTooltip
            text={
              isGrainConstrained
                ? `Locked by stock grain constraint (${assignedStock?.name}). Disable "Constrain Grain" in Project Settings to customize.`
                : 'Controls whether the part can be rotated during cut list optimization to maximize material usage.'
            }
            docsSection="cut-lists"
          />
        </div>
        <select
          value={selectedPart.grainSensitive ? selectedPart.grainDirection : 'none'}
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'none') {
              updatePart(selectedPart.id, { grainSensitive: false });
            } else {
              updatePart(selectedPart.id, {
                grainSensitive: true,
                grainDirection: value as 'length' | 'width'
              });
            }
          }}
          disabled={isGrainConstrained}
          className={isGrainConstrained ? 'disabled' : ''}
        >
          <option value="length">Along Length ({formatMeasurementWithUnit(selectedPart.length, units)})</option>
          <option value="width">Along Width ({formatMeasurementWithUnit(selectedPart.width, units)})</option>
          <option value="none">N/A (can rotate)</option>
        </select>
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
            <HelpTooltip
              text="Wide panel made by edge-gluing multiple narrower boards. The cut list will calculate how many boards are needed."
              docsSection="cut-lists"
              inline
            />
          </label>
          {selectedPart.glueUpPanel &&
            (() => {
              const cutWidth = selectedPart.width + (selectedPart.extraWidth || 0);
              const boardsNeeded = Math.ceil(cutWidth / assignedStock.width);
              return (
                <p className="text-[11px] text-text-muted mt-1">
                  Requires {boardsNeeded} board{boardsNeeded !== 1 ? 's' : ''} of {assignedStock.name}
                </p>
              );
            })()}
        </div>
      )}

      <details className="property-group collapsible-section">
        <summary>
          Notes
          {selectedPart.notes && <span className="has-content-indicator">●</span>}
        </summary>
        <div className="collapsible-content">
          <textarea
            className="part-notes-textarea"
            value={selectedPart.notes || ''}
            onChange={(e) => updatePart(selectedPart.id, { notes: e.target.value })}
            placeholder="Fabrication notes (edge banding, joinery, etc.)"
            rows={3}
          />
        </div>
      </details>

      <details className="property-group joinery-adjustments">
        <summary>
          Joinery Adjustments
          {(selectedPart.extraLength || selectedPart.extraWidth) && <span className="joinery-indicator">●</span>}
          <HelpTooltip
            text="Add extra material for joinery (tenons, dado insertions, etc.). These values affect the cut list dimensions but not the 3D visualization."
            docsSection="joinery"
            inline
          />
        </summary>
        <div className="joinery-inputs">
          <div className="joinery-input-row">
            <label>Extra Length</label>
            <FractionInput
              key={`${selectedPart.id}-extraLength`}
              value={selectedPart.extraLength || 0}
              onChange={(extraLength) => updatePart(selectedPart.id, { extraLength: extraLength || undefined })}
              min={0}
            />
          </div>
          <div className="joinery-input-row">
            <label>Extra Width</label>
            <FractionInput
              key={`${selectedPart.id}-extraWidth`}
              value={selectedPart.extraWidth || 0}
              onChange={(extraWidth) => updatePart(selectedPart.id, { extraWidth: extraWidth || undefined })}
              min={0}
            />
          </div>
        </div>
      </details>

      <div className="property-group properties-learn-more">
        <a
          href="#"
          className="text-accent no-underline text-xs hover:underline hover:text-accent-hover transition-colors duration-150"
          onClick={(e) => {
            e.preventDefault();
            window.electronAPI?.openExternal?.('https://carvd-studio.com/docs#parts');
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

interface BrightnessPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

function BrightnessPopup({ isOpen, onClose }: BrightnessPopupProps) {
  const { settings, updateSettings } = useAppSettings();
  const brightness = settings.brightnessMultiplier ?? 1.0;
  const lightingMode = settings.lightingMode ?? 'default';
  const popupRef = useRef<HTMLDivElement>(null);

  const presets: { key: LightingMode; label: string }[] = [
    { key: 'default', label: 'Default' },
    { key: 'bright', label: 'Bright' },
    { key: 'studio', label: 'Studio' },
    { key: 'dramatic', label: 'Dramatic' }
  ];

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Delay to avoid catching the opening click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-surface border border-border rounded-lg p-3 min-w-[200px] z-[100] shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
      ref={popupRef}
    >
      <div className="flex items-center gap-2.5">
        <Sun size={14} className="text-text-muted shrink-0" />
        <input
          type="range"
          min={0.25}
          max={2.0}
          step={0.05}
          value={brightness}
          onChange={(e) => updateSettings({ brightnessMultiplier: parseFloat(e.target.value) })}
          className="flex-1 h-1 appearance-none bg-border rounded-sm cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <span className="text-xs text-text-muted min-w-10 text-right">{Math.round(brightness * 100)}%</span>
      </div>
      <div className="h-px bg-border my-2.5" />
      <div className="flex gap-1.5">
        {presets.map((p) => (
          <button
            key={p.key}
            className={`flex-1 py-1.5 px-2 text-[11px] rounded bg-bg border border-border text-text-muted cursor-pointer transition-all duration-100 hover:bg-surface-hover hover:text-text ${lightingMode === p.key ? '!bg-accent !text-bg !border-accent' : ''}`}
            onClick={() => updateSettings({ lightingMode: p.key })}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DisplayToolbar() {
  const displayMode = useCameraStore((s) => s.displayMode);
  const showGrid = useCameraStore((s) => s.showGrid);
  const showGrainDirection = useCameraStore((s) => s.showGrainDirection);
  const snapToPartsEnabled = useSnapStore((s) => s.snapToPartsEnabled);
  const referencePartIds = useSnapStore((s) => s.referencePartIds);
  const setDisplayMode = useCameraStore((s) => s.setDisplayMode);
  const setShowGrid = useCameraStore((s) => s.setShowGrid);
  const toggleGrainDirection = useCameraStore((s) => s.toggleGrainDirection);
  const setSnapToPartsEnabled = useSnapStore((s) => s.setSnapToPartsEnabled);
  const clearReferences = useSnapStore((s) => s.clearReferences);
  const [brightnessOpen, setBrightnessOpen] = useState(false);

  const toolbarBtn =
    'py-1.5 px-2.5 text-xs rounded bg-transparent border-none text-text-muted cursor-pointer transition-all duration-100 hover:bg-surface-hover hover:text-text';
  const activeBtn = `${toolbarBtn} !bg-bg !text-text`;
  const toggleActiveBtn = `${toolbarBtn} !bg-accent !text-bg`;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-surface border border-border rounded-md p-1 z-10">
      <div className="flex items-center gap-0.5">
        <button
          className={displayMode === 'solid' ? activeBtn : toolbarBtn}
          onClick={() => setDisplayMode('solid')}
          title="Solid view"
        >
          Solid
        </button>
        <button
          className={displayMode === 'wireframe' ? activeBtn : toolbarBtn}
          onClick={() => setDisplayMode('wireframe')}
          title="Wireframe view"
        >
          Wire
        </button>
        <button
          className={displayMode === 'translucent' ? activeBtn : toolbarBtn}
          onClick={() => setDisplayMode('translucent')}
          title="Translucent view"
        >
          Ghost
        </button>
      </div>
      <div className="w-px h-6 bg-border mx-1" />
      <div className="flex items-center gap-0.5 relative">
        <button
          className={brightnessOpen ? toggleActiveBtn : toolbarBtn}
          onClick={() => setBrightnessOpen(!brightnessOpen)}
          title="Adjust lighting"
        >
          <Sun size={14} />
        </button>
        <BrightnessPopup isOpen={brightnessOpen} onClose={() => setBrightnessOpen(false)} />
      </div>
      <div className="w-px h-6 bg-border mx-1" />
      <div className="flex items-center gap-0.5">
        <button
          className={showGrid ? toggleActiveBtn : toolbarBtn}
          onClick={() => setShowGrid(!showGrid)}
          title="Toggle grid"
        >
          Grid
        </button>
        <button
          className={showGrainDirection ? toggleActiveBtn : toolbarBtn}
          onClick={toggleGrainDirection}
          title="Toggle grain direction arrows"
        >
          Grain
        </button>
        <button
          className={snapToPartsEnabled ? toggleActiveBtn : toolbarBtn}
          onClick={() => setSnapToPartsEnabled(!snapToPartsEnabled)}
          title="Snap to parts (align edges and centers)"
        >
          Snap
        </button>
        {referencePartIds.length > 0 && (
          <button
            className="py-1.5 px-2.5 text-xs rounded bg-reference-bg text-primary border border-primary font-medium cursor-pointer transition-all duration-100 hover:bg-primary-bg"
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
  // Only UI state is reactive — project data is read imperatively in handleDrop
  // to avoid re-rendering the Canvas tree when stocks/parts/assemblies change
  const partsCount = useProjectStore((s) => s.parts.length);
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

    // Read project state imperatively at drop time
    const projectState = useProjectStore.getState();
    const { stocks: projectStocks, parts, assemblies } = projectState;

    // Check for stock drop
    const stockId = e.dataTransfer.getData('application/carvd-stock');
    if (stockId) {
      // Look for stock in both project stocks and library (for assembly editing mode)
      let stock = projectStocks.find((s) => s.id === stockId);
      if (!stock) {
        stock = stockLibrary.find((s) => s.id === stockId);
      }
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
      projectState.addPart({
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
          projectState.addAssembly(assembly);
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

      projectState.placeAssembly(assembly.id, position, stockLibrary);
    }
  };

  return (
    <div
      className={`canvas-container ${isDragOver ? 'outline-2 outline-dashed outline-accent -outline-offset-2' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Canvas
        camera={{ position: [60, 50, 60], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
          stencil: false
        }}
      >
        <Workspace />
      </Canvas>
      <DisplayToolbar />
      <HotkeyHints show={appSettings.showHotkeyHints} />
      {appSettings.showHotkeyHints && (
        <div className="absolute bottom-3 left-3 flex flex-col gap-1 py-2 px-2.5 bg-surface opacity-70 hover:opacity-95 border border-border rounded-md backdrop-blur-[4px] z-50 pointer-events-none [&_kbd]:inline-block [&_kbd]:min-w-10 [&_kbd]:py-px [&_kbd]:px-1 [&_kbd]:bg-bg [&_kbd]:border [&_kbd]:border-border [&_kbd]:rounded-sm [&_kbd]:font-mono [&_kbd]:text-[9px] [&_kbd]:text-text [&_kbd]:text-center">
          <div className="flex items-center gap-2 text-[10px] text-text-muted whitespace-nowrap">
            <kbd>LMB</kbd> Orbit
          </div>
          <div className="flex items-center gap-2 text-[10px] text-text-muted whitespace-nowrap">
            <kbd>RMB</kbd> Pan
          </div>
          <div className="flex items-center gap-2 text-[10px] text-text-muted whitespace-nowrap">
            <kbd>Scroll</kbd> Zoom
          </div>
          <div className="flex items-center gap-2 text-[10px] text-text-muted whitespace-nowrap">
            <kbd>F</kbd> Focus
          </div>
        </div>
      )}
      {isDragOver && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-bg-dark py-4 px-8 rounded-lg text-base font-medium pointer-events-none z-[100]">
          <span>{dropType === 'assembly' ? 'Drop to place assembly' : 'Drop to create part'}</span>
        </div>
      )}
      {/* Empty state overlay - rendered outside Canvas so it doesn't move with camera */}
      {partsCount === 0 && (
        <div className="empty-state-overlay absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 text-center">
          <div className="bg-bg border border-border rounded-lg py-8 px-10 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <div className="text-5xl mb-4">🛠️</div>
            <h2 className="text-xl font-semibold text-text m-0 mb-2">Start Building</h2>
            <p className="text-sm text-text-muted m-0 mb-5 max-w-80 leading-relaxed">
              Add parts to your design to get started. You can create parts from the sidebar or drag stock materials
              onto the canvas.
            </p>
            <div className="flex flex-col gap-2 items-center">
              <div className="flex items-center gap-2 text-[13px] text-text-muted">
                <kbd className="bg-bg-dark border border-border rounded-sm py-0.5 px-2 font-sans text-xs text-text">
                  P
                </kbd>
                <span>Add new part</span>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-text-muted">
                <span className="text-xs text-text-muted">Drag stock →</span>
                <span>Create part from stock</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  useKeyboardShortcuts();
  useDevTools(); // Dev tools for testing (only active in dev mode)

  // Auto-recovery for crash protection
  const { hasRecovery, recoveryInfo, restoreRecovery, discardRecovery } = useAutoRecovery();

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

  // Start screen state (defined early so it can be used in template editing callbacks)
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [showTemplatesScreen, setShowTemplatesScreen] = useState(false);

  // Template editing mode
  const {
    isEditingTemplate,
    editingTemplateName,
    editingTemplateDescription,
    isCreatingNewTemplate,
    showSaveDialog: showTemplateSaveDialog,
    showDiscardDialog: showTemplateDiscardDialog,
    showNewTemplateSetupDialog,
    startEditing: startTemplateEditing,
    startCreatingNew: startCreatingNewTemplate,
    confirmNewTemplateSetup,
    cancelNewTemplateSetup,
    openSaveDialog: openTemplateSaveDialog,
    saveTemplate: saveTemplateDirectly,
    saveAndExit: saveTemplateAndExit,
    requestDiscard: requestTemplateDiscard,
    discardAndExit: discardTemplateAndExit,
    cancelDialog: cancelTemplateDialog
  } = useTemplateEditing({
    onSaveComplete: () => {
      // After saving a template, return to the templates screen
      setShowTemplatesScreen(true);
      setShowStartScreen(false);
    },
    onDiscardComplete: () => {
      // After discarding, return to the templates screen
      setShowTemplatesScreen(true);
      setShowStartScreen(false);
    }
  });

  // File operations - now after editing hooks so we can route save commands appropriately
  const {
    UnsavedChangesDialogComponent,
    FileRecoveryModalComponent,
    handleNew,
    handleOpen,
    handleOpenRecent,
    handleRelocateFile,
    handleSave,
    handleGoHome
  } = useFileOperations({
    isEditingTemplate,
    onSaveTemplate: saveTemplateDirectly,
    isEditingAssembly,
    onSaveAssembly: saveAssemblyAndExit,
    onGoHome: () => {
      newProject(); // Reset project state to clear isDirty flag
      setShowStartScreen(true);
    }
  });

  // Auto-save - saves project automatically when changes are made (if enabled in settings)
  useAutoSave({
    onInitialSaveNeeded: handleSave,
    blocked: isEditingTemplate || isEditingAssembly || showStartScreen
  });

  // Platform detection for custom title bar
  const [platform, setPlatform] = useState<string>('');
  useEffect(() => {
    window.electronAPI.getPlatform().then(setPlatform);
  }, []);

  // Trial and license status
  const {
    mode: licenseMode,
    hasFullAccess,
    trial: trialStatus,
    shouldShowBanner: shouldShowTrialBanner,
    shouldShowExpiredModal,
    acknowledgeExpired,
    refresh: refreshLicenseStatus,
    isLoading: isLicenseLoading
  } = useLicenseStatus();

  // Sync license mode to project store for feature limit enforcement
  const setStoreLicenseMode = useLicenseStore((s) => s.setLicenseMode);
  useEffect(() => {
    setStoreLicenseMode(licenseMode);
  }, [licenseMode, setStoreLicenseMode]);

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

  // Check license on app start - now integrates with trial system
  useEffect(() => {
    const checkLicense = async () => {
      try {
        const result = await window.electronAPI.checkLicenseValid();
        const data = await window.electronAPI.getLicenseData();

        if (data) {
          setLicenseData({
            licenseEmail: data.email || null,
            licenseOrderId: data.orderId?.toString() || null,
            licenseActivatedAt: data.validatedAt ? new Date(data.validatedAt).toISOString() : null
          });
        } else {
          setLicenseData({
            licenseEmail: null,
            licenseOrderId: null,
            licenseActivatedAt: null
          });
        }

        if (result.valid) {
          setIsLicenseValid(true);
          setShowLicenseModal(false);
        } else {
          setIsLicenseValid(false);
          // Don't show license modal immediately - let trial system handle it
          // Only show if trial is expired and user explicitly wants to activate
          setShowLicenseModal(false);
        }
      } catch (error) {
        logger.error('Failed to check license:', error);
        setIsLicenseValid(false);
        // On error, also let trial system handle the flow
        setShowLicenseModal(false);
      }
    };

    checkLicense();
  }, []);

  // Welcome tutorial management
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialFromTemplate, setTutorialFromTemplate] = useState(false);
  const loadProject = useProjectStore((s) => s.loadProject);
  const newProject = useProjectStore((s) => s.newProject);

  // New project dialog state
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);

  // Check if welcome tutorial should be shown on first run
  useEffect(() => {
    const checkWelcome = async () => {
      try {
        const hasCompletedWelcome = await window.electronAPI.getHasCompletedWelcome();
        // Show tutorial if user has full access (licensed or trial) and hasn't completed it
        if (!hasCompletedWelcome && hasFullAccess) {
          // Load sample project for tutorial
          const sampleProject = generateSeedProject();
          loadProject(sampleProject);
          setShowTutorial(true);
          setShowStartScreen(false); // Hide start screen during tutorial
        }
      } catch (error) {
        logger.error('Failed to check welcome status:', error);
      }
    };

    // Only check after license/trial status is loaded
    if (!isLicenseLoading) {
      checkWelcome();
    }
  }, [isLicenseLoading, hasFullAccess, loadProject]);

  const handleTutorialComplete = async () => {
    setShowTutorial(false);

    // If tutorial was started from template, keep the user in the editor with their project
    if (tutorialFromTemplate) {
      setTutorialFromTemplate(false); // Reset the flag
      // Don't show start screen, let user continue editing the tutorial project
    } else {
      // First-run tutorial: show start screen for user to choose what to do
      setShowStartScreen(true);
      // Reset the project to empty state
      const now = new Date().toISOString();
      const emptyProject: Project = {
        version: '1',
        name: 'Untitled Project',
        units: 'imperial',
        gridSize: 1,
        parts: [],
        stocks: [],
        assemblies: [],
        groups: [],
        groupMembers: [],
        createdAt: now,
        modifiedAt: now
      };
      loadProject(emptyProject);
    }

    try {
      await window.electronAPI.setHasCompletedWelcome(true);
    } catch (error) {
      logger.error('Failed to save welcome completion:', error);
    }
  };

  // Track project file path to auto-hide start screen when a project is loaded
  const filePath = useProjectStore((s) => s.filePath);

  // Hide start screen when a project is loaded from file
  useEffect(() => {
    if (filePath && showStartScreen) {
      setShowStartScreen(false);
    }
  }, [filePath, showStartScreen]);

  // Start screen handlers
  const handleStartScreenNewProject = () => {
    setShowNewProjectDialog(true);
  };

  const handleStartScreenSelectTemplate = (project: Project) => {
    loadProject(project);
    markDirty(); // Mark as dirty since it's a new unsaved project
    setShowStartScreen(false);
  };

  const handleStartScreenStartTutorial = (project: Project) => {
    loadProject(project);
    markDirty(); // Mark as dirty since it's a new unsaved project
    setShowStartScreen(false);
    setTutorialFromTemplate(true); // Track that this tutorial was started from template
    setShowTutorial(true); // Show the tutorial overlay
  };

  const handleStartScreenOpenProject = async () => {
    // The handleOpen function will load the project into the store
    // and the useEffect above will hide the start screen when projectFilePath is set
    await handleOpen();
  };

  const handleStartScreenOpenRecent = async (filePath: string) => {
    // The handleOpenRecent function will load the project into the store
    // and the useEffect above will hide the start screen when projectFilePath is set
    await handleOpenRecent(filePath);
  };

  const handleStartScreenViewAllTemplates = () => {
    setShowTemplatesScreen(true);
  };

  // Templates Screen handlers
  const handleTemplatesScreenBack = () => {
    setShowTemplatesScreen(false);
  };

  const handleTemplatesScreenSelectTemplate = (project: Project) => {
    loadProject(project);
    markDirty();
    setShowTemplatesScreen(false);
    setShowStartScreen(false);
  };

  const handleTemplatesScreenStartTutorial = (project: Project) => {
    loadProject(project);
    markDirty();
    setShowTemplatesScreen(false);
    setShowStartScreen(false);
    setTutorialFromTemplate(true);
    setShowTutorial(true);
  };

  const handleTemplatesScreenEditTemplate = async (template: import('./templates').UserTemplate) => {
    const success = await startTemplateEditing(template);
    if (success) {
      setShowTemplatesScreen(false);
      setShowStartScreen(false);
    }
  };

  const handleTemplatesScreenNewTemplate = async () => {
    const success = await startCreatingNewTemplate();
    if (success) {
      setShowTemplatesScreen(false);
      setShowStartScreen(false);
    }
  };

  // Handle recovery restore - need to hide start screen after successful restore
  const handleRecoveryRestore = async () => {
    const success = await restoreRecovery();
    if (success) {
      setShowStartScreen(false);
    }
  };

  const handleNewProjectDialogCreate = (options: {
    name: string;
    units: 'imperial' | 'metric';
    selectedMaterials: string[];
  }) => {
    // Create a new project with the selected options
    const now = new Date().toISOString();

    // Get default stocks for the selected materials
    const defaultStocks = getDefaultStocksForMaterials(options.selectedMaterials, options.units);

    const newProject: Project = {
      version: '1',
      name: options.name,
      units: options.units,
      gridSize: options.units === 'imperial' ? 1 : 25, // 1 inch or 25mm
      parts: [],
      stocks: defaultStocks,
      assemblies: [],
      groups: [],
      groupMembers: [],
      createdAt: now,
      modifiedAt: now
    };

    loadProject(newProject);
    markDirty(); // Mark as dirty since it's a new unsaved project
    setShowNewProjectDialog(false);
    setShowStartScreen(false);
  };

  const handleNewProjectCancel = () => {
    setShowNewProjectDialog(false);
  };

  // Helper function to get default stocks for selected materials
  const getDefaultStocksForMaterials = (materialIds: string[], units: 'imperial' | 'metric'): Stock[] => {
    // Default stock definitions (same as in NewProjectDialog)
    const defaultStockDefinitions: Record<string, Omit<Stock, 'id'>> = {
      'default-plywood-3/4': {
        name: units === 'imperial' ? '3/4" Plywood' : '18mm Plywood',
        length: units === 'imperial' ? 96 : 2440,
        width: units === 'imperial' ? 48 : 1220,
        thickness: units === 'imperial' ? 0.75 : 18,
        grainDirection: 'length',
        pricingUnit: 'per_item',
        pricePerUnit: 50,
        color: '#D4A574'
      },
      'default-plywood-1/2': {
        name: units === 'imperial' ? '1/2" Plywood' : '12mm Plywood',
        length: units === 'imperial' ? 96 : 2440,
        width: units === 'imperial' ? 48 : 1220,
        thickness: units === 'imperial' ? 0.5 : 12,
        grainDirection: 'length',
        pricingUnit: 'per_item',
        pricePerUnit: 40,
        color: '#C9956C'
      },
      'default-plywood-1/4': {
        name: units === 'imperial' ? '1/4" Plywood' : '6mm Plywood',
        length: units === 'imperial' ? 96 : 2440,
        width: units === 'imperial' ? 48 : 1220,
        thickness: units === 'imperial' ? 0.25 : 6,
        grainDirection: 'length',
        pricingUnit: 'per_item',
        pricePerUnit: 30,
        color: '#BE8A64'
      },
      'default-oak-4/4': {
        name: units === 'imperial' ? '4/4 Oak' : '25mm Oak',
        length: units === 'imperial' ? 96 : 2440,
        width: units === 'imperial' ? 6 : 150,
        thickness: units === 'imperial' ? 0.75 : 19,
        grainDirection: 'length',
        pricingUnit: 'board_foot',
        pricePerUnit: 8,
        color: '#B8860B'
      },
      'default-poplar-4/4': {
        name: units === 'imperial' ? '4/4 Poplar' : '25mm Poplar',
        length: units === 'imperial' ? 96 : 2440,
        width: units === 'imperial' ? 6 : 150,
        thickness: units === 'imperial' ? 0.75 : 19,
        grainDirection: 'length',
        pricingUnit: 'board_foot',
        pricePerUnit: 4,
        color: '#90EE90'
      },
      'default-pine-4/4': {
        name: units === 'imperial' ? '4/4 Pine' : '25mm Pine',
        length: units === 'imperial' ? 96 : 2440,
        width: units === 'imperial' ? 6 : 150,
        thickness: units === 'imperial' ? 0.75 : 19,
        grainDirection: 'length',
        pricingUnit: 'board_foot',
        pricePerUnit: 3,
        color: '#F4E4BC'
      },
      'default-walnut-4/4': {
        name: units === 'imperial' ? '4/4 Walnut' : '25mm Walnut',
        length: units === 'imperial' ? 96 : 2440,
        width: units === 'imperial' ? 6 : 150,
        thickness: units === 'imperial' ? 0.75 : 19,
        grainDirection: 'length',
        pricingUnit: 'board_foot',
        pricePerUnit: 12,
        color: '#5D4037'
      },
      'default-maple-4/4': {
        name: units === 'imperial' ? '4/4 Hard Maple' : '25mm Hard Maple',
        length: units === 'imperial' ? 96 : 2440,
        width: units === 'imperial' ? 6 : 150,
        thickness: units === 'imperial' ? 0.75 : 19,
        grainDirection: 'length',
        pricingUnit: 'board_foot',
        pricePerUnit: 9,
        color: '#F5DEB3'
      },
      'default-cherry-4/4': {
        name: units === 'imperial' ? '4/4 Cherry' : '25mm Cherry',
        length: units === 'imperial' ? 96 : 2440,
        width: units === 'imperial' ? 6 : 150,
        thickness: units === 'imperial' ? 0.75 : 19,
        grainDirection: 'length',
        pricingUnit: 'board_foot',
        pricePerUnit: 10,
        color: '#8B4513'
      },
      'default-mdf-3/4': {
        name: units === 'imperial' ? '3/4" MDF' : '18mm MDF',
        length: units === 'imperial' ? 96 : 2440,
        width: units === 'imperial' ? 48 : 1220,
        thickness: units === 'imperial' ? 0.75 : 18,
        grainDirection: 'none',
        pricingUnit: 'per_item',
        pricePerUnit: 35,
        color: '#A89078'
      }
    };

    return materialIds
      .filter((id) => defaultStockDefinitions[id])
      .map((id) => ({
        id: crypto.randomUUID(),
        ...defaultStockDefinitions[id]
      }));
  };

  const handleLicenseActivate = async (licenseKey: string) => {
    try {
      const result = await window.electronAPI.activateLicense(licenseKey);
      if (result.valid) {
        const data = await window.electronAPI.getLicenseData();
        if (data) {
          setLicenseData({
            licenseEmail: data.email || null,
            licenseOrderId: data.orderId?.toString() || null,
            licenseActivatedAt: data.validatedAt ? new Date(data.validatedAt).toISOString() : null
          });
        }
        setIsLicenseValid(true);
        setShowLicenseModal(false);
        // Refresh the license status hook to update trial UI
        refreshLicenseStatus();
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
      // Refresh the license status hook - it will determine if trial modal should show
      refreshLicenseStatus();
      // Don't show license modal immediately - let trial system handle the flow
    } catch (error) {
      logger.error('Failed to deactivate license:', error);
    }
  };

  // Project name and dirty state for header
  const projectName = useProjectStore((s) => s.projectName);
  const isDirty = useProjectStore((s) => s.isDirty);
  const markDirty = useProjectStore((s) => s.markDirty);

  // Part deletion confirmation
  const parts = useProjectStore((s) => s.parts);
  const pendingDeletePartIds = useUIStore((s) => s.pendingDeletePartIds);
  const confirmDeleteParts = useProjectStore((s) => s.confirmDeleteParts);
  const cancelDeleteParts = useUIStore((s) => s.cancelDeleteParts);

  // Cut list modal
  const openCutListModal = useUIStore((s) => s.openCutListModal);
  const cutListModalOpen = useUIStore((s) => s.cutListModalOpen);

  // Save assembly modal
  const saveAssemblyModalOpen = useUIStore((s) => s.saveAssemblyModalOpen);

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
  const [isTemplateBrowserOpen, setIsTemplateBrowserOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isImportAppStateOpen, setIsImportAppStateOpen] = useState(false);

  // Handler for creating a project from a template
  const handleCreateFromTemplate = async (project: Project) => {
    loadProject(project);
    // Mark as dirty since this is a new project (not saved to disk yet)
    markDirty();

    // Add template stocks to the app-level stock library (if not already present)
    // Compare by name, dimensions, and thickness to avoid duplicates
    for (const templateStock of project.stocks) {
      const exists = stockLibrary.some(
        (s) =>
          s.name === templateStock.name &&
          s.length === templateStock.length &&
          s.width === templateStock.width &&
          s.thickness === templateStock.thickness
      );
      if (!exists) {
        await addToLibrary({ ...templateStock });
      }
    }

    // Add template assemblies to the app-level assembly library (if any and not already present)
    if (project.assemblies && project.assemblies.length > 0) {
      for (const templateAssembly of project.assemblies) {
        const exists = assemblyLibrary.some((a) => a.name === templateAssembly.name);
        if (!exists) {
          try {
            const currentAssemblies = (await window.electronAPI.getPreference('assemblyLibrary')) || [];
            await window.electronAPI.setPreference('assemblyLibrary', [...currentAssemblies, templateAssembly]);
          } catch (error) {
            logger.error('Failed to add template assembly to library:', error);
          }
        }
      }
    }
  };

  const {
    stocks: stockLibrary,
    addStock: addToLibrary,
    updateStock: updateLibraryStock,
    deleteStock: deleteLibraryStock
  } = useStockLibrary();

  const {
    assemblies: assemblyLibrary,
    updateAssembly: updateLibraryAssembly,
    deleteAssembly: deleteLibraryAssembly,
    duplicateAssembly: duplicateLibraryAssembly
  } = useAssemblyLibrary();

  // Native menu commands handler
  useMenuCommands({
    onOpenSettings: () => setIsAppSettingsOpen(true),
    onOpenTemplateBrowser: () => setIsTemplateBrowserOpen(true),
    onShowAbout: () => setIsAboutModalOpen(true),
    // File operations with unsaved changes handling
    onNewProject: handleNew,
    onOpenProject: handleOpen,
    onOpenRecentProject: handleOpenRecent,
    onCloseProject: handleGoHome,
    // Template/assembly editing mode - route save commands appropriately
    isEditingTemplate,
    onSaveTemplate: saveTemplateDirectly,
    onSaveAssembly: saveAssemblyAndExit
  });

  // Get names of parts pending deletion for the confirmation message
  const pendingDeletePartNames = pendingDeletePartIds
    ? parts.filter((p) => pendingDeletePartIds.includes(p.id)).map((p) => p.name)
    : [];

  // Determine if we should show the main editor or a full-screen overlay
  // Note: showTutorial is NOT excluded here because the tutorial needs the editor
  // elements to be visible for targeting (sidebar, canvas, properties panel)
  // With trial system: user can use editor if licensed, in trial, OR in free mode (with limits)
  // Note: licenseMode covers all cases - we don't need a separate isLicenseValid check
  const canUseApp = licenseMode === 'licensed' || licenseMode === 'trial' || licenseMode === 'free';
  const showMainEditor = canUseApp && !showStartScreen && !isLicenseLoading;

  return (
    <div className="app">
      {/* Update notifications — banner for updates, toast for post-update */}
      <UpdateNotificationBanner />
      {/* Only show header and main content when not on start screen */}
      {showMainEditor && (
        <>
          <header className={`app-header ${platform ? `platform-${platform}` : ''}`}>
            <div className="header-left">
              <div className="header-title">
                <button className="app-name-btn" onClick={handleGoHome} title="Return to start screen">
                  Carvd Studio
                </button>
                <span className="title-separator">/</span>
                <span className="project-name">
                  {projectName}
                  {isDirty && <span className="dirty-indicator"> •</span>}
                </span>
              </div>
            </div>
            <div className="header-actions">
              <div className="header-actions-group">
                <UndoRedoButtons />
                <button
                  className={`btn btn-icon-sm ${isDirty ? 'btn-filled btn-primary' : 'btn-outlined btn-secondary'}`}
                  onClick={handleSave}
                  title="Save (Cmd+S)"
                >
                  <Save size={18} />
                </button>
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
              {licenseMode === 'free' && (
                <>
                  <div className="header-divider" />
                  <button
                    className="btn btn-sm btn-filled btn-primary upgrade-btn"
                    onClick={() => {
                      // Open purchase page in browser
                      window.open('https://carvd-studio.com/pricing', '_blank');
                      // Also open license modal to enter key
                      setShowLicenseModal(true);
                    }}
                  >
                    Upgrade
                  </button>
                </>
              )}
            </div>
          </header>
          {/* Trial Banner (shown days 7-14 of trial) */}
          {shouldShowTrialBanner && trialStatus && (
            <TrialBanner
              daysRemaining={trialStatus.daysRemaining}
              onActivateLicense={() => setShowLicenseModal(true)}
              onPurchase={() => {}}
            />
          )}
          {/* Assembly Editing Banner */}
          {isEditingAssembly && (
            <AssemblyEditingBanner
              assemblyName={editingAssemblyName}
              isCreatingNew={isCreatingNewAssembly}
              onSave={saveAssemblyAndExit}
              onCancel={requestAssemblyExit}
            />
          )}
          {/* Template Editing Banner */}
          {isEditingTemplate && (
            <TemplateEditingBanner
              templateName={editingTemplateName}
              isCreatingNew={isCreatingNewTemplate}
              onSave={saveTemplateDirectly}
              onDiscard={requestTemplateDiscard}
            />
          )}
          <main className="app-main">
            <Sidebar
              onOpenProjectSettings={() => setIsProjectSettingsOpen(true)}
              onOpenCutList={openCutListModal}
              onCreateNewAssembly={startCreatingNewAssembly}
              onShowLicenseModal={() => setShowLicenseModal(true)}
            />
            <CanvasWithDrop />
            <PropertiesPanel />
          </main>
        </>
      )}
      <ContextMenu />
      <SelectionBox />
      <Toast />
      {isStockLibraryOpen && (
        <Suspense fallback={null}>
          <LazyStockLibraryModal
            isOpen={isStockLibraryOpen}
            onClose={() => setIsStockLibraryOpen(false)}
            stocks={stockLibrary}
            onAddStock={addToLibrary}
            onUpdateStock={updateLibraryStock}
            onDeleteStock={deleteLibraryStock}
            assemblies={assemblyLibrary}
            onUpdateAssembly={updateLibraryAssembly}
            onDeleteAssembly={deleteLibraryAssembly}
            onDuplicateAssembly={duplicateLibraryAssembly}
            onEditAssemblyIn3D={startAssemblyEditing}
            onCreateNewAssembly={startCreatingNewAssembly}
          />
        </Suspense>
      )}

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

      {/* Trial Expired Modal */}
      {shouldShowExpiredModal && (
        <TrialExpiredModal
          onActivateLicense={() => {
            acknowledgeExpired();
            setShowLicenseModal(true);
          }}
          onPurchase={acknowledgeExpired}
          onContinueFree={acknowledgeExpired}
        />
      )}

      {/* License Activation Modal */}
      {showLicenseModal && (
        <Suspense fallback={null}>
          <LazyLicenseActivationModal
            isOpen={showLicenseModal}
            onActivate={handleLicenseActivate}
            onClose={() => setShowLicenseModal(false)}
          />
        </Suspense>
      )}

      {/* App Settings Modal */}
      {isAppSettingsOpen && (
        <Suspense fallback={null}>
          <LazyAppSettingsModal
            isOpen={isAppSettingsOpen}
            onClose={() => setIsAppSettingsOpen(false)}
            settings={appSettings}
            onUpdateSettings={updateAppSettings}
            licenseMode={licenseMode}
            licenseData={licenseData}
            onDeactivateLicense={handleLicenseDeactivate}
            onShowLicenseModal={() => setShowLicenseModal(true)}
            onShowImportModal={() => setIsImportAppStateOpen(true)}
          />
        </Suspense>
      )}

      {/* Import App State Modal */}
      {isImportAppStateOpen && (
        <Suspense fallback={null}>
          <LazyImportAppStateModal isOpen={isImportAppStateOpen} onClose={() => setIsImportAppStateOpen(false)} />
        </Suspense>
      )}

      {/* About Modal */}
      {isAboutModalOpen && (
        <Suspense fallback={null}>
          <LazyAboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
        </Suspense>
      )}

      {/* Project Settings Modal */}
      {isProjectSettingsOpen && (
        <Suspense fallback={null}>
          <LazyProjectSettingsModal
            isOpen={isProjectSettingsOpen}
            onClose={() => setIsProjectSettingsOpen(false)}
            isEditingTemplate={isEditingTemplate}
          />
        </Suspense>
      )}

      {/* Template Browser Modal */}
      {isTemplateBrowserOpen && (
        <Suspense fallback={null}>
          <LazyTemplateBrowserModal
            isOpen={isTemplateBrowserOpen}
            onClose={() => setIsTemplateBrowserOpen(false)}
            onCreateProject={handleCreateFromTemplate}
          />
        </Suspense>
      )}

      {/* Save Assembly Modal */}
      {saveAssemblyModalOpen && (
        <Suspense fallback={null}>
          <LazySaveAssemblyModalWrapper />
        </Suspense>
      )}

      {/* Cut List Modal */}
      {cutListModalOpen && (
        <Suspense fallback={null}>
          <LazyCutListModalWrapper />
        </Suspense>
      )}

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialogComponent />
      <FileRecoveryModalComponent />

      {/* Auto-Recovery Dialog */}
      <RecoveryDialog
        isOpen={hasRecovery}
        recoveryInfo={recoveryInfo}
        onRestore={handleRecoveryRestore}
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

      {/* Template Save Dialog */}
      <TemplateSaveDialog
        isOpen={showTemplateSaveDialog}
        templateName={editingTemplateName}
        templateDescription={editingTemplateDescription}
        isCreatingNew={isCreatingNewTemplate}
        onSave={saveTemplateAndExit}
        onCancel={cancelTemplateDialog}
      />

      {/* Template Discard Confirmation Dialog */}
      <TemplateDiscardDialog
        isOpen={showTemplateDiscardDialog}
        templateName={editingTemplateName}
        isCreatingNew={isCreatingNewTemplate}
        onDiscard={discardTemplateAndExit}
        onCancel={cancelTemplateDialog}
      />

      {/* Template Setup Dialog (shown before entering edit mode for new templates) */}
      <TemplateSetupDialog
        isOpen={showNewTemplateSetupDialog}
        onConfirm={confirmNewTemplateSetup}
        onCancel={cancelNewTemplateSetup}
      />

      {/* Welcome Tutorial (first-run experience) */}
      {showTutorial && (
        <Suspense fallback={null}>
          <LazyWelcomeTutorial onComplete={handleTutorialComplete} />
        </Suspense>
      )}

      {/* Start Screen (shown when no project is loaded, or while checking license/trial) */}
      {showStartScreen && canUseApp && !showTutorial && !isLicenseLoading && (
        <StartScreen
          onNewProject={handleStartScreenNewProject}
          onOpenFile={handleStartScreenOpenProject}
          onOpenProject={handleStartScreenOpenRecent}
          onRelocateFile={handleRelocateFile}
          onSelectTemplate={handleStartScreenSelectTemplate}
          onStartTutorial={handleStartScreenStartTutorial}
          onViewAllTemplates={handleStartScreenViewAllTemplates}
        />
      )}

      {/* Templates Screen (full-screen view of all templates) */}
      {showTemplatesScreen && (
        <Suspense fallback={null}>
          <LazyTemplatesScreen
            onBack={handleTemplatesScreenBack}
            onSelectTemplate={handleTemplatesScreenSelectTemplate}
            onStartTutorial={handleTemplatesScreenStartTutorial}
            onEditTemplate={handleTemplatesScreenEditTemplate}
            onNewTemplate={handleTemplatesScreenNewTemplate}
          />
        </Suspense>
      )}

      {/* New Project Dialog */}
      <NewProjectDialog
        isOpen={showNewProjectDialog}
        onClose={handleNewProjectCancel}
        onCreateProject={handleNewProjectDialogCreate}
      />
    </div>
  );
}

export default App;
