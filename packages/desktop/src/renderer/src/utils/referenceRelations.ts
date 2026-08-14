import type { Part, ReferenceDistanceIndicator, ReferenceRuler } from '../types';
import type { InteractionSelectionEntity } from './interactionSelection';
import { getCombinedBounds, type PartBounds } from './snapToPartsUtil';
import { isAxisAlignedRotation } from './rotation';

type Axis = 'x' | 'y' | 'z';
type BoundKeys = {
  min: 'minX' | 'minY' | 'minZ';
  max: 'maxX' | 'maxY' | 'maxZ';
  center: 'centerX' | 'centerY' | 'centerZ';
};

export type ReferenceRelationKind = 'gap' | 'offset' | 'span' | 'dimension-match';
export type ReferenceRelationEditMode = 'move' | 'resize-size' | 'resize-gap';
export type ReferenceRelationSource = 'idle' | 'move' | 'resize';

export interface ReferenceRelation {
  id: string;
  kind: ReferenceRelationKind;
  axis: Axis | null;
  fromEntityId: string;
  toEntityId: string;
  fromAnchorId: string;
  toAnchorId: string;
  value: number;
  editMode: ReferenceRelationEditMode;
  priority: number;
  source: ReferenceRelationSource;
  indicatorType: 'edge-to-edge' | 'edge-offset';
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  labelPosition: { x: number; y: number; z: number };
}

export interface ReferenceRelationSolveResult {
  relations: ReferenceRelation[];
  activeRelation: ReferenceRelation | null;
}

export interface MoveReferencePreviewResult extends ReferenceRelationSolveResult {
  previewParts: Part[];
  axisAligned: boolean;
}

export interface ResizeReferencePreviewResult extends ReferenceRelationSolveResult {
  previewParts: Part[];
  axisAligned: boolean;
}

interface SolverEntityBounds {
  entity: InteractionSelectionEntity;
  bounds: PartBounds;
}

interface SolveReferenceRelationsParams {
  selectionEntities: InteractionSelectionEntity[];
  referenceEntities: InteractionSelectionEntity[];
  parts: Part[];
  source: ReferenceRelationSource;
  preferredAxis?: Axis | null;
  latchedRelationId?: string | null;
  latchedAxis?: Axis | null;
}

interface SolveMoveReferencePreviewParams {
  selectionEntities: InteractionSelectionEntity[];
  referenceEntities: InteractionSelectionEntity[];
  parts: Part[];
  movingPartIds: string[];
  delta: { x: number; y: number; z: number };
  preferredAxis?: Axis | null;
  latchedRelationId?: string | null;
  latchedAxis?: Axis | null;
}

interface SolveResizeReferencePreviewParams {
  selectionEntities: InteractionSelectionEntity[];
  referenceEntities: InteractionSelectionEntity[];
  parts: Part[];
  preferredAxis?: Axis | null;
  resizingDimensions: { length: boolean; width: boolean; thickness: boolean };
  latchedRelationId?: string | null;
  latchedAxis?: Axis | null;
}

const AXIS_KEYS: Record<Axis, BoundKeys> = {
  x: { min: 'minX', max: 'maxX', center: 'centerX' },
  y: { min: 'minY', max: 'maxY', center: 'centerY' },
  z: { min: 'minZ', max: 'maxZ', center: 'centerZ' }
};

function getEntityBounds(entity: InteractionSelectionEntity, parts: Part[]): PartBounds | null {
  const entityParts = parts.filter((part) => entity.partIds.includes(part.id));
  if (entityParts.length === 0) return null;
  return getCombinedBounds(entityParts);
}

function getDimensionKeyForAxis(axis: Axis): 'length' | 'thickness' | 'width' {
  if (axis === 'x') return 'length';
  if (axis === 'y') return 'thickness';
  return 'width';
}

function isZeroDelta(delta: { x: number; y: number; z: number }): boolean {
  return Math.abs(delta.x) < 1e-6 && Math.abs(delta.y) < 1e-6 && Math.abs(delta.z) < 1e-6;
}

export function createPreviewMovedParts(
  parts: Part[],
  movingPartIds: string[],
  delta: { x: number; y: number; z: number }
): Part[] {
  if (movingPartIds.length === 0 || isZeroDelta(delta)) {
    return parts;
  }

  const movingIdSet = new Set(movingPartIds);
  return parts.map((part) =>
    movingIdSet.has(part.id)
      ? {
          ...part,
          position: {
            x: part.position.x + delta.x,
            y: part.position.y + delta.y,
            z: part.position.z + delta.z
          }
        }
      : part
  );
}

function getPerpendicularCenters(
  selectedBounds: PartBounds,
  referenceBounds: PartBounds,
  axis: Axis
): [number, number] {
  const perpAxes = (['x', 'y', 'z'] as const).filter((entry) => entry !== axis);
  const perp1Key = AXIS_KEYS[perpAxes[0]].center;
  const perp2Key = AXIS_KEYS[perpAxes[1]].center;
  return [
    (selectedBounds[perp1Key] + referenceBounds[perp1Key]) / 2,
    (selectedBounds[perp2Key] + referenceBounds[perp2Key]) / 2
  ];
}

function createAxisLine(
  axis: Axis,
  selectedValue: number,
  referenceValue: number,
  perpPos1: number,
  perpPos2: number,
  labelOffset = 0.5
) {
  const midVal = (selectedValue + referenceValue) / 2;
  switch (axis) {
    case 'x':
      return {
        start: { x: selectedValue, y: perpPos1, z: perpPos2 },
        end: { x: referenceValue, y: perpPos1, z: perpPos2 },
        labelPosition: { x: midVal, y: perpPos1 + labelOffset, z: perpPos2 }
      };
    case 'y':
      return {
        start: { x: perpPos1, y: selectedValue, z: perpPos2 },
        end: { x: perpPos1, y: referenceValue, z: perpPos2 },
        labelPosition: { x: perpPos1 + labelOffset, y: midVal, z: perpPos2 }
      };
    case 'z':
      return {
        start: { x: perpPos1, y: perpPos2, z: selectedValue },
        end: { x: perpPos1, y: perpPos2, z: referenceValue },
        labelPosition: { x: perpPos1, y: perpPos2 + labelOffset, z: midVal }
      };
  }
}

function getOffsetLinePerpendiculars(
  selectedBounds: PartBounds,
  referenceBounds: PartBounds,
  axis: Axis,
  edge: 'min' | 'max'
): [number, number] {
  if (axis === 'x') {
    return edge === 'min'
      ? [
          Math.min(selectedBounds.minY, referenceBounds.minY) - 1,
          Math.min(selectedBounds.minZ, referenceBounds.minZ) - 1
        ]
      : [
          Math.max(selectedBounds.maxY, referenceBounds.maxY) + 1,
          Math.max(selectedBounds.maxZ, referenceBounds.maxZ) + 1
        ];
  }

  if (axis === 'y') {
    return [
      Math.max(selectedBounds.maxX, referenceBounds.maxX) + 1,
      (selectedBounds.centerZ + referenceBounds.centerZ) / 2
    ];
  }

  return edge === 'min'
    ? [Math.min(selectedBounds.minY, referenceBounds.minY) - 1, Math.min(selectedBounds.minX, referenceBounds.minX) - 1]
    : [
        Math.max(selectedBounds.maxY, referenceBounds.maxY) + 1,
        Math.max(selectedBounds.maxX, referenceBounds.maxX) + 1
      ];
}

function scoreReferenceRelation(params: {
  kind: ReferenceRelationKind;
  axis: Axis | null;
  value: number;
  source: ReferenceRelationSource;
  preferredAxis?: Axis | null;
  latchedAxis?: Axis | null;
  selectionKind?: InteractionSelectionEntity['kind'];
  referenceKind?: InteractionSelectionEntity['kind'];
}): number {
  const { kind, axis, value, source, preferredAxis, latchedAxis, selectionKind, referenceKind } = params;
  let score = 0;

  if (source === 'resize') {
    score += kind === 'gap' ? 130 : kind === 'dimension-match' ? 110 : 80;
  } else if (source === 'move') {
    score += kind === 'gap' ? 120 : kind === 'offset' ? 100 : 70;
  } else {
    score += kind === 'gap' ? 110 : kind === 'offset' ? 95 : 65;
  }

  if (axis && preferredAxis && axis === preferredAxis) {
    score += 40;
  }

  if (axis && latchedAxis && axis === latchedAxis) {
    score += 14;
  }

  if (referenceKind === 'group') {
    score += 8;
  }

  if (selectionKind === 'group') {
    score += 6;
  }

  if (kind === 'gap') {
    score += Math.max(0, 24 - Math.min(value, 24));
  } else if (kind === 'offset') {
    score += Math.max(0, 16 - Math.min(value, 16));
  } else if (kind === 'dimension-match') {
    score += Math.max(0, 20 - Math.min(value, 20));
  }

  return score;
}

function scoreResizeSizeRelation(axis: Axis, value: number, preferredAxis?: Axis | null): number {
  let score = 105;
  if (preferredAxis && axis === preferredAxis) {
    score += 20;
  }
  score += Math.max(0, Math.min(value, 24));
  return score;
}

function resolveActiveRelation(
  relations: ReferenceRelation[],
  latchedRelationId?: string | null
): ReferenceRelation | null {
  if (relations.length === 0) return null;

  if (!latchedRelationId) {
    return relations[0] ?? null;
  }

  const top = relations[0] ?? null;
  const latched = relations.find((relation) => relation.id === latchedRelationId) ?? null;
  if (!top || !latched) {
    return top;
  }

  // Keep the current relation latched unless a clearly better alternative appears.
  if (top.id !== latched.id && top.priority <= latched.priority + 18) {
    return latched;
  }

  return top;
}

function createGapRelation(
  axis: Axis,
  selectedBounds: PartBounds,
  referenceBounds: PartBounds,
  selectionEntity: InteractionSelectionEntity,
  referenceEntity: InteractionSelectionEntity,
  source: ReferenceRelationSource,
  preferredAxis?: Axis | null,
  latchedAxis?: Axis | null
): ReferenceRelation | null {
  const keys = AXIS_KEYS[axis];
  const [perpPos1, perpPos2] = getPerpendicularCenters(selectedBounds, referenceBounds, axis);
  let selectedValue: number | null = null;
  let referenceValue: number | null = null;

  if (selectedBounds[keys.max] < referenceBounds[keys.min]) {
    selectedValue = selectedBounds[keys.max];
    referenceValue = referenceBounds[keys.min];
  } else if (selectedBounds[keys.min] > referenceBounds[keys.max]) {
    selectedValue = selectedBounds[keys.min];
    referenceValue = referenceBounds[keys.max];
  }

  if (selectedValue === null || referenceValue === null) return null;

  const value = Math.abs(referenceValue - selectedValue);
  if (value <= 0.001) return null;

  const line = createAxisLine(axis, selectedValue, referenceValue, perpPos1, perpPos2);
  return {
    id: `gap-${axis}-${selectionEntity.id}-${referenceEntity.id}`,
    kind: 'gap',
    axis,
    fromEntityId: selectionEntity.id,
    toEntityId: referenceEntity.id,
    fromAnchorId: `${selectionEntity.id}:${axis}:outer`,
    toAnchorId: `${referenceEntity.id}:${axis}:outer`,
    value,
    editMode: source === 'resize' ? 'resize-gap' : 'move',
    priority: scoreReferenceRelation({
      kind: 'gap',
      axis,
      value,
      source,
      preferredAxis,
      latchedAxis,
      selectionKind: selectionEntity.kind,
      referenceKind: referenceEntity.kind
    }),
    source,
    indicatorType: 'edge-to-edge',
    ...line
  };
}

function createOffsetRelations(
  axis: Axis,
  selectedBounds: PartBounds,
  referenceBounds: PartBounds,
  selectionEntity: InteractionSelectionEntity,
  referenceEntity: InteractionSelectionEntity,
  source: ReferenceRelationSource,
  preferredAxis?: Axis | null,
  latchedAxis?: Axis | null
): ReferenceRelation[] {
  const keys = AXIS_KEYS[axis];
  const relations: ReferenceRelation[] = [];

  for (const edge of ['min', 'max'] as const) {
    const selectedValue = selectedBounds[keys[edge]];
    const referenceValue = referenceBounds[keys[edge]];
    const value = Math.abs(referenceValue - selectedValue);
    if (value <= 0.001) continue;

    const [perpPos1, perpPos2] = getOffsetLinePerpendiculars(selectedBounds, referenceBounds, axis, edge);
    const line = createAxisLine(axis, selectedValue, referenceValue, perpPos1, perpPos2);
    relations.push({
      id: `offset-${edge}-${axis}-${selectionEntity.id}-${referenceEntity.id}`,
      kind: 'offset',
      axis,
      fromEntityId: selectionEntity.id,
      toEntityId: referenceEntity.id,
      fromAnchorId: `${selectionEntity.id}:${axis}:${edge}`,
      toAnchorId: `${referenceEntity.id}:${axis}:${edge}`,
      value,
      editMode: source === 'resize' ? 'resize-gap' : 'move',
      priority: scoreReferenceRelation({
        kind: 'offset',
        axis,
        value,
        source,
        preferredAxis,
        latchedAxis,
        selectionKind: selectionEntity.kind,
        referenceKind: referenceEntity.kind
      }),
      source,
      indicatorType: 'edge-offset',
      ...line
    });
  }

  return relations;
}

function createDimensionMatchRelation(
  axis: Axis,
  selectedBounds: PartBounds,
  referenceBounds: PartBounds,
  selectionEntity: InteractionSelectionEntity,
  referenceEntity: InteractionSelectionEntity,
  source: ReferenceRelationSource,
  preferredAxis?: Axis | null,
  latchedAxis?: Axis | null
): ReferenceRelation | null {
  const keys = AXIS_KEYS[axis];
  const selectedSize = selectedBounds[keys.max] - selectedBounds[keys.min];
  const referenceSize = referenceBounds[keys.max] - referenceBounds[keys.min];
  const value = Math.abs(referenceSize - selectedSize);
  if (value <= 0.001) return null;

  return {
    id: `dimension-match-${axis}-${selectionEntity.id}-${referenceEntity.id}`,
    kind: 'dimension-match',
    axis,
    fromEntityId: selectionEntity.id,
    toEntityId: referenceEntity.id,
    fromAnchorId: `${selectionEntity.id}:${axis}:size`,
    toAnchorId: `${referenceEntity.id}:${axis}:size`,
    value,
    editMode: 'resize-size',
    priority: scoreReferenceRelation({
      kind: 'dimension-match',
      axis,
      value,
      source,
      preferredAxis,
      latchedAxis,
      selectionKind: selectionEntity.kind,
      referenceKind: referenceEntity.kind
    }),
    source,
    indicatorType: 'edge-offset',
    start: {
      x: selectedBounds.centerX,
      y: selectedBounds.centerY,
      z: selectedBounds.centerZ
    },
    end: {
      x: referenceBounds.centerX,
      y: referenceBounds.centerY,
      z: referenceBounds.centerZ
    },
    labelPosition: {
      x: (selectedBounds.centerX + referenceBounds.centerX) / 2,
      y: Math.max(selectedBounds.maxY, referenceBounds.maxY) + 1,
      z: (selectedBounds.centerZ + referenceBounds.centerZ) / 2
    }
  };
}

function createResizeSizeRelations(params: {
  selectionEntities: InteractionSelectionEntity[];
  parts: Part[];
  resizingDimensions: { length: boolean; width: boolean; thickness: boolean };
  preferredAxis?: Axis | null;
}): ReferenceRelation[] {
  const { selectionEntities, parts, resizingDimensions, preferredAxis } = params;
  const relations: ReferenceRelation[] = [];

  for (const entity of selectionEntities) {
    const bounds = getEntityBounds(entity, parts);
    if (!bounds) continue;

    for (const axis of ['x', 'y', 'z'] as const) {
      const dimensionKey = getDimensionKeyForAxis(axis);
      if (!resizingDimensions[dimensionKey]) continue;

      const keys = AXIS_KEYS[axis];
      const value = bounds[keys.max] - bounds[keys.min];
      const line = createAxisLine(
        axis,
        bounds[keys.min],
        bounds[keys.max],
        axis === 'x' ? bounds.maxY + 1 : axis === 'y' ? bounds.maxX + 1 : bounds.centerX,
        axis === 'z' ? bounds.maxY + 1 : bounds.centerZ,
        0
      );

      relations.push({
        id: `size-${axis}-${entity.id}`,
        kind: 'span',
        axis,
        fromEntityId: entity.id,
        toEntityId: entity.id,
        fromAnchorId: `${entity.id}:${axis}:min`,
        toAnchorId: `${entity.id}:${axis}:max`,
        value,
        editMode: 'resize-size',
        priority: scoreResizeSizeRelation(axis, value, preferredAxis),
        source: 'resize',
        indicatorType: 'edge-offset',
        ...line
      });
    }
  }

  return relations;
}

export function solveReferenceRelations(params: SolveReferenceRelationsParams): ReferenceRelationSolveResult {
  const { selectionEntities, referenceEntities, parts, source, preferredAxis, latchedRelationId, latchedAxis } = params;
  const selectionBounds = selectionEntities
    .map((entity) => {
      const bounds = getEntityBounds(entity, parts);
      return bounds ? { entity, bounds } : null;
    })
    .filter((entry): entry is SolverEntityBounds => entry !== null);
  const referenceBounds = referenceEntities
    .map((entity) => {
      const bounds = getEntityBounds(entity, parts);
      return bounds ? { entity, bounds } : null;
    })
    .filter((entry): entry is SolverEntityBounds => entry !== null);

  const relations: ReferenceRelation[] = [];

  for (const selected of selectionBounds) {
    for (const reference of referenceBounds) {
      if (selected.entity.id === reference.entity.id) continue;

      for (const axis of ['x', 'y', 'z'] as const) {
        const gapRelation = createGapRelation(
          axis,
          selected.bounds,
          reference.bounds,
          selected.entity,
          reference.entity,
          source,
          preferredAxis,
          latchedAxis
        );
        if (gapRelation) {
          relations.push(gapRelation);
          continue;
        }

        relations.push(
          ...createOffsetRelations(
            axis,
            selected.bounds,
            reference.bounds,
            selected.entity,
            reference.entity,
            source,
            preferredAxis,
            latchedAxis
          )
        );

        if (source === 'resize') {
          const dimensionMatchRelation = createDimensionMatchRelation(
            axis,
            selected.bounds,
            reference.bounds,
            selected.entity,
            reference.entity,
            source,
            preferredAxis,
            latchedAxis
          );
          if (dimensionMatchRelation) {
            relations.push(dimensionMatchRelation);
          }
        }
      }
    }
  }

  relations.sort((a, b) => b.priority - a.priority || a.value - b.value || a.id.localeCompare(b.id));
  const activeRelation = resolveActiveRelation(relations, latchedRelationId);

  return {
    relations,
    activeRelation
  };
}

export function solveMoveReferencePreview(params: SolveMoveReferencePreviewParams): MoveReferencePreviewResult {
  const {
    selectionEntities,
    referenceEntities,
    parts,
    movingPartIds,
    delta,
    preferredAxis,
    latchedRelationId,
    latchedAxis
  } = params;
  const previewParts = createPreviewMovedParts(parts, movingPartIds, delta);
  const relevantPartIds = new Set([
    ...selectionEntities.flatMap((entity) => entity.partIds),
    ...referenceEntities.flatMap((entity) => entity.partIds)
  ]);
  const relevantParts = previewParts.filter((part) => relevantPartIds.has(part.id));
  const axisAligned = relevantParts.every((part) => isAxisAlignedRotation(part.rotation));

  if (!axisAligned) {
    return {
      previewParts,
      axisAligned: false,
      relations: [],
      activeRelation: null
    };
  }

  const result = solveReferenceRelations({
    selectionEntities,
    referenceEntities,
    parts: previewParts,
    source: 'move',
    preferredAxis,
    latchedRelationId,
    latchedAxis
  });

  return {
    previewParts,
    axisAligned: true,
    ...result
  };
}

export function solveResizeReferencePreview(params: SolveResizeReferencePreviewParams): ResizeReferencePreviewResult {
  const {
    selectionEntities,
    referenceEntities,
    parts,
    preferredAxis,
    resizingDimensions,
    latchedRelationId,
    latchedAxis
  } = params;
  const relevantPartIds = new Set([
    ...selectionEntities.flatMap((entity) => entity.partIds),
    ...referenceEntities.flatMap((entity) => entity.partIds)
  ]);
  const relevantParts = parts.filter((part) => relevantPartIds.has(part.id));
  const axisAligned = relevantParts.every((part) => isAxisAlignedRotation(part.rotation));

  const sizeRelations = createResizeSizeRelations({
    selectionEntities,
    parts,
    resizingDimensions,
    preferredAxis
  });

  if (!axisAligned) {
    const sortedSizeRelations = [...sizeRelations].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
    return {
      previewParts: parts,
      axisAligned: false,
      relations: sortedSizeRelations,
      activeRelation: sortedSizeRelations[0] ?? null
    };
  }

  const referenceResult = referenceEntities.length
    ? solveReferenceRelations({
        selectionEntities,
        referenceEntities,
        parts,
        source: 'resize',
        preferredAxis,
        latchedRelationId,
        latchedAxis
      })
    : { relations: [], activeRelation: null };

  const relations = [...referenceResult.relations, ...sizeRelations].sort(
    (a, b) => b.priority - a.priority || a.value - b.value || a.id.localeCompare(b.id)
  );

  const activeRelation = resolveActiveRelation(relations, latchedRelationId);
  return {
    previewParts: parts,
    axisAligned: true,
    relations,
    activeRelation
  };
}

export function calculateMoveDeltaForReferenceRelation(
  relation: ReferenceRelation,
  nextValue: number
): { x: number; y: number; z: number } | null {
  const deltaValue = nextValue - relation.value;
  if (Math.abs(deltaValue) < 1e-6) {
    return { x: 0, y: 0, z: 0 };
  }

  if (relation.axis) {
    const axisDirection = relation.end[relation.axis] - relation.start[relation.axis];
    const axisSign = Math.sign(axisDirection);
    if (axisSign === 0) return null;
    return {
      x: relation.axis === 'x' ? -axisSign * deltaValue : 0,
      y: relation.axis === 'y' ? -axisSign * deltaValue : 0,
      z: relation.axis === 'z' ? -axisSign * deltaValue : 0
    };
  }

  const vx = relation.end.x - relation.start.x;
  const vy = relation.end.y - relation.start.y;
  const vz = relation.end.z - relation.start.z;
  const length = Math.hypot(vx, vy, vz);
  if (length < 1e-6) return null;

  return {
    x: (-vx / length) * deltaValue,
    y: (-vy / length) * deltaValue,
    z: (-vz / length) * deltaValue
  };
}

export function referenceRelationToIndicator(relation: ReferenceRelation): ReferenceDistanceIndicator {
  return {
    id: relation.id,
    axis: relation.axis ?? 'x',
    type: relation.indicatorType,
    fromPartId: relation.fromEntityId,
    toPartId: relation.toEntityId,
    start: relation.start,
    end: relation.end,
    distance: relation.value,
    labelPosition: relation.labelPosition
  };
}

export function referenceRelationToRuler(
  relation: ReferenceRelation,
  kind: ReferenceRuler['kind'] = 'passive'
): ReferenceRuler {
  return {
    id: relation.id,
    relationId: relation.id,
    kind,
    editMode: relation.editMode,
    axis: relation.axis,
    type: relation.indicatorType,
    fromPartId: relation.fromEntityId,
    toPartId: relation.toEntityId,
    start: relation.start,
    end: relation.end,
    distance: relation.value,
    labelPosition: relation.labelPosition,
    priority: relation.priority
  };
}

export function referenceIndicatorToRuler(
  indicator: ReferenceDistanceIndicator,
  kind: ReferenceRuler['kind'] = 'passive'
): ReferenceRuler {
  return {
    id: indicator.id,
    relationId: indicator.id,
    kind,
    editMode: 'move',
    axis: indicator.axis,
    type: indicator.type,
    fromPartId: indicator.fromPartId,
    toPartId: indicator.toPartId,
    start: indicator.start,
    end: indicator.end,
    distance: indicator.distance,
    labelPosition: indicator.labelPosition,
    priority: 0
  };
}
