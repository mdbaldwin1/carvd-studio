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
  /**
   * Starting stock is the only thing this dialog decides.
   *
   * The name comes from the file the first save writes, and the units from
   * the app's New Project Defaults, so neither is asked for here.
   */
  onCreateProject: (options: { selectedMaterials: string[] }) => void | Promise<void>;
}

export function NewProjectDialog({ isOpen, onClose, onCreateProject }: NewProjectDialogProps) {
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [hasLoadedDefaults, setHasLoadedDefaults] = useState(false);
  const [stockLibrary, setStockLibrary] = useState<StockLibraryItem[]>([]);
  const [isLoadingStocks, setIsLoadingStocks] = useState(true);

  // Load the stock library on open. The skipSetupDialog preference is no
  // longer read: the checkbox that set it is gone, and nothing else could
  // ever clear it, so honouring it would suppress this dialog permanently
  // for anyone who had ticked that box.
  useEffect(() => {
    if (isOpen && !hasLoadedDefaults) {
      const loadData = async () => {
        try {
          const stocks = (await window.electronAPI.getPreference('stockLibrary')) as StockLibraryItem[];
          const stockList = stocks || [];
          setStockLibrary(stockList);
          setIsLoadingStocks(false);
          // A few common stocks, pre-ticked, so Create Project works as one
          // click for the common case.
          setSelectedMaterials(stockList.slice(0, 4).map((stock) => stock.id));
        } catch (error) {
          console.error('Failed to load data:', error);
          setIsLoadingStocks(false);
        }
        setHasLoadedDefaults(true);
      };
      loadData();
    }
  }, [isOpen, hasLoadedDefaults]);

  // Reset when dialog closes
  useEffect(() => {
    if (!isOpen) {
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

  const handleCreate = () => {
    onCreateProject({ selectedMaterials });
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
          {/* Starting stock is the only choice this dialog makes. */}
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
