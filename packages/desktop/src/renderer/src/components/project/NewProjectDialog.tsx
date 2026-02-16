import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// Stock item from the app-level stock library
interface StockLibraryItem {
  id: string;
  name: string;
  length: number;
  width: number;
  thickness: number;
  grainDirection: 'length' | 'width' | 'none';
  pricingUnit: 'board_foot' | 'per_item';
  pricePerUnit: number;
  color: string;
}

// Categorize stocks based on dimensions (sheet goods vs dimensional lumber)
function categorizeStock(stock: StockLibraryItem): string {
  // Sheet goods are typically 4x8 feet (48x96 inches) or similar large sheets
  // Also includes MDF which has no grain direction
  if ((stock.width >= 24 && stock.length >= 48) || stock.grainDirection === 'none') {
    return 'Sheet Goods';
  }
  return 'Dimensional Lumber';
}

const inputClass =
  'py-2.5 px-3 text-sm bg-bg-secondary border border-border rounded-md text-text outline-none transition-[border-color] duration-100 focus:border-accent placeholder:text-text-muted';

interface NewProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (options: { name: string; units: 'imperial' | 'metric'; selectedMaterials: string[] }) => void;
}

export function NewProjectDialog({ isOpen, onClose, onCreateProject }: NewProjectDialogProps) {
  const [projectName, setProjectName] = useState('Untitled Project');
  const [units, setUnits] = useState<'imperial' | 'metric'>('imperial');
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [rememberChoices, setRememberChoices] = useState(false);
  const [hasLoadedDefaults, setHasLoadedDefaults] = useState(false);
  const [stockLibrary, setStockLibrary] = useState<StockLibraryItem[]>([]);
  const [isLoadingStocks, setIsLoadingStocks] = useState(true);

  // Track if mousedown started on overlay (to prevent closing when dragging from inside modal)
  const mouseDownOnOverlay = useRef(false);

  // Load stock library and saved defaults on mount
  useEffect(() => {
    if (isOpen && !hasLoadedDefaults) {
      const loadData = async () => {
        try {
          // Load stock library and defaults in parallel
          const [stocks, defaults] = await Promise.all([
            window.electronAPI.getPreference('stockLibrary') as Promise<StockLibraryItem[]>,
            window.electronAPI.getNewProjectDefaults()
          ]);

          setStockLibrary(stocks || []);
          setIsLoadingStocks(false);

          if (defaults.skipSetupDialog) {
            // User wants to skip - create project immediately with saved defaults
            onCreateProject({
              name: 'Untitled Project',
              units: defaults.units,
              selectedMaterials: defaults.addCommonMaterials ? defaults.selectedMaterials : []
            });
            return;
          }

          // Pre-fill the form with their last choices
          setUnits(defaults.units);
          const stockList = stocks || [];
          if (defaults.selectedMaterials.length > 0) {
            // Only select materials that still exist in the library
            const stockIds = new Set(stockList.map((s: StockLibraryItem) => s.id));
            const validSelections = defaults.selectedMaterials.filter((id: string) => stockIds.has(id));
            setSelectedMaterials(validSelections);
          } else {
            // Default to selecting the first few common stocks
            const defaultStockIds = stockList.slice(0, 4).map((s: StockLibraryItem) => s.id);
            setSelectedMaterials(defaultStockIds);
          }
        } catch (error) {
          console.error('Failed to load data:', error);
          setIsLoadingStocks(false);
        }
        setHasLoadedDefaults(true);
      };
      loadData();
    }
  }, [isOpen, hasLoadedDefaults, onCreateProject]);

  // Reset when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setProjectName('Untitled Project');
      setHasLoadedDefaults(false);
      setSelectedMaterials([]);
    }
  }, [isOpen]);

  const handleToggleMaterial = (materialId: string) => {
    setSelectedMaterials((prev) =>
      prev.includes(materialId) ? prev.filter((id) => id !== materialId) : [...prev, materialId]
    );
  };

  const handleSelectAll = () => {
    setSelectedMaterials(stockLibrary.map((m) => m.id));
  };

  const handleSelectNone = () => {
    setSelectedMaterials([]);
  };

  const handleCreate = async () => {
    // Save preferences if "remember" is checked
    if (rememberChoices) {
      await window.electronAPI.setNewProjectDefaults({
        units,
        addCommonMaterials: selectedMaterials.length > 0,
        selectedMaterials,
        skipSetupDialog: true
      });
    }

    onCreateProject({
      name: projectName,
      units,
      selectedMaterials
    });
  };

  if (!isOpen) return null;

  // Group materials by category
  const materialsByCategory = stockLibrary.reduce(
    (acc, stock) => {
      const category = categorizeStock(stock);
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(stock);
      return acc;
    },
    {} as Record<string, StockLibraryItem[]>
  );

  // Sort categories to show Sheet Goods first
  const sortedCategories = Object.keys(materialsByCategory).sort((a, b) => {
    if (a === 'Sheet Goods') return -1;
    if (b === 'Sheet Goods') return 1;
    return a.localeCompare(b);
  });

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        // Only track if mousedown is directly on the overlay (not bubbled from children)
        mouseDownOnOverlay.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        // Only close if both mousedown and click were on the overlay
        if (e.target === e.currentTarget && mouseDownOnOverlay.current) {
          onClose();
        }
        mouseDownOnOverlay.current = false;
      }}
    >
      <div
        className="new-project-dialog bg-bg rounded-lg w-[480px] max-h-[90vh] flex flex-col shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-border"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-dialog-title"
      >
        <div className="flex items-center justify-between py-5 px-6 border-b border-border">
          <h2 id="new-project-dialog-title" className="m-0 text-lg font-semibold text-text">
            New Project
          </h2>
          <button
            className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded-md text-text-muted cursor-pointer transition-all duration-100 hover:bg-bg-secondary hover:text-text"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex flex-col gap-5">
          {/* Project Name */}
          <div className="flex flex-col gap-2">
            <label htmlFor="project-name" className="text-sm font-medium text-text">
              Project Name
            </label>
            <input
              id="project-name"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
              autoFocus
              className={inputClass}
            />
          </div>

          {/* Units */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-text">Units</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="units"
                  value="imperial"
                  checked={units === 'imperial'}
                  onChange={() => setUnits('imperial')}
                  className="w-4.5 h-4.5 m-0 accent-accent cursor-pointer"
                />
                <span className="text-sm text-text">Imperial (inches)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="units"
                  value="metric"
                  checked={units === 'metric'}
                  onChange={() => setUnits('metric')}
                  className="w-4.5 h-4.5 m-0 accent-accent cursor-pointer"
                />
                <span className="text-sm text-text">Metric (mm)</span>
              </label>
            </div>
          </div>

          {/* Materials Selection */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text">Add materials from your library?</label>
              {stockLibrary.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="bg-transparent border-none text-accent text-[13px] cursor-pointer p-0 hover:underline"
                    onClick={handleSelectAll}
                  >
                    Select All
                  </button>
                  <span className="text-text-muted text-xs">|</span>
                  <button
                    type="button"
                    className="bg-transparent border-none text-accent text-[13px] cursor-pointer p-0 hover:underline"
                    onClick={handleSelectNone}
                  >
                    Select None
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 p-4 bg-bg-secondary rounded-lg border border-border max-h-60 overflow-y-auto">
              {isLoadingStocks ? (
                <div className="text-center p-4 text-text-muted text-sm">Loading materials...</div>
              ) : stockLibrary.length === 0 ? (
                <div className="text-center p-4 text-text-muted text-sm">
                  No materials in your library yet. You can add materials later from the Stock Library.
                </div>
              ) : (
                sortedCategories.map((category) => (
                  <div key={category} className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">{category}</span>
                    {materialsByCategory[category].map((stock) => (
                      <label key={stock.id} className="flex items-center gap-2.5 cursor-pointer py-1">
                        <input
                          type="checkbox"
                          checked={selectedMaterials.includes(stock.id)}
                          onChange={() => handleToggleMaterial(stock.id)}
                          className="w-4 h-4 m-0 accent-accent cursor-pointer"
                        />
                        <span className="text-sm text-text">{stock.name}</span>
                      </label>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Remember Choices */}
          <label className="flex items-center gap-2.5 cursor-pointer py-3 px-4 bg-bg-tertiary rounded-lg mt-1">
            <input
              type="checkbox"
              checked={rememberChoices}
              onChange={(e) => setRememberChoices(e.target.checked)}
              className="w-4 h-4 m-0 accent-accent cursor-pointer"
            />
            <span className="text-[13px] text-text-secondary">Remember these choices (skip this dialog next time)</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 py-4 px-6 border-t border-border">
          <button
            className="py-2.5 px-5 text-sm font-medium rounded-md cursor-pointer transition-all duration-100 bg-bg-secondary border border-border text-text hover:bg-bg-tertiary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn-accent py-2.5 px-5 text-sm font-medium rounded-md cursor-pointer transition-all duration-100 bg-accent border border-accent text-accent-foreground hover:bg-accent-hover hover:border-accent-hover"
            onClick={handleCreate}
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}
