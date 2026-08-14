import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { AppSettings, Part } from '../types';
import { solveResizePreview } from './interactionResizePreview';

function part(overrides: Partial<Part> = {}): Part {
  return {
    id: overrides.id ?? 'part-1',
    name: overrides.name ?? 'Part',
    length: overrides.length ?? 10,
    width: overrides.width ?? 4,
    thickness: overrides.thickness ?? 1,
    position: overrides.position ?? { x: 0, y: 0.5, z: 0 },
    rotation: overrides.rotation ?? { x: 0, y: 0, z: 0 },
    stockId: overrides.stockId ?? null,
    grainSensitive: overrides.grainSensitive ?? false,
    grainDirection: overrides.grainDirection ?? 'length',
    color: overrides.color ?? '#fff'
  };
}

const settings: AppSettings = {
  defaultUnits: 'imperial',
  defaultGridSize: 1,
  theme: 'system',
  confirmBeforeDelete: true,
  showHotkeyHints: true,
  stockConstraints: {
    constrainDimensions: true,
    constrainGrain: true,
    constrainColor: true,
    preventOverlap: true
  },
  liveGridSnap: false,
  snapSensitivity: 'normal',
  snapToOrigin: true,
  dimensionSnapSameTypeOnly: false,
  enableSurfaceAnchors: true,
  enableFractionalAnchors: true,
  enableGoldenRatioAnchors: false,
  enableFeatureAnchors: true,
  enableAxisLegacySnaps: true
};

describe('interactionResizePreview', () => {
  it('solves raw resize preview and shifts the center to keep the opposite side fixed', () => {
    const resizingPart = part();

    const preview = solveResizePreview({
      part: resizingPart,
      handlePos: { x: 1, y: 0, z: 0, type: 'edge-y' },
      localDelta: { x: 2, y: 0, z: 0 },
      partPosition: resizingPart.position,
      startingDimensions: { length: 10, width: 4, thickness: 1 },
      constrainDimensions: false,
      rotationQuaternion: new THREE.Quaternion(),
      referenceParts: [resizingPart],
      referencePartIds: [],
      groupMembers: [],
      snapToPartsEnabled: false,
      appSettings: settings,
      units: 'imperial',
      cameraDistance: 20
    });

    expect(preview.dimensions.length).toBe(12);
    expect(preview.position.x).toBeCloseTo(1, 5);
    expect(preview.snapLines).toEqual([]);
  });

  it('applies dimension snapping in the shared resize solver', () => {
    const resizingPart = part();
    const reference = part({ id: 'part-2', length: 12, width: 8, thickness: 1.5, position: { x: 20, y: 0.75, z: 0 } });

    const preview = solveResizePreview({
      part: resizingPart,
      handlePos: { x: 1, y: 0, z: 0, type: 'edge-y' },
      localDelta: { x: 1.95, y: 0, z: 0 },
      partPosition: resizingPart.position,
      startingDimensions: { length: 10, width: 4, thickness: 1 },
      constrainDimensions: false,
      rotationQuaternion: new THREE.Quaternion(),
      referenceParts: [resizingPart, reference],
      referencePartIds: [],
      groupMembers: [],
      snapToPartsEnabled: true,
      appSettings: settings,
      units: 'imperial',
      cameraDistance: 20
    });

    expect(preview.dimensions.length).toBe(12);
    expect(preview.snappedDimensions.length).toBe(true);
    expect(preview.snapLines.length).toBeGreaterThan(0);
  });

  it('publishes resize size and reference gap relations from the shared resize preview solver', () => {
    const resizingPart = part();
    const reference = part({ id: 'part-2', position: { x: 15, y: 0.5, z: 0 } });

    const preview = solveResizePreview({
      part: resizingPart,
      handlePos: { x: 1, y: 0, z: 0, type: 'edge-y' },
      localDelta: { x: 2, y: 0, z: 0 },
      partPosition: resizingPart.position,
      startingDimensions: { length: 10, width: 4, thickness: 1 },
      constrainDimensions: false,
      rotationQuaternion: new THREE.Quaternion(),
      referenceParts: [resizingPart, reference],
      referencePartIds: ['part-2'],
      groupMembers: [],
      snapToPartsEnabled: false,
      appSettings: settings,
      units: 'imperial',
      cameraDistance: 20
    });

    expect(preview.referenceState?.candidateRelations.some((relation) => relation.editMode === 'resize-size')).toBe(
      true
    );
    expect(preview.referenceState?.candidateRelations.some((relation) => relation.editMode === 'resize-gap')).toBe(
      true
    );
    expect(preview.referenceState?.activeRelationId).toBeTruthy();
  });
});
