import { Badge } from '@renderer/components/ui/badge';
import { ChevronDown, ChevronRight, Download, FileText, FileSpreadsheet } from 'lucide-react';
import React, { useState, useCallback, useMemo } from 'react';
import { useUIStore } from '../../store/uiStore';
import { getBlockedMessage } from '../../utils/featureLimits';
import { formatMeasurementWithUnit } from '../../utils/fractions';
import { showSavedFileToast } from '../../utils/fileToast';
// pdfExport is dynamically imported on export click to defer the jsPDF dependency
import { logger } from '../../utils/logger';
import { CutList, CutInstruction } from '../../types';
import { DropdownButton, DropdownItem } from '../common/DropdownButton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@renderer/components/ui/table';

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
      showToast(getBlockedMessage('exportPDF'), 'warning');
      return;
    }

    try {
      const { exportCutListToPdf } = await import('../../utils/pdfExport');
      const result = await exportCutListToPdf(cutList, { projectName, units });
      if (result.success && result.filePath) {
        showSavedFileToast('Parts list saved to PDF', result.filePath);
      } else if (result.error) {
        showToast('Failed to save PDF', 'error');
        logger.error('Parts list PDF export error:', result.error);
      }
    } catch (error) {
      logger.error('Parts list PDF export error:', error);
      showToast('Failed to export PDF', 'error');
    }
  }, [cutList, projectName, units, canExportPDF, showToast]);

  const handleDownloadCSV = useCallback(async () => {
    try {
      const { exportCutListToCsv } = await import('../../utils/pdfExport');
      const csvContent = exportCutListToCsv(cutList, units);
      const defaultFileName = `${projectName || 'cut-list'}-parts.csv`;
      const result = await window.electronAPI.showSaveDialog({
        defaultPath: defaultFileName,
        filters: [{ name: 'CSV Files', extensions: ['csv'] }]
      });

      if (result.canceled || !result.filePath) {
        return;
      }

      const BOM = '\uFEFF';
      await window.electronAPI.writeFile(result.filePath, BOM + csvContent);
      showSavedFileToast('Parts list saved to CSV', result.filePath);
    } catch (error) {
      logger.error('Parts list CSV export error:', error);
      showToast('Failed to export CSV', 'error');
    }
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="col-expand sticky top-0 z-[1] w-6 text-center"></TableHead>
              <TableHead className="col-qty sticky top-0 z-[1] w-12 text-center">Qty</TableHead>
              <TableHead className="sticky top-0 z-[1]">Part Name</TableHead>
              <TableHead className="sticky top-0 z-[1]">Cut Length</TableHead>
              <TableHead className="sticky top-0 z-[1]">Cut Width</TableHead>
              <TableHead className="sticky top-0 z-[1]">Thickness</TableHead>
              <TableHead className="sticky top-0 z-[1]">Stock</TableHead>
              <TableHead className="sticky top-0 z-[1]">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedInstructions.map((group) => {
              const isExpanded = expandedGroups.has(group.key);
              const hasMultiple = group.quantity > 1;

              return (
                <React.Fragment key={group.key}>
                  {/* Group row */}
                  <TableRow
                    className={`${group.isGlueUp ? 'glue-up-row' : ''} ${hasMultiple ? 'cursor-pointer hover:bg-bg-hover' : ''}`}
                    onClick={hasMultiple ? () => toggleGroup(group.key) : undefined}
                  >
                    <TableCell className="col-expand w-6 text-center">
                      {hasMultiple && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                    </TableCell>
                    <TableCell className="col-qty w-12 text-center">{group.quantity}</TableCell>
                    <TableCell className="col-part-name">
                      {hasMultiple ? (
                        <span className="text-[11px] text-text-muted italic">
                          {isExpanded ? 'Click to collapse' : 'Click to expand'}
                        </span>
                      ) : (
                        group.items[0].partName
                      )}
                    </TableCell>
                    <TableCell>{formatMeasurementWithUnit(group.cutLength, units)}</TableCell>
                    <TableCell>{formatMeasurementWithUnit(group.cutWidth, units)}</TableCell>
                    <TableCell>{formatMeasurementWithUnit(group.thickness, units)}</TableCell>
                    <TableCell>{group.stockName}</TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>

                  {/* Expanded item rows */}
                  {isExpanded &&
                    group.items.map((item) => (
                      <TableRow key={item.partId} className="bg-bg-alt">
                        <TableCell className="col-expand w-6 border-[rgba(255,255,255,0.05)] text-center"></TableCell>
                        <TableCell className="col-qty w-12 border-[rgba(255,255,255,0.05)] text-center"></TableCell>
                        <TableCell className="col-part-name border-[rgba(255,255,255,0.05)] pl-2 text-[12px] text-text-muted">
                          {item.partName}
                        </TableCell>
                        <TableCell className="border-[rgba(255,255,255,0.05)]" colSpan={4}></TableCell>
                        <TableCell className="border-[rgba(255,255,255,0.05)]">
                          {item.notes && <span className="text-[11px] text-text-muted italic">{item.notes}</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
