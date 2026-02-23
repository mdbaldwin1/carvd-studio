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
  const dimensions = `${formatMeasurementWithUnit(summary.stockLength, units)} × ${formatMeasurementWithUnit(summary.stockWidth, units)} × ${formatMeasurementWithUnit(summary.stockThickness, units)}`;

  const qtyLabel = summary.boardsNeeded === 1 ? 'board' : 'boards';
  const hasOverage = summary.boardsNeeded > summary.actualBoardsUsed;
  const linearFeetDisplay =
    summary.pricingUnit === 'board_foot' && summary.linearFeet > 0
      ? ` (${summary.linearFeet.toFixed(1)} linear ft)`
      : '';
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
