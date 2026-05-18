export function getPartDimensionPriority(kind: 'length' | 'width' | 'thickness'): number {
  switch (kind) {
    case 'length':
      return 16;
    case 'width':
      return 14;
    case 'thickness':
    default:
      return 9;
  }
}

export function getBoundingMeasurementPriority(
  kind: 'overall' | 'gap',
  axis: 'x' | 'y' | 'z',
  distance: number
): number {
  if (kind === 'overall') {
    if (axis === 'x') return 30;
    if (axis === 'z') return 29;
    return 28;
  }

  const distanceBoost = Math.min(distance, 12);
  const openingBoost = distance >= 6 ? 8 : distance >= 3 ? 5 : distance >= 1.5 ? 2 : 0;
  const axisBias = axis === 'y' ? -1 : 0;

  return 10 + distanceBoost + openingBoost + axisBias;
}

export function getReferenceDistancePriority({
  type,
  distance,
  isEditing
}: {
  type: 'edge-to-edge' | 'edge-offset';
  distance: number;
  isEditing: boolean;
}): number {
  if (isEditing) {
    return 100;
  }

  const distanceBoost = Math.min(distance, 8);

  if (type === 'edge-to-edge') {
    return 24 + distanceBoost;
  }

  return 12 + Math.min(distanceBoost, 5);
}
