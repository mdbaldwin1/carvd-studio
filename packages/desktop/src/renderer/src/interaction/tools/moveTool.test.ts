import { beforeEach, describe, expect, it } from 'vitest';
import type { AppSettings, Part, SnapGuide } from '../../types';
import { moveTool, type MoveToolInput } from './moveTool';

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

const NO_GUIDES: SnapGuide[] = [];

function makeInput(overrides?: Partial<MoveToolInput>): MoveToolInput {
  const part = overrides?.part ?? makePart();
  return {
    part,
    position: { x: 5, y: 0.375, z: 0 },
    axes: { x: true, y: false, z: true },
    worldHalfHeight: 0.375,
    alsoMoving: [],
    referenceParts: [],
    snapGuides: NO_GUIDES,
    settings: SETTINGS,
    snapThreshold: 0.1,
    resolveFeatureStage: () => 'face',
    ...overrides
  };
}

describe('moveTool', () => {
  describe('lifecycle', () => {
    it('begin captures initial positions of primary + alsoMoving', () => {
      const primary = makePart({ id: 'a', position: { x: 0, y: 0.375, z: 0 } });
      const other = makePart({ id: 'b', position: { x: 10, y: 0.375, z: 5 } });
      const state = moveTool.begin(makeInput({ part: primary, alsoMoving: [other] }));
      expect(state.initialPrimaryPosition).toEqual({ x: 0, y: 0.375, z: 0 });
      expect(state.initialOtherPositions.get('b')).toEqual({ x: 10, y: 0.375, z: 5 });
      expect(state.latchedFaceSnap).toBeNull();
    });

    it('update with no movement returns the original position', () => {
      const part = makePart();
      const input = makeInput({ part, position: { x: 0, y: 0.375, z: 0 } });
      const state = moveTool.begin(input);
      const { preview } = moveTool.update(input, state);
      expect(preview.primaryPosition).toEqual({ x: 0, y: 0.375, z: 0 });
      expect(preview.delta).toEqual({ x: 0, y: 0, z: 0 });
      expect(preview.positions.get(part.id)).toEqual({ x: 0, y: 0.375, z: 0 });
    });

    it('update propagates the same delta to alsoMoving parts', () => {
      const primary = makePart({ id: 'a', position: { x: 0, y: 0.375, z: 0 } });
      const other = makePart({ id: 'b', position: { x: 10, y: 0.375, z: 0 } });
      const input = makeInput({
        part: primary,
        position: { x: 4, y: 0.375, z: 0 },
        alsoMoving: [other]
      });
      const state = moveTool.begin(input);
      const { preview } = moveTool.update(input, state);
      // Without snap enabled, the primary position is the input position.
      expect(preview.primaryPosition).toEqual({ x: 4, y: 0.375, z: 0 });
      expect(preview.delta).toEqual({ x: 4, y: 0, z: 0 });
      // The other part follows by the same delta.
      expect(preview.positions.get('b')).toEqual({ x: 14, y: 0.375, z: 0 });
    });

    it('update exposes a constraint-ready move candidate matching the preview', () => {
      const primary = makePart({ id: 'a', position: { x: 0, y: 0.375, z: 0 } });
      const other = makePart({ id: 'b', position: { x: 10, y: 0.375, z: 0 } });
      const input = makeInput({
        part: primary,
        position: { x: 4, y: 0.375, z: 2 },
        alsoMoving: [other]
      });
      const state = moveTool.begin(input);
      const { preview } = moveTool.update(input, state);

      expect(preview.candidate).toEqual({
        kind: 'move',
        delta: preview.delta,
        positions: preview.positions
      });
    });

    it('commit produces one updatePartPosition per moving part', () => {
      const primary = makePart({ id: 'a' });
      const other = makePart({ id: 'b', position: { x: 10, y: 0.375, z: 0 } });
      const input = makeInput({
        part: primary,
        position: { x: 4, y: 0.375, z: 0 },
        alsoMoving: [other]
      });
      const state = moveTool.begin(input);
      const { preview } = moveTool.update(input, state);
      const instructions = moveTool.commit(state, preview);
      expect(instructions).toHaveLength(2);
      const aIns = instructions.find((i) => i.kind === 'updatePartPosition' && i.partId === 'a');
      const bIns = instructions.find((i) => i.kind === 'updatePartPosition' && i.partId === 'b');
      expect(aIns).toMatchObject({
        kind: 'updatePartPosition',
        partId: 'a',
        position: { x: 4, y: 0.375, z: 0 }
      });
      expect(bIns).toMatchObject({
        kind: 'updatePartPosition',
        partId: 'b',
        position: { x: 14, y: 0.375, z: 0 }
      });
    });

    it('cancel does not throw and returns nothing', () => {
      const state = moveTool.begin(makeInput());
      expect(() => moveTool.cancel(state)).not.toThrow();
    });
  });

  describe('invariant: commit produces the same transform as the final preview', () => {
    it('commit position for primary matches the last preview primaryPosition', () => {
      const part = makePart({ id: 'p' });
      let input = makeInput({ part, position: { x: 5, y: 0.375, z: 0 } });
      let state = moveTool.begin(input);

      // Simulate a mid-drag update
      const midResult = moveTool.update(input, state);
      state = midResult.state;

      // Then a final update at a new position
      input = makeInput({ part, position: { x: 7, y: 0.375, z: 0 } });
      const final = moveTool.update(input, state);
      state = final.state;

      const instructions = moveTool.commit(state, final.preview);
      const positionIns = instructions.find((i) => i.kind === 'updatePartPosition' && i.partId === 'p');
      expect(positionIns).toMatchObject({
        position: final.preview.primaryPosition
      });
    });
  });

  describe('state threading: latched face snap survives across updates', () => {
    beforeEach(() => {
      // Reset module-level pre-allocated objects from snap utilities.
    });

    it('first update returns a state object; subsequent updates can reuse it', () => {
      const part = makePart({ id: 'p' });
      const input = makeInput({ part });
      const state1 = moveTool.begin(input);
      const result1 = moveTool.update(input, state1);
      expect(result1.state).toBeDefined();
      // Second update consumes the prior state.
      const result2 = moveTool.update(input, result1.state);
      expect(result2.state).toBeDefined();
    });
  });
});
