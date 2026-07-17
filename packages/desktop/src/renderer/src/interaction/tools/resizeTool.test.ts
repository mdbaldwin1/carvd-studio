import { describe, expect, it, vi } from 'vitest';

// Use the real three.js for the rotation quaternion math the resize tool consumes.
vi.unmock('three');
vi.mock('three', async () => await vi.importActual('three'));

import * as THREE from 'three';
import type { AppSettings, Part } from '../../types';
import { createResizeCommitPreview, createResizeCommitState, resizeTool, type ResizeToolInput } from './resizeTool';

function makePart(overrides?: Partial<Part>): Part {
  return {
    id: 'p1',
    name: 'p1',
    length: 24,
    width: 12,
    thickness: 0.75,
    position: { x: 0, y: 0.375, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    stockId: null,
    grainSensitive: false,
    grainDirection: 'length',
    color: '#fff',
    ...overrides
  };
}

const SETTINGS: AppSettings = {
  units: 'imperial',
  defaultStock: 'plywood',
  theme: 'dark',
  gridSize: 0.0625,
  snapDistance: 0.125,
  snapEnabled: false,
  snapSensitivity: 1.0,
  showGrid: true,
  enableAxisLegacySnaps: false,
  enableSurfaceAnchors: false,
  enableFractionalAnchors: false,
  enableGoldenRatioAnchors: false,
  enableFeatureAnchors: false,
  snapToOrigin: false,
  displayMode: 'solid',
  lightingMode: 'default',
  brightnessMultiplier: 1.0
} as AppSettings;

function makeInput(overrides?: Partial<ResizeToolInput>): ResizeToolInput {
  const part = overrides?.part ?? makePart();
  return {
    part,
    handlePos: { x: 1, y: 0, z: 0, type: 'edge-x' },
    localDelta: { x: 0, y: 0, z: 0 },
    partPosition: { ...part.position },
    startingDimensions: {
      length: part.length,
      width: part.width,
      thickness: part.thickness
    },
    constrainDimensions: false,
    rotationQuaternion: new THREE.Quaternion(),
    referenceParts: [],
    referencePartIds: [],
    groupMembers: [],
    snapToPartsEnabled: false,
    appSettings: SETTINGS,
    units: 'imperial',
    cameraDistance: 50,
    ...overrides
  };
}

describe('resizeTool', () => {
  describe('lifecycle', () => {
    it('begin captures starting dimensions and position', () => {
      const part = makePart({ length: 24, width: 12, thickness: 0.75 });
      const state = resizeTool.begin(makeInput({ part }));
      expect(state.startingDimensions).toEqual({ length: 24, width: 12, thickness: 0.75 });
      expect(state.startingPosition).toEqual(part.position);
      expect(state.latchedRelationId).toBeNull();
      expect(state.latchedAxis).toBeNull();
    });

    it('update with zero delta returns the starting dimensions', () => {
      const part = makePart();
      const input = makeInput({ part });
      const state = resizeTool.begin(input);
      const { preview } = resizeTool.update(input, state);
      expect(preview.dimensions).toEqual({ length: 24, width: 12, thickness: 0.75 });
    });

    it('update with a +x edge handle drag extends the length', () => {
      const part = makePart();
      const input = makeInput({
        part,
        handlePos: { x: 1, y: 0, z: 0, type: 'edge-x' },
        localDelta: { x: 4, y: 0, z: 0 }
      });
      const state = resizeTool.begin(input);
      const { preview } = resizeTool.update(input, state);
      // Edge-x with handle x=1 extends length by localDelta.x; the part center
      // shifts by half that to keep the opposite face fixed.
      expect(preview.dimensions.length).toBeCloseTo(28, 3);
      expect(preview.dimensions.width).toBe(12);
      expect(preview.dimensions.thickness).toBe(0.75);
    });

    it('update exposes a constraint-ready resize candidate matching the preview', () => {
      const part = makePart();
      const input = makeInput({
        part,
        handlePos: { x: 1, y: 0, z: 0, type: 'edge-x' },
        localDelta: { x: 4, y: 0, z: 0 }
      });
      const state = resizeTool.begin(input);
      const { preview } = resizeTool.update(input, state);

      expect(preview.candidate).toEqual({
        kind: 'resize',
        partId: part.id,
        dimensions: preview.dimensions,
        position: preview.position
      });
    });

    it('update preserves reference state from the shared resize preview solver', () => {
      const part = makePart({ id: 'p1', length: 10, width: 4, thickness: 1, position: { x: 0, y: 0.5, z: 0 } });
      const reference = makePart({ id: 'p2', length: 10, width: 4, thickness: 1, position: { x: 15, y: 0.5, z: 0 } });
      const input = makeInput({
        part,
        handlePos: { x: 1, y: 0, z: 0, type: 'edge-y' },
        localDelta: { x: 2, y: 0, z: 0 },
        startingDimensions: { length: 10, width: 4, thickness: 1 },
        referenceParts: [part, reference],
        referencePartIds: ['p2']
      });
      const state = resizeTool.begin(input);
      const { preview } = resizeTool.update(input, state);

      expect(preview.referenceState?.candidateRelations.some((relation) => relation.editMode === 'resize-size')).toBe(
        true
      );
      expect(preview.referenceState?.candidateRelations.some((relation) => relation.editMode === 'resize-gap')).toBe(
        true
      );
      expect(preview.referenceState?.activeRelationId).toBeTruthy();
    });

    it('commit produces a single updatePartDimensions instruction', () => {
      const part = makePart();
      const input = makeInput({
        part,
        handlePos: { x: 1, y: 0, z: 0, type: 'edge-x' },
        localDelta: { x: 4, y: 0, z: 0 }
      });
      const state = resizeTool.begin(input);
      const { preview } = resizeTool.update(input, state);
      const instructions = resizeTool.commit(state, preview);
      expect(instructions).toHaveLength(1);
      expect(instructions[0]).toMatchObject({
        kind: 'updatePartDimensions',
        partId: 'p1',
        dimensions: preview.dimensions,
        position: preview.position
      });
    });

    it('createResizeCommitPreview builds a commit-ready resize preview', () => {
      const preview = createResizeCommitPreview({
        partId: 'p1',
        dimensions: { length: 18, width: 6, thickness: 1.5 },
        position: { x: 2, y: 0.75, z: -3 },
        snappedDimensions: { length: true, width: false, thickness: true }
      });

      expect(preview).toMatchObject({
        partId: 'p1',
        dimensions: { length: 18, width: 6, thickness: 1.5 },
        position: { x: 2, y: 0.75, z: -3 },
        snappedDimensions: { length: true, width: false, thickness: true }
      });
      expect(preview.candidate).toEqual({
        kind: 'resize',
        partId: 'p1',
        dimensions: preview.dimensions,
        position: preview.position
      });
    });

    it('createResizeCommitState falls back to resize start dimensions and position', () => {
      const state = createResizeCommitState({
        startingDimensions: { length: 10, width: 4, thickness: 1 },
        startingPosition: { x: 2, y: 0.5, z: -1 }
      });

      expect(state).toEqual({
        startingDimensions: { length: 10, width: 4, thickness: 1 },
        startingPosition: { x: 2, y: 0.5, z: -1 },
        latchedRelationId: null,
        latchedAxis: null
      });
    });

    it('cancel does not throw', () => {
      const state = resizeTool.begin(makeInput());
      expect(() => resizeTool.cancel(state)).not.toThrow();
    });
  });

  describe('invariant: commit dimensions/position match the final preview', () => {
    it('after a mid-drag update + a final update, commit reflects the final preview only', () => {
      const part = makePart();
      let input = makeInput({
        part,
        handlePos: { x: 1, y: 0, z: 0, type: 'edge-x' },
        localDelta: { x: 2, y: 0, z: 0 }
      });
      let state = resizeTool.begin(input);
      const mid = resizeTool.update(input, state);
      state = mid.state;

      input = makeInput({
        part,
        handlePos: { x: 1, y: 0, z: 0, type: 'edge-x' },
        localDelta: { x: 5, y: 0, z: 0 }
      });
      const final = resizeTool.update(input, state);
      state = final.state;

      const instructions = resizeTool.commit(state, final.preview);
      const ins = instructions[0];
      expect(ins).toMatchObject({
        kind: 'updatePartDimensions',
        dimensions: final.preview.dimensions,
        position: final.preview.position
      });
    });
  });
});
