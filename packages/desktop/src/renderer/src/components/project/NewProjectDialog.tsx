import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import './NewProjectDialog.css';

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
      <div className="new-project-dialog" role="dialog" aria-modal="true" aria-labelledby="new-project-dialog-title">
        <div className="dialog-header">
          <h2 id="new-project-dialog-title">New Project</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="dialog-content">
          {/* Project Name */}
          <div className="form-group">
            <label htmlFor="project-name">Project Name</label>
            <input
              id="project-name"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
              autoFocus
            />
          </div>

          {/* Units */}
          <div className="form-group">
            <label>Units</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="units"
                  value="imperial"
                  checked={units === 'imperial'}
                  onChange={() => setUnits('imperial')}
                />
                <span>Imperial (inches)</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="units"
                  value="metric"
                  checked={units === 'metric'}
                  onChange={() => setUnits('metric')}
                />
                <span>Metric (mm)</span>
              </label>
            </div>
          </div>

          {/* Materials Selection */}
          <div className="form-group materials-section">
            <div className="materials-header">
              <label>Add materials from your library?</label>
              {stockLibrary.length > 0 && (
                <div className="materials-actions">
                  <button type="button" className="text-btn" onClick={handleSelectAll}>
                    Select All
                  </button>
                  <span className="separator">|</span>
                  <button type="button" className="text-btn" onClick={handleSelectNone}>
                    Select None
                  </button>
                </div>
              )}
            </div>

            <div className="materials-grid">
              {isLoadingStocks ? (
                <div className="materials-loading">Loading materials...</div>
              ) : stockLibrary.length === 0 ? (
                <div className="materials-empty">
                  No materials in your library yet. You can add materials later from the Stock Library.
                </div>
              ) : (
                sortedCategories.map((category) => (
                  <div key={category} className="material-category">
                    <span className="category-label">{category}</span>
                    {materialsByCategory[category].map((stock) => (
                      <label key={stock.id} className="material-option">
                        <input
                          type="checkbox"
                          checked={selectedMaterials.includes(stock.id)}
                          onChange={() => handleToggleMaterial(stock.id)}
                        />
                        <span>{stock.name}</span>
                      </label>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Remember Choices */}
          <label className="remember-option">
            <input type="checkbox" checked={rememberChoices} onChange={(e) => setRememberChoices(e.target.checked)} />
            <span>Remember these choices (skip this dialog next time)</span>
          </label>
        </div>

        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-accent" onClick={handleCreate}>
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}
