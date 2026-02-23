import { Button } from '@renderer/components/ui/button';
import { Download, Plus, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { STOCK_COLORS } from '../../constants';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { Stock } from '../../types';
import { formatMeasurementWithUnit } from '../../utils/fractions';
import { showSavedFileToast } from '../../utils/fileToast';
import { DocsLink } from '../common/library/DocsLink';
import { LibraryDetailHeader } from '../common/library/LibraryDetailHeader';
import { LibraryDetailPane } from '../common/library/LibraryDetailPane';
import { LibraryDetailRow } from '../common/library/LibraryDetailRow';
import { LibraryEmptyState } from '../common/library/LibraryEmptyState';
import { LibrarySidebar } from '../common/library/LibrarySidebar';
import { StockFormFields } from './StockFormFields';
import { StockListItem } from './StockListItem';

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
  hideInlineFormActions?: boolean;
  onFormModeChange?: (state: {
    isFormMode: boolean;
    confirmLabel?: 'Save' | 'Create';
    canConfirm?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
  }) => void;
}

export function StocksTab({
  stocks,
  onAddStock,
  onUpdateStock,
  onDeleteStock,
  onClose,
  hideInlineFormActions = false,
  onFormModeChange
}: StocksTabProps) {
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
  const selectedStock = selectedStockId ? stocks.find((s) => s.id === selectedStockId) : null;
  const hasUnsavedFormChanges = useMemo(() => {
    if (!isFormMode) return false;
    if (isCreating) {
      return (
        formData.name !== defaultStock.name ||
        formData.length !== defaultStock.length ||
        formData.width !== defaultStock.width ||
        formData.thickness !== defaultStock.thickness ||
        formData.grainDirection !== defaultStock.grainDirection ||
        formData.pricingUnit !== defaultStock.pricingUnit ||
        formData.pricePerUnit !== defaultStock.pricePerUnit ||
        formData.color !== defaultStock.color
      );
    }
    if (!selectedStock) return false;
    return (
      formData.name !== selectedStock.name ||
      formData.length !== selectedStock.length ||
      formData.width !== selectedStock.width ||
      formData.thickness !== selectedStock.thickness ||
      formData.grainDirection !== selectedStock.grainDirection ||
      formData.pricingUnit !== selectedStock.pricingUnit ||
      formData.pricePerUnit !== selectedStock.pricePerUnit ||
      formData.color !== selectedStock.color
    );
  }, [formData, isCreating, isFormMode, selectedStock]);

  const confirmDiscardUnsaved = useCallback(() => {
    if (!hasUnsavedFormChanges) return true;
    return window.confirm('Discard unsaved stock changes?');
  }, [hasUnsavedFormChanges]);

  // Handle escape key; capture phase ensures edit-cancel takes precedence over dialog-close.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (isFormMode) {
          handleCancelEdit();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleCancelEdit is a useCallback defined below; deps cover the values it reads
  }, [isFormMode, onClose]);

  const handleSelectStock = useCallback(
    (stock: Stock) => {
      if (stock.id !== selectedStockId && isFormMode && !confirmDiscardUnsaved()) {
        return;
      }
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
    },
    [confirmDiscardUnsaved, isFormMode, selectedStockId]
  );

  const handleStartCreate = useCallback(() => {
    // Always allow entering create mode from the "+" action.
    // This avoids Electron/runtime confirm edge cases blocking the action.
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

  const canSave = useMemo(() => {
    const hasName = formData.name.trim().length > 0;
    if (!hasName) return false;
    if (isCreating) return true;
    if (isEditing) return selectedStockId !== null;
    return false;
  }, [formData.name, isCreating, isEditing, selectedStockId]);

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
        showSavedFileToast(`Stock exported to ${result.filePath.split('/').pop()}`, result.filePath);
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

  useEffect(() => {
    if (!onFormModeChange) return;
    if (isFormMode) {
      onFormModeChange({
        isFormMode: true,
        confirmLabel: isCreating ? 'Create' : 'Save',
        canConfirm: canSave,
        onConfirm: handleSave,
        onCancel: handleCancelEdit
      });
      return;
    }
    onFormModeChange({ isFormMode: false });
  }, [onFormModeChange, isFormMode, isCreating, canSave, handleSave, handleCancelEdit]);

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <LibrarySidebar
        count={stocks.length}
        hasItems={stocks.length > 0}
        showNoResults={filteredStocks.length === 0}
        search={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: 'Search stocks...'
        }}
        headerActions={
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void handleImportStocks();
              }}
              title="Import stocks"
              aria-label="Import stocks"
              style={{ WebkitAppRegion: 'no-drag' }}
            >
              <Upload size={14} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleStartCreate();
              }}
              title="Create new stock"
              aria-label="Create new stock"
              style={{ WebkitAppRegion: 'no-drag' }}
            >
              <Plus size={14} />
            </Button>
          </>
        }
        emptyState={
          <div className="text-text-muted text-xs italic p-4 text-center">
            <p className="mb-2">📦 No stocks in library yet</p>
            <p className="text-[11px] text-text-muted mt-1">
              Click "+" above to create your first stock material.{' '}
              <DocsLink section="stock" className="hover:underline">
                Learn more
              </DocsLink>
            </p>
          </div>
        }
        noResultsState={
          <div className="text-text-muted text-xs italic p-4 text-center">
            <p>No stocks match "{searchTerm}"</p>
          </div>
        }
      >
        <ul className="list-none m-0 p-2 flex-1 min-h-0 overflow-y-auto">
          {filteredStocks.map((stock) => (
            <StockListItem
              key={stock.id}
              stock={stock}
              units={units}
              selected={selectedStockId === stock.id}
              onClick={() => handleSelectStock(stock)}
            />
          ))}
        </ul>
      </LibrarySidebar>

      {/* Stock detail/edit panel */}
      <LibraryDetailPane>
        {!selectedStock && !isCreating ? (
          <LibraryEmptyState
            title="Select a stock to view details"
            subtitle='or click "+" to create a new stock material'
            linkLabel="Learn more about stock materials"
            docsSection="stock"
          />
        ) : (
          <>
            <LibraryDetailHeader
              title={isCreating ? 'New Stock' : formData.name}
              actions={
                !isFormMode ? (
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
                ) : undefined
              }
            />

            {isFormMode ? (
              <div className="flex-1 p-5 overflow-y-auto">
                <StockFormFields formData={formData} onChange={setFormData} />

                {!hideInlineFormActions && (
                  <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-border">
                    <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={!canSave}>
                      {isCreating ? 'Create' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 p-5 overflow-y-auto">
                <LibraryDetailRow
                  label="Dimensions"
                  value={
                    <>
                      {formatMeasurementWithUnit(formData.length, units)} ×{' '}
                      {formatMeasurementWithUnit(formData.width, units)} ×{' '}
                      {formatMeasurementWithUnit(formData.thickness, units)}
                    </>
                  }
                />
                <LibraryDetailRow
                  label="Grain"
                  value={formData.grainDirection === 'none' ? 'None' : `Along ${formData.grainDirection}`}
                />
                <LibraryDetailRow
                  label="Pricing"
                  value={
                    <>
                      ${formData.pricePerUnit.toFixed(2)}{' '}
                      {formData.pricingUnit === 'board_foot' ? '/ bd ft' : '/ sheet'}
                    </>
                  }
                />
                <LibraryDetailRow
                  label="Color"
                  bordered={false}
                  value={
                    <span
                      className="w-6 h-6 rounded border border-border"
                      style={{ backgroundColor: formData.color }}
                    />
                  }
                />
              </div>
            )}
          </>
        )}
      </LibraryDetailPane>
    </div>
  );
}
