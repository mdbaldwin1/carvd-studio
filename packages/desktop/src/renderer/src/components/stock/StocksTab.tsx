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
      <div className="stock-library-list-panel">
        <div className="stock-library-list-header">
          <span>{stocks.length} available</span>
          <div className="stock-library-header-actions">
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
            <p className="hint text-xs">
              Click "+" above to create your first stock material.{' '}
              <a
                href="#"
                className="learn-more-link"
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
          <ul className="stock-library-list">
            {filteredStocks.map((stock) => (
              <li
                key={stock.id}
                className={`stock-library-item ${selectedStockId === stock.id ? 'selected' : ''}`}
                onClick={() => handleSelectStock(stock)}
              >
                <span className="stock-color" style={{ backgroundColor: stock.color }} />
                <div className="stock-info">
                  <span className="stock-name">{stock.name}</span>
                  <span className="stock-dims">
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
      <div className="stock-library-detail-panel">
        {!selectedStock && !isCreating ? (
          <div className="stock-library-empty">
            <p className="mb-2">Select a stock to view details</p>
            <p className="hint text-xs">or click "+" to create a new stock material</p>
            <a
              href="#"
              className="learn-more-link text-xs"
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
            <div className="stock-detail-header">
              <h3>{isCreating ? 'New Stock' : formData.name}</h3>
              {!isFormMode && (
                <div className="stock-detail-actions">
                  <button className="btn btn-xs btn-ghost btn-secondary" onClick={handleStartEdit}>
                    Edit
                  </button>
                  <button
                    className="btn btn-xs btn-ghost btn-secondary"
                    onClick={handleExportStock}
                    title="Export stock to file"
                  >
                    <Download size={12} />
                    Export
                  </button>
                  <button className="btn btn-xs btn-outlined btn-danger" onClick={handleDeleteStock}>
                    Delete
                  </button>
                </div>
              )}
            </div>

            {isFormMode ? (
              <div className="stock-edit-form">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Dimensions (L × W × T)</label>
                  <div className="dimension-inputs">
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

                <div className="form-group">
                  <label>Grain Direction</label>
                  <select
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

                <div className="form-row">
                  <div className="form-group">
                    <label>Pricing Unit</label>
                    <select
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

                  <div className="form-group">
                    <label>Price ($)</label>
                    <input
                      type="number"
                      value={formData.pricePerUnit}
                      onChange={(e) => setFormData({ ...formData, pricePerUnit: parseFloat(e.target.value) || 0 })}
                      min={0}
                      step={0.01}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Display Color</label>
                  <ColorPicker value={formData.color} onChange={(color) => setFormData({ ...formData, color })} />
                </div>

                <div className="form-actions">
                  <button className="btn btn-sm btn-outlined btn-secondary" onClick={handleCancelEdit}>
                    Cancel
                  </button>
                  <button className="btn btn-sm btn-filled btn-primary" onClick={handleSave}>
                    {isCreating ? 'Create' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="stock-detail-view">
                <div className="detail-row">
                  <span className="detail-label">Dimensions</span>
                  <span className="detail-value">
                    {formatMeasurementWithUnit(formData.length, units)} ×{' '}
                    {formatMeasurementWithUnit(formData.width, units)} ×{' '}
                    {formatMeasurementWithUnit(formData.thickness, units)}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Grain</span>
                  <span className="detail-value">
                    {formData.grainDirection === 'none' ? 'None' : `Along ${formData.grainDirection}`}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Pricing</span>
                  <span className="detail-value">
                    ${formData.pricePerUnit.toFixed(2)} {formData.pricingUnit === 'board_foot' ? '/ bd ft' : '/ sheet'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Color</span>
                  <span className="detail-color-swatch" style={{ backgroundColor: formData.color }} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
