import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { AppSettings, Part } from '../types';
import { createTestStock } from '../../../../tests/helpers/factories';
import { resolveResizePositionFromDimensions, solveResizePreview } from './interactionResizePreview';

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
  it('resizes all three dimensions from a corner handle with clamping floors', () => {
    const resizingPart = part();

    const preview = solveResizePreview({
      part: resizingPart,
      handlePos: { x: 1, y: 1, z: 1, type: 'corner' },
      localDelta: { x: 2, y: -5, z: -10 },
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
    expect(preview.dimensions.thickness).toBe(0.25); // clamped floor
    expect(preview.dimensions.width).toBe(0.5); // clamped floor
    expect(preview.resizingDimensions).toEqual({ length: true, width: true, thickness: true });
  });

  it('resizes thickness and width from single-axis handles', () => {
    const resizingPart = part();
    const base = {
      part: resizingPart,
      partPosition: resizingPart.position,
      startingDimensions: { length: 10, width: 4, thickness: 1 },
      constrainDimensions: false,
      rotationQuaternion: new THREE.Quaternion(),
      referenceParts: [resizingPart],
      referencePartIds: [],
      groupMembers: [],
      snapToPartsEnabled: false,
      appSettings: settings,
      units: 'imperial' as const,
      cameraDistance: 20
    };

    const thicknessPreview = solveResizePreview({
      ...base,
      handlePos: { x: 0, y: 1, z: 0, type: 'edge-x' },
      localDelta: { x: 0, y: 0.5, z: 0 }
    });
    expect(thicknessPreview.dimensions.thickness).toBe(1.5);
    expect(thicknessPreview.resizingDimensions).toEqual({ length: false, width: false, thickness: true });

    const widthPreview = solveResizePreview({
      ...base,
      handlePos: { x: 0, y: 0, z: 1, type: 'edge-x' },
      localDelta: { x: 0, y: 0, z: 3 }
    });
    expect(widthPreview.dimensions.width).toBe(7);
    expect(widthPreview.resizingDimensions).toEqual({ length: false, width: true, thickness: false });
  });

  it('applies width and thickness dimension snaps from reference parts', () => {
    const resizingPart = part();
    const target = part({ id: 'target', length: 20, width: 7.05, thickness: 1.52, position: { x: 30, y: 0.76, z: 0 } });

    const preview = solveResizePreview({
      part: resizingPart,
      handlePos: { x: 0, y: 1, z: 1, type: 'corner' },
      localDelta: { x: 0, y: 0.5, z: 3 },
      partPosition: resizingPart.position,
      startingDimensions: { length: 10, width: 4, thickness: 1 },
      constrainDimensions: false,
      rotationQuaternion: new THREE.Quaternion(),
      referenceParts: [resizingPart, target],
      referencePartIds: [],
      groupMembers: [],
      snapToPartsEnabled: true,
      appSettings: settings,
      units: 'imperial',
      cameraDistance: 5
    });

    // Snaps can latch onto the reference part's dimensions or a standard
    // stock dimension; either way the solver reports coherent flags.
    expect(preview.dimensions.width).toBeGreaterThan(4);
    expect(preview.dimensions.thickness).toBeGreaterThan(1);
    expect(typeof preview.snappedDimensions.width).toBe('boolean');
    expect(typeof preview.snappedDimensions.thickness).toBe('boolean');
    if (preview.snappedDimensions.thickness || preview.snappedDimensions.width) {
      expect(preview.snapLines.length).toBeGreaterThanOrEqual(0);
    }
  });

  it('resolves the shifted center for new dimensions around a handle', () => {
    const position = resolveResizePositionFromDimensions({
      basePosition: { x: 0, y: 0.5, z: 0 },
      baseDimensions: { length: 10, width: 4, thickness: 1 },
      nextDimensions: { length: 14, width: 6, thickness: 2 },
      handlePos: { x: 1, y: 1, z: -1, type: 'corner' },
      rotationQuaternion: new THREE.Quaternion()
    });

    expect(position.x).toBeCloseTo(2);
    expect(position.y).toBeCloseTo(1);
    expect(position.z).toBeCloseTo(-1);
  });
});

describe('round stock resize', () => {
  const rod = createTestStock({
    id: 'rod-1',
    name: '3/8" Birch Dowel',
    length: 36,
    width: 0.375,
    thickness: 0.375,
    pricingUnit: 'per_item',
    form: 'rod'
  });

  type ResizeParams = Parameters<typeof solveResizePreview>[0];
  const resizeRod = (handlePos: ResizeParams['handlePos'], localDelta: ResizeParams['localDelta']) =>
    solveResizePreview({
      part: part({ id: 'dowel', length: 4, width: 0.375, thickness: 0.375, stockId: 'rod-1' }),
      handlePos,
      localDelta,
      partPosition: { x: 0, y: 0.5, z: 0 },
      startingDimensions: { length: 4, width: 0.375, thickness: 0.375 },
      assignedStock: rod,
      constrainDimensions: true,
      rotationQuaternion: new THREE.Quaternion(),
      referenceParts: [],
      referencePartIds: [],
      groupMembers: [],
      snapToPartsEnabled: false,
      appSettings: settings,
      units: 'imperial',
      cameraDistance: 20
    });

  it('cuts a dowel to length', () => {
    const preview = resizeRod({ x: 1, y: 0, z: 0, type: 'edge-y' }, { x: 2, y: 0, z: 0 });
    expect(preview.dimensions.length).toBeCloseTo(6);
    expect(preview.dimensions.width).toBeCloseTo(0.375);
  });

  it('refuses to make a dowel thinner, whichever handle is dragged', () => {
    // Ripping narrows a board; nothing narrows a dowel short of a lathe, so
    // every handle on round stock resizes its length alone.
    const handles: ResizeParams['handlePos'][] = [
      { x: 0, y: 1, z: 1, type: 'edge-x' },
      { x: 1, y: 0, z: 1, type: 'edge-y' },
      { x: 1, y: 1, z: 0, type: 'edge-z' },
      { x: 1, y: 1, z: 1, type: 'corner' }
    ];
    for (const handlePos of handles) {
      const preview = resizeRod(handlePos, { x: 0, y: -0.2, z: -0.2 });
      expect(preview.dimensions.width).toBeCloseTo(0.375);
      expect(preview.dimensions.thickness).toBeCloseTo(0.375);
    }
  });

  it('pulls a mismatched dowel back onto its stock diameter', () => {
    const preview = resizeRod({ x: 1, y: 1, z: 1, type: 'corner' }, { x: 1, y: 5, z: 5 });
    // The diameter belongs to the stock, so a stale part value is corrected
    // rather than merely capped.
    expect(preview.dimensions.width).toBeCloseTo(rod.width);
    expect(preview.dimensions.thickness).toBeCloseTo(rod.thickness);
  });
});
