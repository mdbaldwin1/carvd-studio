import { describe, expect, it } from 'vitest';
import {
  getBoundingMeasurementPriority,
  getPartDimensionPriority,
  getReferenceDistancePriority
} from './measurementPriority';

describe('measurementPriority', () => {
  it('prioritizes part dimensions by importance', () => {
    expect(getPartDimensionPriority('length')).toBeGreaterThan(getPartDimensionPriority('width'));
    expect(getPartDimensionPriority('width')).toBeGreaterThan(getPartDimensionPriority('thickness'));
  });

  it('prioritizes overall bounds over internal gaps', () => {
    expect(getBoundingMeasurementPriority('overall', 'x', 40)).toBeGreaterThan(
      getBoundingMeasurementPriority('gap', 'x', 8)
    );
  });

  it('prioritizes larger openings over tiny incidental gaps', () => {
    expect(getBoundingMeasurementPriority('gap', 'x', 8)).toBeGreaterThan(
      getBoundingMeasurementPriority('gap', 'x', 0.5)
    );
  });

  it('pins actively edited reference distances to the top', () => {
    expect(getReferenceDistancePriority({ type: 'edge-offset', distance: 1, isEditing: true })).toBeGreaterThan(
      getReferenceDistancePriority({ type: 'edge-to-edge', distance: 8, isEditing: false })
    );
  });
});
