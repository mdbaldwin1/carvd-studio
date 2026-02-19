import { Plus, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { STOCK_COLORS } from '../../constants';
import { useBackdropClose } from '../../hooks/useBackdropClose';
import { useProjectStore } from '../../store/projectStore';
import { Stock } from '../../types';
import { formatMeasurementWithUnit } from '../../utils/fractions';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { ColorPicker } from '../common/ColorPicker';
import { FractionInput } from '../common/FractionInput';

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

  const { handleMouseDown, handleClick } = useBackdropClose(onClose);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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

  return (
    <div
      className="fixed inset-0 bg-overlay flex items-center justify-center z-[1100]"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div
        className="bg-surface border border-border rounded-lg shadow-[0_8px_32px_var(--color-overlay)] max-w-[90vw] max-h-[85vh] flex flex-col animate-modal-fade-in w-[700px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-stock-modal-title"
      >
        <div className="flex justify-between items-center py-4 px-5 border-b border-border">
          <h2 id="add-stock-modal-title" className="text-base font-semibold text-text m-0">
            Add Stock to Project
          </h2>
          <button
            className="bg-transparent border-none text-text-muted text-2xl cursor-pointer p-0 leading-none transition-colors duration-150 hover:text-text"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Library list */}
          <div className="w-60 border-r border-border flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="shrink-0 flex items-center justify-between py-3 px-4 border-b border-border gap-2">
                <span className="text-xs text-text-muted">{stockLibrary.length} available</span>
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
              </div>
              {stockLibrary.length > 0 && (
                <div className="flex items-center gap-2 py-2 px-3 bg-bg border border-border rounded mb-2">
                  <Search size={14} className="text-text-muted shrink-0" />
                  <input
                    className="flex-1 border-none bg-transparent text-text text-[13px] outline-none placeholder:text-text-muted"
                    type="text"
                    placeholder="Search stock..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      className="flex items-center justify-center w-5 h-5 border-none bg-none text-text-muted cursor-pointer p-0 rounded-sm shrink-0 hover:text-text hover:bg-bg-hover"
                      onClick={() => setSearchTerm('')}
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}
              {stockLibrary.length === 0 ? (
                <div className="text-text-muted text-xs italic p-4 text-center">
                  <p>No stocks in library yet</p>
                  <p className="text-[11px] text-text-muted mt-1">Click "+" to create your first stock</p>
                </div>
              ) : filteredStockLibrary.length === 0 ? (
                <p className="text-text-muted text-xs italic p-4 text-center">No stocks match "{searchTerm}"</p>
              ) : (
                <ul className="list-none m-0 p-2 flex-1 min-h-0 overflow-y-auto">
                  {filteredStockLibrary.map((stock) => (
                    <li
                      key={stock.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-[background] duration-100 hover:bg-surface-hover ${selectedIds.has(stock.id) ? 'bg-selected' : ''} ${displayedStockId === stock.id ? 'outline-2 outline-solid outline-primary -outline-offset-2' : ''}`}
                      onClick={() => handleItemClick(stock)}
                    >
                      <span className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: stock.color }} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs whitespace-nowrap overflow-hidden text-ellipsis">{stock.name}</span>
                        <span className="text-[10px] text-text-muted">
                          {formatMeasurementWithUnit(stock.length, units)} ×{' '}
                          {formatMeasurementWithUnit(stock.width, units)} ×{' '}
                          {formatMeasurementWithUnit(stock.thickness, units)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between gap-3 pt-3 mt-auto border-t border-border shrink-0">
                <span className="text-xs text-text-muted">{selectedIds.size} selected</span>
              </div>
            )}
          </div>

          {/* Stock details display or create form */}
          <div className="flex-1 p-5 overflow-y-auto flex flex-col">
            {isCreatingNew ? (
              <>
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                  <span className="w-6 h-6 rounded shrink-0" style={{ backgroundColor: formData.color }} />
                  <h3 className="m-0 text-lg font-semibold">Create New Stock</h3>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col mb-4 gap-2.5">
                    <Label>Name</Label>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="flex flex-col mb-4 gap-2.5">
                    <Label>Dimensions (L × W × T)</Label>
                    <div className="flex items-center gap-1">
                      <FractionInput
                        value={formData.length}
                        onChange={(length) => setFormData({ ...formData, length })}
                        min={1}
                      />
                      <span>×</span>
                      <FractionInput
                        value={formData.width}
                        onChange={(width) => setFormData({ ...formData, width })}
                        min={1}
                      />
                      <span>×</span>
                      <FractionInput
                        value={formData.thickness}
                        onChange={(thickness) => setFormData({ ...formData, thickness })}
                        min={0.25}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col mb-4 gap-2.5">
                    <Label>Grain Direction</Label>
                    <select
                      className="w-full bg-bg border border-border text-text px-3.5 py-2.5 text-sm font-[inherit] rounded-[var(--radius-md)] pr-8 cursor-pointer focus:outline-none focus:border-accent"
                      value={formData.grainDirection}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          grainDirection: e.target.value as 'length' | 'width' | 'none'
                        })
                      }
                    >
                      <option value="length">Along Length</option>
                      <option value="width">Along Width</option>
                      <option value="none">No Grain (MDF, etc.)</option>
                    </select>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex flex-col mb-4 gap-2.5 flex-1">
                      <Label>Pricing Unit</Label>
                      <select
                        className="w-full bg-bg border border-border text-text px-3.5 py-2.5 text-sm font-[inherit] rounded-[var(--radius-md)] pr-8 cursor-pointer focus:outline-none focus:border-accent"
                        value={formData.pricingUnit}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pricingUnit: e.target.value as 'board_foot' | 'per_item'
                          })
                        }
                      >
                        <option value="per_item">Per Sheet/Board</option>
                        <option value="board_foot">Per Board Foot</option>
                      </select>
                    </div>

                    <div className="flex flex-col mb-4 gap-2.5 flex-1">
                      <Label>Price ($)</Label>
                      <Input
                        type="number"
                        value={formData.pricePerUnit}
                        onChange={(e) => setFormData({ ...formData, pricePerUnit: parseFloat(e.target.value) || 0 })}
                        min={0}
                        step={0.01}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col mb-4 gap-2.5">
                    <Label>Display Color</Label>
                    <ColorPicker value={formData.color} onChange={(color) => setFormData({ ...formData, color })} />
                  </div>
                </div>
              </>
            ) : displayedStock ? (
              <>
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                  <span className="w-6 h-6 rounded shrink-0" style={{ backgroundColor: displayedStock.color }} />
                  <h3 className="m-0 text-lg font-semibold">{displayedStock.name}</h3>
                </div>

                <div className="flex flex-col gap-4">
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
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Pricing</label>
                    <span>
                      ${displayedStock.pricePerUnit.toFixed(2)} {pricingUnitLabel(displayedStock.pricingUnit)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-text-muted gap-2">
                <p className="mb-2">Select a stock from the library to view details</p>
                <p className="text-[11px] text-text-muted mt-1">or click "+" to create one</p>
                <a
                  href="#"
                  className="text-accent no-underline text-xs hover:underline hover:text-accent-hover transition-colors duration-150"
                  onClick={(e) => {
                    e.preventDefault();
                    window.electronAPI.openExternal('https://carvd-studio.com/docs#stock');
                  }}
                >
                  Learn more about stock materials
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 py-4 px-5 border-t border-border">
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
        </div>
      </div>
    </div>
  );
}
