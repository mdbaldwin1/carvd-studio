import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import React, { useState, useCallback, useMemo } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { getBlockedMessage } from '../../utils/featureLimits';
import { formatMeasurementWithUnit } from '../../utils/fractions';
// pdfExport is dynamically imported on export click to defer the jsPDF dependency
import { logger } from '../../utils/logger';
import { CutList, StockSummary, CustomShoppingItem } from '../../types';
import { Button } from '@renderer/components/ui/button';
import { Checkbox } from '@renderer/components/ui/checkbox';
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
  const showToast = useUIStore((s) => s.showToast);

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
      const { exportShoppingListToPdf } = await import('../../utils/pdfExport');
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
  const handleDownloadCSV = useCallback(async () => {
    const { exportShoppingListToCsv } = await import('../../utils/pdfExport');
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
    <div className="shopping-list-tab flex flex-col flex-1 min-h-0 overflow-y-auto gap-4">
      <div className="flex items-center justify-between py-2 px-0 mb-2 shrink-0">
        <span className="text-[12px] text-text-muted">
          {cutList.statistics.byStock.length} stock type{cutList.statistics.byStock.length !== 1 ? 's' : ''}, Est. $
          {grandTotal.toFixed(2)}
        </span>
        <DropdownButton label="Download" icon={<Download size={14} />} items={downloadItems} />
      </div>

      {/* Stock items as checklist cards */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between text-[12px] font-semibold text-text-muted uppercase tracking-wider py-2 px-0 border-b border-border mb-2">
          Lumber & Sheet Goods
        </div>
        <div className="flex flex-col gap-2">
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
        <div className="flex flex-col gap-2">
          {overageWarnings.map((warning) => (
            <div
              key={warning.stockId}
              className="bg-warning-bg border border-warning text-warning rounded py-2 px-3 text-[12px] leading-relaxed"
            >
              &ldquo;{warning.stockName}&rdquo; boards are {warning.utilization.toFixed(0)}% utilized — consider an
              extra board in case of defects or cutting mistakes
            </div>
          ))}
        </div>
      )}

      {/* Custom shopping items section */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between text-[12px] font-semibold text-text-muted uppercase tracking-wider py-2 px-0 border-b border-border mb-2">
          <span>Other Items</span>
          <Button variant="ghost" size="xs" onClick={() => setIsAddingItem(true)} disabled={isAddingItem}>
            + Add Item
          </Button>
        </div>

        <div className="custom-items flex flex-col gap-2">
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
            <div className="py-4 text-center text-[12px] text-text-muted italic">
              Add hardware, fasteners, glue, finish, and other supplies
            </div>
          )}
        </div>
      </div>

      {/* Totals */}
      <div className="border-t border-border pt-3">
        {customShoppingItems.length > 0 && (
          <>
            <div className="flex justify-between py-1 text-[13px] text-text-secondary">
              <span>Lumber & Sheet Goods:</span>
              <span>${cutList.statistics.estimatedCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 text-[13px] text-text-secondary">
              <span>Other Items:</span>
              <span>${customItemsTotal.toFixed(2)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between py-1 text-[15px] font-bold text-text border-t border-border pt-2 mt-1">
          <span>Est. Total:</span>
          <span>${grandTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between py-1 text-[11px] text-text-muted mt-1 italic">
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
    <div
      className={`flex items-start gap-3 py-3 px-4 bg-surface border border-border rounded transition-colors duration-150 ${checked ? 'opacity-50 bg-bg-alt' : ''}`}
    >
      <label className="flex items-center pt-0.5 shrink-0 cursor-pointer">
        <Checkbox checked={checked} onChange={onToggle} />
      </label>

      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-medium text-text mb-0.5 ${checked ? 'line-through' : ''}`}>
          {summary.stockName}
        </div>
        <div className="text-[11px] text-text-muted mb-0.5">{dimensions}</div>
        <div className="text-[12px] text-text-secondary">
          Buy: {summary.boardsNeeded} {qtyLabel}
          {hasOverage && (
            <span className="text-[11px] text-text-muted">
              {' '}
              (uses {summary.actualBoardsUsed}, +{summary.boardsNeeded - summary.actualBoardsUsed} overage)
            </span>
          )}
          {linearFeetDisplay}
        </div>
        {summary.pricingUnit === 'board_foot' && (
          <div className="text-[11px] text-text-muted mt-0.5">{summary.boardFeet.toFixed(2)} board feet total</div>
        )}
      </div>

      <div className="text-right shrink-0">
        <div className="text-[11px] text-text-muted mb-0.5">{priceDisplay}</div>
        <div className="line-total text-[13px] font-semibold text-text">${summary.cost.toFixed(2)}</div>
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
    <div
      className={`group flex items-start gap-3 py-3 px-4 bg-surface border border-border rounded transition-colors duration-150 ${checked ? 'opacity-50 bg-bg-alt' : ''}`}
    >
      <label className="flex items-center pt-0.5 shrink-0 cursor-pointer">
        <Checkbox checked={checked} onChange={onToggle} />
      </label>

      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-medium text-text mb-0.5 ${checked ? 'line-through' : ''}`}>{item.name}</div>
        {item.description && <div className="text-[11px] text-text-muted mt-0.5 italic">{item.description}</div>}
        {item.category && (
          <div className="inline-block text-[10px] bg-bg py-0.5 px-1.5 rounded text-text-muted mt-0.5">
            {item.category}
          </div>
        )}
        <div className="text-[12px] text-text-secondary">Qty: {item.quantity}</div>
      </div>

      <div className="text-right shrink-0">
        <div className="text-[11px] text-text-muted mb-0.5">${item.unitPrice.toFixed(2)}/ea</div>
        <div className="line-total text-[13px] font-semibold text-text">${lineTotal.toFixed(2)}</div>
      </div>

      <div className="flex gap-1 shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <Button variant="ghost" size="xs" onClick={onEdit} title="Edit">
          ✎
        </Button>
        <Button variant="destructiveGhost" size="xs" onClick={onDelete} title="Delete">
          ×
        </Button>
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
    <form
      className="custom-item-form flex flex-col gap-2 p-3 bg-surface border border-border rounded"
      onSubmit={handleSubmit}
    >
      <div>
        <input
          type="text"
          className="w-full py-1.5 px-2 border border-border rounded text-[13px] bg-bg text-text outline-none focus:border-primary focus:shadow-[0_0_0_2px_var(--color-primary-faded)]"
          placeholder="Item name (e.g., Wood screws #8 x 1-1/4)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />
      </div>
      <div>
        <input
          type="text"
          className="w-full py-1.5 px-2 border border-border rounded text-[13px] bg-bg text-text outline-none focus:border-primary focus:shadow-[0_0_0_2px_var(--color-primary-faded)]"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex gap-2 items-end">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[11px] text-text-muted font-medium">Qty</label>
          <input
            type="number"
            className="w-20 py-1.5 px-2 border border-border rounded text-[13px] bg-bg text-text outline-none focus:border-primary focus:shadow-[0_0_0_2px_var(--color-primary-faded)]"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            min={1}
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[11px] text-text-muted font-medium">Unit Price</label>
          <input
            type="number"
            className="w-20 py-1.5 px-2 border border-border rounded text-[13px] bg-bg text-text outline-none focus:border-primary focus:shadow-[0_0_0_2px_var(--color-primary-faded)]"
            value={unitPrice}
            onChange={(e) => setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
            min={0}
            step={0.01}
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[11px] text-text-muted font-medium">Category</label>
          <input
            type="text"
            className="w-20 py-1.5 px-2 border border-border rounded text-[13px] bg-bg text-text outline-none focus:border-primary focus:shadow-[0_0_0_2px_var(--color-primary-faded)]"
            placeholder="e.g., Hardware"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1 min-w-[70px]">
          <label className="text-[11px] text-text-muted font-medium">Total</label>
          <span className="text-[14px] font-semibold text-text">${lineTotal.toFixed(2)}</span>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="xs" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="xs" disabled={!name.trim()}>
          {initialData ? 'Save' : 'Add'}
        </Button>
      </div>
    </form>
  );
}
