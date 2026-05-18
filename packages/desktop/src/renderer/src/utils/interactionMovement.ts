import type { GroupMember, Part } from '../types';
import * as THREE from 'three';
import { resolveSafeTranslationDelta } from './overlapPolicy';
import { getCombinedBounds } from './snapToPartsUtil';
import { type InteractionSelectionInput, resolveTransformSelectedPartIds } from './interactionSelection';

export interface MoveSelectionResolution {
  affectedPartIds: string[];
  affectedParts: Part[];
  anchorPosition: { x: number; y: number; z: number };
}

export interface TranslationDelta {
  x: number;
  y: number;
  z: number;
}

export interface ConstrainedMoveDeltaResult {
  delta: TranslationDelta;
  overlapBlocked: boolean;
  overlapClamped: boolean;
  usedFallbackDelta: boolean;
}

const _upVector = new THREE.Vector3(0, 1, 0);
const _localX = new THREE.Vector3();
const _localY = new THREE.Vector3();
const _localZ = new THREE.Vector3();
const _euler = new THREE.Euler();
const _quaternion = new THREE.Quaternion();

function calculatePartWorldHalfHeight(part: Part): number {
  _euler.set(
    (part.rotation.x * Math.PI) / 180,
    (part.rotation.y * Math.PI) / 180,
    (part.rotation.z * Math.PI) / 180,
    'XYZ'
  );
  _quaternion.setFromEuler(_euler);
  _localX.set(1, 0, 0).applyQuaternion(_quaternion);
  _localY.set(0, 1, 0).applyQuaternion(_quaternion);
  _localZ.set(0, 0, 1).applyQuaternion(_quaternion);

  return (
    Math.abs(_localX.x * _upVector.x + _localX.y * _upVector.y + _localX.z * _upVector.z) * (part.length / 2) +
    Math.abs(_localY.x * _upVector.x + _localY.y * _upVector.y + _localY.z * _upVector.z) * (part.thickness / 2) +
    Math.abs(_localZ.x * _upVector.x + _localZ.y * _upVector.y + _localZ.z * _upVector.z) * (part.width / 2)
  );
}

export function resolveMoveSelection(
  selection: InteractionSelectionInput,
  parts: Part[],
  groupMembers: GroupMember[],
  primaryPartId?: string
): MoveSelectionResolution {
  const affectedPartIdSet = new Set(resolveTransformSelectedPartIds(selection, groupMembers));

  if (primaryPartId) {
    affectedPartIdSet.add(primaryPartId);
  }

  const affectedPartIds = [...affectedPartIdSet];
  const affectedParts = parts.filter((part) => affectedPartIdSet.has(part.id));
  const primaryPart = primaryPartId ? (parts.find((part) => part.id === primaryPartId) ?? null) : null;
  const anchorParts = affectedParts.length > 0 ? affectedParts : primaryPart ? [primaryPart] : [];

  if (anchorParts.length > 1) {
    const bounds = getCombinedBounds(anchorParts);
    return {
      affectedPartIds,
      affectedParts,
      anchorPosition: { x: bounds.centerX, y: bounds.centerY, z: bounds.centerZ }
    };
  }

  const anchorPart = anchorParts[0] ?? primaryPart;
  return {
    affectedPartIds,
    affectedParts,
    anchorPosition: anchorPart
      ? { x: anchorPart.position.x, y: anchorPart.position.y, z: anchorPart.position.z }
      : { x: 0, y: 0, z: 0 }
  };
}

export function applyGroundConstraintToDelta(
  parts: Part[],
  movingPartIds: Iterable<string>,
  proposedDelta: TranslationDelta
): TranslationDelta {
  let maxYAdjustment = 0;
  const movingPartIdSet = new Set(movingPartIds);

  for (const part of parts) {
    if (!movingPartIdSet.has(part.id)) continue;

    const halfHeight = calculatePartWorldHalfHeight(part);
    const projectedY = part.position.y + proposedDelta.y;
    const adjustment = Math.max(0, halfHeight - projectedY);
    maxYAdjustment = Math.max(maxYAdjustment, adjustment);
  }

  return {
    x: proposedDelta.x,
    y: proposedDelta.y + maxYAdjustment,
    z: proposedDelta.z
  };
}

export function resolveConstrainedMoveDelta(
  parts: Part[],
  movingPartIds: Iterable<string>,
  proposedDelta: TranslationDelta,
  options?: {
    preventOverlap?: boolean;
    fallbackDeltaOnOverlap?: TranslationDelta | null;
  }
): ConstrainedMoveDeltaResult {
  const groundedDelta = applyGroundConstraintToDelta(parts, movingPartIds, proposedDelta);
  const movingIdSet = new Set(movingPartIds);

  if (!options?.preventOverlap) {
    return {
      delta: groundedDelta,
      overlapBlocked: false,
      overlapClamped: false,
      usedFallbackDelta: false
    };
  }

  const safeDelta = resolveSafeTranslationDelta(parts, movingIdSet, groundedDelta);
  if (safeDelta) {
    return {
      delta: safeDelta,
      overlapBlocked: false,
      overlapClamped:
        Math.abs(safeDelta.x - groundedDelta.x) > 1e-6 ||
        Math.abs(safeDelta.y - groundedDelta.y) > 1e-6 ||
        Math.abs(safeDelta.z - groundedDelta.z) > 1e-6,
      usedFallbackDelta: false
    };
  }

  if (options.fallbackDeltaOnOverlap) {
    return {
      delta: options.fallbackDeltaOnOverlap,
      overlapBlocked: true,
      overlapClamped: false,
      usedFallbackDelta: true
    };
  }

  return {
    delta: groundedDelta,
    overlapBlocked: true,
    overlapClamped: false,
    usedFallbackDelta: false
  };
}
