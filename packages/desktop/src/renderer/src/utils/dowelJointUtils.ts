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

function id(prefix: string): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function quaternionFor(part: Part): THREE.Quaternion {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(part.rotation.x),
      THREE.MathUtils.degToRad(part.rotation.y),
      THREE.MathUtils.degToRad(part.rotation.z),
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

  const firstFrame = getFaceFrame(input.firstPart, input.firstFace);
  const secondFrame = getFaceFrame(input.secondPart, input.secondFace);
  const firstNormal = worldDirection(input.firstPart, firstFrame.inwardNormal);
  const secondNormal = worldDirection(input.secondPart, secondFrame.inwardNormal);
  if (firstNormal.dot(secondNormal) > -0.999) throw new Error('Selected faces must be parallel and opposing.');

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
  const axisDot = THREE.MathUtils.clamp(firstAxis.dot(secondAxis), -1, 1);
  const axisErrorDegrees = THREE.MathUtils.radToDeg(Math.acos(-axisDot));
  const offset = firstEntry.distanceTo(secondEntry);
  return { aligned: offset <= tolerance && axisErrorDegrees <= 0.5, offset, axisErrorDegrees };
}
