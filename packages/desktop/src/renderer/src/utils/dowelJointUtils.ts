import type { CircularCutFeature, DowelJointMetadata, FaceTarget, Part } from '@renderer/types';
import { expandCircularCut, getFaceFrame, validateCircularCut } from '@renderer/utils/roundCutUtils';
import * as THREE from 'three';

export interface CreateDowelJointInput {
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
  if (input.firstEmbedmentDepth + input.secondEmbedmentDepth > input.dowelLength + 1e-9)
    throw new Error('Combined embedment depths cannot exceed the dowel length.');

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

  return { jointId, firstFeatures, secondFeatures };
}

export function validateDowelRelationships(parts: Part[]): string[] {
  const errors: string[] = [];
  const entries = new Map<string, Array<{ part: Part; feature: CircularCutFeature; metadata: DowelJointMetadata }>>();
  for (const part of parts) {
    for (const feature of part.features ?? []) {
      const dowel = feature.metadata?.dowelJoint as DowelJointMetadata | undefined;
      if (!dowel) continue;
      const key = `${dowel.jointId}:${dowel.memberIndex}`;
      if (feature.kind !== 'circular_cut') {
        errors.push(`Dowel joint member ${key} is not a round hole.`);
        continue;
      }
      const members = entries.get(key) ?? [];
      members.push({ part, feature, metadata: dowel });
      entries.set(key, members);
    }
  }
  for (const [key, members] of entries) {
    if (members.length !== 2) {
      errors.push(`Dowel joint member ${key} is missing its matching hole.`);
      continue;
    }
    const [first, second] = members;
    const reciprocal = first.metadata.matePartId === second.part.id && second.metadata.matePartId === first.part.id;
    const matchingMetadata =
      first.metadata.dowelDiameter === second.metadata.dowelDiameter &&
      first.metadata.dowelLength === second.metadata.dowelLength;
    const matchingFeatures =
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
      first.metadata.embedmentDepth + second.metadata.embedmentDepth <= first.metadata.dowelLength + 1e-9;
    const aligned = getDowelJointAlignment(first.part, first.feature, second.part, second.feature).aligned;
    if (!reciprocal || !matchingMetadata || !matchingFeatures || !aligned)
      errors.push(`Dowel joint member ${key} has mismatched or misaligned hole geometry.`);
  }
  return errors;
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

export function getDowelVisualizations(parts: Part[]): DowelVisualization[] {
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
    const center = entry.clone().addScaledVector(axis, first.metadata.embedmentDepth - first.metadata.dowelLength / 2);
    const alignment = getDowelJointAlignment(first.part, first.feature, second.part, second.feature);
    visuals.push({
      jointId: first.metadata.jointId,
      memberIndex: first.metadata.memberIndex,
      center: { x: center.x, y: center.y, z: center.z },
      axis: { x: axis.x, y: axis.y, z: axis.z },
      diameter: first.metadata.dowelDiameter,
      length: first.metadata.dowelLength,
      aligned: alignment.aligned
    });
  }
  return visuals.sort((a, b) => a.jointId.localeCompare(b.jointId) || a.memberIndex - b.memberIndex);
}
