import { Badge } from '@renderer/components/ui/badge';
import { AssemblyPart } from '../../types';
import { formatMeasurementWithUnit } from '../../utils/fractions';
import { getFeatureBadgeLabel, getPrimaryFeatureText } from '../../utils/partFeatureSummary';

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
      {visibleParts.map((part, index) => {
        const featureBadge = getFeatureBadgeLabel(part.features);
        const featureSummary = getPrimaryFeatureText(part.features, units);

        return (
          <li key={index} className={itemClassName}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-xs text-text">{part.name}</span>
                {featureBadge && (
                  <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px] font-medium">
                    {featureBadge}
                  </Badge>
                )}
              </div>
              {featureSummary && <p className="mt-0.5 truncate text-[11px] text-text-muted">{featureSummary}</p>}
            </div>
            <span className="shrink-0 text-[11px] text-text-muted">
              {formatMeasurementWithUnit(part.length, units)} × {formatMeasurementWithUnit(part.width, units)} ×{' '}
              {formatMeasurementWithUnit(part.thickness, units)}
            </span>
          </li>
        );
      })}
      {hasMore && (
        <li className="py-1.5 px-2.5 text-[11px] text-text-muted italic">
          +{parts.length - maxVisibleParts!} more parts
        </li>
      )}
    </ul>
  );
}
