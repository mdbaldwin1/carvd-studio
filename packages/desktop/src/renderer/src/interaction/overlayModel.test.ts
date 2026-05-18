import { describe, expect, it } from 'vitest';
import type { Part, SnapLine } from '../types';
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

function makePart(overrides?: Partial<Part>): Part {
  return {
    id: 'p1',
    name: 'p1',
    length: 12,
    width: 8,
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

function makeInput(overrides?: Partial<ComputeOverlayModelInput>): ComputeOverlayModelInput {
  return {
    activeSession: null,
    snap: {
      activeSnapLines: [],
      snapPulseAt: 0,
      snapLabelPosition: null
    },
    selection: {
      selectedPartIds: [],
      selectedGroupIds: []
    },
    project: {
      parts: [],
      groupMembers: [],
      units: 'imperial'
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

  describe('dimensions slot', () => {
    const partA = makePart({ id: 'a' });
    const partB = makePart({ id: 'b', position: { x: 20, y: 0.375, z: 0 } });

    it('is null when no selection', () => {
      const model = computeOverlayModel(
        makeInput({ project: { parts: [partA, partB], groupMembers: [], units: 'imperial' } })
      );
      expect(model.dimensions).toBeNull();
    });

    it('is null while an interaction session is active', () => {
      const model = computeOverlayModel(
        makeInput({
          activeSession: {
            kind: 'move',
            affectedPartIds: ['a'],
            primaryPartId: 'a',
            delta: { x: 0, y: 0, z: 0 },
            referenceState: {
              selectionEntities: [],
              referenceEntities: [],
              candidateRelations: [],
              activeRelationId: null,
              hoveredRelationId: null,
              latchedAxis: null
            }
          },
          selection: { selectedPartIds: ['a', 'b'], selectedGroupIds: [] },
          project: { parts: [partA, partB], groupMembers: [], units: 'imperial' }
        })
      );
      expect(model.dimensions).toBeNull();
    });

    it('is populated when a multi-part selection is present and no session is active', () => {
      const model = computeOverlayModel(
        makeInput({
          selection: { selectedPartIds: ['a', 'b'], selectedGroupIds: [] },
          project: { parts: [partA, partB], groupMembers: [], units: 'imperial' }
        })
      );
      expect(model.dimensions).not.toBeNull();
      expect(model.dimensions?.parts).toEqual([partA, partB]);
      expect(model.dimensions?.selectedPartIds).toEqual(['a', 'b']);
      expect(model.dimensions?.units).toBe('imperial');
    });

    it('is populated when a group is selected (even a single-part group)', () => {
      const model = computeOverlayModel(
        makeInput({
          selection: { selectedPartIds: [], selectedGroupIds: ['g1'] },
          project: { parts: [partA], groupMembers: [], units: 'metric' }
        })
      );
      expect(model.dimensions).not.toBeNull();
      expect(model.dimensions?.units).toBe('metric');
    });
  });

  describe('references slot', () => {
    it('is null until §10b-2 migrates ReferenceDistanceIndicators', () => {
      const model = computeOverlayModel(makeInput());
      expect(model.references).toBeNull();
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
