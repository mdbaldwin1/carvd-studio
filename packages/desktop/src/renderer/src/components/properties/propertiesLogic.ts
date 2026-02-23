import { STOCK_COLORS } from '@renderer/constants';
import { Part, Stock } from '@renderer/types';
import { formatMeasurementWithUnit } from '@renderer/utils/fractions';
import { getPartBounds } from '@renderer/utils/snapToPartsUtil';

export function getConstraintWarnings(part: Part, stocks: Stock[], units: 'imperial' | 'metric'): string[] {
  const warnings: string[] = [];
  if (!part.stockId) return warnings;

  const stock = stocks.find((s) => s.id === part.stockId);
  if (!stock) return warnings;

  const partLength = part.length + (part.extraLength || 0);
  const partWidth = part.width + (part.extraWidth || 0);

  const fitsNormal = partLength <= stock.length && partWidth <= stock.width;
  const fitsRotated = partLength <= stock.width && partWidth <= stock.length;

  if (!fitsNormal && !fitsRotated) {
    if (!(part.glueUpPanel && partLength <= stock.length)) {
      warnings.push(
        `Part dimensions (${formatMeasurementWithUnit(partLength, units)} × ${formatMeasurementWithUnit(partWidth, units)}) exceed stock (${formatMeasurementWithUnit(stock.length, units)} × ${formatMeasurementWithUnit(stock.width, units)})`
      );
    }
  }

  if (part.thickness > stock.thickness) {
    warnings.push(
      `Part thickness (${formatMeasurementWithUnit(part.thickness, units)}) exceeds stock (${formatMeasurementWithUnit(stock.thickness, units)})`
    );
  }

  if (part.grainSensitive && stock.grainDirection !== 'none' && part.grainDirection !== stock.grainDirection) {
    warnings.push(`Part grain (${part.grainDirection}) doesn't match stock grain (${stock.grainDirection})`);
  }

  return warnings;
}

export function getPartAABB(part: Part) {
  const bounds = getPartBounds(part);
  return {
    minX: bounds.minX,
    maxX: bounds.maxX,
    minY: bounds.minY,
    maxY: bounds.maxY,
    minZ: bounds.minZ,
    maxZ: bounds.maxZ
  };
}

export function aabbsOverlap(
  a: ReturnType<typeof getPartAABB>,
  b: ReturnType<typeof getPartAABB>,
  epsilon = 0.001
): boolean {
  return (
    a.minX < b.maxX - epsilon &&
    a.maxX > b.minX + epsilon &&
    a.minY < b.maxY - epsilon &&
    a.maxY > b.minY + epsilon &&
    a.minZ < b.maxZ - epsilon &&
    a.maxZ > b.minZ + epsilon
  );
}

export function getOverlappingParts(part: Part, parts: Part[]): string[] {
  if (part.ignoreOverlap) {
    return [];
  }

  const overlapping: string[] = [];
  const partAABB = getPartAABB(part);

  for (const other of parts) {
    if (other.id === part.id || other.ignoreOverlap) continue;
    const otherAABB = getPartAABB(other);
    if (aabbsOverlap(partAABB, otherAABB)) {
      overlapping.push(other.name);
    }
  }

  return overlapping;
}

export function wouldPartOverlap(part: Part, newPosition: Part['position'], parts: Part[]): boolean {
  const testPart: Part = { ...part, position: newPosition };
  const testAABB = getPartAABB(testPart);

  for (const other of parts) {
    if (other.id === part.id) continue;
    const otherAABB = getPartAABB(other);
    if (aabbsOverlap(testAABB, otherAABB)) {
      return true;
    }
  }
  return false;
}

export function buildStockDataFromUpdates(updates: Partial<Stock>, colorIndex: number): Partial<Stock> {
  return {
    name: updates.name || 'New Stock',
    length: updates.length || 96,
    width: updates.width || 48,
    thickness: updates.thickness || 0.75,
    grainDirection: updates.grainDirection || 'length',
    pricingUnit: updates.pricingUnit || 'per_item',
    pricePerUnit: updates.pricePerUnit || 50,
    color: updates.color || STOCK_COLORS[colorIndex % STOCK_COLORS.length]
  };
}
