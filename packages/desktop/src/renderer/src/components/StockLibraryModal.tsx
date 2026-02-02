import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Stock, Assembly } from '../types';
import { FractionInput } from './FractionInput';
import { STOCK_COLORS } from '../constants';
import { formatMeasurementWithUnit } from '../utils/fractions';
import { useProjectStore } from '../store/projectStore';
import { useBackdropClose } from '../hooks/useBackdropClose';

type LibraryTab = 'stocks' | 'assemblies';

interface StockLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  stocks: Stock[];
  onAddStock: (stock: Stock) => void;
  onUpdateStock: (id: string, updates: Partial<Stock>) => void;
  onDeleteStock: (id: string) => void;
  assemblies: Assembly[];
  onUpdateAssembly: (id: string, updates: Partial<Assembly>) => void;
  onDeleteAssembly: (id: string) => void;
  onEditAssemblyIn3D?: (assembly: Assembly) => Promise<boolean>;
  onCreateNewAssembly?: () => Promise<boolean>;
}

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

export function StockLibraryModal({
  isOpen,
  onClose,
  stocks,
  onAddStock,
  onUpdateStock,
  onDeleteStock,
  assemblies,
  onUpdateAssembly,
  onDeleteAssembly,
  onEditAssemblyIn3D,
  onCreateNewAssembly
}: StockLibraryModalProps) {
  const units = useProjectStore((s) => s.units);
  const [activeTab, setActiveTab] = useState<LibraryTab>('stocks');
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Omit<Stock, 'id'>>(defaultStock);
  // Assembly editing state
  const [isEditingAssembly, setIsEditingAssembly] = useState(false);
  const [assemblyFormData, setAssemblyFormData] = useState({ name: '', description: '' });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedStockId(null);
      setSelectedAssemblyId(null);
      setIsEditing(false);
      setIsCreating(false);
      setFormData(defaultStock);
      setIsEditingAssembly(false);
      setAssemblyFormData({ name: '', description: '' });
    }
  }, [isOpen]);

  // Reset selection when switching tabs
  useEffect(() => {
    setSelectedStockId(null);
    setSelectedAssemblyId(null);
    setIsEditing(false);
    setIsCreating(false);
    setFormData(defaultStock);
    setIsEditingAssembly(false);
    setAssemblyFormData({ name: '', description: '' });
  }, [activeTab]);

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

  const handleSelectAssembly = useCallback((assembly: Assembly) => {
    setSelectedAssemblyId(assembly.id);
    setIsEditingAssembly(false);
    setAssemblyFormData({ name: assembly.name, description: assembly.description || '' });
  }, []);

  const handleStartEditAssembly = useCallback(() => {
    setIsEditingAssembly(true);
  }, []);

  const handleCancelEditAssembly = useCallback(() => {
    setIsEditingAssembly(false);
    if (selectedAssemblyId) {
      const assembly = assemblies.find((a) => a.id === selectedAssemblyId);
      if (assembly) {
        setAssemblyFormData({ name: assembly.name, description: assembly.description || '' });
      }
    }
  }, [selectedAssemblyId, assemblies]);

  const handleSaveAssembly = useCallback(() => {
    if (selectedAssemblyId) {
      onUpdateAssembly(selectedAssemblyId, {
        name: assemblyFormData.name,
        description: assemblyFormData.description || undefined,
        modifiedAt: new Date().toISOString()
      });
      setIsEditingAssembly(false);
    }
  }, [selectedAssemblyId, assemblyFormData, onUpdateAssembly]);

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

  const handleDeleteAssembly = useCallback(() => {
    if (selectedAssemblyId) {
      onDeleteAssembly(selectedAssemblyId);
      setSelectedAssemblyId(null);
    }
  }, [selectedAssemblyId, onDeleteAssembly]);

  const { handleMouseDown, handleClick } = useBackdropClose(onClose);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isEditing || isCreating) {
          handleCancelEdit();
        } else if (isEditingAssembly) {
          handleCancelEditAssembly();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEditing, isCreating, isEditingAssembly, handleCancelEdit, handleCancelEditAssembly, onClose]);

  if (!isOpen) return null;

  const selectedStock = selectedStockId ? stocks.find((s) => s.id === selectedStockId) : null;
  const selectedAssembly = selectedAssemblyId ? assemblies.find((a) => a.id === selectedAssemblyId) : null;
  const isFormMode = isEditing || isCreating;

  return (
    <div className="modal-backdrop" onMouseDown={handleMouseDown} onClick={handleClick}>
      <div className="modal stock-library-modal">
        <div className="modal-header">
          <h2>Library</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Tab bar */}
        <div className="library-tabs">
          <button
            className={`library-tab ${activeTab === 'stocks' ? 'active' : ''}`}
            onClick={() => setActiveTab('stocks')}
          >
            Stocks ({stocks.length})
          </button>
          <button
            className={`library-tab ${activeTab === 'assemblies' ? 'active' : ''}`}
            onClick={() => setActiveTab('assemblies')}
          >
            Assemblies ({assemblies.length})
          </button>
        </div>

        <div className="stock-library-content">
          {activeTab === 'stocks' ? (
            <>
              {/* Stock list sidebar */}
              <div className="stock-library-list-panel">
                <div className="stock-library-list-header">
                  <span>{stocks.length} stock type{stocks.length !== 1 ? 's' : ''}</span>
                  <button className="btn btn-xs btn-ghost btn-secondary" onClick={handleStartCreate}>
                    + Add
                  </button>
                </div>
                {stocks.length === 0 ? (
                  <div className="placeholder-text">
                    <p className="mb-2">📦 No stocks in library yet</p>
                    <p className="hint text-xs">Click "+ Add" above to create your first stock material</p>
                  </div>
                ) : (
                  <ul className="stock-library-list">
                    {stocks.map((stock) => (
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
                    <div className="text-4xl mb-4">📐</div>
                    <p className="mb-2">Select a stock to view details</p>
                    <p className="hint text-xs">or click "+ Add" to create a new stock material</p>
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
                          <button className="btn btn-xs btn-outlined btn-danger" onClick={handleDeleteStock}>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {isFormMode ? (
                      // Edit/Create form
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
                      // View mode
                      <div className="stock-detail-view">
                        <div className="detail-row">
                          <span className="detail-label">Dimensions</span>
                          <span className="detail-value">
                            {formatMeasurementWithUnit(formData.length, units)} × {formatMeasurementWithUnit(formData.width, units)} ×{' '}
                            {formatMeasurementWithUnit(formData.thickness, units)}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Grain</span>
                          <span className="detail-value">
                            {formData.grainDirection === 'none'
                              ? 'None'
                              : `Along ${formData.grainDirection}`}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Pricing</span>
                          <span className="detail-value">
                            ${formData.pricePerUnit.toFixed(2)}{' '}
                            {formData.pricingUnit === 'board_foot' ? '/ bd ft' : '/ sheet'}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Color</span>
                          <span
                            className="detail-color-swatch"
                            style={{ backgroundColor: formData.color }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Assemblies list sidebar */}
              <div className="stock-library-list-panel">
                <div className="stock-library-list-header">
                  <span>{assemblies.length} assembl{assemblies.length !== 1 ? 'ies' : 'y'}</span>
                  {onCreateNewAssembly && (
                    <button
                      className="btn btn-xs btn-ghost btn-secondary"
                      onClick={async () => {
                        const success = await onCreateNewAssembly();
                        if (success) {
                          onClose();
                        }
                      }}
                      title="Create new assembly"
                    >
                      + New
                    </button>
                  )}
                </div>
                {assemblies.length === 0 ? (
                  <div className="placeholder-text">
                    <p>No assemblies in library yet</p>
                    <p className="hint">
                      {onCreateNewAssembly ? (
                        <>Click "+ New" above or save a selection as an assembly from the canvas</>
                      ) : (
                        <>Save a selection as an assembly from the canvas</>
                      )}
                    </p>
                  </div>
                ) : (
                  <ul className="stock-library-list">
                    {assemblies.map((assembly) => (
                      <li
                        key={assembly.id}
                        className={`stock-library-item ${selectedAssemblyId === assembly.id ? 'selected' : ''}`}
                        onClick={() => handleSelectAssembly(assembly)}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/carvd-assembly', assembly.id);
                          e.dataTransfer.setData('application/carvd-assembly-source', 'library');
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                      >
                        <span className="assembly-icon">📦</span>
                        <div className="stock-info">
                          <span className="stock-name">{assembly.name}</span>
                          <span className="stock-dims">
                            {assembly.parts.length} part{assembly.parts.length !== 1 ? 's' : ''}
                            {assembly.groups.length > 0 && `, ${assembly.groups.length} group${assembly.groups.length !== 1 ? 's' : ''}`}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Assembly detail panel */}
              <div className="stock-library-detail-panel">
                {!selectedAssembly ? (
                  <div className="stock-library-empty">
                    <p>Select an assembly to view details</p>
                    <p className="hint">Drag assemblies onto the canvas to place them</p>
                  </div>
                ) : (
                  <>
                    <div className="stock-detail-header">
                      <h3>{isEditingAssembly ? 'Edit Assembly' : selectedAssembly.name}</h3>
                      {!isEditingAssembly && (
                        <div className="stock-detail-actions">
                          <button className="btn btn-xs btn-ghost btn-secondary" onClick={handleStartEditAssembly}>
                            Edit
                          </button>
                          {onEditAssemblyIn3D && (
                            <button
                              className="btn btn-xs btn-ghost btn-secondary"
                              onClick={async () => {
                                const success = await onEditAssemblyIn3D(selectedAssembly);
                                if (success) {
                                  onClose();
                                }
                              }}
                            >
                              Edit in 3D
                            </button>
                          )}
                          <button className="btn btn-xs btn-outlined btn-danger" onClick={handleDeleteAssembly}>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {isEditingAssembly ? (
                      // Edit form for assembly metadata
                      <div className="stock-edit-form">
                        <div className="form-group">
                          <label>Name</label>
                          <input
                            type="text"
                            value={assemblyFormData.name}
                            onChange={(e) => setAssemblyFormData({ ...assemblyFormData, name: e.target.value })}
                          />
                        </div>

                        <div className="form-group">
                          <label>Description</label>
                          <textarea
                            value={assemblyFormData.description}
                            onChange={(e) => setAssemblyFormData({ ...assemblyFormData, description: e.target.value })}
                            placeholder="Optional description"
                            rows={3}
                          />
                        </div>

                        {onEditAssemblyIn3D && (
                          <div className="form-group">
                            <button
                              className="btn btn-sm btn-outlined btn-secondary edit-3d-btn"
                              onClick={async () => {
                                const success = await onEditAssemblyIn3D(selectedAssembly);
                                if (success) {
                                  onClose();
                                }
                              }}
                            >
                              Edit Layout in 3D
                            </button>
                            <p className="hint">Opens this assembly in the 3D workspace for editing parts and positions.</p>
                          </div>
                        )}

                        <div className="form-actions">
                          <button className="btn btn-sm btn-outlined btn-secondary" onClick={handleCancelEditAssembly}>
                            Cancel
                          </button>
                          <button className="btn btn-sm btn-filled btn-primary" onClick={handleSaveAssembly}>
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="stock-detail-view">
                        {selectedAssembly.description && (
                          <div className="detail-row">
                            <span className="detail-label">Description</span>
                            <span className="detail-value">{selectedAssembly.description}</span>
                          </div>
                        )}
                        <div className="detail-row">
                          <span className="detail-label">Parts</span>
                          <span className="detail-value">{selectedAssembly.parts.length}</span>
                        </div>
                        {selectedAssembly.groups.length > 0 && (
                          <div className="detail-row">
                            <span className="detail-label">Groups</span>
                            <span className="detail-value">{selectedAssembly.groups.length}</span>
                          </div>
                        )}
                        <div className="detail-row">
                          <span className="detail-label">Created</span>
                          <span className="detail-value">
                            {new Date(selectedAssembly.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Modified</span>
                          <span className="detail-value">
                            {new Date(selectedAssembly.modifiedAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Parts list */}
                        <div className="assembly-parts-list">
                          <span className="detail-label">Parts in this assembly:</span>
                          <ul className="assembly-parts">
                            {selectedAssembly.parts.map((part, index) => (
                              <li key={index} className="assembly-part-item">
                                <span className="assembly-part-name">{part.name}</span>
                                <span className="assembly-part-dims">
                                  {formatMeasurementWithUnit(part.length, units)} × {formatMeasurementWithUnit(part.width, units)} × {formatMeasurementWithUnit(part.thickness, units)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-sm btn-filled btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
