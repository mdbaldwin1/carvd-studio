import { cn } from '@renderer/lib/utils';
import { formatMeasurementWithUnit } from '../../utils/fractions';
import { CutPlacement, StockBoard } from '../../types';

function getReadableTextColor(backgroundHex: string): string {
  const normalized = backgroundHex.trim().replace('#', '');
  const hex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return '#111827';
  }

  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const toLinear = (channel: number) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);

  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.4 ? '#111827' : '#f9fafb';
}

interface StockBoardDiagramProps {
  board: StockBoard;
  units: 'imperial' | 'metric';
  maxWidth?: number;
  minVisualHeight?: number;
  maxPixelsPerUnit?: number;
  zoom?: number;
  lockAspectRatio?: boolean;
  className?: string;
  onClick?: () => void;
  onPlacementClick?: (placement: CutPlacement) => void;
  selectedPartId?: string | null;
}

export function StockBoardDiagram({
  board,
  units,
  maxWidth = 600,
  minVisualHeight = 96,
  maxPixelsPerUnit = 4,
  zoom = 1,
  lockAspectRatio = false,
  className,
  onClick,
  onPlacementClick,
  selectedPartId
}: StockBoardDiagramProps) {
  // Keep horizontal scale realistic, but boost vertical scale for narrow boards
  // so diagrams remain readable in projects with many boards.
  const baseScale = Math.min(maxWidth / Math.max(board.stockLength, 1), maxPixelsPerUnit);
  const xScale = baseScale * zoom;
  const yBaseScale = lockAspectRatio ? baseScale : Math.max(baseScale, minVisualHeight / Math.max(board.stockWidth, 1));
  const yScale = yBaseScale * zoom;
  const svgWidth = board.stockLength * xScale;
  const svgHeight = board.stockWidth * yScale;
  const selectedPlacement = selectedPartId ? (board.placements.find((p) => p.partId === selectedPartId) ?? null) : null;
  const MIN_PART_LABEL_FONT = 6;
  const MAX_PART_LABEL_FONT = 14;
  const PART_LABEL_HORIZONTAL_PADDING = 4;
  const PART_LABEL_VERTICAL_PADDING = 2;
  const APPROX_CHAR_WIDTH_FACTOR = 0.56;

  return (
    <div
      className={cn(
        'stock-board-diagram shrink-0 border border-border rounded bg-surface overflow-hidden',
        onClick ? 'cursor-zoom-in transition-colors hover:border-primary/60' : '',
        className
      )}
      onClick={onClick}
    >
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
        <rect x={0} y={0} width={svgWidth} height={svgHeight} fill="#ddd" stroke="#999" strokeWidth={1} />

        {board.placements.map((placement) => {
          const labelColor = getReadableTextColor(placement.color);
          const px = placement.x * xScale;
          const py = placement.y * yScale;
          const pw = placement.width * xScale;
          const ph = placement.height * yScale;
          const availableLabelWidth = Math.max(0, pw - PART_LABEL_HORIZONTAL_PADDING);
          const availableLabelHeight = Math.max(0, ph - PART_LABEL_VERTICAL_PADDING);
          const rawName = placement.partName;
          const fontByHeight = availableLabelHeight * 0.55;
          const fontByWidth = availableLabelWidth / Math.max(1, rawName.length * APPROX_CHAR_WIDTH_FACTOR);
          const partLabelFontSize = Math.min(MAX_PART_LABEL_FONT, fontByHeight, fontByWidth);
          const canRenderPartLabel = partLabelFontSize >= MIN_PART_LABEL_FONT;
          const maxCharsByWidth = Math.max(
            1,
            Math.floor(availableLabelWidth / Math.max(1, partLabelFontSize * APPROX_CHAR_WIDTH_FACTOR))
          );
          const shouldTruncate = rawName.length > maxCharsByWidth;
          const displayedPartName =
            shouldTruncate && maxCharsByWidth > 3
              ? `${rawName.slice(0, Math.max(1, maxCharsByWidth - 3))}...`
              : shouldTruncate
                ? rawName.slice(0, maxCharsByWidth)
                : rawName;
          const rotatedLabelFontSize = Math.max(5, Math.min(8, partLabelFontSize * 0.75));
          const rotatedOffset = Math.max(7, partLabelFontSize * 0.85);
          const canRenderRotatedLabel =
            placement.rotated && ph >= partLabelFontSize + rotatedLabelFontSize + PART_LABEL_VERTICAL_PADDING;

          return (
            <g key={placement.partId}>
              <rect
                x={px}
                y={py}
                width={pw}
                height={ph}
                fill={placement.color}
                stroke={selectedPartId === placement.partId ? '#ffffff' : '#333'}
                strokeWidth={selectedPartId === placement.partId ? 1.5 : 0.5}
                className={onPlacementClick ? 'cursor-pointer' : undefined}
                onClick={
                  onPlacementClick
                    ? (e) => {
                        e.stopPropagation();
                        onPlacementClick(placement);
                      }
                    : undefined
                }
              />
              {canRenderPartLabel && (
                <text
                  x={(placement.x + placement.width / 2) * xScale}
                  y={(placement.y + placement.height / 2) * yScale}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={partLabelFontSize}
                  fill={labelColor}
                  style={{ pointerEvents: 'none' }}
                >
                  {displayedPartName}
                </text>
              )}
              {canRenderRotatedLabel && (
                <text
                  x={(placement.x + placement.width / 2) * xScale}
                  y={(placement.y + placement.height / 2) * yScale + rotatedOffset}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={rotatedLabelFontSize}
                  fill={labelColor}
                  style={{ pointerEvents: 'none' }}
                >
                  (rotated)
                </text>
              )}
            </g>
          );
        })}

        {selectedPlacement && (
          <g style={{ pointerEvents: 'none' }}>
            {(() => {
              const px = selectedPlacement.x * xScale;
              const py = selectedPlacement.y * yScale;
              const pw = selectedPlacement.width * xScale;
              const ph = selectedPlacement.height * yScale;
              const offset = 12;
              const tick = 8;
              const hLineTargetY = py - offset;
              const hY = Math.max(10, hLineTargetY);
              const isHorizontalLabelFlipped = hLineTargetY < 10;
              const hLabelY = isHorizontalLabelFlipped ? hY + 14 : hY - 3;
              const vX = Math.min(svgWidth - 10, px + pw + offset);
              return (
                <>
                  <line x1={px} y1={hY} x2={px + pw} y2={hY} stroke="#111827" strokeWidth={1.75} />
                  <line x1={px} y1={hY - tick / 2} x2={px} y2={hY + tick / 2} stroke="#111827" strokeWidth={1.75} />
                  <line
                    x1={px + pw}
                    y1={hY - tick / 2}
                    x2={px + pw}
                    y2={hY + tick / 2}
                    stroke="#111827"
                    strokeWidth={1.75}
                  />
                  <line x1={px} y1={py} x2={px} y2={hY} stroke="#111827" strokeWidth={1.25} strokeDasharray="2 2" />
                  <line
                    x1={px + pw}
                    y1={py}
                    x2={px + pw}
                    y2={hY}
                    stroke="#111827"
                    strokeWidth={1.25}
                    strokeDasharray="2 2"
                  />
                  <text
                    x={px + pw / 2}
                    y={hLabelY}
                    textAnchor="middle"
                    fontSize={14}
                    fontWeight={800}
                    fill="#0b1220"
                    stroke="#ffffff"
                    strokeWidth={1.1}
                    strokeLinejoin="round"
                    paintOrder="stroke"
                  >
                    {formatMeasurementWithUnit(selectedPlacement.width, units)}
                  </text>

                  <line x1={vX} y1={py} x2={vX} y2={py + ph} stroke="#111827" strokeWidth={1.75} />
                  <line x1={vX - tick / 2} y1={py} x2={vX + tick / 2} y2={py} stroke="#111827" strokeWidth={1.75} />
                  <line
                    x1={vX - tick / 2}
                    y1={py + ph}
                    x2={vX + tick / 2}
                    y2={py + ph}
                    stroke="#111827"
                    strokeWidth={1.75}
                  />
                  <line
                    x1={px + pw}
                    y1={py}
                    x2={vX}
                    y2={py}
                    stroke="#111827"
                    strokeWidth={1.25}
                    strokeDasharray="2 2"
                  />
                  <line
                    x1={px + pw}
                    y1={py + ph}
                    x2={vX}
                    y2={py + ph}
                    stroke="#111827"
                    strokeWidth={1.25}
                    strokeDasharray="2 2"
                  />
                  <text
                    x={vX + 3}
                    y={py + ph / 2}
                    textAnchor="start"
                    dominantBaseline="middle"
                    fontSize={14}
                    fontWeight={800}
                    fill="#0b1220"
                    stroke="#ffffff"
                    strokeWidth={1.1}
                    strokeLinejoin="round"
                    paintOrder="stroke"
                  >
                    {formatMeasurementWithUnit(selectedPlacement.height, units)}
                  </text>
                </>
              );
            })()}
          </g>
        )}
      </svg>
    </div>
  );
}
