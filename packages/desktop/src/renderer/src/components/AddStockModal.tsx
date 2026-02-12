import { Plus, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { STOCK_COLORS } from '../constants';
import { useBackdropClose } from '../hooks/useBackdropClose';
import { useProjectStore } from '../store/projectStore';
import { Stock } from '../types';
import { formatMeasurementWithUnit } from '../utils/fractions';
import { ColorPicker } from './ColorPicker';
import { FractionInput } from './FractionInput';

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
    <div className="modal-backdrop" onMouseDown={handleMouseDown} onClick={handleClick}>
      <div className="modal add-stock-modal" role="dialog" aria-modal="true" aria-labelledby="add-stock-modal-title">
        <div className="modal-header">
          <h2 id="add-stock-modal-title">Add Stock to Project</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="add-stock-content">
          {/* Library list */}
          <div className="stock-library-sidebar">
            <div className="stock-library-section">
              <div className="stock-library-section-header">
                <span>{stockLibrary.length} available</span>
                <div className="stock-library-section-actions">
                  {stockLibrary.length > 0 && (
                    <button className="btn btn-xs btn-ghost btn-secondary" onClick={handleSelectAll}>
                      {filteredStockLibrary.every((s) => selectedIds.has(s.id)) && filteredStockLibrary.length > 0
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                  )}
                  <button
                    className="btn btn-icon-xs btn-ghost btn-secondary"
                    onClick={handleStartCreate}
                    title="Create new stock"
                    aria-label="Create new stock"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              {stockLibrary.length > 0 && (
                <div className="modal-search">
                  <Search size={14} className="modal-search-icon" />
                  <input
                    type="text"
                    placeholder="Search stock..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button className="modal-search-clear" onClick={() => setSearchTerm('')} aria-label="Clear search">
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}
              {stockLibrary.length === 0 ? (
                <div className="placeholder-text">
                  <p>No stocks in library yet</p>
                  <p className="hint">Click "+" to create your first stock</p>
                </div>
              ) : filteredStockLibrary.length === 0 ? (
                <p className="placeholder-text">No stocks match "{searchTerm}"</p>
              ) : (
                <ul className="stock-library-list">
                  {filteredStockLibrary.map((stock) => (
                    <li
                      key={stock.id}
                      className={`stock-library-item ${selectedIds.has(stock.id) ? 'selected' : ''} ${displayedStockId === stock.id ? 'displayed' : ''}`}
                      onClick={() => handleItemClick(stock)}
                    >
                      <span className="stock-color" style={{ backgroundColor: stock.color }} />
                      <div className="stock-info">
                        <span className="stock-name">{stock.name}</span>
                        <span className="stock-dims">
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
              <div className="stock-library-selection-bar">
                <span>{selectedIds.size} selected</span>
              </div>
            )}
          </div>

          {/* Stock details display or create form */}
          <div className="stock-details">
            {isCreatingNew ? (
              <>
                <div className="stock-details-header">
                  <span className="stock-color-large" style={{ backgroundColor: formData.color }} />
                  <h3>Create New Stock</h3>
                </div>

                <div className="create-stock-form">
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
                </div>
              </>
            ) : displayedStock ? (
              <>
                <div className="stock-details-header">
                  <span className="stock-color-large" style={{ backgroundColor: displayedStock.color }} />
                  <h3>{displayedStock.name}</h3>
                </div>

                <div className="stock-details-grid">
                  <div className="detail-item">
                    <label>Dimensions (L × W × T)</label>
                    <span>
                      {formatMeasurementWithUnit(displayedStock.length, units)} ×{' '}
                      {formatMeasurementWithUnit(displayedStock.width, units)} ×{' '}
                      {formatMeasurementWithUnit(displayedStock.thickness, units)}
                    </span>
                  </div>

                  <div className="detail-item">
                    <label>Grain Direction</label>
                    <span>{grainDirectionLabel(displayedStock.grainDirection)}</span>
                  </div>

                  <div className="detail-item">
                    <label>Pricing</label>
                    <span>
                      ${displayedStock.pricePerUnit.toFixed(2)} {pricingUnitLabel(displayedStock.pricingUnit)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="stock-details-placeholder">
                <p className="mb-2">Select a stock from the library to view details</p>
                <p className="hint text-xs">or click "+" to create one</p>
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
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-sm btn-outlined btn-secondary"
            onClick={isCreatingNew ? handleCancelCreate : onClose}
          >
            {isCreatingNew ? 'Back' : stockLibrary.length === 0 ? 'Close' : 'Cancel'}
          </button>
          {isCreatingNew ? (
            <button className="btn btn-sm btn-filled btn-primary" onClick={handleCreateStock}>
              Create & Add to Project
            </button>
          ) : (
            <button
              className="btn btn-sm btn-filled btn-primary"
              onClick={handleAddToProject}
              disabled={selectedIds.size === 0}
            >
              Add to Project{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
