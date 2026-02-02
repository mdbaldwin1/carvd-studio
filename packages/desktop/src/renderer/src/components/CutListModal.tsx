import { ChevronDown, ChevronRight } from 'lucide-react';
import React, { useState, useCallback, useMemo } from 'react';
import { useBackdropClose } from '../hooks/useBackdropClose';
import { useProjectStore, validatePartsForCutList } from '../store/projectStore';
import { generateOptimizedCutList } from '../utils/cutListOptimizer';
import { formatMeasurementWithUnit } from '../utils/fractions';
import { exportDiagramsToPdf } from '../utils/pdfExport';
import { CutList, CutInstruction, StockBoard, StockSummary, PartValidationIssue, CustomShoppingItem } from '../types';

type CutListTab = 'parts' | 'diagrams' | 'shopping';

// Grouped cut instruction for parts with identical dimensions
interface GroupedCutInstruction {
  key: string;
  cutLength: number;
  cutWidth: number;
  thickness: number;
  stockId: string;
  stockName: string;
  grainSensitive: boolean;
  isGlueUp: boolean;
  quantity: number;
  items: CutInstruction[];
}

// Group identical cut instructions together
function groupCutInstructions(instructions: CutInstruction[]): GroupedCutInstruction[] {
  const groups = new Map<string, GroupedCutInstruction>();

  for (const inst of instructions) {
    // Create a key from the attributes that make parts "identical"
    const key = `${inst.cutLength}-${inst.cutWidth}-${inst.thickness}-${inst.stockId}-${inst.grainSensitive}-${inst.isGlueUp}`;

    const existing = groups.get(key);
    if (existing) {
      existing.quantity++;
      existing.items.push(inst);
    } else {
      groups.set(key, {
        key,
        cutLength: inst.cutLength,
        cutWidth: inst.cutWidth,
        thickness: inst.thickness,
        stockId: inst.stockId,
        stockName: inst.stockName,
        grainSensitive: inst.grainSensitive,
        isGlueUp: inst.isGlueUp,
        quantity: 1,
        items: [inst]
      });
    }
  }

  return Array.from(groups.values());
}

// Helper to escape CSV values (double quotes become doubled)
function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

interface CutListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CutListModal({ isOpen, onClose }: CutListModalProps) {
  const [activeTab, setActiveTab] = useState<CutListTab>('parts');
  const [validationIssues, setValidationIssues] = useState<PartValidationIssue[]>([]);

  const parts = useProjectStore((s) => s.parts);
  const stocks = useProjectStore((s) => s.stocks);
  const units = useProjectStore((s) => s.units);
  const kerfWidth = useProjectStore((s) => s.kerfWidth);
  const overageFactor = useProjectStore((s) => s.overageFactor);
  const modifiedAt = useProjectStore((s) => s.modifiedAt);
  const cutList = useProjectStore((s) => s.cutList);
  const setCutList = useProjectStore((s) => s.setCutList);

  // Handle backdrop click (only close if mousedown AND mouseup both on backdrop)
  const { handleMouseDown, handleClick } = useBackdropClose(onClose);

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Generate cut list
  const handleGenerate = useCallback(() => {
    // Validate parts first
    const issues = validatePartsForCutList(parts, stocks);
    const blockingIssues = issues.filter((i) => i.severity === 'error' && !i.canBypass);

    if (blockingIssues.length > 0) {
      setValidationIssues(issues);
      return;
    }

    // Clear validation issues and generate
    setValidationIssues([]);
    const bypassedIssues = issues.filter((i) => i.canBypass);
    const newCutList = generateOptimizedCutList(
      parts,
      stocks,
      kerfWidth,
      overageFactor,
      modifiedAt,
      bypassedIssues
    );

    setCutList(newCutList);
  }, [parts, stocks, kerfWidth, overageFactor, modifiedAt, setCutList]);

  // Export to CSV (grouped by identical dimensions)
  const handleExportCSV = useCallback(() => {
    if (!cutList) return;

    const grouped = groupCutInstructions(cutList.instructions);
    const unitLabel = units === 'imperial' ? 'inches' : 'mm';

    const rows = [
      'CUT LIST',
      `Units: ${unitLabel}`,
      '',
      ['Qty', 'Cut Length', 'Cut Width', 'Thickness', 'Stock', 'Grain Sensitive', 'Glue-Up', 'Part Names'].join(',')
    ];

    for (const group of grouped) {
      // List all part names for this group
      const partNames = group.items.map((i) => i.partName).join('; ');
      rows.push(
        [
          group.quantity.toString(),
          csvEscape(formatMeasurementWithUnit(group.cutLength, units)),
          csvEscape(formatMeasurementWithUnit(group.cutWidth, units)),
          csvEscape(formatMeasurementWithUnit(group.thickness, units)),
          csvEscape(group.stockName),
          group.grainSensitive ? 'Yes' : 'No',
          group.isGlueUp ? 'Yes' : 'No',
          csvEscape(partNames)
        ].join(',')
      );
    }

    // Add UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cut-list.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [cutList, units]);

  if (!isOpen) return null;

  const hasBlockingIssues = validationIssues.some((i) => i.severity === 'error' && !i.canBypass);

  return (
    <div className="modal-backdrop" onMouseDown={handleMouseDown} onClick={handleClick}>
      <div className="modal cut-list-modal">
        <div className="modal-header">
          <h2>Cut List</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* No cut list - show generate UI */}
        {!cutList && (
          <div className="cut-list-generate">
            <p className="cut-list-intro">
              Generate an optimized cut list from your design. All parts must be assigned to a stock material before generating.
            </p>

            {parts.length === 0 ? (
              <div className="cut-list-empty">
                <div className="text-5xl mb-3">📋</div>
                <p className="font-semibold mb-2">No parts in your project yet</p>
                <p className="text-sm text-gray-400">Add parts to your design to generate a cut list with optimized cutting diagrams and material costs.</p>
              </div>
            ) : (
              <>
                <button
                  className="btn btn-md btn-filled btn-primary"
                  onClick={handleGenerate}
                  disabled={parts.length === 0}
                >
                  Generate Cut List
                </button>

                {validationIssues.length > 0 && (
                  <div className="cut-list-issues">
                    <h3>Issues Found</h3>
                    {hasBlockingIssues && (
                      <p className="cut-list-issues-note">
                        Fix the errors below before generating. Each part must be assigned to a stock material.
                      </p>
                    )}
                    <ul className="cut-list-issues-list">
                      {validationIssues.map((issue, index) => (
                        <li
                          key={index}
                          className={`cut-list-issue ${issue.severity}`}
                        >
                          <strong>{issue.partName}:</strong> {issue.message}
                          {issue.canBypass && <span className="bypass-note"> (can proceed)</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Cut list generated - show tabs */}
        {cutList && (
          <>
            {/* Stale warning */}
            {cutList.isStale && (
              <div className="cut-list-stale-warning">
                <span>Project changed since cut list was generated.</span>
                <button className="btn btn-sm btn-filled btn-primary" onClick={handleGenerate}>
                  Regenerate
                </button>
              </div>
            )}

            {/* Skipped parts warning */}
            {cutList.skippedParts.length > 0 && (
              <div className="cut-list-error-warning">
                <strong>Warning:</strong> {cutList.skippedParts.length} part{cutList.skippedParts.length !== 1 ? 's' : ''} could not be placed (too large for stock):
                <ul>
                  {cutList.skippedParts.map((name, i) => (
                    <li key={i}>{name}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tab bar */}
            <div className="cut-list-tabs">
              <button
                className={`cut-list-tab ${activeTab === 'parts' ? 'active' : ''}`}
                onClick={() => setActiveTab('parts')}
              >
                Parts List ({cutList.instructions.length})
              </button>
              <button
                className={`cut-list-tab ${activeTab === 'diagrams' ? 'active' : ''}`}
                onClick={() => setActiveTab('diagrams')}
              >
                Cutting Diagrams ({cutList.stockBoards.length})
              </button>
              <button
                className={`cut-list-tab ${activeTab === 'shopping' ? 'active' : ''}`}
                onClick={() => setActiveTab('shopping')}
              >
                Shopping List ({cutList.statistics.byStock.length})
              </button>
            </div>

            <div className="cut-list-content">
              {activeTab === 'parts' && (
                <CutListPartsTab cutList={cutList} units={units} />
              )}
              {activeTab === 'diagrams' && (
                <CutListDiagramsTab cutList={cutList} units={units} />
              )}
              {activeTab === 'shopping' && (
                <ShoppingListTab cutList={cutList} units={units} />
              )}
            </div>

            {/* Statistics */}
            <CutListStatistics cutList={cutList} />
          </>
        )}

        <div className="modal-footer">
          {cutList && (
            <button className="btn btn-sm btn-outlined btn-secondary" onClick={handleExportCSV}>
              Export CSV
            </button>
          )}
          <button className="btn btn-sm btn-filled btn-secondary" onClick={onClose}>
            {cutList ? 'Done' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Parts list tab with grouped identical parts
function CutListPartsTab({ cutList, units }: { cutList: CutList; units: 'imperial' | 'metric' }) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const groupedInstructions = useMemo(
    () => groupCutInstructions(cutList.instructions),
    [cutList.instructions]
  );

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="cut-list-parts-tab">
      <table className="cut-list-table">
        <thead>
          <tr>
            <th className="col-expand"></th>
            <th className="col-qty">Qty</th>
            <th>Part Name</th>
            <th>Cut Length</th>
            <th>Cut Width</th>
            <th>Thickness</th>
            <th>Stock</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {groupedInstructions.map((group) => {
            const isExpanded = expandedGroups.has(group.key);
            const hasMultiple = group.quantity > 1;

            return (
              <React.Fragment key={group.key}>
                {/* Group row */}
                <tr
                  className={`group-row ${group.isGlueUp ? 'glue-up-row' : ''} ${hasMultiple ? 'expandable' : ''}`}
                  onClick={hasMultiple ? () => toggleGroup(group.key) : undefined}
                >
                  <td className="col-expand">
                    {hasMultiple && (
                      isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    )}
                  </td>
                  <td className="col-qty">{group.quantity}</td>
                  <td className="col-part-name">
                    {hasMultiple ? (
                      <span className="multiple-parts-hint">
                        {isExpanded ? 'Click to collapse' : 'Click to expand'}
                      </span>
                    ) : (
                      group.items[0].partName
                    )}
                  </td>
                  <td>{formatMeasurementWithUnit(group.cutLength, units)}</td>
                  <td>{formatMeasurementWithUnit(group.cutWidth, units)}</td>
                  <td>{formatMeasurementWithUnit(group.thickness, units)}</td>
                  <td>{group.stockName}</td>
                  <td>
                    {group.isGlueUp && <span className="glue-up-badge">Glue-up strip</span>}
                    {group.grainSensitive && !group.isGlueUp && <span className="grain-badge">Grain</span>}
                    {!hasMultiple && group.items[0].notes && (
                      <span className="notes-text">{group.items[0].notes}</span>
                    )}
                  </td>
                </tr>

                {/* Expanded item rows */}
                {isExpanded &&
                  group.items.map((item) => (
                    <tr key={item.partId} className="item-row">
                      <td className="col-expand"></td>
                      <td className="col-qty"></td>
                      <td className="col-part-name item-name">{item.partName}</td>
                      <td colSpan={4}></td>
                      <td>{item.notes && <span className="notes-text">{item.notes}</span>}</td>
                    </tr>
                  ))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Cutting diagrams tab
function CutListDiagramsTab({ cutList, units }: { cutList: CutList; units: 'imperial' | 'metric' }) {
  const showToast = useProjectStore((s) => s.showToast);
  const projectName = useProjectStore((s) => s.projectName);

  // Group boards by stock
  const boardsByStock = useMemo(() => {
    const map = new Map<string, StockBoard[]>();
    for (const board of cutList.stockBoards) {
      const existing = map.get(board.stockId) || [];
      existing.push(board);
      map.set(board.stockId, existing);
    }
    return map;
  }, [cutList.stockBoards]);

  const handleExportPdf = useCallback(async () => {
    try {
      const result = await exportDiagramsToPdf(cutList, {
        projectName: projectName || 'Untitled Project',
        units
      });

      if (result.success) {
        showToast('Cutting diagrams saved to PDF');
      } else if (result.error) {
        showToast('Failed to save PDF');
        console.error('PDF export error:', result.error);
      }
      // If canceled, do nothing
    } catch (error) {
      console.error('PDF export error:', error);
      showToast('Failed to export PDF');
    }
  }, [cutList, projectName, units, showToast]);

  return (
    <div className="cut-list-diagrams-tab">
      <div className="diagrams-header">
        <span className="diagrams-count">{cutList.stockBoards.length} board{cutList.stockBoards.length !== 1 ? 's' : ''} needed</span>
        <button className="btn btn-sm btn-outlined btn-secondary" onClick={handleExportPdf}>
          Save as PDF
        </button>
      </div>

      <div className="diagrams-content">
        {Array.from(boardsByStock.entries()).map(([stockId, boards]) => (
          <div key={stockId} className="stock-group">
            <h3 className="stock-group-title">{boards[0].stockName}</h3>
            <div className="stock-boards">
              {boards.map((board) => (
                <StockBoardDiagram key={`${stockId}-${board.boardIndex}`} board={board} units={units} />
              ))}
            </div>
          </div>
        ))}

        {cutList.stockBoards.length === 0 && (
          <p className="no-diagrams">No cutting diagrams to display.</p>
        )}
      </div>
    </div>
  );
}

// Single stock board diagram
function StockBoardDiagram({ board, units }: { board: StockBoard; units: 'imperial' | 'metric' }) {
  // Scale to fit in a reasonable viewport (max 600px width)
  const maxWidth = 600;
  const scale = Math.min(maxWidth / board.stockLength, 4); // Max 4 pixels per inch
  const svgWidth = board.stockLength * scale;
  const svgHeight = board.stockWidth * scale;

  return (
    <div className="stock-board-diagram">
      <div className="board-header">
        <span className="board-title">Board #{board.boardIndex}</span>
        <span className="board-dims">
          {formatMeasurementWithUnit(board.stockLength, units)} × {formatMeasurementWithUnit(board.stockWidth, units)}
        </span>
        <span className="board-utilization">{board.utilizationPercent.toFixed(1)}% used</span>
      </div>
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="board-svg"
      >
        {/* Board outline (waste area background) */}
        <rect x={0} y={0} width={svgWidth} height={svgHeight} fill="#ddd" stroke="#999" strokeWidth={1} />

        {/* Part placements */}
        {board.placements.map((placement) => (
          <g key={placement.partId}>
            <rect
              x={placement.x * scale}
              y={placement.y * scale}
              width={placement.width * scale}
              height={placement.height * scale}
              fill={placement.color}
              stroke="#333"
              strokeWidth={0.5}
            />
            {/* Part label */}
            {placement.width * scale > 30 && placement.height * scale > 15 && (
              <text
                x={(placement.x + placement.width / 2) * scale}
                y={(placement.y + placement.height / 2) * scale}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={Math.min(10, placement.height * scale * 0.4)}
                fill="#333"
                style={{ pointerEvents: 'none' }}
              >
                {placement.partName.length > 15
                  ? placement.partName.substring(0, 12) + '...'
                  : placement.partName}
              </text>
            )}
            {/* Rotation indicator */}
            {placement.rotated && placement.width * scale > 20 && (
              <text
                x={(placement.x + placement.width / 2) * scale}
                y={(placement.y + placement.height / 2) * scale + 10}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={8}
                fill="#666"
                style={{ pointerEvents: 'none' }}
              >
                (rotated)
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// Statistics section
function CutListStatistics({ cutList }: { cutList: CutList }) {
  return (
    <div className="cut-list-statistics">
      <div className="stat-item">
        <span className="stat-label">Parts</span>
        <span className="stat-value">{cutList.statistics.totalParts}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Boards</span>
        <span className="stat-value">{cutList.statistics.totalStockBoards}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Board Feet</span>
        <span className="stat-value">{cutList.statistics.totalBoardFeet.toFixed(2)}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Waste</span>
        <span className="stat-value">{cutList.statistics.wastePercentage.toFixed(1)}%</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Est. Cost</span>
        <span className="stat-value">${cutList.statistics.estimatedCost.toFixed(2)}</span>
      </div>
    </div>
  );
}

// Shopping list tab
function ShoppingListTab({
  cutList,
  units
}: {
  cutList: CutList;
  units: 'imperial' | 'metric';
}) {
  // Custom shopping items from store
  const customShoppingItems = useProjectStore((s) => s.customShoppingItems);
  const addCustomShoppingItem = useProjectStore((s) => s.addCustomShoppingItem);
  const updateCustomShoppingItem = useProjectStore((s) => s.updateCustomShoppingItem);
  const deleteCustomShoppingItem = useProjectStore((s) => s.deleteCustomShoppingItem);

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

  // Export shopping list to CSV
  const handleExportShoppingList = useCallback(() => {
    const unitLabel = units === 'imperial' ? 'inches' : 'mm';
    const lines = [
      'SHOPPING LIST',
      `Generated: ${new Date().toLocaleDateString()}`,
      `Units: ${unitLabel}`,
      '',
      'LUMBER & SHEET GOODS',
      'Stock,Dimensions,Quantity,Unit Price,Total'
    ];

    for (const summary of cutList.statistics.byStock) {
      // Use formatMeasurementWithUnit for proper unit display
      const dims = `${formatMeasurementWithUnit(summary.stockLength, units)} x ${formatMeasurementWithUnit(summary.stockWidth, units)} x ${formatMeasurementWithUnit(summary.stockThickness, units)}`;
      const unitPrice =
        summary.pricingUnit === 'board_foot'
          ? `$${summary.pricePerUnit.toFixed(2)}/bf`
          : `$${summary.pricePerUnit.toFixed(2)}/ea`;
      lines.push(
        `${csvEscape(summary.stockName)},${csvEscape(dims)},${summary.boardsNeeded},${unitPrice},$${summary.cost.toFixed(2)}`
      );
    }

    lines.push(`Lumber Subtotal,,,,$${cutList.statistics.estimatedCost.toFixed(2)}`);

    // Add custom shopping items if any
    if (customShoppingItems.length > 0) {
      lines.push('');
      lines.push('OTHER ITEMS');
      lines.push('Item,Description,Quantity,Unit Price,Total');

      for (const item of customShoppingItems) {
        const itemTotal = item.quantity * item.unitPrice;
        lines.push(
          `${csvEscape(item.name)},${csvEscape(item.description || '')},${item.quantity},$${item.unitPrice.toFixed(2)},$${itemTotal.toFixed(2)}`
        );
      }

      lines.push(`Other Items Subtotal,,,,$${customItemsTotal.toFixed(2)}`);
    }

    lines.push('');
    lines.push(`GRAND TOTAL,,,,$${grandTotal.toFixed(2)}`);

    // Add UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shopping-list.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [cutList, units, customShoppingItems, customItemsTotal, grandTotal]);

  return (
    <div className="shopping-list-tab">
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
              "{warning.stockName}" boards are {warning.utilization.toFixed(0)}% utilized —
              consider an extra board in case of defects or cutting mistakes
            </div>
          ))}
        </div>
      )}

      {/* Custom shopping items section */}
      <div className="shopping-list-section custom-items-section">
        <div className="shopping-list-section-header">
          <span>Other Items</span>
          <button
            className="btn btn-xs btn-text"
            onClick={() => setIsAddingItem(true)}
            disabled={isAddingItem}
          >
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
            <div className="custom-items-empty">
              Add hardware, fasteners, glue, finish, and other supplies
            </div>
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
            ${cutList.statistics.totalWasteCost.toFixed(2)} ({cutList.statistics.wastePercentage.toFixed(0)}% of material)
          </span>
        </div>
      </div>

      {/* Export button */}
      <div className="shopping-list-actions">
        <button className="btn btn-sm btn-outlined btn-secondary" onClick={handleExportShoppingList}>
          Export Shopping List
        </button>
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
            <span className="overage-note"> (uses {summary.actualBoardsUsed}, +{summary.boardsNeeded - summary.actualBoardsUsed} overage)</span>
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
