import * as THREE from 'three';
import type { AppSettings, Part, SnapLine, Stock } from '../types';
import type { HandlePosition } from '../components/workspace/partTypes';
import type { GroupMember } from '../types';
import type { PartBounds } from './snapToPartsUtil';
import {
  calculateSnapThreshold,
  createDimensionMatchSnapLine,
  detectDimensionSnaps,
  getPartBoundsAtPosition
} from './snapToPartsUtil';
import { resolveReferenceEntities } from './interactionSelection';
import type { InteractionSelectionEntity } from './interactionSelection';
import { solveResizeReferencePreview, type ReferenceRelation } from './referenceRelations';

type Vec3 = { x: number; y: number; z: number };
type Dimensions = { length: number; width: number; thickness: number };
type ResizingDimensions = { length: boolean; width: boolean; thickness: boolean };

export interface ResizePreviewResult {
  dimensions: Dimensions;
  resizingDimensions: ResizingDimensions;
  snappedDimensions: ResizingDimensions;
  position: Vec3;
  snapLines: SnapLine[];
  referenceState?: {
    selectionEntities: InteractionSelectionEntity[];
    referenceEntities: InteractionSelectionEntity[];
    candidateRelations: ReferenceRelation[];
    activeRelationId: string | null;
    latchedAxis: 'x' | 'y' | 'z' | null;
  };
}

function resolveDimensionCaps(part: Part, assignedStock: Stock | undefined, constrainDimensions: boolean) {
  const isDimensionConstrained = constrainDimensions && !!assignedStock;
  return {
    maxLength: isDimensionConstrained && assignedStock ? assignedStock.length : Infinity,
    maxWidth: isDimensionConstrained && assignedStock && !part.glueUpPanel ? assignedStock.width : Infinity,
    maxThickness: isDimensionConstrained && assignedStock ? assignedStock.thickness : Infinity
  };
}

export function solveResizePreview(params: {
  part: Part;
  handlePos: HandlePosition;
  localDelta: Vec3;
  partPosition: Vec3;
  startingDimensions: Dimensions;
  assignedStock?: Stock;
  constrainDimensions: boolean;
  rotationQuaternion: THREE.Quaternion;
  referenceParts: Part[];
  referencePartIds: string[];
  groupMembers: GroupMember[];
  latchedRelationId?: string | null;
  latchedAxis?: 'x' | 'y' | 'z' | null;
  snapToPartsEnabled: boolean;
  appSettings: AppSettings;
  units: 'imperial' | 'metric';
  cameraDistance: number;
}): ResizePreviewResult {
  const {
    part,
    handlePos,
    localDelta,
    partPosition,
    startingDimensions,
    assignedStock,
    constrainDimensions,
    rotationQuaternion,
    referenceParts,
    referencePartIds,
    groupMembers,
    latchedRelationId,
    latchedAxis,
    snapToPartsEnabled,
    appSettings,
    units,
    cameraDistance
  } = params;

  const { maxLength, maxWidth, maxThickness } = resolveDimensionCaps(part, assignedStock, constrainDimensions);

  let newLength = startingDimensions.length;
  let newWidth = startingDimensions.width;
  let newThickness = startingDimensions.thickness;

  const resizingDimensions: ResizingDimensions = {
    length: false,
    width: false,
    thickness: false
  };

  if (handlePos.type === 'corner') {
    newLength = Math.min(maxLength, Math.max(0.5, startingDimensions.length + localDelta.x * handlePos.x));
    newThickness = Math.min(maxThickness, Math.max(0.25, startingDimensions.thickness + localDelta.y * handlePos.y));
    newWidth = Math.min(maxWidth, Math.max(0.5, startingDimensions.width + localDelta.z * handlePos.z));
    resizingDimensions.length = true;
    resizingDimensions.thickness = true;
    resizingDimensions.width = true;
  } else {
    if (handlePos.x !== 0) {
      newLength = Math.min(maxLength, Math.max(0.5, startingDimensions.length + localDelta.x * handlePos.x));
      resizingDimensions.length = true;
    }
    if (handlePos.y !== 0) {
      newThickness = Math.min(maxThickness, Math.max(0.25, startingDimensions.thickness + localDelta.y * handlePos.y));
      resizingDimensions.thickness = true;
    }
    if (handlePos.z !== 0) {
      newWidth = Math.min(maxWidth, Math.max(0.5, startingDimensions.width + localDelta.z * handlePos.z));
      resizingDimensions.width = true;
    }
  }

  const snapTargetParts =
    referencePartIds.length > 0
      ? referenceParts.filter((entry) => referencePartIds.includes(entry.id))
      : referenceParts;

  const snapLines: SnapLine[] = [];
  const snappedDimensions: ResizingDimensions = { length: false, width: false, thickness: false };

  if (snapToPartsEnabled) {
    const snapThreshold = calculateSnapThreshold(cameraDistance, appSettings.snapSensitivity);
    const dimensionSnaps = detectDimensionSnaps(
      { length: newLength, width: newWidth, thickness: newThickness },
      resizingDimensions,
      snapTargetParts,
      part.id,
      snapThreshold,
      appSettings.dimensionSnapSameTypeOnly,
      units,
      true
    );

    for (const snap of dimensionSnaps) {
      if (snap.dimension === 'length') {
        newLength = snap.targetValue;
        snappedDimensions.length = true;
      } else if (snap.dimension === 'width') {
        newWidth = snap.targetValue;
        snappedDimensions.width = true;
      } else if (snap.dimension === 'thickness') {
        newThickness = snap.targetValue;
        snappedDimensions.thickness = true;
      }

      const tempPart = {
        ...part,
        length: newLength,
        width: newWidth,
        thickness: newThickness
      };
      const resizingBounds: PartBounds = getPartBoundsAtPosition(tempPart, partPosition);
      const snapLine = createDimensionMatchSnapLine(snap, resizingBounds);
      snapLine.dimensionMatchInfo = {
        isStandard: snap.isStandardDimension,
        sourcePart: snap.matchedPartName ?? undefined,
        sourceDimension: snap.matchedDimension ?? undefined
      };

      if (snap.matchedPartBounds && !snap.isStandardDimension) {
        const labelPos = snapLine.distanceIndicators![0].labelPosition;
        snapLine.connectorLine = {
          start: labelPos,
          end: {
            x: snap.matchedPartBounds.centerX,
            y: snap.matchedPartBounds.maxY + 0.5,
            z: snap.matchedPartBounds.centerZ
          }
        };
      }

      snapLines.push(snapLine);
    }
  }

  const localOffset = {
    x: ((newLength - startingDimensions.length) / 2) * handlePos.x,
    y: ((newThickness - startingDimensions.thickness) / 2) * handlePos.y,
    z: ((newWidth - startingDimensions.width) / 2) * handlePos.z
  };

  const offset = new THREE.Vector3(localOffset.x, localOffset.y, localOffset.z).applyQuaternion(rotationQuaternion);
  const worldOffset: Vec3 = { x: offset.x, y: offset.y, z: offset.z };
  const previewPosition = {
    x: partPosition.x + worldOffset.x,
    y: partPosition.y + worldOffset.y,
    z: partPosition.z + worldOffset.z
  };
  const previewPart: Part = {
    ...part,
    length: newLength,
    width: newWidth,
    thickness: newThickness,
    position: previewPosition
  };
  const previewParts = referenceParts.map((entry) => (entry.id === part.id ? previewPart : entry));
  const selectionEntities: InteractionSelectionEntity[] = [{ id: part.id, kind: 'part', partIds: [part.id] }];
  const referenceEntities = resolveReferenceEntities(
    referencePartIds.filter((id) => id !== part.id),
    groupMembers
  );
  const preferredAxis =
    resizingDimensions.length && !resizingDimensions.width && !resizingDimensions.thickness
      ? 'x'
      : resizingDimensions.thickness && !resizingDimensions.length && !resizingDimensions.width
        ? 'y'
        : resizingDimensions.width && !resizingDimensions.length && !resizingDimensions.thickness
          ? 'z'
          : ([
              resizingDimensions.length ? { axis: 'x' as const, magnitude: Math.abs(localDelta.x) } : null,
              resizingDimensions.thickness ? { axis: 'y' as const, magnitude: Math.abs(localDelta.y) } : null,
              resizingDimensions.width ? { axis: 'z' as const, magnitude: Math.abs(localDelta.z) } : null
            ]
              .filter(
                (entry): entry is { axis: 'x' | 'y' | 'z'; magnitude: number } => entry !== null && entry.magnitude > 0
              )
              .sort((a, b) => b.magnitude - a.magnitude)[0]?.axis ?? null);
  const referencePreview = solveResizeReferencePreview({
    selectionEntities,
    referenceEntities,
    parts: previewParts,
    preferredAxis,
    resizingDimensions,
    latchedRelationId,
    latchedAxis
  });

  return {
    dimensions: {
      length: newLength,
      width: newWidth,
      thickness: newThickness
    },
    resizingDimensions,
    snappedDimensions,
    position: previewPosition,
    snapLines,
    referenceState: {
      selectionEntities,
      referenceEntities,
      candidateRelations: referencePreview.relations,
      activeRelationId: referencePreview.activeRelation?.id ?? null,
      latchedAxis: referencePreview.activeRelation?.axis ?? null
    }
  };
}

export function resolveResizePositionFromDimensions(params: {
  basePosition: Vec3;
  baseDimensions: Dimensions;
  nextDimensions: Dimensions;
  handlePos: HandlePosition;
  rotationQuaternion: THREE.Quaternion;
}): Vec3 {
  const { basePosition, baseDimensions, nextDimensions, handlePos, rotationQuaternion } = params;
  const localOffset = new THREE.Vector3(
    ((nextDimensions.length - baseDimensions.length) / 2) * handlePos.x,
    ((nextDimensions.thickness - baseDimensions.thickness) / 2) * handlePos.y,
    ((nextDimensions.width - baseDimensions.width) / 2) * handlePos.z
  ).applyQuaternion(rotationQuaternion);

  return {
    x: basePosition.x + localOffset.x,
    y: basePosition.y + localOffset.y,
    z: basePosition.z + localOffset.z
  };
}
