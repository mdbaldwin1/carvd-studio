import type { CircularCutFeature, DowelJointMetadata, FaceTarget, Part } from '@renderer/types';
import { clonePartFeature } from '@renderer/utils/partFeatures';
import { expandCircularCut, getFaceFrame, validateCircularCut } from '@renderer/utils/roundCutUtils';
import * as THREE from 'three';
import { Brush, Evaluator, INTERSECTION } from 'three-bvh-csg';

export interface CreateDowelJointInput {
  existingParts?: Part[];
  firstPart: Part;
  firstFace: FaceTarget;
  secondPart: Part;
  secondFace: FaceTarget;
  diameter: number;
  dowelLength: number;
  firstEmbedmentDepth: number;
  secondEmbedmentDepth: number;
  count: number;
  spacing: number;
  firstPrimary: number;
  firstSecondary: number;
}

export interface DowelJointResult {
  jointId: string;
  firstFeatures: CircularCutFeature[];
  secondFeatures: CircularCutFeature[];
}

export type DowelJointFaceInput = Pick<CreateDowelJointInput, 'firstPart' | 'firstFace' | 'secondPart' | 'secondFace'>;

export interface DowelVisualization {
  jointId: string;
  memberIndex: number;
  center: { x: number; y: number; z: number };
  axis: { x: number; y: number; z: number };
  diameter: number;
  length: number;
  aligned: boolean;
}

function id(prefix: string): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function quaternionFor(part: Part): THREE.Quaternion {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      (part.rotation.x * Math.PI) / 180,
      (part.rotation.y * Math.PI) / 180,
      (part.rotation.z * Math.PI) / 180,
      'XYZ'
    )
  );
}

function worldPoint(part: Part, point: { x: number; y: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(point.x, point.y, point.z)
    .applyQuaternion(quaternionFor(part))
    .add(new THREE.Vector3(part.position.x, part.position.y, part.position.z));
}

function worldDirection(part: Part, direction: { x: number; y: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(direction.x, direction.y, direction.z).applyQuaternion(quaternionFor(part)).normalize();
}

function localPoint(part: Part, point: THREE.Vector3): THREE.Vector3 {
  return point
    .clone()
    .sub(new THREE.Vector3(part.position.x, part.position.y, part.position.z))
    .applyQuaternion(quaternionFor(part).invert());
}

function metadata(
  jointId: string,
  matePartId: string,
  memberIndex: number,
  diameter: number,
  dowelLength: number,
  embedmentDepth: number
): { dowelJoint: DowelJointMetadata } {
  return {
    dowelJoint: { jointId, matePartId, memberIndex, dowelDiameter: diameter, dowelLength, embedmentDepth }
  };
}

function feature(
  jointId: string,
  part: Part,
  matePart: Part,
  face: FaceTarget,
  memberIndex: number,
  primary: number,
  secondary: number,
  diameter: number,
  dowelLength: number,
  embedmentDepth: number
): CircularCutFeature {
  return {
    id: id('dowel-hole'),
    kind: 'circular_cut',
    version: 1,
    enabled: true,
    label: `Dowel hole ${memberIndex + 1}`,
    metadata: metadata(jointId, matePart.id, memberIndex, diameter, dowelLength, embedmentDepth),
    target: { type: 'face', face },
    reference: { primaryFrom: 'center', secondaryFrom: 'center' },
    cutType: 'round_hole',
    placement: { primary, secondary, rotation: 0 },
    parameters: { diameter, depthMode: 'blind', depth: embedmentDepth, tilt: 0, direction: 0 }
  };
}

export function validateDowelJointFaces(input: DowelJointFaceInput): void {
  const firstFrame = getFaceFrame(input.firstPart, input.firstFace);
  const secondFrame = getFaceFrame(input.secondPart, input.secondFace);
  const firstNormal = worldDirection(input.firstPart, firstFrame.inwardNormal);
  const secondNormal = worldDirection(input.secondPart, secondFrame.inwardNormal);
  if (firstNormal.dot(secondNormal) > -0.999) throw new Error('Selected faces must be parallel and opposing.');
  const firstFaceOrigin = worldPoint(input.firstPart, firstFrame.origin);
  const secondFaceOrigin = worldPoint(input.secondPart, secondFrame.origin);
  if (Math.abs(secondFaceOrigin.clone().sub(firstFaceOrigin).dot(firstNormal)) > 1e-4)
    throw new Error('Selected faces must be touching to create a dowel joint.');
}

export function createDowelJoint(input: CreateDowelJointInput): DowelJointResult {
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > 128)
    throw new Error('Dowel count must be between 1 and 128.');
  if (
    input.diameter <= 0 ||
    input.dowelLength <= 0 ||
    input.firstEmbedmentDepth <= 0 ||
    input.secondEmbedmentDepth <= 0
  )
    throw new Error('Dowel dimensions and embedment depths must be greater than zero.');
  if (input.firstEmbedmentDepth + input.secondEmbedmentDepth < input.dowelLength - 1e-9)
    throw new Error('Combined hole depths must accommodate the full dowel length.');
  if (input.count > 1 && (!Number.isFinite(input.spacing) || input.spacing < input.diameter - 1e-9))
    throw new Error('Dowel spacing must be at least the dowel diameter so the dowels do not overlap.');

  validateDowelJointFaces(input);
  const secondFrame = getFaceFrame(input.secondPart, input.secondFace);

  const jointId = id('dowel-joint');
  const firstFeatures: CircularCutFeature[] = [];
  const secondFeatures: CircularCutFeature[] = [];
  const secondOrigin = new THREE.Vector3(secondFrame.origin.x, secondFrame.origin.y, secondFrame.origin.z);
  const secondPrimary = new THREE.Vector3(
    secondFrame.primaryAxis.x,
    secondFrame.primaryAxis.y,
    secondFrame.primaryAxis.z
  );
  const secondSecondary = new THREE.Vector3(
    secondFrame.secondaryAxis.x,
    secondFrame.secondaryAxis.y,
    secondFrame.secondaryAxis.z
  );

  for (let memberIndex = 0; memberIndex < input.count; memberIndex += 1) {
    const primary = input.firstPrimary + memberIndex * input.spacing;
    const first = feature(
      jointId,
      input.firstPart,
      input.secondPart,
      input.firstFace,
      memberIndex,
      primary,
      input.firstSecondary,
      input.diameter,
      input.dowelLength,
      input.firstEmbedmentDepth
    );
    const firstEntry = expandCircularCut(first, input.firstPart)[0].entryPoint;
    const entryInSecond = localPoint(input.secondPart, worldPoint(input.firstPart, firstEntry)).sub(secondOrigin);
    const second = feature(
      jointId,
      input.secondPart,
      input.firstPart,
      input.secondFace,
      memberIndex,
      entryInSecond.dot(secondPrimary),
      entryInSecond.dot(secondSecondary),
      input.diameter,
      input.dowelLength,
      input.secondEmbedmentDepth
    );
    const firstError = validateCircularCut(first, input.firstPart);
    const secondError = validateCircularCut(second, input.secondPart);
    if (firstError || secondError) throw new Error(firstError ?? secondError ?? 'Dowel hole is invalid.');
    firstFeatures.push(first);
    secondFeatures.push(second);
  }

  const parts = (input.existingParts ?? [input.firstPart, input.secondPart]).map((part) =>
    part.id === input.firstPart.id
      ? { ...input.firstPart, features: [...(input.firstPart.features ?? []), ...firstFeatures] }
      : part.id === input.secondPart.id
        ? { ...input.secondPart, features: [...(input.secondPart.features ?? []), ...secondFeatures] }
        : part
  );
  if (
    findDowelInterferences(getRawDowelVisualizations(parts)).some((pair) =>
      pair.some((dowel) => dowel.jointId === jointId)
    )
  )
    throw new Error('The new dowels overlap existing hardware. Increase spacing or move this joint.');
  return { jointId, firstFeatures, secondFeatures };
}

function dowelKey(metadata: DowelJointMetadata): string {
  return `${metadata.jointId}:${metadata.memberIndex}`;
}

function dowelMemberIdentity(partId: string, featureId: string): string {
  return `${partId}:${featureId}`;
}

function detachDowelMetadata(feature: NonNullable<Part['features']>[number], metadata: DowelJointMetadata) {
  const detached = clonePartFeature(feature);
  if (detached.label === `Dowel hole ${metadata.memberIndex + 1}`) {
    detached.label = `Round hole ${metadata.memberIndex + 1}`;
  }
  const remainingMetadata = { ...detached.metadata };
  delete remainingMetadata.dowelJoint;
  detached.metadata = Object.keys(remainingMetadata).length > 0 ? remainingMetadata : undefined;
  return detached;
}

/**
 * Dissolve relationships whose existing member was removed by a part or
 * feature-array replacement. Geometry-only edits, including invalid or
 * disabled holes, retain their metadata so validation can diagnose them.
 */
export function reconcileDowelRelationshipRemovals(previousParts: Part[], nextParts: Part[]): Part[] {
  const previousMembers = new Map<string, Set<string>>();
  for (const part of previousParts) {
    for (const feature of part.features ?? []) {
      const metadata = feature.metadata?.dowelJoint as DowelJointMetadata | undefined;
      if (!metadata) continue;
      const key = dowelKey(metadata);
      const identities = previousMembers.get(key) ?? new Set<string>();
      identities.add(dowelMemberIdentity(part.id, feature.id));
      previousMembers.set(key, identities);
    }
  }

  const nextMembers = new Map<string, Set<string>>();
  for (const part of nextParts) {
    for (const feature of part.features ?? []) {
      const metadata = feature.metadata?.dowelJoint as DowelJointMetadata | undefined;
      if (!metadata) continue;
      const key = dowelKey(metadata);
      const identities = nextMembers.get(key) ?? new Set<string>();
      identities.add(dowelMemberIdentity(part.id, feature.id));
      nextMembers.set(key, identities);
    }
  }

  const removedKeys = new Set<string>();
  for (const [key, previousIdentities] of previousMembers) {
    const nextIdentities = nextMembers.get(key);
    if ([...previousIdentities].some((identity) => !nextIdentities?.has(identity))) removedKeys.add(key);
  }
  if (removedKeys.size === 0) return nextParts;

  return nextParts.map((part) => {
    if (!part.features) return part;
    let changed = false;
    const features = part.features.map((feature) => {
      const metadata = feature.metadata?.dowelJoint as DowelJointMetadata | undefined;
      if (!metadata || !removedKeys.has(dowelKey(metadata))) return feature;
      changed = true;
      return detachDowelMetadata(feature, metadata);
    });
    return changed ? { ...part, features } : part;
  });
}

/**
 * Apply a part's edited feature list and dissolve only relationships whose
 * feature was deleted. The physical hole on the other member remains as an
 * ordinary, independently editable drilling operation.
 */
export function detachDeletedDowelMates(parts: Part[], partId: string, nextFeatures: Part['features']): Part[] {
  if (!parts.some((part) => part.id === partId)) return parts;
  const nextParts = parts.map((part) => (part.id === partId ? { ...part, features: nextFeatures ?? [] } : part));
  return reconcileDowelRelationshipRemovals(parts, nextParts);
}

function isValidDowelPair(
  first: { part: Part; feature: CircularCutFeature; metadata: DowelJointMetadata },
  second: { part: Part; feature: CircularCutFeature; metadata: DowelJointMetadata }
): boolean {
  const reciprocal = first.metadata.matePartId === second.part.id && second.metadata.matePartId === first.part.id;
  const matchingMetadata =
    first.metadata.dowelDiameter === second.metadata.dowelDiameter &&
    first.metadata.dowelLength === second.metadata.dowelLength;
  const matchingFeatures =
    first.feature.enabled &&
    second.feature.enabled &&
    first.feature.cutType === 'round_hole' &&
    second.feature.cutType === 'round_hole' &&
    first.feature.pattern === undefined &&
    second.feature.pattern === undefined &&
    first.feature.parameters.countersink === undefined &&
    second.feature.parameters.countersink === undefined &&
    first.feature.parameters.counterbore === undefined &&
    second.feature.parameters.counterbore === undefined &&
    first.feature.parameters.diameter === first.metadata.dowelDiameter &&
    second.feature.parameters.diameter === second.metadata.dowelDiameter &&
    first.feature.parameters.depthMode === 'blind' &&
    second.feature.parameters.depthMode === 'blind' &&
    first.feature.parameters.depth === first.metadata.embedmentDepth &&
    second.feature.parameters.depth === second.metadata.embedmentDepth &&
    validateCircularCut(first.feature, first.part) === null &&
    validateCircularCut(second.feature, second.part) === null &&
    first.metadata.embedmentDepth + second.metadata.embedmentDepth >= first.metadata.dowelLength - 1e-9;
  return (
    reciprocal &&
    matchingMetadata &&
    matchingFeatures &&
    getDowelJointAlignment(first.part, first.feature, second.part, second.feature).aligned
  );
}

export interface DowelRelationshipIssue {
  partIds: string[];
  message: string;
}

export function getDowelRelationshipIssues(parts: Part[]): DowelRelationshipIssue[] {
  const errors: DowelRelationshipIssue[] = [];
  const entries = new Map<string, Array<{ part: Part; feature: CircularCutFeature; metadata: DowelJointMetadata }>>();
  for (const part of parts) {
    for (const feature of part.features ?? []) {
      const dowel = feature.metadata?.dowelJoint as DowelJointMetadata | undefined;
      if (!dowel) continue;
      const key = `${dowel.jointId}:${dowel.memberIndex}`;
      if (feature.kind !== 'circular_cut') {
        errors.push({ partIds: [part.id], message: `Dowel joint member ${key} is not a round hole.` });
        continue;
      }
      const members = entries.get(key) ?? [];
      members.push({ part, feature, metadata: dowel });
      entries.set(key, members);
    }
  }
  for (const [key, members] of entries) {
    if (members.length !== 2) {
      errors.push({
        partIds: members.map((member) => member.part.id),
        message: `Dowel joint member ${key} is missing its matching hole.`
      });
      continue;
    }
    const [first, second] = members;
    if (!isValidDowelPair(first, second))
      errors.push({
        partIds: members.map((member) => member.part.id),
        message: `Dowel joint member ${key} has mismatched or misaligned hole geometry.`
      });
  }
  for (const [first, second] of findDowelInterferences(getRawDowelVisualizations(parts))) {
    errors.push({
      partIds: [
        ...new Set(
          [first, second].flatMap((visual) =>
            (entries.get(`${visual.jointId}:${visual.memberIndex}`) ?? []).map((member) => member.part.id)
          )
        )
      ],
      message: `Dowel members ${first.memberIndex + 1} and ${second.memberIndex + 1} overlap. Increase their spacing or move the joints apart.`
    });
  }
  return errors;
}

export function validateDowelRelationships(parts: Part[]): string[] {
  return getDowelRelationshipIssues(parts).map((issue) => issue.message);
}

export function getDowelJointAlignment(
  firstPart: Part,
  firstFeature: CircularCutFeature,
  secondPart: Part,
  secondFeature: CircularCutFeature,
  tolerance = 0.01
): { aligned: boolean; offset: number; axisErrorDegrees: number } {
  const firstMember = expandCircularCut(firstFeature, firstPart)[0];
  const secondMember = expandCircularCut(secondFeature, secondPart)[0];
  const firstEntry = worldPoint(firstPart, firstMember.entryPoint);
  const secondEntry = worldPoint(secondPart, secondMember.entryPoint);
  const firstAxis = worldDirection(firstPart, firstMember.axis);
  const secondAxis = worldDirection(secondPart, secondMember.axis);
  const axisDot = Math.min(1, Math.max(-1, firstAxis.dot(secondAxis)));
  const axisErrorDegrees = (Math.acos(-axisDot) * 180) / Math.PI;
  const offset = firstEntry.distanceTo(secondEntry);
  return { aligned: offset <= tolerance && axisErrorDegrees <= 0.5, offset, axisErrorDegrees };
}

function getDowelMetadata(feature: CircularCutFeature): DowelJointMetadata | null {
  const value = feature.metadata?.dowelJoint;
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<DowelJointMetadata>;
  return typeof candidate.jointId === 'string' && typeof candidate.memberIndex === 'number'
    ? (candidate as DowelJointMetadata)
    : null;
}

function getRawDowelVisualizations(parts: Part[]): DowelVisualization[] {
  const members = new Map<string, Array<{ part: Part; feature: CircularCutFeature; metadata: DowelJointMetadata }>>();
  for (const part of parts) {
    for (const feature of part.features ?? []) {
      if (feature.kind !== 'circular_cut') continue;
      const dowelMetadata = getDowelMetadata(feature);
      if (!dowelMetadata) continue;
      const key = `${dowelMetadata.jointId}:${dowelMetadata.memberIndex}`;
      const entries = members.get(key) ?? [];
      entries.push({ part, feature, metadata: dowelMetadata });
      members.set(key, entries);
    }
  }

  const visuals: DowelVisualization[] = [];
  for (const entries of members.values()) {
    if (entries.length !== 2) continue;
    const [first, second] = entries;
    const member = expandCircularCut(first.feature, first.part)[0];
    const entry = worldPoint(first.part, member.entryPoint);
    const axis = worldDirection(first.part, member.axis);
    const totalDepth = first.metadata.embedmentDepth + second.metadata.embedmentDepth;
    const firstInsertion = (first.metadata.dowelLength * first.metadata.embedmentDepth) / totalDepth;
    const center = entry.clone().addScaledVector(axis, firstInsertion - first.metadata.dowelLength / 2);
    visuals.push({
      jointId: first.metadata.jointId,
      memberIndex: first.metadata.memberIndex,
      center: { x: center.x, y: center.y, z: center.z },
      axis: { x: axis.x, y: axis.y, z: axis.z },
      diameter: first.metadata.dowelDiameter,
      length: first.metadata.dowelLength,
      aligned: isValidDowelPair(first, second)
    });
  }
  return visuals.sort((a, b) => a.jointId.localeCompare(b.jointId) || a.memberIndex - b.memberIndex);
}

/** Flat-ended dowels, not capsules: touching sides or ends do not overlap. */
function dowelsIntersect(first: DowelVisualization, second: DowelVisualization): boolean {
  const a = new THREE.Vector3(first.axis.x, first.axis.y, first.axis.z);
  const b = new THREE.Vector3(second.axis.x, second.axis.y, second.axis.z);
  const delta = new THREE.Vector3(
    second.center.x - first.center.x,
    second.center.y - first.center.y,
    second.center.z - first.center.z
  );
  const ar = first.diameter / 2;
  const br = second.diameter / 2;
  if (![ar, br, first.length, second.length, ...delta.toArray()].every(Number.isFinite)) return false;
  for (const coordinate of ['x', 'y', 'z'] as const) {
    const extent =
      (Math.abs(a[coordinate]) * first.length) / 2 +
      Math.sqrt(Math.max(0, 1 - a[coordinate] ** 2)) * ar +
      (Math.abs(b[coordinate]) * second.length) / 2 +
      Math.sqrt(Math.max(0, 1 - b[coordinate] ** 2)) * br;
    if (Math.abs(delta[coordinate]) >= extent - 1e-9) return false;
  }
  if (Math.abs(a.dot(b)) > 1 - 1e-9) {
    const axial = delta.dot(a);
    return (
      Math.abs(axial) < (first.length + second.length) / 2 - 1e-9 &&
      delta.clone().addScaledVector(a, -axial).length() < ar + br - 1e-9
    );
  }
  // Nonparallel finite cylinders need their end caps included. Use the same
  // solid intersection engine as cut geometry after the cheap analytic bounds.
  const brushFor = (dowel: DowelVisualization, axis: THREE.Vector3) => {
    const brush = new Brush(new THREE.CylinderGeometry(dowel.diameter / 2, dowel.diameter / 2, dowel.length, 64));
    brush.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
    brush.position.set(dowel.center.x, dowel.center.y, dowel.center.z);
    brush.updateMatrixWorld(true);
    return brush;
  };
  const firstBrush = brushFor(first, a);
  const secondBrush = brushFor(second, b);
  const evaluator = new Evaluator();
  evaluator.attributes = ['position', 'normal'];
  evaluator.useGroups = false;
  const result = evaluator.evaluate(firstBrush, secondBrush, INTERSECTION);
  const positions = result.geometry.getAttribute('position');
  const index = result.geometry.index;
  let volume = 0;
  const p = new THREE.Vector3();
  const q = new THREE.Vector3();
  const r = new THREE.Vector3();
  for (let i = 0; i < (index?.count ?? positions.count); i += 3) {
    p.fromBufferAttribute(positions, index ? index.getX(i) : i);
    q.fromBufferAttribute(positions, index ? index.getX(i + 1) : i + 1);
    r.fromBufferAttribute(positions, index ? index.getX(i + 2) : i + 2);
    volume += p.dot(q.cross(r)) / 6;
  }
  firstBrush.geometry.dispose();
  secondBrush.geometry.dispose();
  result.geometry.dispose();
  return Math.abs(volume) > 1e-10;
}

function findDowelInterferences(visuals: DowelVisualization[]): Array<[DowelVisualization, DowelVisualization]> {
  const overlaps: Array<[DowelVisualization, DowelVisualization]> = [];
  for (let i = 0; i < visuals.length; i += 1) {
    for (let j = i + 1; j < visuals.length; j += 1) {
      if (dowelsIntersect(visuals[i], visuals[j])) overlaps.push([visuals[i], visuals[j]]);
    }
  }
  return overlaps;
}

export function getDowelVisualizations(parts: Part[]): DowelVisualization[] {
  const visuals = getRawDowelVisualizations(parts);
  for (const [first, second] of findDowelInterferences(visuals)) {
    first.aligned = false;
    second.aligned = false;
  }
  return visuals;
}
