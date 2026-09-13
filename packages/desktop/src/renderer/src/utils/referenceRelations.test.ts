import { describe, expect, it } from 'vitest';
import type { Part } from '../types';
import {
  calculateMoveDeltaForReferenceRelation,
  referenceRelationToIndicator,
  solveMoveReferencePreview,
  solveReferenceRelations
} from './referenceRelations';
import type { InteractionSelectionEntity } from './interactionSelection';

const parts: Part[] = [
  {
    id: 'ref',
    name: 'Reference',
    length: 10,
    width: 6,
    thickness: 1,
    position: { x: 0, y: 0.5, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    stockId: null,
    grainSensitive: false,
    grainDirection: 'length',
    color: '#aaa'
  },
  {
    id: 'sel',
    name: 'Selected',
    length: 10,
    width: 6,
    thickness: 1,
    position: { x: 15, y: 0.5, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    stockId: null,
    grainSensitive: false,
    grainDirection: 'length',
    color: '#bbb'
  },
  {
    id: 'other',
    name: 'Other',
    length: 10,
    width: 6,
    thickness: 1,
    position: { x: 15, y: 7, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    stockId: null,
    grainSensitive: false,
    grainDirection: 'length',
    color: '#ccc'
  }
];

const selectionEntities: InteractionSelectionEntity[] = [{ id: 'sel', kind: 'part', partIds: ['sel'] }];
const referenceEntities: InteractionSelectionEntity[] = [{ id: 'ref', kind: 'part', partIds: ['ref'] }];

describe('referenceRelations', () => {
  it('creates gap relations for separated entities and chooses the strongest active one', () => {
    const result = solveReferenceRelations({
      selectionEntities,
      referenceEntities,
      parts,
      source: 'move'
    });

    expect(result.relations.some((relation) => relation.kind === 'gap' && relation.axis === 'x')).toBe(true);
    expect(result.activeRelation?.kind).toBe('gap');
    expect(result.activeRelation?.axis).toBe('x');
    expect(result.activeRelation?.value).toBeCloseTo(5);
  });

  it('creates offset relations when entities overlap on an axis', () => {
    const overlappingParts = parts.map((part) =>
      part.id === 'sel' ? { ...part, position: { x: 0, y: 0.75, z: 0 } } : part
    );
    const result = solveReferenceRelations({
      selectionEntities,
      referenceEntities,
      parts: overlappingParts,
      source: 'move',
      preferredAxis: 'y'
    });

    expect(result.relations.some((relation) => relation.kind === 'offset' && relation.axis === 'y')).toBe(true);
    expect(result.activeRelation?.axis).toBe('y');
  });

  it('creates resize dimension-match relations and prefers the manipulated axis', () => {
    const resizedReferenceParts = parts.map((part) => (part.id === 'ref' ? { ...part, width: 8 } : part));
    const result = solveReferenceRelations({
      selectionEntities,
      referenceEntities,
      parts: resizedReferenceParts,
      source: 'resize',
      preferredAxis: 'z'
    });

    expect(result.relations.some((relation) => relation.kind === 'dimension-match' && relation.axis === 'z')).toBe(
      true
    );
    expect(result.activeRelation?.axis).toBe('z');
  });

  it('converts a relation back into a compatibility indicator shape', () => {
    const result = solveReferenceRelations({
      selectionEntities,
      referenceEntities,
      parts,
      source: 'move'
    });
    const indicator = referenceRelationToIndicator(result.activeRelation!);

    expect(indicator.fromPartId).toBe('sel');
    expect(indicator.toPartId).toBe('ref');
    expect(indicator.type).toBe('edge-to-edge');
    expect(indicator.distance).toBeCloseTo(5);
  });

  it('scores the nearest preferred-axis candidate ahead of unrelated candidates', () => {
    const spacedParts = parts.map((part) =>
      part.id === 'other' ? { ...part, position: { x: 30, y: 7, z: 0 } } : part
    );
    const crowdedSelectionEntities: InteractionSelectionEntity[] = [
      { id: 'sel', kind: 'part', partIds: ['sel'] },
      { id: 'other', kind: 'part', partIds: ['other'] }
    ];
    const result = solveReferenceRelations({
      selectionEntities: crowdedSelectionEntities,
      referenceEntities,
      parts: spacedParts,
      source: 'move',
      preferredAxis: 'x'
    });

    expect(result.activeRelation?.fromEntityId).toBe('sel');
    expect(result.activeRelation?.axis).toBe('x');
  });

  it('solves move preview relations against previewed positions instead of stale part positions', () => {
    const result = solveMoveReferencePreview({
      selectionEntities,
      referenceEntities,
      parts,
      movingPartIds: ['sel'],
      delta: { x: -4, y: 0, z: 0 }
    });

    expect(result.axisAligned).toBe(true);
    expect(result.activeRelation?.kind).toBe('gap');
    expect(result.activeRelation?.value).toBeCloseTo(1);
  });

  it('calculates axis-aware move deltas for editable move relations', () => {
    const result = solveReferenceRelations({
      selectionEntities,
      referenceEntities,
      parts,
      source: 'move'
    });

    const delta = calculateMoveDeltaForReferenceRelation(result.activeRelation!, 7);

    expect(delta).toEqual({ x: 2, y: 0, z: 0 });
  });

  it('keeps a near-equal latched relation active to prevent flicker', () => {
    const ambiguousParts = [
      ...parts,
      {
        ...parts[0],
        id: 'ref-2',
        name: 'Reference 2',
        position: { x: 0, y: 0.6, z: 0 }
      }
    ];
    const ambiguousReferenceEntities: InteractionSelectionEntity[] = [
      { id: 'ref', kind: 'part', partIds: ['ref'] },
      { id: 'ref-2', kind: 'part', partIds: ['ref-2'] }
    ];

    const initial = solveReferenceRelations({
      selectionEntities,
      referenceEntities: ambiguousReferenceEntities,
      parts: ambiguousParts,
      source: 'move'
    });
    const secondChoice = initial.relations.find((relation) => relation.id !== initial.activeRelation?.id);

    const latched = solveReferenceRelations({
      selectionEntities,
      referenceEntities: ambiguousReferenceEntities,
      parts: ambiguousParts,
      source: 'move',
      latchedRelationId: secondChoice?.id ?? null,
      latchedAxis: secondChoice?.axis ?? null
    });

    expect(latched.activeRelation?.id).toBe(secondChoice?.id);
  });

  it('prefers group references over loose parts when candidates are otherwise similar', () => {
    const groupSelectionEntities: InteractionSelectionEntity[] = [{ id: 'sel-group', kind: 'group', partIds: ['sel'] }];
    const groupedReferenceEntities: InteractionSelectionEntity[] = [
      { id: 'ref-group', kind: 'group', partIds: ['ref'] },
      { id: 'ref-loose', kind: 'part', partIds: ['other'] }
    ];
    const groupedParts = parts.map((entry) =>
      entry.id === 'other' ? { ...entry, position: { x: 0, y: 0.5, z: 0 } } : entry
    );

    const result = solveReferenceRelations({
      selectionEntities: groupSelectionEntities,
      referenceEntities: groupedReferenceEntities,
      parts: groupedParts,
      source: 'move'
    });

    expect(result.activeRelation?.toEntityId).toBe('ref-group');
  });
});

describe('typing a new distance into a reference measurement', () => {
  const relation = (overrides: Record<string, unknown> = {}) =>
    ({
      id: 'rel-1',
      kind: 'gap',
      axis: 'x',
      fromEntityId: 'a',
      toEntityId: 'b',
      fromAnchorId: 'a:max',
      toAnchorId: 'b:min',
      value: 4,
      editMode: 'move',
      priority: 0,
      source: 'reference',
      indicatorType: 'edge-to-edge',
      start: { x: 0, y: 0, z: 0 },
      end: { x: 4, y: 0, z: 0 },
      labelPosition: { x: 2, y: 0, z: 0 },
      ...overrides
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

  it('stays put when the number did not really change', () => {
    expect(calculateMoveDeltaForReferenceRelation(relation(), 4)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('moves along the axis the measurement runs on', () => {
    // Widening a 4" gap to 6" moves the part 2" further away, against the
    // direction the measurement points in.
    expect(calculateMoveDeltaForReferenceRelation(relation(), 6)).toEqual({ x: -2, y: 0, z: 0 });
  });

  it('moves the other way when the measurement points the other way', () => {
    const backwards = relation({ start: { x: 4, y: 0, z: 0 }, end: { x: 0, y: 0, z: 0 } });
    expect(calculateMoveDeltaForReferenceRelation(backwards, 6)).toEqual({ x: 2, y: 0, z: 0 });
  });

  it.each(['y', 'z'] as const)('moves along %s when that is the axis measured', (axis) => {
    const along = relation({
      axis,
      start: { x: 0, y: 0, z: 0 },
      end: { x: 0, y: axis === 'y' ? 4 : 0, z: axis === 'z' ? 4 : 0 }
    });
    const delta = calculateMoveDeltaForReferenceRelation(along, 6)!;
    expect(delta[axis]).toBe(-2);
  });

  it('refuses a measurement with no length to take a direction from', () => {
    // Two ends in the same place say nothing about which way to move.
    const collapsed = relation({ start: { x: 2, y: 0, z: 0 }, end: { x: 2, y: 0, z: 0 } });
    expect(calculateMoveDeltaForReferenceRelation(collapsed, 6)).toBeNull();
  });

  it('follows a diagonal measurement along its own line', () => {
    const diagonal = relation({ axis: null, start: { x: 0, y: 0, z: 0 }, end: { x: 3, y: 4, z: 0 }, value: 5 });
    const delta = calculateMoveDeltaForReferenceRelation(diagonal, 10)!;
    // Five inches further along a 3-4-5 line.
    expect(delta.x).toBeCloseTo(-3);
    expect(delta.y).toBeCloseTo(-4);
    expect(delta.z).toBeCloseTo(0);
  });

  it('refuses a diagonal measurement of no length', () => {
    const collapsed = relation({ axis: null, start: { x: 1, y: 1, z: 1 }, end: { x: 1, y: 1, z: 1 } });
    expect(calculateMoveDeltaForReferenceRelation(collapsed, 6)).toBeNull();
  });

  it('describes a relation with no axis as running along x', () => {
    // The indicator has to be drawn somewhere, and x is the fallback.
    expect(referenceRelationToIndicator(relation({ axis: null })).axis).toBe('x');
  });
});
