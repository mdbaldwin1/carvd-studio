import { describe, expect, it, vi } from 'vitest';
vi.mock('three', async () => await vi.importActual<typeof import('three')>('three'));
import { PerspectiveCamera } from 'three';
import { getProjectedMeasurementLength, resolveMeasurementOverlayLayout } from './measurementOverlayLayout';

function createCamera(): PerspectiveCamera {
  const camera = new PerspectiveCamera(50, 1, 0.1, 1000);
  camera.position.set(0, 0, 20);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

describe('measurementOverlayLayout', () => {
  it('measures projected line length in screen pixels', () => {
    const camera = createCamera();
    const viewport = { width: 1000, height: 1000 };

    const length = getProjectedMeasurementLength({ x: -5, y: 0, z: 0 }, { x: 5, y: 0, z: 0 }, camera, viewport);

    expect(length).toBeGreaterThan(400);
  });

  it('suppresses lower-priority labels that overlap in screen space', () => {
    const camera = createCamera();
    const viewport = { width: 1000, height: 1000 };

    const placements = resolveMeasurementOverlayLayout(
      [
        { id: 'primary', worldPosition: { x: 0, y: 0, z: 0 }, priority: 10 },
        { id: 'secondary', worldPosition: { x: 0.2, y: 0.1, z: 0 }, priority: 5 },
        { id: 'far-away', worldPosition: { x: 6, y: 0, z: 0 }, priority: 1 }
      ],
      camera,
      viewport,
      50
    );

    expect(placements.get('primary')).toEqual({ visible: true, lane: 0 });
    expect(placements.get('secondary')).toEqual({ visible: true, lane: 1 });
    expect(placements.get('far-away')).toEqual({ visible: true, lane: 0 });
  });
});
