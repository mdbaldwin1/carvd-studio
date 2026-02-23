import { Stock } from '../../types';
import { formatMeasurementWithUnit } from '../../utils/fractions';
import { type KeyboardEvent } from 'react';

interface StockListItemProps {
  stock: Stock;
  units: 'imperial' | 'metric';
  selected: boolean;
  highlighted?: boolean;
  onClick: () => void;
}

export function StockListItem({ stock, units, selected, highlighted = false, onClick }: StockListItemProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <li
      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-[background] duration-100 hover:bg-surface-hover ${selected ? 'bg-selected' : ''} ${highlighted ? 'outline-2 outline-solid outline-primary -outline-offset-2' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <span className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: stock.color }} />
      <div className="flex flex-col min-w-0">
        <span className="text-xs whitespace-nowrap overflow-hidden text-ellipsis">{stock.name}</span>
        <span className="text-[10px] text-text-muted">
          {formatMeasurementWithUnit(stock.length, units)} × {formatMeasurementWithUnit(stock.width, units)} ×{' '}
          {formatMeasurementWithUnit(stock.thickness, units)}
        </span>
      </div>
    </li>
  );
}
