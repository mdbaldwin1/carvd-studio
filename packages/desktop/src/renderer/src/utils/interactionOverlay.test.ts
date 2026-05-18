import { describe, expect, it } from 'vitest';
import type { Part } from '../types';
import {
  resolveInteractionAffectedPartIds,
  resolvePartInteractionPreview,
  shouldHideGroupTransformHandles,
  shouldHideMeasurementOverlays,
  shouldHideReferenceDistanceIndicators
} from './interactionOverlay';

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

describe('interactionOverlay', () => {
  it('resolves move preview positions for affected parts', () => {
    const preview = resolvePartInteractionPreview(part(), {
      kind: 'move',
      affectedPartIds: ['part-1'],
      primaryPartId: 'part-1',
      delta: { x: 2, y: 3, z: 4 }
    });

    expect(preview.position).toEqual({ x: 2, y: 3.5, z: 4 });
    expect(preview.dimensions).toEqual({ length: 10, width: 4, thickness: 1 });
    expect(preview.affected).toBe(true);
  });

  it('resolves resize preview dimensions and position for the primary part', () => {
    const preview = resolvePartInteractionPreview(part(), {
      kind: 'resize',
      affectedPartIds: ['part-1'],
      primaryPartId: 'part-1',
      handle: { x: 1, y: 0, z: 1, type: 'edge-y' },
      dimensions: { length: 12, width: 6, thickness: 1 },
      position: { x: 1, y: 0.5, z: 1 }
    });

    expect(preview.position).toEqual({ x: 1, y: 0.5, z: 1 });
    expect(preview.dimensions).toEqual({ length: 12, width: 6, thickness: 1 });
  });

  it('returns shared overlay suppression decisions from active interaction state', () => {
    const rotateSession = {
      kind: 'rotate' as const,
      affectedPartIds: ['p1'],
      primaryPartId: 'p1',
      axis: 'z' as const,
      degrees: 30,
      pivot: { x: 0, y: 0, z: 0 },
      referenceState: {
        selectionEntities: [],
        referenceEntities: [],
        candidateRelations: [],
        activeRelationId: null,
        hoveredRelationId: null,
        latchedAxis: null
      }
    };

    expect(shouldHideMeasurementOverlays(rotateSession)).toBe(true);
    expect(shouldHideReferenceDistanceIndicators(rotateSession)).toBe(true);
    expect(shouldHideGroupTransformHandles(rotateSession)).toBe(false);
    expect(resolveInteractionAffectedPartIds(rotateSession, ['fallback'])).toEqual(['p1']);
    expect(resolveInteractionAffectedPartIds(null, ['fallback'])).toEqual(['fallback']);
  });

  it('shows reference indicators during an active session when candidate relations exist', () => {
    const moveSession = {
      kind: 'move' as const,
      affectedPartIds: ['p1'],
      primaryPartId: 'p1',
      delta: { x: 1, y: 0, z: 0 },
      referenceState: {
        selectionEntities: [],
        referenceEntities: [],
        candidateRelations: [
          {
            id: 'rel-1',
            kind: 'gap' as const,
            axis: 'x' as const,
            fromEntityId: 'sel',
            toEntityId: 'ref',
            fromAnchorId: 'sel:x:outer',
            toAnchorId: 'ref:x:outer',
            value: 5,
            editMode: 'move' as const,
            priority: 100,
            source: 'move' as const,
            indicatorType: 'edge-to-edge' as const,
            start: { x: 0, y: 0, z: 0 },
            end: { x: 5, y: 0, z: 0 },
            labelPosition: { x: 2.5, y: 0.5, z: 0 }
          }
        ],
        activeRelationId: 'rel-1',
        hoveredRelationId: null,
        latchedAxis: 'x' as const
      }
    };

    expect(shouldHideReferenceDistanceIndicators(moveSession)).toBe(false);
  });
});
