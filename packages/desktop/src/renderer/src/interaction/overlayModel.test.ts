import { describe, expect, it } from 'vitest';
import type { SnapLine } from '../types';
import { computeOverlayModel, type ComputeOverlayModelInput } from './overlayModel';

function makeSnapLine(overrides?: Partial<SnapLine>): SnapLine {
  return {
    id: 'line-1',
    axis: 'x',
    type: 'edge',
    family: 'face',
    start: { x: 0, y: 0, z: 0 },
    end: { x: 10, y: 0, z: 0 },
    ...overrides
  } as SnapLine;
}

function makeInput(overrides?: Partial<ComputeOverlayModelInput>): ComputeOverlayModelInput {
  return {
    activeSession: null,
    snap: {
      activeSnapLines: [],
      snapPulseAt: 0,
      snapLabelPosition: null
    },
    ...overrides
  };
}

describe('computeOverlayModel', () => {
  describe('snap slot', () => {
    it('is null when there are no active snap lines', () => {
      const model = computeOverlayModel(makeInput());
      expect(model.snap).toBeNull();
    });

    it('contains the snap lines, pulse, and label when lines are present', () => {
      const line = makeSnapLine();
      const labelPosition = { x: 1, y: 2, z: 3 };
      const model = computeOverlayModel(
        makeInput({
          snap: {
            activeSnapLines: [line],
            snapPulseAt: 12345,
            snapLabelPosition: labelPosition
          }
        })
      );
      expect(model.snap).not.toBeNull();
      expect(model.snap?.lines).toEqual([line]);
      expect(model.snap?.pulseAt).toBe(12345);
      expect(model.snap?.labelPosition).toEqual(labelPosition);
    });

    it('exposes a defensive copy of the lines array', () => {
      const lines = [makeSnapLine()];
      const model = computeOverlayModel(
        makeInput({
          snap: {
            activeSnapLines: lines,
            snapPulseAt: 0,
            snapLabelPosition: null
          }
        })
      );
      expect(model.snap?.lines).not.toBe(lines);
      expect(model.snap?.lines).toEqual(lines);
    });

    it('snap labelPosition can be null even when lines are present', () => {
      const model = computeOverlayModel(
        makeInput({
          snap: {
            activeSnapLines: [makeSnapLine()],
            snapPulseAt: 0,
            snapLabelPosition: null
          }
        })
      );
      expect(model.snap?.labelPosition).toBeNull();
    });
  });

  describe('placeholder slots', () => {
    it('references is null until §10b migrates the reference overlays', () => {
      const model = computeOverlayModel(makeInput());
      expect(model.references).toBeNull();
    });

    it('dimensions is null until §10b migrates MultiSelectionDimensions', () => {
      const model = computeOverlayModel(makeInput());
      expect(model.dimensions).toBeNull();
    });
  });

  describe('purity', () => {
    it('produces identical output for identical input', () => {
      const input = makeInput({
        snap: {
          activeSnapLines: [makeSnapLine()],
          snapPulseAt: 100,
          snapLabelPosition: { x: 0, y: 0, z: 0 }
        }
      });
      const a = computeOverlayModel(input);
      const b = computeOverlayModel(input);
      expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
    });

    it('does not mutate its input', () => {
      const lines = [makeSnapLine()];
      const input = makeInput({
        snap: {
          activeSnapLines: lines,
          snapPulseAt: 0,
          snapLabelPosition: null
        }
      });
      computeOverlayModel(input);
      // Lines unchanged
      expect(input.snap.activeSnapLines).toBe(lines);
      expect(input.snap.activeSnapLines).toHaveLength(1);
    });
  });
});
