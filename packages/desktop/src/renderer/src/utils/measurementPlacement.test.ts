import { describe, expect, it } from 'vitest';
import {
  getBoundingBoxDimensionPlacements,
  getCameraFacingSigns,
  getPartDimensionPlacements,
  getReferenceLabelPosition
} from './measurementPlacement';

describe('measurementPlacement', () => {
  it('derives stable visible-side signs from camera position', () => {
    expect(getCameraFacingSigns([8, 3, -4])).toEqual({ x: 1, y: 1, z: -1 });
    expect(getCameraFacingSigns([-8, -3, 4])).toEqual({ x: -1, y: -1, z: 1 });
  });

  it('places part dimensions on the camera-visible outer edges', () => {
    const placements = getPartDimensionPlacements({
      length: 60,
      width: 24,
      thickness: 1.5,
      cameraLocal: [20, 10, 18]
    });

    expect(placements.length.start).toEqual([-30, 0.75, 12]);
    expect(placements.length.end).toEqual([30, 0.75, 12]);
    expect(placements.width.start).toEqual([30, 0.75, -12]);
    expect(placements.width.end).toEqual([30, 0.75, 12]);
    expect(placements.thickness.start).toEqual([30, -0.75, 12]);
    expect(placements.thickness.end).toEqual([30, 0.75, 12]);
    expect(placements.length.offset).toBeGreaterThan(1);
    expect(placements.thickness.offset).toBeGreaterThan(1);
  });

  it('places bounding dimensions on the visible edges of the selection bounds', () => {
    const placements = getBoundingBoxDimensionPlacements({
      minX: -10,
      maxX: 20,
      minY: 0,
      maxY: 30,
      minZ: -5,
      maxZ: 12,
      cameraWorld: [100, 80, 90]
    });

    expect(placements.x.start).toEqual([-10, 30, 12]);
    expect(placements.x.end).toEqual([20, 30, 12]);
    expect(placements.z.start).toEqual([20, 30, -5]);
    expect(placements.z.end).toEqual([20, 30, 12]);
    expect(placements.y.start).toEqual([20, 0, 12]);
    expect(placements.y.end).toEqual([20, 30, 12]);
  });

  it('offsets reference labels perpendicular to the measured line using camera orientation', () => {
    const labelPosition = getReferenceLabelPosition({
      start: [0, 0, 0],
      end: [10, 0, 0],
      axis: 'x',
      cameraUp: [0, 1, 0],
      cameraRight: [1, 0, 0]
    });

    expect(labelPosition[0]).toBeCloseTo(5);
    expect(labelPosition[1]).toBeGreaterThan(0.8);
    expect(labelPosition[2]).toBeCloseTo(0);
  });
});
