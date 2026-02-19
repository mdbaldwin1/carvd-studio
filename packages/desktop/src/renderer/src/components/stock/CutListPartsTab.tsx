import { Badge } from '@renderer/components/ui/badge';
import { ChevronDown, ChevronRight, Download, FileText, FileSpreadsheet } from 'lucide-react';
import React, { useState, useCallback, useMemo } from 'react';
import { useUIStore } from '../../store/uiStore';
import { getBlockedMessage } from '../../utils/featureLimits';
import { formatMeasurementWithUnit } from '../../utils/fractions';
// pdfExport is dynamically imported on export click to defer the jsPDF dependency
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
      const { exportCutListToPdf } = await import('../../utils/pdfExport');
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

  const handleDownloadCSV = useCallback(async () => {
    const { exportCutListToCsv } = await import('../../utils/pdfExport');
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
    <div className="cut-list-parts-tab flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center justify-between py-2 px-0 mb-2 shrink-0">
        <span className="text-[12px] text-text-muted">
          {groupedInstructions.length} unique dimension{groupedInstructions.length !== 1 ? 's' : ''} (
          {cutList.instructions.length} parts total)
        </span>
        <DropdownButton label="Download" icon={<Download size={14} />} items={downloadItems} />
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 border border-border rounded bg-surface">
        <table className="w-full border-collapse text-[13px] [&_th]:py-2 [&_th]:px-3 [&_th]:text-left [&_th]:border-b [&_th]:border-border [&_td]:py-2 [&_td]:px-3 [&_td]:text-left [&_td]:border-b [&_td]:border-border [&_th]:bg-bg [&_th]:text-text-muted [&_th]:font-medium [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:sticky [&_th]:top-0 [&_th]:z-[1]">
          <thead>
            <tr>
              <th className="col-expand w-6 text-center"></th>
              <th className="col-qty w-12 text-center">Qty</th>
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
                    className={`${group.isGlueUp ? 'glue-up-row' : ''} ${hasMultiple ? 'cursor-pointer hover:bg-bg-hover' : ''}`}
                    onClick={hasMultiple ? () => toggleGroup(group.key) : undefined}
                  >
                    <td className="col-expand w-6 text-center">
                      {hasMultiple && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                    </td>
                    <td className="col-qty w-12 text-center">{group.quantity}</td>
                    <td className="col-part-name">
                      {hasMultiple ? (
                        <span className="text-[11px] text-text-muted italic">
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
                      {group.isGlueUp && (
                        <Badge
                          variant="outline"
                          className="rounded-sm border-transparent bg-[rgba(147,112,219,0.15)] text-[#9370db] py-0.5 px-1.5 text-[10px]"
                        >
                          Glue-up strip
                        </Badge>
                      )}
                      {group.grainSensitive && !group.isGlueUp && (
                        <Badge
                          variant="outline"
                          className="grain-badge rounded-sm border-transparent bg-[rgba(76,175,80,0.15)] text-[#4caf50] py-0.5 px-1.5 text-[10px]"
                        >
                          Grain
                        </Badge>
                      )}
                      {!hasMultiple && group.items[0].notes && (
                        <span className="text-[11px] text-text-muted italic">{group.items[0].notes}</span>
                      )}
                    </td>
                  </tr>

                  {/* Expanded item rows */}
                  {isExpanded &&
                    group.items.map((item) => (
                      <tr key={item.partId} className="bg-bg-alt [&>td]:border-[rgba(255,255,255,0.05)]">
                        <td className="col-expand w-6 text-center"></td>
                        <td className="col-qty w-12 text-center"></td>
                        <td className="col-part-name pl-2 text-text-muted text-[12px]">{item.partName}</td>
                        <td colSpan={4}></td>
                        <td>
                          {item.notes && <span className="text-[11px] text-text-muted italic">{item.notes}</span>}
                        </td>
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
