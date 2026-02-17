import { Download, FileText } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { getBlockedMessage } from '../../utils/featureLimits';
import { formatMeasurementWithUnit } from '../../utils/fractions';
import { exportDiagramsToPdf } from '../../utils/pdfExport';
import { logger } from '../../utils/logger';
import { CutList, StockBoard } from '../../types';
import { DropdownButton, DropdownItem } from '../common/DropdownButton';

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
      showToast(getBlockedMessage('exportPDF'));
      return;
    }

    try {
      const result = await exportDiagramsToPdf(cutList, {
        projectName: projectName || 'Untitled Project',
        units
      });

      if (result.success) {
        showToast('Cutting diagrams saved to PDF');
      } else if (result.error) {
        showToast('Failed to save PDF');
        logger.error('PDF export error:', result.error);
      }
      // If canceled, do nothing
    } catch (error) {
      logger.error('PDF export error:', error);
      showToast('Failed to export PDF');
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

  return (
    <div className="cut-list-diagrams-tab flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center justify-between py-2 px-0 mb-2 shrink-0">
        <span className="text-[12px] text-text-muted">
          {cutList.stockBoards.length} board{cutList.stockBoards.length !== 1 ? 's' : ''} needed
        </span>
        <DropdownButton label="Download" icon={<Download size={14} />} items={downloadItems} />
      </div>

      <div className="diagrams-content flex-1 overflow-y-auto min-h-0 flex flex-col gap-5">
        {Array.from(boardsByStock.entries()).map(([stockId, boards]) => (
          <div key={stockId} className="stock-group border border-border rounded overflow-hidden">
            <h3 className="stock-group-title text-[14px] font-semibold text-text py-2.5 px-4 bg-bg m-0 border-b border-border">
              {boards[0].stockName}
            </h3>
            <div className="stock-boards flex flex-col gap-3 p-4">
              {boards.map((board) => (
                <StockBoardDiagram key={`${stockId}-${board.boardIndex}`} board={board} units={units} />
              ))}
            </div>
          </div>
        ))}

        {cutList.stockBoards.length === 0 && (
          <p className="text-center text-text-muted py-8">No cutting diagrams to display.</p>
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
    <div className="stock-board-diagram border border-border rounded bg-surface overflow-hidden">
      <div className="flex items-center gap-3 py-2 px-3 bg-bg text-[12px]">
        <span className="font-semibold text-text">Board #{board.boardIndex}</span>
        <span className="board-dims text-text-muted">
          {formatMeasurementWithUnit(board.stockLength, units)} × {formatMeasurementWithUnit(board.stockWidth, units)}
        </span>
        <span className="ml-auto font-medium text-accent">{board.utilizationPercent.toFixed(1)}% used</span>
      </div>
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="board-svg block w-full"
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
                {placement.partName.length > 15 ? placement.partName.substring(0, 12) + '...' : placement.partName}
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
