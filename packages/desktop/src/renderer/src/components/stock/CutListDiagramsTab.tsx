import { Download, FileText, Minus, Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import type { WheelEvent } from 'react';
import { UNTITLED_PROJECT_NAME } from '@renderer/constants/appDefaults';
import { Button } from '@renderer/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog';
import { getAncestorGroupIds, useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { getBlockedMessage } from '../../utils/featureLimits';
// pdfExport is dynamically imported on export click to defer the jsPDF dependency
import { showSavedFileToast } from '../../utils/fileToast';
import { logger } from '../../utils/logger';
import { formatMeasurementWithUnit } from '../../utils/fractions';
import { CutList, CutPlacement, StockBoard } from '../../types';
import { DropdownButton, DropdownItem } from '../common/DropdownButton';
import { StockBoardDiagram } from './StockBoardDiagram';

export function CutListDiagramsTab({
  cutList,
  units,
  canExportPDF
}: {
  cutList: CutList;
  units: 'imperial' | 'metric';
  canExportPDF: boolean;
}) {
  const showToast = useUIStore((s) => s.showToast);
  const projectName = useProjectStore((s) => s.projectName);
  const groups = useProjectStore((s) => s.groups);
  const groupMembers = useProjectStore((s) => s.groupMembers);
  const [expandedBoard, setExpandedBoard] = useState<StockBoard | null>(null);
  const [zoom, setZoom] = useState(1);
  const [selectedPlacement, setSelectedPlacement] = useState<CutPlacement | null>(null);

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
    // Check license limits for PDF export
    if (!canExportPDF) {
      showToast(getBlockedMessage('exportPDF'), 'warning');
      return;
    }

    try {
      const { exportDiagramsToPdf } = await import('../../utils/pdfExport');
      const result = await exportDiagramsToPdf(cutList, {
        projectName: projectName || UNTITLED_PROJECT_NAME,
        units
      });

      if (result.success && result.filePath) {
        showSavedFileToast('Cutting diagrams saved to PDF', result.filePath);
      } else if (result.error) {
        showToast('Failed to save PDF', 'error');
        logger.error('PDF export error:', result.error);
      }
      // If canceled, do nothing
    } catch (error) {
      logger.error('PDF export error:', error);
      showToast('Failed to export PDF', 'error');
    }
  }, [cutList, projectName, units, showToast, canExportPDF]);

  const downloadItems: DropdownItem[] = useMemo(
    () => [
      {
        label: 'Download PDF',
        icon: <FileText size={14} />,
        onClick: handleExportPdf,
        disabled: !canExportPDF
      }
    ],
    [handleExportPdf, canExportPDF]
  );

  const openBoardDetail = useCallback((board: StockBoard) => {
    setExpandedBoard(board);
    setZoom(1);
    setSelectedPlacement(null);
  }, []);

  const handleDetailViewportWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    // Keep standard two-finger/mouse-wheel scrolling untouched.
    // Intercept pinch gesture (usually reported as ctrl+wheel in Chromium/Electron)
    // and convert it to diagram zoom.
    if (!e.ctrlKey) return;

    e.preventDefault();
    const zoomFactor = Math.exp(-e.deltaY * 0.003);
    setZoom((current) => {
      const next = current * zoomFactor;
      return Math.min(4, Math.max(0.5, next));
    });
  }, []);

  const selectedPartGroupChain = useMemo(() => {
    if (!selectedPlacement) return [];
    const ancestorIds = getAncestorGroupIds(selectedPlacement.partId, groupMembers).reverse();
    return ancestorIds.map((id) => groups.find((g) => g.id === id)?.name).filter((name): name is string => !!name);
  }, [selectedPlacement, groups, groupMembers]);

  const selectedPartPath = useMemo(() => {
    if (!selectedPlacement) return '';
    if (selectedPartGroupChain.length === 0) return selectedPlacement.partName;
    return [...selectedPartGroupChain, selectedPlacement.partName].join('.');
  }, [selectedPlacement, selectedPartGroupChain]);

  return (
    <>
      <div className="cut-list-diagrams-tab flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex items-center justify-between py-2 px-0 mb-2 shrink-0">
          <span className="text-[12px] text-text-muted">
            {cutList.stockBoards.length} board{cutList.stockBoards.length !== 1 ? 's' : ''} needed
          </span>
          <DropdownButton label="Download" icon={<Download size={14} />} items={downloadItems} />
        </div>

        <div className="diagrams-content flex-1 overflow-y-auto min-h-0 flex flex-col gap-5">
          {Array.from(boardsByStock.entries()).map(([stockId, boards]) => (
            <div key={stockId} className="stock-group shrink-0 border border-border rounded overflow-hidden">
              <h3 className="stock-group-title text-[14px] font-semibold text-text py-2.5 px-4 bg-bg m-0 border-b border-border">
                {boards[0].stockName}
              </h3>
              <div className="stock-boards flex flex-col gap-3 p-4">
                {boards.map((board) => (
                  <StockBoardDiagram
                    key={`${stockId}-${board.boardIndex}`}
                    board={board}
                    units={units}
                    onClick={() => openBoardDetail(board)}
                  />
                ))}
              </div>
            </div>
          ))}

          {cutList.stockBoards.length === 0 && (
            <p className="text-center text-text-muted py-8">No cutting diagrams to display.</p>
          )}
        </div>
      </div>

      <Dialog open={!!expandedBoard} onOpenChange={(open) => !open && setExpandedBoard(null)}>
        <DialogContent
          className="w-[1320px] max-w-[97vw] max-h-[94vh] rounded-lg"
          onClose={() => setExpandedBoard(null)}
        >
          <DialogHeader className="py-4 px-5 bg-bg rounded-t-lg">
            <DialogTitle className="text-base">
              {expandedBoard ? `${expandedBoard.stockName} - Board #${expandedBoard.boardIndex}` : 'Board Detail'}
            </DialogTitle>
            <DialogClose onClose={() => setExpandedBoard(null)} />
          </DialogHeader>
          {expandedBoard && (
            <div className="flex-1 min-h-0 flex flex-col gap-3 px-5 py-4 bg-bg-alt">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">Zoom</span>
                <Button size="sm" variant="secondary" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>
                  <Minus size={14} />
                </Button>
                <span className="min-w-14 text-center text-xs font-medium">{Math.round(zoom * 100)}%</span>
                <Button size="sm" variant="secondary" onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>
                  <Plus size={14} />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setZoom(1)}>
                  Reset
                </Button>
                {selectedPlacement && (
                  <div className="ml-auto flex flex-col items-end text-xs text-text-muted">
                    <span>
                      Selected: {selectedPlacement.partName} (
                      {formatMeasurementWithUnit(selectedPlacement.width, units)} x{' '}
                      {formatMeasurementWithUnit(selectedPlacement.height, units)})
                    </span>
                    <span>Path: {selectedPartPath}</span>
                  </div>
                )}
              </div>
              <div
                className="flex-1 min-h-0 overflow-auto rounded-md border border-border bg-surface p-4"
                onWheel={handleDetailViewportWheel}
              >
                <div className="min-w-max">
                  <StockBoardDiagram
                    board={expandedBoard}
                    units={units}
                    maxWidth={1200}
                    minVisualHeight={220}
                    maxPixelsPerUnit={8}
                    zoom={zoom}
                    lockAspectRatio
                    onPlacementClick={setSelectedPlacement}
                    selectedPartId={selectedPlacement?.partId ?? null}
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
