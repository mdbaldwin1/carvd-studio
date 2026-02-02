import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Stock } from '../types';
import { useBackdropClose } from '../hooks/useBackdropClose';
import { formatMeasurementWithUnit } from '../utils/fractions';
import { useProjectStore } from '../store/projectStore';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStock: (stock: Stock) => void;
  stockLibrary: Stock[];
  onAddToLibrary: (stock: Stock) => void;
}

export function AddStockModal({
  isOpen,
  onClose,
  onAddStock,
  stockLibrary
}: AddStockModalProps) {
  const units = useProjectStore((s) => s.units);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [displayedStockId, setDisplayedStockId] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setDisplayedStockId(null);
    }
  }, [isOpen]);

  // Get the currently displayed stock
  const displayedStock = displayedStockId
    ? stockLibrary.find((s) => s.id === displayedStockId)
    : null;

  const handleItemClick = useCallback((stock: Stock) => {
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
  }, [displayedStockId]);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === stockLibrary.length) {
      setSelectedIds(new Set());
      setDisplayedStockId(null);
    } else {
      setSelectedIds(new Set(stockLibrary.map((s) => s.id)));
      // Display the last item in the library
      if (stockLibrary.length > 0) {
        setDisplayedStockId(stockLibrary[stockLibrary.length - 1].id);
      }
    }
  }, [selectedIds.size, stockLibrary]);

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
      <div className="modal add-stock-modal">
        <div className="modal-header">
          <h2>Add Stock to Project</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="add-stock-content">
          {/* Library list */}
          <div className="stock-library-sidebar">
            <div className="stock-library-section">
              <div className="stock-library-section-header">
                <h4>Stock Library</h4>
                {stockLibrary.length > 0 && (
                  <button
                    className="btn btn-xs btn-ghost btn-secondary"
                    onClick={handleSelectAll}
                  >
                    {selectedIds.size === stockLibrary.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>
              {stockLibrary.length === 0 ? (
                <p className="placeholder-text">No stocks in library yet</p>
              ) : (
                <ul className="stock-library-list">
                  {stockLibrary.map((stock) => (
                    <li
                      key={stock.id}
                      className={`stock-library-item ${selectedIds.has(stock.id) ? 'selected' : ''} ${displayedStockId === stock.id ? 'displayed' : ''}`}
                      onClick={() => handleItemClick(stock)}
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
            {selectedIds.size > 0 && (
              <div className="stock-library-selection-bar">
                <span>{selectedIds.size} selected</span>
              </div>
            )}
          </div>

          {/* Stock details display */}
          <div className="stock-details">
            {displayedStock ? (
              <>
                <div className="stock-details-header">
                  <span className="stock-color-large" style={{ backgroundColor: displayedStock.color }} />
                  <h3>{displayedStock.name}</h3>
                </div>

                <div className="stock-details-grid">
                  <div className="detail-item">
                    <label>Dimensions (L × W × T)</label>
                    <span>
                      {formatMeasurementWithUnit(displayedStock.length, units)} × {formatMeasurementWithUnit(displayedStock.width, units)} × {formatMeasurementWithUnit(displayedStock.thickness, units)}
                    </span>
                  </div>

                  <div className="detail-item">
                    <label>Grain Direction</label>
                    <span>{grainDirectionLabel(displayedStock.grainDirection)}</span>
                  </div>

                  <div className="detail-item">
                    <label>Pricing</label>
                    <span>${displayedStock.pricePerUnit.toFixed(2)} {pricingUnitLabel(displayedStock.pricingUnit)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="stock-details-placeholder">
                <p>Select a stock from the library to view details</p>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-sm btn-outlined btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-sm btn-filled btn-primary"
            onClick={handleAddToProject}
            disabled={selectedIds.size === 0}
          >
            Add to Project{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
