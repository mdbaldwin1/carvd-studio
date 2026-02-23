import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import React, { useState, useCallback, useMemo } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { getBlockedMessage } from '../../utils/featureLimits';
// pdfExport is dynamically imported on export click to defer the jsPDF dependency
import { showSavedFileToast } from '../../utils/fileToast';
import { logger } from '../../utils/logger';
import { CutList } from '../../types';
import { Button } from '@renderer/components/ui/button';
import { DropdownButton, DropdownItem } from '../common/DropdownButton';
import { ShoppingListItem } from './ShoppingListItem';
import { CustomShoppingListItem } from './CustomShoppingListItem';
import { CustomItemForm } from './CustomItemForm';

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
      showToast(getBlockedMessage('exportPDF'), 'warning');
      return;
    }

    try {
      const { exportShoppingListToPdf } = await import('../../utils/pdfExport');
      const result = await exportShoppingListToPdf(cutList, customShoppingItems || [], { projectName, units });
      if (result.success && result.filePath) {
        showSavedFileToast('Shopping list saved to PDF', result.filePath);
      } else if (result.error) {
        showToast('Failed to save PDF', 'error');
        logger.error('Shopping list PDF export error:', result.error);
      }
    } catch (error) {
      logger.error('Shopping list PDF export error:', error);
      showToast('Failed to export PDF', 'error');
    }
  }, [cutList, customShoppingItems, projectName, units, canExportPDF, showToast]);

  // Export shopping list to CSV
  const handleDownloadCSV = useCallback(async () => {
    try {
      const { exportShoppingListToCsv } = await import('../../utils/pdfExport');
      const csvContent = exportShoppingListToCsv(cutList, customShoppingItems || [], units);
      const defaultFileName = `${projectName || 'shopping-list'}.csv`;
      const result = await window.electronAPI.showSaveDialog({
        defaultPath: defaultFileName,
        filters: [{ name: 'CSV Files', extensions: ['csv'] }]
      });

      if (result.canceled || !result.filePath) {
        return;
      }

      const BOM = '\uFEFF';
      await window.electronAPI.writeFile(result.filePath, BOM + csvContent);
      showSavedFileToast('Shopping list saved to CSV', result.filePath);
    } catch (error) {
      logger.error('Shopping list CSV export error:', error);
      showToast('Failed to export CSV', 'error');
    }
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
