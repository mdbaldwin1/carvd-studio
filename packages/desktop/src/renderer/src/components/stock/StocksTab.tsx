import { Download, Plus, Search, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { STOCK_COLORS } from '../../constants';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { Stock } from '../../types';
import { formatMeasurementWithUnit } from '../../utils/fractions';
import { ColorPicker } from '../common/ColorPicker';
import { FractionInput } from '../common/FractionInput';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Select } from '@renderer/components/ui/select';
import { IconButton } from '../common/IconButton';

const defaultStock: Omit<Stock, 'id'> = {
  name: 'New Stock',
  length: 96,
  width: 48,
  thickness: 0.75,
  grainDirection: 'length',
  pricingUnit: 'per_item',
  pricePerUnit: 50,
  color: STOCK_COLORS[0]
};

interface StocksTabProps {
  stocks: Stock[];
  onAddStock: (stock: Stock) => void;
  onUpdateStock: (id: string, updates: Partial<Stock>) => void;
  onDeleteStock: (id: string) => void;
  onClose: () => void;
}

export function StocksTab({ stocks, onAddStock, onUpdateStock, onDeleteStock, onClose }: StocksTabProps) {
  const units = useProjectStore((s) => s.units);
  const showToast = useUIStore((s) => s.showToast);

  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Omit<Stock, 'id'>>(defaultStock);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStocks = useMemo(
    () => (searchTerm ? stocks.filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase())) : stocks),
    [stocks, searchTerm]
  );

  const isFormMode = isEditing || isCreating;

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFormMode) {
          handleCancelEdit();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleCancelEdit is a useCallback defined below; deps cover the values it reads
  }, [isFormMode, onClose]);

  const handleSelectStock = useCallback((stock: Stock) => {
    setSelectedStockId(stock.id);
    setIsEditing(false);
    setIsCreating(false);
    setFormData({
      name: stock.name,
      length: stock.length,
      width: stock.width,
      thickness: stock.thickness,
      grainDirection: stock.grainDirection,
      pricingUnit: stock.pricingUnit,
      pricePerUnit: stock.pricePerUnit,
      color: stock.color
    });
  }, []);

  const handleStartCreate = useCallback(() => {
    setSelectedStockId(null);
    setIsEditing(false);
    setIsCreating(true);
    setFormData(defaultStock);
  }, []);

  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setIsCreating(false);
    if (selectedStockId) {
      const stock = stocks.find((s) => s.id === selectedStockId);
      if (stock) {
        setFormData({
          name: stock.name,
          length: stock.length,
          width: stock.width,
          thickness: stock.thickness,
          grainDirection: stock.grainDirection,
          pricingUnit: stock.pricingUnit,
          pricePerUnit: stock.pricePerUnit,
          color: stock.color
        });
      }
    }
  }, [selectedStockId, stocks]);

  const handleSave = useCallback(() => {
    if (isCreating) {
      const newStock: Stock = {
        id: uuidv4(),
        ...formData
      };
      onAddStock(newStock);
      setSelectedStockId(newStock.id);
      setIsCreating(false);
    } else if (isEditing && selectedStockId) {
      onUpdateStock(selectedStockId, formData);
      setIsEditing(false);
    }
  }, [isCreating, isEditing, selectedStockId, formData, onAddStock, onUpdateStock]);

  const handleDeleteStock = useCallback(() => {
    if (selectedStockId) {
      onDeleteStock(selectedStockId);
      setSelectedStockId(null);
      setFormData(defaultStock);
    }
  }, [selectedStockId, onDeleteStock]);

  const handleExportStock = useCallback(async () => {
    if (!selectedStockId) return;
    try {
      const result = await window.electronAPI.exportStocks([selectedStockId]);
      if (result.success && result.filePath) {
        showToast(`Stock exported to ${result.filePath.split('/').pop()}`, 'success');
      } else if (!result.canceled && result.error) {
        showToast(result.error, 'error');
      }
    } catch (error) {
      console.error('Failed to export stock:', error);
      showToast('Failed to export stock', 'error');
    }
  }, [selectedStockId, showToast]);

  const handleImportStocks = useCallback(async () => {
    try {
      const result = await window.electronAPI.importStocks();
      if (result.success) {
        const message = result.skipped
          ? `Imported ${result.imported} stock${result.imported === 1 ? '' : 's'}, ${result.skipped} skipped`
          : `Imported ${result.imported} stock${result.imported === 1 ? '' : 's'}`;
        showToast(message, 'success');
      } else if (!result.canceled && result.error) {
        showToast(result.error, 'error');
      }
    } catch (error) {
      console.error('Failed to import stocks:', error);
      showToast('Failed to import stocks', 'error');
    }
  }, [showToast]);

  const selectedStock = selectedStockId ? stocks.find((s) => s.id === selectedStockId) : null;

  return (
    <>
      {/* Stock list sidebar */}
      <div className="w-60 border-r border-border flex flex-col">
        <div className="flex justify-between items-center py-3 px-4 border-b border-border text-xs text-text-muted">
          <span>{stocks.length} available</span>
          <div className="flex items-center gap-1">
            <IconButton label="Import stocks" size="xs" onClick={handleImportStocks}>
              <Upload size={14} />
            </IconButton>
            <IconButton label="Create new stock" size="xs" onClick={handleStartCreate}>
              <Plus size={14} />
            </IconButton>
          </div>
        </div>
        {stocks.length > 0 && (
          <div className="flex items-center gap-2 py-2 px-3 bg-bg border border-border rounded mb-2">
            <Search size={14} className="text-text-muted shrink-0" />
            <input
              className="flex-1 border-none bg-transparent text-text text-[13px] outline-none placeholder:text-text-muted"
              type="text"
              placeholder="Search stocks..."
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
        {stocks.length === 0 ? (
          <div className="text-text-muted text-xs italic p-4 text-center">
            <p className="mb-2">📦 No stocks in library yet</p>
            <p className="text-[11px] text-text-muted mt-1">
              Click "+" above to create your first stock material.{' '}
              <a
                href="#"
                className="text-accent no-underline hover:underline hover:text-accent-hover transition-colors duration-150"
                onClick={(e) => {
                  e.preventDefault();
                  window.electronAPI.openExternal('https://carvd-studio.com/docs#stock');
                }}
              >
                Learn more
              </a>
            </p>
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="text-text-muted text-xs italic p-4 text-center">
            <p>No stocks match "{searchTerm}"</p>
          </div>
        ) : (
          <ul className="list-none m-0 p-2 flex-1 min-h-0 overflow-y-auto">
            {filteredStocks.map((stock) => (
              <li
                key={stock.id}
                className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-[background] duration-100 hover:bg-surface-hover ${selectedStockId === stock.id ? 'bg-selected' : ''}`}
                onClick={() => handleSelectStock(stock)}
              >
                <span className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: stock.color }} />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs whitespace-nowrap overflow-hidden text-ellipsis">{stock.name}</span>
                  <span className="text-[10px] text-text-muted">
                    {formatMeasurementWithUnit(stock.length, units)} × {formatMeasurementWithUnit(stock.width, units)} ×{' '}
                    {formatMeasurementWithUnit(stock.thickness, units)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Stock detail/edit panel */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {!selectedStock && !isCreating ? (
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted gap-2">
            <p className="mb-2">Select a stock to view details</p>
            <p className="text-[11px] text-text-muted mt-1">or click "+" to create a new stock material</p>
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
        ) : (
          <>
            <div className="flex justify-between items-center py-4 px-5 border-b border-border">
              <h3 className="text-base font-semibold m-0 flex items-center gap-2">
                {isCreating ? 'New Stock' : formData.name}
              </h3>
              {!isFormMode && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="xs" onClick={handleStartEdit}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="xs" onClick={handleExportStock} title="Export stock to file">
                    <Download size={12} />
                    Export
                  </Button>
                  <Button variant="destructiveOutline" size="xs" onClick={handleDeleteStock}>
                    Delete
                  </Button>
                </div>
              )}
            </div>

            {isFormMode ? (
              <div className="flex-1 p-5 overflow-y-auto">
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
                  <Select
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
                  </Select>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col mb-4 gap-2.5 flex-1">
                    <Label>Pricing Unit</Label>
                    <Select
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
                    </Select>
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

                <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-border">
                  <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    {isCreating ? 'Create' : 'Save'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 p-5 overflow-y-auto">
                <div className="flex justify-between items-start gap-4 py-3 border-b border-border">
                  <span className="text-xs text-text-muted shrink-0">Dimensions</span>
                  <span className="text-[13px] text-text text-right break-words">
                    {formatMeasurementWithUnit(formData.length, units)} ×{' '}
                    {formatMeasurementWithUnit(formData.width, units)} ×{' '}
                    {formatMeasurementWithUnit(formData.thickness, units)}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-4 py-3 border-b border-border">
                  <span className="text-xs text-text-muted shrink-0">Grain</span>
                  <span className="text-[13px] text-text text-right break-words">
                    {formData.grainDirection === 'none' ? 'None' : `Along ${formData.grainDirection}`}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-4 py-3 border-b border-border">
                  <span className="text-xs text-text-muted shrink-0">Pricing</span>
                  <span className="text-[13px] text-text text-right break-words">
                    ${formData.pricePerUnit.toFixed(2)} {formData.pricingUnit === 'board_foot' ? '/ bd ft' : '/ sheet'}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-4 py-3">
                  <span className="text-xs text-text-muted shrink-0">Color</span>
                  <span className="w-6 h-6 rounded border border-border" style={{ backgroundColor: formData.color }} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
