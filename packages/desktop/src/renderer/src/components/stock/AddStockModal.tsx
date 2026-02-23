import { Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { STOCK_COLORS } from '../../constants';
import { useProjectStore } from '../../store/projectStore';
import { Stock } from '../../types';
import { formatMeasurementWithUnit } from '../../utils/fractions';
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
import { LibraryDetailHeader } from '../common/library/LibraryDetailHeader';
import { LibraryDetailPane } from '../common/library/LibraryDetailPane';
import { LibraryEmptyState } from '../common/library/LibraryEmptyState';
import { LibrarySidebar } from '../common/library/LibrarySidebar';
import { StockListItem } from './StockListItem';
import { StockFormFields } from './StockFormFields';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStock: (stock: Stock) => void;
  stockLibrary: Stock[];
  onAddToLibrary: (stock: Stock) => void;
}

const defaultFormData: Omit<Stock, 'id'> = {
  name: 'New Stock',
  length: 96,
  width: 48,
  thickness: 0.75,
  grainDirection: 'length',
  pricingUnit: 'per_item',
  pricePerUnit: 50,
  color: STOCK_COLORS[0]
};

export function AddStockModal({ isOpen, onClose, onAddStock, stockLibrary, onAddToLibrary }: AddStockModalProps) {
  const units = useProjectStore((s) => s.units);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [displayedStockId, setDisplayedStockId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [formData, setFormData] = useState<Omit<Stock, 'id'>>(defaultFormData);

  // Filter stock library based on search
  const filteredStockLibrary = useMemo(
    () =>
      searchTerm ? stockLibrary.filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase())) : stockLibrary,
    [stockLibrary, searchTerm]
  );

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setDisplayedStockId(null);
      setSearchTerm('');
      setIsCreatingNew(false);
      setFormData({
        ...defaultFormData,
        color: STOCK_COLORS[Math.floor(Math.random() * STOCK_COLORS.length)]
      });
    }
  }, [isOpen]);

  // Get the currently displayed stock
  const displayedStock = displayedStockId ? stockLibrary.find((s) => s.id === displayedStockId) : null;

  const handleItemClick = useCallback(
    (stock: Stock) => {
      // Exit create mode if active
      if (isCreatingNew) {
        setIsCreatingNew(false);
      }

      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(stock.id)) {
          // Clicking a selected item deselects it
          newSet.delete(stock.id);
          // If we're deselecting the displayed item, clear the display or show another selected item
          if (displayedStockId === stock.id) {
            const remaining = Array.from(newSet);
            setDisplayedStockId(remaining.length > 0 ? remaining[remaining.length - 1] : null);
          }
        } else {
          // Select the item and display it
          newSet.add(stock.id);
          setDisplayedStockId(stock.id);
        }
        return newSet;
      });
    },
    [displayedStockId, isCreatingNew]
  );

  const handleSelectAll = useCallback(() => {
    const filteredIds = filteredStockLibrary.map((s) => s.id);
    const allFilteredSelected = filteredIds.every((id) => selectedIds.has(id));
    if (allFilteredSelected) {
      // Deselect all filtered items
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        filteredIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
      setDisplayedStockId(null);
    } else {
      // Select all filtered items
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        filteredIds.forEach((id) => newSet.add(id));
        return newSet;
      });
      // Display the last item in the filtered library
      if (filteredStockLibrary.length > 0) {
        setDisplayedStockId(filteredStockLibrary[filteredStockLibrary.length - 1].id);
      }
    }
  }, [filteredStockLibrary, selectedIds]);

  const handleStartCreate = useCallback(() => {
    setIsCreatingNew(true);
    setDisplayedStockId(null);
    setFormData({
      ...defaultFormData,
      color: STOCK_COLORS[Math.floor(Math.random() * STOCK_COLORS.length)]
    });
  }, []);

  const handleCancelCreate = useCallback(() => {
    setIsCreatingNew(false);
  }, []);

  const handleCreateStock = useCallback(() => {
    const newId = uuidv4();
    const newStock: Stock = {
      id: newId,
      ...formData
    };
    // Add to library
    onAddToLibrary(newStock);
    // Add to project
    onAddStock(newStock);
    onClose();
  }, [formData, onAddToLibrary, onAddStock, onClose]);

  const handleAddToProject = useCallback(() => {
    // Add all selected stocks to the project
    for (const stockId of selectedIds) {
      const libraryStock = stockLibrary.find((s) => s.id === stockId);
      if (libraryStock) {
        const newStock: Stock = {
          ...libraryStock,
          id: uuidv4() // Generate new ID for project
        };
        onAddStock(newStock);
      }
    }
    onClose();
  }, [selectedIds, stockLibrary, onAddStock, onClose]);

  const grainDirectionLabel = (direction: string) => {
    switch (direction) {
      case 'length':
        return 'Along Length';
      case 'width':
        return 'Along Width';
      case 'none':
        return 'No Grain';
      default:
        return direction;
    }
  };

  const pricingUnitLabel = (unit: string) => {
    switch (unit) {
      case 'per_item':
        return 'Per Sheet/Board';
      case 'board_foot':
        return 'Per Board Foot';
      default:
        return unit;
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[820px] max-w-[92vw] max-h-[86vh]" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Add Stock to Project</DialogTitle>
          <DialogClose onClose={onClose} />
        </DialogHeader>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <LibrarySidebar
            count={stockLibrary.length}
            hasItems={stockLibrary.length > 0}
            showNoResults={filteredStockLibrary.length === 0}
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: 'Search stock...'
            }}
            headerActions={
              <div className="flex items-center gap-2">
                {stockLibrary.length > 0 && (
                  <Button variant="ghost" size="xs" onClick={handleSelectAll}>
                    {filteredStockLibrary.every((s) => selectedIds.has(s.id)) && filteredStockLibrary.length > 0
                      ? 'Deselect All'
                      : 'Select All'}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleStartCreate}
                  title="Create new stock"
                  aria-label="Create new stock"
                >
                  <Plus size={14} />
                </Button>
              </div>
            }
            emptyState={
              <div className="text-text-muted text-xs italic p-4 text-center">
                <p>No stocks in library yet</p>
                <p className="text-[11px] text-text-muted mt-1">Click "+" to create your first stock</p>
              </div>
            }
            noResultsState={
              <p className="text-text-muted text-xs italic p-4 text-center">No stocks match "{searchTerm}"</p>
            }
            footer={
              selectedIds.size > 0 ? (
                <div className="flex items-center justify-between gap-3 pt-3 mt-auto border-t border-border shrink-0">
                  <span className="text-xs text-text-muted">{selectedIds.size} selected</span>
                </div>
              ) : undefined
            }
          >
            <ul className="list-none m-0 p-2 flex-1 min-h-0 overflow-y-auto">
              {filteredStockLibrary.map((stock) => (
                <StockListItem
                  key={stock.id}
                  stock={stock}
                  units={units}
                  selected={selectedIds.has(stock.id)}
                  highlighted={displayedStockId === stock.id}
                  onClick={() => handleItemClick(stock)}
                />
              ))}
            </ul>
          </LibrarySidebar>

          {/* Stock details display or create form */}
          <LibraryDetailPane className="p-5">
            {isCreatingNew ? (
              <>
                <LibraryDetailHeader
                  title={
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded shrink-0" style={{ backgroundColor: formData.color }} />
                      <span>Create New Stock</span>
                    </div>
                  }
                  className="mb-6 pb-4 px-0 pt-0"
                />

                <Card className="border-border bg-bg">
                  <CardContent className="p-4">
                    <StockFormFields formData={formData} onChange={setFormData} />
                  </CardContent>
                </Card>
              </>
            ) : displayedStock ? (
              <>
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                  <span className="w-6 h-6 rounded shrink-0" style={{ backgroundColor: displayedStock.color }} />
                  <h3 className="m-0 text-lg font-semibold">{displayedStock.name}</h3>
                </div>

                <Card className="border-border bg-bg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Stock Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                        Dimensions (L × W × T)
                      </label>
                      <span>
                        {formatMeasurementWithUnit(displayedStock.length, units)} ×{' '}
                        {formatMeasurementWithUnit(displayedStock.width, units)} ×{' '}
                        {formatMeasurementWithUnit(displayedStock.thickness, units)}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                        Grain Direction
                      </label>
                      <span>{grainDirectionLabel(displayedStock.grainDirection)}</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                        Pricing
                      </label>
                      <span>
                        ${displayedStock.pricePerUnit.toFixed(2)} {pricingUnitLabel(displayedStock.pricingUnit)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <LibraryEmptyState
                title="Select a stock from the library to view details"
                subtitle='or click "+" to create one'
                linkLabel="Learn more about stock materials"
                docsSection="stock"
              />
            )}
          </LibraryDetailPane>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={isCreatingNew ? handleCancelCreate : onClose}>
            {isCreatingNew ? 'Back' : stockLibrary.length === 0 ? 'Close' : 'Cancel'}
          </Button>
          {isCreatingNew ? (
            <Button size="sm" onClick={handleCreateStock}>
              Create & Add to Project
            </Button>
          ) : (
            <Button size="sm" onClick={handleAddToProject} disabled={selectedIds.size === 0}>
              Add to Project{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
