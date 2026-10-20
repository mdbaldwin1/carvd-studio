import type { Stock } from '../types';
import { formatReadableMeasurement } from './fractions';

/** Purchased insert sizes must not become a different nominal imperial size. */
export function formatStockMeasurement(
  value: number,
  stock: Pick<Stock, 'form' | 'insertKind'>,
  units: 'imperial' | 'metric'
) {
  return stock.form === 'insert' && stock.insertKind !== 'loose_tenon'
    ? formatReadableMeasurement(value, 'metric')
    : formatReadableMeasurement(value, units);
}
