import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import type { CircularCutFeature, FaceTarget, Part } from '../types';
import { expandCircularCut, getFaceFrame } from './roundCutUtils';

/**
 * Dowel centres, in software.
 *
 * Getting matching holes into two pieces is the whole craft problem of dowel
 * joinery, and every shop answer works the same way: reference both holes from
 * one datum rather than measuring twice. Dowel centres do it by marking the
 * mating piece off the holes you already bored; a self-centring jig does it by
 * registering off a shared face.
 *
 * So this takes holes that already exist, bored where you wanted them, and
 * marks them across the joint line -- rather than asking for the joint to be
 * described in the abstract before any of it is real.
 */

/** Faces must be touching this closely to count as a joint line. */
const CONTACT_TOLERANCE = 1e-3;
/** Normals must oppose at least this closely. */
const OPPOSING_COSINE = -0.999;

const FACES: FaceTarget[] = ['left_end', 'right_end', 'top_face', 'bottom_face', 'front_face', 'back_face'];

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
    .applyQuaternion(quaternionFor(part).clone().invert());
}

export interface MatingFace {
  part: Part;
  face: FaceTarget;
}

/**
 * The face on another part that is pressed against this one.
 *
 * Unlike the old wizard, this is discovery rather than a precondition: the
 * parts are already together because the user put them together, so there is
 * nothing to satisfy up front.
 */
export function findMatingFace(source: Part, sourceFace: FaceTarget, candidates: Part[]): MatingFace | null {
  const sourceFrame = getFaceFrame(source, sourceFace);
  const sourceNormal = worldDirection(source, sourceFrame.inwardNormal);
  const sourceOrigin = worldPoint(source, sourceFrame.origin);

  for (const candidate of candidates) {
    if (candidate.id === source.id) continue;
    for (const face of FACES) {
      const frame = getFaceFrame(candidate, face);
      const normal = worldDirection(candidate, frame.inwardNormal);
      if (normal.dot(sourceNormal) > OPPOSING_COSINE) continue;
      const origin = worldPoint(candidate, frame.origin);
      if (Math.abs(origin.clone().sub(sourceOrigin).dot(sourceNormal)) > CONTACT_TOLERANCE) continue;
      return { part: candidate, face };
    }
  }
  return null;
}

/** The holes on one face of a part, in the order they were authored. */
export function getHolesOnFace(part: Part, face: FaceTarget): CircularCutFeature[] {
  return (part.features ?? []).filter(
    (feature): feature is CircularCutFeature =>
      feature.enabled && feature.kind === 'circular_cut' && feature.target.face === face
  );
}

export interface TransferredHole {
  feature: CircularCutFeature;
  /** Where the hole landed on the mating face, for reporting. */
  placement: { primary: number; secondary: number };
}

/**
 * Mark each hole onto the mating face, at the point its centre meets it.
 *
 * Every member of a repeat is marked separately, because a patterned hole is
 * a row of real holes and the jig steps across all of them. The marks come
 * back as plain holes rather than a patterned one: the mating face may have
 * different dimensions, so a repeat authored against one board's edges will
 * not describe the same row on the other.
 */
export function transferHolesToMatingFace(
  source: Part,
  sourceFace: FaceTarget,
  target: Part,
  targetFace: FaceTarget,
  depth: number
): TransferredHole[] {
  const targetFrame = getFaceFrame(target, targetFace);
  const targetOrigin = new THREE.Vector3(targetFrame.origin.x, targetFrame.origin.y, targetFrame.origin.z);
  const primaryAxis = new THREE.Vector3(
    targetFrame.primaryAxis.x,
    targetFrame.primaryAxis.y,
    targetFrame.primaryAxis.z
  );
  const secondaryAxis = new THREE.Vector3(
    targetFrame.secondaryAxis.x,
    targetFrame.secondaryAxis.y,
    targetFrame.secondaryAxis.z
  );

  const transferred: TransferredHole[] = [];

  for (const hole of getHolesOnFace(source, sourceFace)) {
    for (const member of expandCircularCut(hole, source)) {
      const entryInTarget = localPoint(target, worldPoint(source, member.entryPoint)).sub(targetOrigin);
      const primary = entryInTarget.dot(primaryAxis);
      const secondary = entryInTarget.dot(secondaryAxis);

      transferred.push({
        placement: { primary, secondary },
        feature: {
          id: uuidv4(),
          kind: 'circular_cut',
          version: 1,
          enabled: true,
          label: hole.label ? `${hole.label} (transferred)` : 'Transferred hole',
          target: { type: 'face', face: targetFace },
          reference: { primaryFrom: 'center', secondaryFrom: 'center' },
          cutType: 'round_hole',
          placement: { primary, secondary, rotation: 0 },
          // Same bit, so the same diameter; depth is the operator's to set
          // because the two halves of a joint are rarely bored equally deep.
          parameters: { diameter: hole.parameters.diameter, depthMode: 'blind', depth, tilt: 0, direction: 0 }
        }
      });
    }
  }

  return transferred;
}

/** A hole that landed off the edge of the mating face cannot be drilled. */
export function findHolesOffTheFace(target: Part, targetFace: FaceTarget, holes: TransferredHole[]): TransferredHole[] {
  const frame = getFaceFrame(target, targetFace);
  return holes.filter(({ placement, feature }) => {
    const radius = feature.parameters.diameter / 2;
    return (
      Math.abs(placement.primary) + radius > frame.primarySize / 2 + 1e-9 ||
      Math.abs(placement.secondary) + radius > frame.secondarySize / 2 + 1e-9
    );
  });
}
