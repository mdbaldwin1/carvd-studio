import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Checkbox } from '@renderer/components/ui/checkbox';
import { Button } from '@renderer/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog';
import { Input } from '@renderer/components/ui/input';
import { Select } from '@renderer/components/ui/select';
import { UNTITLED_PROJECT_NAME } from '@renderer/constants/appDefaults';

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
  onCreateProject: (options: {
    name: string;
    units: 'imperial' | 'metric';
    selectedMaterials: string[];
  }) => void | Promise<void>;
}

export function NewProjectDialog({ isOpen, onClose, onCreateProject }: NewProjectDialogProps) {
  const [projectName, setProjectName] = useState(UNTITLED_PROJECT_NAME);
  const [units, setUnits] = useState<'imperial' | 'metric'>('imperial');
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [rememberChoices, setRememberChoices] = useState(false);
  const [hasLoadedDefaults, setHasLoadedDefaults] = useState(false);
  const [stockLibrary, setStockLibrary] = useState<StockLibraryItem[]>([]);
  const [isLoadingStocks, setIsLoadingStocks] = useState(true);

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
              name: UNTITLED_PROJECT_NAME,
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
      setProjectName(UNTITLED_PROJECT_NAME);
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

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="new-project-dialog bg-bg w-[620px] max-w-[92vw] max-h-[86vh] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
        onClose={onClose}
      >
        <DialogHeader className="py-5 px-6">
          <DialogTitle className="text-lg">New Project</DialogTitle>
          <DialogClose
            onClose={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-text-muted hover:bg-bg-secondary hover:text-text"
          >
            <X size={20} />
          </DialogClose>
        </DialogHeader>

        <div className="p-6 overflow-y-auto flex flex-col gap-4">
          <Card className="border-border bg-bg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="project-name" className="text-sm font-medium text-text">
                  Project Name
                </label>
                <Input
                  id="project-name"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  autoFocus
                  className="bg-bg-secondary"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="project-units" className="text-sm font-medium text-text">
                  Units
                </label>
                <Select
                  id="project-units"
                  value={units}
                  onChange={(e) => setUnits(e.target.value as 'imperial' | 'metric')}
                  className="bg-bg-secondary"
                >
                  <option value="imperial">Imperial (inches)</option>
                  <option value="metric">Metric (mm)</option>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Materials Selection */}
          <Card className="border-border bg-bg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Starting Materials</CardTitle>
                {stockLibrary.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="link" size="xs" className="h-auto p-0" onClick={handleSelectAll}>
                      Select All
                    </Button>
                    <span className="text-text-muted text-xs">|</span>
                    <Button type="button" variant="link" size="xs" className="h-auto p-0" onClick={handleSelectNone}>
                      Select None
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="text-sm font-medium text-text">Add materials from your library?</label>
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
                          <Checkbox
                            className="w-4 h-4"
                            checked={selectedMaterials.includes(stock.id)}
                            onChange={() => handleToggleMaterial(stock.id)}
                          />
                          <span className="text-sm text-text">{stock.name}</span>
                        </label>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-bg">
            <CardContent className="pt-5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox
                  className="w-4 h-4"
                  checked={rememberChoices}
                  onChange={(e) => setRememberChoices(e.target.checked)}
                />
                <span className="text-[13px] text-text-secondary">
                  Remember these choices (skip this dialog next time)
                </span>
              </label>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-3 py-4 px-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create Project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
