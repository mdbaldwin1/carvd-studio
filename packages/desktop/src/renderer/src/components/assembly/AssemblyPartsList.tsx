import { AssemblyPart } from '../../types';
import { formatMeasurementWithUnit } from '../../utils/fractions';

interface AssemblyPartsListProps {
  parts: AssemblyPart[];
  units: 'imperial' | 'metric';
  maxVisibleParts?: number;
  maxHeightClassName?: string;
  itemClassName?: string;
}

export function AssemblyPartsList({
  parts,
  units,
  maxVisibleParts,
  maxHeightClassName = 'max-h-[200px]',
  itemClassName = 'flex justify-between items-center py-2 px-3 bg-bg rounded mb-1 last:mb-0'
}: AssemblyPartsListProps) {
  const visibleParts = maxVisibleParts ? parts.slice(0, maxVisibleParts) : parts;
  const hasMore = Boolean(maxVisibleParts && parts.length > maxVisibleParts);

  return (
    <ul className={`list-none m-0 p-0 overflow-y-auto ${maxHeightClassName}`}>
      {visibleParts.map((part, index) => (
        <li key={index} className={itemClassName}>
          <span className="text-xs text-text">{part.name}</span>
          <span className="text-[11px] text-text-muted">
            {formatMeasurementWithUnit(part.length, units)} × {formatMeasurementWithUnit(part.width, units)} ×{' '}
            {formatMeasurementWithUnit(part.thickness, units)}
          </span>
        </li>
      ))}
      {hasMore && (
        <li className="py-1.5 px-2.5 text-[11px] text-text-muted italic">
          +{parts.length - maxVisibleParts!} more parts
        </li>
      )}
    </ul>
  );
}
