import type { Part } from '@renderer/types';
import { formatMeasurementWithUnit } from '@renderer/utils/fractions';

/** "24" × 12" × 3/4"" — the blank a part's cuts are applied to. */
export function getBlankSizeLabel(part: Part, units: 'imperial' | 'metric'): string {
  return [
    formatMeasurementWithUnit(part.length, units),
    formatMeasurementWithUnit(part.width, units),
    formatMeasurementWithUnit(part.thickness, units)
  ].join(' × ');
}
