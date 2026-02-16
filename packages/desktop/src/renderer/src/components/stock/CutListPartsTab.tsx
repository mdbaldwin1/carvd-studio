import { ChevronDown, ChevronRight, Download, FileText, FileSpreadsheet } from 'lucide-react';
import React, { useState, useCallback, useMemo } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { getBlockedMessage } from '../../utils/featureLimits';
import { formatMeasurementWithUnit } from '../../utils/fractions';
import { exportCutListToPdf, exportCutListToCsv } from '../../utils/pdfExport';
import { logger } from '../../utils/logger';
import { CutList, CutInstruction } from '../../types';
import { DropdownButton, DropdownItem } from '../common/DropdownButton';

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

export function CutListPartsTab({
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const showToast = useUIStore((s) => s.showToast);

  const groupedInstructions = useMemo(() => groupCutInstructions(cutList.instructions), [cutList.instructions]);

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

  const handleDownloadPDF = useCallback(async () => {
    if (!canExportPDF) {
      showToast(getBlockedMessage('exportPDF'));
      return;
    }

    try {
      const result = await exportCutListToPdf(cutList, { projectName, units });
      if (result.success) {
        showToast('Parts list saved to PDF');
      } else if (result.error) {
        showToast('Failed to save PDF');
        logger.error('Parts list PDF export error:', result.error);
      }
    } catch (error) {
      logger.error('Parts list PDF export error:', error);
      showToast('Failed to export PDF');
    }
  }, [cutList, projectName, units, canExportPDF, showToast]);

  const handleDownloadCSV = useCallback(() => {
    const csvContent = exportCutListToCsv(cutList, units);
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'cut-list'}-parts.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Parts list exported to CSV');
  }, [cutList, units, projectName, showToast]);

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
    <div className="cut-list-parts-tab">
      <div className="tab-content-header">
        <span className="tab-header-info">
          {groupedInstructions.length} unique dimension{groupedInstructions.length !== 1 ? 's' : ''} (
          {cutList.instructions.length} parts total)
        </span>
        <DropdownButton label="Download" icon={<Download size={14} />} items={downloadItems} />
      </div>
      <div className="cut-list-table-wrapper">
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
                      {hasMultiple && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
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
    </div>
  );
}
