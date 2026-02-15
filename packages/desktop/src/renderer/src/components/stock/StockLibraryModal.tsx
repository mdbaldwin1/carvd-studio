import { Copy, Plus, Search, X, Download, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { STOCK_COLORS } from '../../constants';
import { useBackdropClose } from '../../hooks/useBackdropClose';
import { useProjectStore } from '../../store/projectStore';
import { isBuiltInAssembly } from '../../templates/builtInAssemblies';
import { Assembly, Stock } from '../../types';
import { formatMeasurementWithUnit } from '../../utils/fractions';
import { getFeatureLimits } from '../../utils/featureLimits';
import { ColorPicker } from '../common/ColorPicker';
import { FractionInput } from '../common/FractionInput';
import { HelpTooltip } from '../common/HelpTooltip';

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
  onDuplicateAssembly?: (assembly: Assembly) => Promise<void>;
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
  onDuplicateAssembly,
  onEditAssemblyIn3D,
  onCreateNewAssembly
}: StockLibraryModalProps) {
  const units = useProjectStore((s) => s.units);
  const licenseMode = useProjectStore((s) => s.licenseMode);
  const limits = getFeatureLimits(licenseMode);
  const canCreateAssemblies = limits.canUseAssemblies;
  const [activeTab, setActiveTab] = useState<LibraryTab>('stocks');
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Omit<Stock, 'id'>>(defaultStock);
  // Assembly editing state
  const [isEditingAssembly, setIsEditingAssembly] = useState(false);
  const [assemblyFormData, setAssemblyFormData] = useState({ name: '', description: '' });
  // Search state
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [assemblySearchTerm, setAssemblySearchTerm] = useState('');

  // Filtered lists based on search
  const filteredStocks = useMemo(
    () =>
      stockSearchTerm ? stocks.filter((s) => s.name.toLowerCase().includes(stockSearchTerm.toLowerCase())) : stocks,
    [stocks, stockSearchTerm]
  );

  const filteredAssemblies = useMemo(
    () =>
      assemblySearchTerm
        ? assemblies.filter((a) => a.name.toLowerCase().includes(assemblySearchTerm.toLowerCase()))
        : assemblies,
    [assemblies, assemblySearchTerm]
  );

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
      setStockSearchTerm('');
      setAssemblySearchTerm('');
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
    setStockSearchTerm('');
    setAssemblySearchTerm('');
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

  // Export/Import handlers
  const showToast = useProjectStore((s) => s.showToast);

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

  const handleExportAssembly = useCallback(async () => {
    if (!selectedAssemblyId) return;
    try {
      const result = await window.electronAPI.exportAssembly(selectedAssemblyId);
      if (result.success && result.filePath) {
        const message = result.stocksIncluded
          ? `Assembly exported with ${result.stocksIncluded} stock${result.stocksIncluded === 1 ? '' : 's'}`
          : 'Assembly exported successfully';
        showToast(message, 'success');
      } else if (!result.canceled && result.error) {
        showToast(result.error, 'error');
      }
    } catch (error) {
      console.error('Failed to export assembly:', error);
      showToast('Failed to export assembly', 'error');
    }
  }, [selectedAssemblyId, showToast]);

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

  const handleImportAssembly = useCallback(async () => {
    try {
      const result = await window.electronAPI.importAssembly({ importStocks: true });
      if (result.success && result.assemblyId) {
        const message = result.stocksImported
          ? `Assembly imported with ${result.stocksImported} stock${result.stocksImported === 1 ? '' : 's'}`
          : 'Assembly imported successfully';
        showToast(message, 'success');
      } else if (!result.canceled && result.error) {
        showToast(result.error, 'error');
      }
    } catch (error) {
      console.error('Failed to import assembly:', error);
      showToast('Failed to import assembly', 'error');
    }
  }, [showToast]);

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
      <div className="modal stock-library-modal" role="dialog" aria-modal="true" aria-labelledby="library-modal-title">
        <div className="modal-header">
          <h2 id="library-modal-title">Library</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
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

        {/* Upgrade banner for free mode users - shown above assemblies tab content */}
        {activeTab === 'assemblies' && !canCreateAssemblies && (
          <div className="upgrade-banner">
            <span>Upgrade to create and edit assemblies</span>
          </div>
        )}

        <div className="stock-library-content">
          {activeTab === 'stocks' ? (
            <>
              {/* Stock list sidebar */}
              <div className="stock-library-list-panel">
                <div className="stock-library-list-header">
                  <span>{stocks.length} available</span>
                  <div className="stock-library-header-actions">
                    <button
                      className="btn btn-icon-xs btn-ghost btn-secondary"
                      onClick={handleImportStocks}
                      title="Import stocks from file"
                      aria-label="Import stocks"
                    >
                      <Upload size={14} />
                    </button>
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
                {stocks.length > 0 && (
                  <div className="modal-search">
                    <Search size={14} className="modal-search-icon" />
                    <input
                      type="text"
                      placeholder="Search stocks..."
                      value={stockSearchTerm}
                      onChange={(e) => setStockSearchTerm(e.target.value)}
                    />
                    {stockSearchTerm && (
                      <button
                        className="modal-search-clear"
                        onClick={() => setStockSearchTerm('')}
                        aria-label="Clear search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                )}
                {stocks.length === 0 ? (
                  <div className="placeholder-text">
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
                  <div className="placeholder-text">
                    <p>No stocks match "{stockSearchTerm}"</p>
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
                          <ColorPicker
                            value={formData.color}
                            onChange={(color) => setFormData({ ...formData, color })}
                          />
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
                            ${formData.pricePerUnit.toFixed(2)}{' '}
                            {formData.pricingUnit === 'board_foot' ? '/ bd ft' : '/ sheet'}
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
          ) : (
            <>
              {/* Assemblies list sidebar */}
              <div className="stock-library-list-panel">
                <div className="stock-library-list-header">
                  <span>{assemblies.length} available</span>
                  <div className="stock-library-header-actions">
                    {canCreateAssemblies && (
                      <button
                        className="btn btn-icon-xs btn-ghost btn-secondary"
                        onClick={handleImportAssembly}
                        title="Import assembly from file"
                        aria-label="Import assembly"
                      >
                        <Upload size={14} />
                      </button>
                    )}
                    {onCreateNewAssembly && canCreateAssemblies && (
                      <button
                        className="btn btn-icon-xs btn-ghost btn-secondary"
                        onClick={async () => {
                          const success = await onCreateNewAssembly();
                          if (success) {
                            onClose();
                          }
                        }}
                        title="Create new assembly"
                        aria-label="Create new assembly"
                      >
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                </div>
                {assemblies.length > 0 && (
                  <div className="modal-search">
                    <Search size={14} className="modal-search-icon" />
                    <input
                      type="text"
                      placeholder="Search assemblies..."
                      value={assemblySearchTerm}
                      onChange={(e) => setAssemblySearchTerm(e.target.value)}
                    />
                    {assemblySearchTerm && (
                      <button
                        className="modal-search-clear"
                        onClick={() => setAssemblySearchTerm('')}
                        aria-label="Clear search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                )}
                {assemblies.length === 0 ? (
                  <div className="placeholder-text">
                    {!canCreateAssemblies ? (
                      <>
                        <p>Assemblies require a license</p>
                        <p className="hint">
                          Upgrade to create and use assemblies.{' '}
                          <a
                            href="#"
                            className="learn-more-link"
                            onClick={(e) => {
                              e.preventDefault();
                              window.electronAPI.openExternal('https://carvd-studio.com/docs#assemblies');
                            }}
                          >
                            Learn more
                          </a>
                        </p>
                      </>
                    ) : (
                      <>
                        <p>No assemblies in library yet</p>
                        <p className="hint">
                          {onCreateNewAssembly ? (
                            <>
                              Click "+" above or save a selection as an assembly from the canvas.{' '}
                              <a
                                href="#"
                                className="learn-more-link"
                                onClick={(e) => {
                                  e.preventDefault();
                                  window.electronAPI.openExternal('https://carvd-studio.com/docs#assemblies');
                                }}
                              >
                                Learn more
                              </a>
                            </>
                          ) : (
                            <>
                              Save a selection as an assembly from the canvas.{' '}
                              <a
                                href="#"
                                className="learn-more-link"
                                onClick={(e) => {
                                  e.preventDefault();
                                  window.electronAPI.openExternal('https://carvd-studio.com/docs#assemblies');
                                }}
                              >
                                Learn more
                              </a>
                            </>
                          )}
                        </p>
                      </>
                    )}
                  </div>
                ) : filteredAssemblies.length === 0 ? (
                  <div className="placeholder-text">
                    <p>No assemblies match "{assemblySearchTerm}"</p>
                  </div>
                ) : (
                  <ul className="stock-library-list">
                    {filteredAssemblies.map((assembly) => (
                      <li
                        key={assembly.id}
                        className={`stock-library-item ${selectedAssemblyId === assembly.id ? 'selected' : ''} ${isBuiltInAssembly(assembly.id) ? 'built-in' : ''}`}
                        onClick={() => handleSelectAssembly(assembly)}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/carvd-assembly', assembly.id);
                          e.dataTransfer.setData('application/carvd-assembly-source', 'library');
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                      >
                        {assembly.thumbnailData?.data ? (
                          <img src={assembly.thumbnailData.data} alt={assembly.name} className="assembly-thumbnail" />
                        ) : (
                          <span className="assembly-icon">📦</span>
                        )}
                        <div className="stock-info">
                          <span className="stock-name">
                            {assembly.name}
                            {isBuiltInAssembly(assembly.id) && <span className="built-in-badge">Built-in</span>}
                          </span>
                          <span className="stock-dims">
                            {assembly.parts.length} part{assembly.parts.length !== 1 ? 's' : ''}
                            {assembly.groups.length > 0 &&
                              `, ${assembly.groups.length} group${assembly.groups.length !== 1 ? 's' : ''}`}
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
                    <p className="hint">or click "+" to create a new assembly</p>
                    <a
                      href="#"
                      className="learn-more-link text-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        window.electronAPI.openExternal('https://carvd-studio.com/docs#assemblies');
                      }}
                    >
                      Learn more about assemblies
                    </a>
                  </div>
                ) : (
                  <>
                    <div className="stock-detail-header">
                      <h3>
                        {isEditingAssembly ? 'Edit Assembly' : selectedAssembly.name}
                        {!isEditingAssembly && isBuiltInAssembly(selectedAssembly.id) && (
                          <span className="built-in-badge">Built-in</span>
                        )}
                      </h3>
                      {!isEditingAssembly && (
                        <div className="stock-detail-actions">
                          {/* Edit buttons only for non-built-in assemblies and licensed users */}
                          {!isBuiltInAssembly(selectedAssembly.id) && canCreateAssemblies && (
                            <>
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
                            </>
                          )}
                          {/* Duplicate button - always available for licensed users */}
                          {onDuplicateAssembly && canCreateAssemblies && (
                            <button
                              className="btn btn-xs btn-ghost btn-secondary"
                              onClick={async () => {
                                await onDuplicateAssembly(selectedAssembly);
                              }}
                              title="Create a copy of this assembly"
                            >
                              <Copy size={12} />
                              Duplicate
                            </button>
                          )}
                          {/* Export button - available for non-built-in assemblies */}
                          {!isBuiltInAssembly(selectedAssembly.id) && canCreateAssemblies && (
                            <button
                              className="btn btn-xs btn-ghost btn-secondary"
                              onClick={handleExportAssembly}
                              title="Export assembly to file"
                            >
                              <Download size={12} />
                              Export
                            </button>
                          )}
                          {/* Delete only for non-built-in assemblies */}
                          {!isBuiltInAssembly(selectedAssembly.id) && (
                            <button className="btn btn-xs btn-outlined btn-danger" onClick={handleDeleteAssembly}>
                              Delete
                            </button>
                          )}
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

                        {onEditAssemblyIn3D && !isBuiltInAssembly(selectedAssembly.id) && canCreateAssemblies && (
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
                              <HelpTooltip
                                text="Opens this assembly in the 3D workspace for editing parts and positions."
                                docsSection="assemblies"
                                inline
                              />
                            </button>
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
                                  {formatMeasurementWithUnit(part.length, units)} ×{' '}
                                  {formatMeasurementWithUnit(part.width, units)} ×{' '}
                                  {formatMeasurementWithUnit(part.thickness, units)}
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
