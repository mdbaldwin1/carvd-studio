import * as THREE from 'three';

export interface ScreenSpaceMeasurement {
  id: string;
  worldPosition: { x: number; y: number; z: number };
  priority: number;
}

export interface MeasurementOverlayPlacement {
  visible: boolean;
  lane: number;
}

function projectWorldPoint(
  point: { x: number; y: number; z: number },
  camera: THREE.Camera,
  viewport: { width: number; height: number }
): { x: number; y: number; depth: number } | null {
  const projected = new THREE.Vector3(point.x, point.y, point.z).project(camera);

  if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y) || !Number.isFinite(projected.z)) {
    return null;
  }

  return {
    x: ((projected.x + 1) * viewport.width) / 2,
    y: ((1 - projected.y) * viewport.height) / 2,
    depth: projected.z
  };
}

export function getProjectedMeasurementLength(
  start: { x: number; y: number; z: number },
  end: { x: number; y: number; z: number },
  camera: THREE.Camera,
  viewport: { width: number; height: number }
): number {
  const startScreen = projectWorldPoint(start, camera, viewport);
  const endScreen = projectWorldPoint(end, camera, viewport);

  if (!startScreen || !endScreen) return 0;

  return Math.hypot(endScreen.x - startScreen.x, endScreen.y - startScreen.y);
}

export function resolveMeasurementOverlayLayout(
  measurements: ScreenSpaceMeasurement[],
  camera: THREE.Camera,
  viewport: { width: number; height: number },
  minScreenSeparationPx: number,
  maxLanes: number = 2
): Map<string, MeasurementOverlayPlacement> {
  const acceptedByLane: { id: string; x: number; y: number }[][] = Array.from({ length: maxLanes }, () => []);
  const placements = new Map<string, MeasurementOverlayPlacement>();

  const ranked = measurements
    .map((measurement, index) => ({
      measurement,
      screen: projectWorldPoint(measurement.worldPosition, camera, viewport),
      index
    }))
    .filter(
      (
        entry
      ): entry is {
        measurement: ScreenSpaceMeasurement;
        screen: { x: number; y: number; depth: number };
        index: number;
      } => entry.screen !== null && entry.screen.depth > -1 && entry.screen.depth < 1
    )
    .sort(
      (a, b) => b.measurement.priority - a.measurement.priority || a.screen.depth - b.screen.depth || a.index - b.index
    );

  for (const entry of ranked) {
    let assignedLane = -1;

    for (let lane = 0; lane < maxLanes; lane++) {
      const collidesInLane = acceptedByLane[lane].some(
        (existing) => Math.hypot(existing.x - entry.screen.x, existing.y - entry.screen.y) < minScreenSeparationPx
      );
      if (!collidesInLane) {
        assignedLane = lane;
        break;
      }
    }

    if (assignedLane === -1) {
      placements.set(entry.measurement.id, { visible: false, lane: 0 });
      continue;
    }

    acceptedByLane[assignedLane].push({ id: entry.measurement.id, x: entry.screen.x, y: entry.screen.y });
    placements.set(entry.measurement.id, { visible: true, lane: assignedLane });
  }

  return placements;
}
