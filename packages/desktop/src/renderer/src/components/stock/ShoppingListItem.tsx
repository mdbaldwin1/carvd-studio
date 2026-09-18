import { Checkbox } from '@renderer/components/ui/checkbox';
import { formatMeasurementWithUnit } from '../../utils/fractions';
import { StockSummary } from '../../types';

interface ShoppingListItemProps {
  summary: StockSummary;
  units: 'imperial' | 'metric';
  checked: boolean;
  onToggle: () => void;
}

export function ShoppingListItem({ summary, units, checked, onToggle }: ShoppingListItemProps) {
  const isRod = summary.form === 'rod';
  const isInsert = summary.form === 'insert';
  const perPack = summary.packSize && summary.packSize > 1 ? summary.packSize : null;

  const dimensions = isInsert
    ? `${formatMeasurementWithUnit(summary.stockLength, units)} × ${formatMeasurementWithUnit(summary.stockWidth, units)} × ${formatMeasurementWithUnit(summary.stockThickness, units)}`
    : summary.form === 'rod'
      ? `${formatMeasurementWithUnit(summary.stockWidth, units)} dia × ${formatMeasurementWithUnit(summary.stockLength, units)}`
      : `${formatMeasurementWithUnit(summary.stockLength, units)} × ${formatMeasurementWithUnit(summary.stockWidth, units)} × ${formatMeasurementWithUnit(summary.stockThickness, units)}`;

  // You buy dowel by the rod and biscuits by the box, not by the board.
  const qtyLabel = isInsert
    ? perPack
      ? summary.boardsNeeded === 1
        ? 'box'
        : 'boxes'
      : summary.boardsNeeded === 1
        ? 'piece'
        : 'pieces'
    : isRod
      ? summary.boardsNeeded === 1
        ? 'rod'
        : 'rods'
      : summary.boardsNeeded === 1
        ? 'board'
        : 'boards';
  const hasOverage = summary.boardsNeeded > summary.actualBoardsUsed;
  // Linear feet is the honest measure of a rod, so show it however it is priced.
  const showLinearFeet = !isInsert && (isRod || summary.pricingUnit === 'board_foot') && summary.linearFeet > 0;
  const linearFeetDisplay = showLinearFeet ? ` (${summary.linearFeet.toFixed(1)} linear ft)` : '';
  const priceDisplay = isInsert
    ? `$${summary.pricePerUnit.toFixed(2)}/${perPack ? 'box' : 'ea'}`
    : isRod
      ? `$${summary.pricePerUnit.toFixed(2)}/rod`
      : summary.pricingUnit === 'board_foot'
        ? `$${summary.pricePerUnit.toFixed(2)}/bf`
        : `$${summary.pricePerUnit.toFixed(2)}/sheet`;

  return (
    <div
      className={`flex items-start gap-3 py-3 px-4 bg-surface border border-border rounded transition-colors duration-150 ${checked ? 'opacity-50 bg-bg-alt' : ''}`}
    >
      <label className="flex items-center pt-0.5 shrink-0 cursor-pointer">
        <Checkbox
          checked={checked}
          onChange={onToggle}
          aria-label={`Mark ${summary.stockName} as ${checked ? 'not purchased' : 'purchased'}`}
        />
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
        {isInsert && perPack && (
          <div className="text-[11px] text-text-muted mt-0.5">
            {summary.insertsNeeded} needed · {perPack} per box
          </div>
        )}
        {!isRod && !isInsert && summary.pricingUnit === 'board_foot' && (
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
