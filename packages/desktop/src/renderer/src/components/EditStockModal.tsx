import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Stock } from '../types';
import { FractionInput } from './FractionInput';
import { STOCK_COLORS } from '../constants';
import { useBackdropClose } from '../hooks/useBackdropClose';

interface EditStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: Stock | null;
  onUpdateStock: (id: string, updates: Partial<Stock>) => void;
  createMode?: boolean;
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

export function EditStockModal({ isOpen, onClose, stock, onUpdateStock, createMode = false }: EditStockModalProps) {
  const [formData, setFormData] = useState<Omit<Stock, 'id'>>(defaultFormData);

  // Update form when stock changes or when opening in create mode
  useEffect(() => {
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
    } else if (createMode && isOpen) {
      // Reset to defaults for create mode
      setFormData({
        ...defaultFormData,
        color: STOCK_COLORS[Math.floor(Math.random() * STOCK_COLORS.length)]
      });
    }
  }, [stock, createMode, isOpen]);

  const handleSubmit = useCallback(() => {
    if (createMode) {
      // Create new stock
      const newId = uuidv4();
      onUpdateStock(newId, formData);
      onClose();
    } else if (stock) {
      onUpdateStock(stock.id, formData);
      onClose();
    }
  }, [stock, formData, onUpdateStock, onClose, createMode]);

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

  if (!isOpen || (!stock && !createMode)) return null;

  return (
    <div className="modal-backdrop" onMouseDown={handleMouseDown} onClick={handleClick}>
      <div className="modal edit-stock-modal">
        <div className="modal-header">
          <h2>{createMode ? 'Create New Stock' : 'Edit Stock'}</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="edit-stock-content">
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
                onChange={(e) =>
                  setFormData({ ...formData, pricePerUnit: parseFloat(e.target.value) || 0 })
                }
                min={0}
                step={0.01}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Display Color</label>
            <div className="color-picker-row">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
              <div className="color-presets">
                {STOCK_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`color-preset ${formData.color === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-sm btn-outlined btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-sm btn-filled btn-primary" onClick={handleSubmit}>
            {createMode ? 'Create Stock' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
