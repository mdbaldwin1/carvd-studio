import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import React, { useState, useCallback, useMemo } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { getBlockedMessage } from '../../utils/featureLimits';
import { formatMeasurementWithUnit } from '../../utils/fractions';
import { exportShoppingListToPdf, exportShoppingListToCsv } from '../../utils/pdfExport';
import { logger } from '../../utils/logger';
import { CutList, StockSummary, CustomShoppingItem } from '../../types';
import { DropdownButton, DropdownItem } from '../common/DropdownButton';

export function ShoppingListTab({
  cutList,
  units,
  projectName,
  canExportPDF
}: {
  cutList: CutList;
  units: 'imperial' | 'metric';
  projectName: string;
  canExportPDF: boolean;
}) {
  // Custom shopping items from store
  const customShoppingItems = useProjectStore((s) => s.customShoppingItems);
  const addCustomShoppingItem = useProjectStore((s) => s.addCustomShoppingItem);
  const updateCustomShoppingItem = useProjectStore((s) => s.updateCustomShoppingItem);
  const deleteCustomShoppingItem = useProjectStore((s) => s.deleteCustomShoppingItem);
  const showToast = useProjectStore((s) => s.showToast);

  // Local state for checkboxes (ephemeral, not saved with project)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  // State for adding new custom item
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const toggleItem = (stockId: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(stockId)) {
        next.delete(stockId);
      } else {
        next.add(stockId);
      }
      return next;
    });
  };

  // Calculate custom items total
  const customItemsTotal = useMemo(() => {
    return customShoppingItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [customShoppingItems]);

  // Combined grand total
  const grandTotal = cutList.statistics.estimatedCost + customItemsTotal;

  // Calculate high-utilization warnings
  // Warn if boards are tightly packed (high utilization) with little margin for error
  const overageWarnings = useMemo(() => {
    const overagePercent = cutList.overageFactor * 100;
    return cutList.statistics.byStock
      .filter((summary) => {
        // If utilization is very high (>90%), user has little margin for mistakes
        return summary.averageUtilization > 90 && overagePercent > 0;
      })
      .map((summary) => ({
        stockId: summary.stockId,
        stockName: summary.stockName,
        utilization: summary.averageUtilization,
        overagePercent
      }));
  }, [cutList]);

  // Export shopping list to PDF
  const handleDownloadPDF = useCallback(async () => {
    if (!canExportPDF) {
      showToast(getBlockedMessage('exportPDF'));
      return;
    }

    try {
      const result = await exportShoppingListToPdf(cutList, customShoppingItems || [], { projectName, units });
      if (result.success) {
        showToast('Shopping list saved to PDF');
      } else if (result.error) {
        showToast('Failed to save PDF');
        logger.error('Shopping list PDF export error:', result.error);
      }
    } catch (error) {
      logger.error('Shopping list PDF export error:', error);
      showToast('Failed to export PDF');
    }
  }, [cutList, customShoppingItems, projectName, units, canExportPDF, showToast]);

  // Export shopping list to CSV
  const handleDownloadCSV = useCallback(() => {
    const csvContent = exportShoppingListToCsv(cutList, customShoppingItems || [], units);
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'shopping-list'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Shopping list exported to CSV');
  }, [cutList, customShoppingItems, units, projectName, showToast]);

  const downloadItems: DropdownItem[] = useMemo(
    () => [
      {
        label: 'Download PDF',
        icon: <FileText size={14} />,
        onClick: handleDownloadPDF,
        disabled: !canExportPDF
      },
      {
        label: 'Download CSV',
        icon: <FileSpreadsheet size={14} />,
        onClick: handleDownloadCSV
      }
    ],
    [handleDownloadPDF, handleDownloadCSV, canExportPDF]
  );

  return (
    <div className="shopping-list-tab">
      <div className="tab-content-header">
        <span className="tab-header-info">
          {cutList.statistics.byStock.length} stock type{cutList.statistics.byStock.length !== 1 ? 's' : ''}, Est. $
          {grandTotal.toFixed(2)}
        </span>
        <DropdownButton label="Download" icon={<Download size={14} />} items={downloadItems} />
      </div>

      {/* Stock items as checklist cards */}
      <div className="shopping-list-section">
        <div className="shopping-list-section-header">Lumber & Sheet Goods</div>
        <div className="shopping-list-items">
          {cutList.statistics.byStock.map((summary) => (
            <ShoppingListItem
              key={summary.stockId}
              summary={summary}
              units={units}
              checked={checkedItems.has(summary.stockId)}
              onToggle={() => toggleItem(summary.stockId)}
            />
          ))}
        </div>
      </div>

      {/* High utilization warnings */}
      {overageWarnings.length > 0 && (
        <div className="shopping-list-warnings">
          {overageWarnings.map((warning) => (
            <div key={warning.stockId} className="overage-warning">
              "{warning.stockName}" boards are {warning.utilization.toFixed(0)}% utilized — consider an extra board in
              case of defects or cutting mistakes
            </div>
          ))}
        </div>
      )}

      {/* Custom shopping items section */}
      <div className="shopping-list-section custom-items-section">
        <div className="shopping-list-section-header">
          <span>Other Items</span>
          <button className="btn btn-xs btn-text" onClick={() => setIsAddingItem(true)} disabled={isAddingItem}>
            + Add Item
          </button>
        </div>

        <div className="shopping-list-items custom-items">
          {customShoppingItems.map((item) =>
            editingItemId === item.id ? (
              <CustomItemForm
                key={item.id}
                initialData={item}
                onSave={(data) => {
                  updateCustomShoppingItem(item.id, data);
                  setEditingItemId(null);
                }}
                onCancel={() => setEditingItemId(null)}
              />
            ) : (
              <CustomShoppingListItem
                key={item.id}
                item={item}
                checked={checkedItems.has(item.id)}
                onToggle={() => toggleItem(item.id)}
                onEdit={() => setEditingItemId(item.id)}
                onDelete={() => deleteCustomShoppingItem(item.id)}
              />
            )
          )}

          {isAddingItem && (
            <CustomItemForm
              onSave={(data) => {
                addCustomShoppingItem(data);
                setIsAddingItem(false);
              }}
              onCancel={() => setIsAddingItem(false)}
            />
          )}

          {customShoppingItems.length === 0 && !isAddingItem && (
            <div className="custom-items-empty">Add hardware, fasteners, glue, finish, and other supplies</div>
          )}
        </div>
      </div>

      {/* Totals */}
      <div className="shopping-list-totals">
        {customShoppingItems.length > 0 && (
          <>
            <div className="total-row subtotal">
              <span>Lumber & Sheet Goods:</span>
              <span>${cutList.statistics.estimatedCost.toFixed(2)}</span>
            </div>
            <div className="total-row subtotal">
              <span>Other Items:</span>
              <span>${customItemsTotal.toFixed(2)}</span>
            </div>
          </>
        )}
        <div className="total-row grand-total">
          <span>Est. Total:</span>
          <span>${grandTotal.toFixed(2)}</span>
        </div>
        <div className="total-row waste-info">
          <span>Waste value:</span>
          <span>
            ${cutList.statistics.totalWasteCost.toFixed(2)} ({cutList.statistics.wastePercentage.toFixed(0)}% of
            material)
          </span>
        </div>
      </div>
    </div>
  );
}

// Individual shopping list item
function ShoppingListItem({
  summary,
  units,
  checked,
  onToggle
}: {
  summary: StockSummary;
  units: 'imperial' | 'metric';
  checked: boolean;
  onToggle: () => void;
}) {
  const dimensions = `${formatMeasurementWithUnit(summary.stockLength, units)} × ${formatMeasurementWithUnit(summary.stockWidth, units)} × ${formatMeasurementWithUnit(summary.stockThickness, units)}`;

  // Quantity display - show actual vs recommended if different
  const qtyLabel = summary.boardsNeeded === 1 ? 'board' : 'boards';
  const hasOverage = summary.boardsNeeded > summary.actualBoardsUsed;

  // Only show linear feet for board_foot pricing (dimensional lumber)
  const linearFeetDisplay =
    summary.pricingUnit === 'board_foot' && summary.linearFeet > 0
      ? ` (${summary.linearFeet.toFixed(1)} linear ft)`
      : '';

  // Price display
  const priceDisplay =
    summary.pricingUnit === 'board_foot'
      ? `$${summary.pricePerUnit.toFixed(2)}/bf`
      : `$${summary.pricePerUnit.toFixed(2)}/sheet`;

  return (
    <div className={`shopping-list-item ${checked ? 'checked' : ''}`}>
      <label className="shopping-checkbox">
        <input type="checkbox" checked={checked} onChange={onToggle} />
        <span className="checkmark" />
      </label>

      <div className="item-details">
        <div className="item-name">{summary.stockName}</div>
        <div className="item-dimensions">{dimensions}</div>
        <div className="item-quantity">
          Buy: {summary.boardsNeeded} {qtyLabel}
          {hasOverage && (
            <span className="overage-note">
              {' '}
              (uses {summary.actualBoardsUsed}, +{summary.boardsNeeded - summary.actualBoardsUsed} overage)
            </span>
          )}
          {linearFeetDisplay}
        </div>
        {summary.pricingUnit === 'board_foot' && (
          <div className="item-board-feet">{summary.boardFeet.toFixed(2)} board feet total</div>
        )}
      </div>

      <div className="item-pricing">
        <div className="unit-price">{priceDisplay}</div>
        <div className="line-total">${summary.cost.toFixed(2)}</div>
      </div>
    </div>
  );
}

// Custom shopping list item (hardware, fasteners, etc.)
function CustomShoppingListItem({
  item,
  checked,
  onToggle,
  onEdit,
  onDelete
}: {
  item: CustomShoppingItem;
  checked: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const lineTotal = item.quantity * item.unitPrice;

  return (
    <div className={`shopping-list-item custom-item ${checked ? 'checked' : ''}`}>
      <label className="shopping-checkbox">
        <input type="checkbox" checked={checked} onChange={onToggle} />
        <span className="checkmark" />
      </label>

      <div className="item-details">
        <div className="item-name">{item.name}</div>
        {item.description && <div className="item-description">{item.description}</div>}
        {item.category && <div className="item-category">{item.category}</div>}
        <div className="item-quantity">Qty: {item.quantity}</div>
      </div>

      <div className="item-pricing">
        <div className="unit-price">${item.unitPrice.toFixed(2)}/ea</div>
        <div className="line-total">${lineTotal.toFixed(2)}</div>
      </div>

      <div className="item-actions">
        <button className="btn btn-xs btn-text" onClick={onEdit} title="Edit">
          ✎
        </button>
        <button className="btn btn-xs btn-text btn-danger" onClick={onDelete} title="Delete">
          ×
        </button>
      </div>
    </div>
  );
}

// Form for adding/editing custom shopping items
function CustomItemForm({
  initialData,
  onSave,
  onCancel
}: {
  initialData?: CustomShoppingItem;
  onSave: (data: Omit<CustomShoppingItem, 'id'>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [quantity, setQuantity] = useState(initialData?.quantity || 1);
  const [unitPrice, setUnitPrice] = useState(initialData?.unitPrice || 0);
  const [category, setCategory] = useState(initialData?.category || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      quantity,
      unitPrice,
      category: category.trim() || undefined
    });
  };

  const lineTotal = quantity * unitPrice;

  return (
    <form className="custom-item-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <input
          type="text"
          className="form-input"
          placeholder="Item name (e.g., Wood screws #8 x 1-1/4)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />
      </div>
      <div className="form-row">
        <input
          type="text"
          className="form-input"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="form-row form-row-inline">
        <div className="form-field">
          <label>Qty</label>
          <input
            type="number"
            className="form-input form-input-sm"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            min={1}
          />
        </div>
        <div className="form-field">
          <label>Unit Price</label>
          <input
            type="number"
            className="form-input form-input-sm"
            value={unitPrice}
            onChange={(e) => setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
            min={0}
            step={0.01}
          />
        </div>
        <div className="form-field">
          <label>Category</label>
          <input
            type="text"
            className="form-input form-input-sm"
            placeholder="e.g., Hardware"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <div className="form-field form-total">
          <label>Total</label>
          <span>${lineTotal.toFixed(2)}</span>
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-xs btn-text" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-xs btn-primary" disabled={!name.trim()}>
          {initialData ? 'Save' : 'Add'}
        </button>
      </div>
    </form>
  );
}
