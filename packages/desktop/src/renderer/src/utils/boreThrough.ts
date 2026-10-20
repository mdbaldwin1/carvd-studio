import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import type { CircularCutFeature, FaceTarget, Part } from '../types';
import { expandCircularCut, getFaceFrame } from './roundCutUtils';
import { getHolesOnFace } from './holeTransfer';

/**
 * Clamp up and drill straight through.
 *
 * The other real way to get aligned holes. Where dowel centres mark the mating
 * piece so each half is bored separately, this is the single operation: the
 * bit passes through everything stacked in its path, so every hole is
 * necessarily in line because one pass made them all.
 *
 * It is what you do for a pegged mortise and tenon, a tusk tenon's wedge, or
 * a bed bolt -- and it only works on a hole that goes all the way through,
 * because a blind hole is where the bit stopped.
 */

/** Air the bit will not cross. Parts must be stacked, not merely in line. */
const CONTACT_TOLERANCE = 1e-3;

/** Part-local axes, in the order length, thickness, width. */
const LOCAL_FACES: Array<{ axis: 0 | 1 | 2; positive: FaceTarget; negative: FaceTarget }> = [
  { axis: 0, positive: 'right_end', negative: 'left_end' },
  { axis: 1, positive: 'top_face', negative: 'bottom_face' },
  { axis: 2, positive: 'front_face', negative: 'back_face' }
];

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

interface LocalRayHit {
  enter: number;
  exit: number;
  /** The face the bit entered through. */
  face: FaceTarget;
  /** Where it entered, in the part's own frame. */
  entryPoint: THREE.Vector3;
}

/**
 * Where a bit crosses a part, in the part's own frame.
 *
 * A slab test against the part's half extents: the last slab the ray enters is
 * the one whose face it actually went in through.
 */
function intersectPart(part: Part, origin: THREE.Vector3, direction: THREE.Vector3): LocalRayHit | null {
  const inverse = quaternionFor(part).invert();
  const localOrigin = origin
    .clone()
    .sub(new THREE.Vector3(part.position.x, part.position.y, part.position.z))
    .applyQuaternion(inverse);
  const localDirection = direction.clone().applyQuaternion(inverse);

  const half = [part.length / 2, part.thickness / 2, part.width / 2];
  const o = [localOrigin.x, localOrigin.y, localOrigin.z];
  const d = [localDirection.x, localDirection.y, localDirection.z];

  let enter = -Infinity;
  let exit = Infinity;
  let entryAxis: 0 | 1 | 2 = 0;

  for (const slab of [0, 1, 2] as const) {
    if (Math.abs(d[slab]) < 1e-9) {
      // Parallel to this pair of faces: it either misses them or never leaves.
      if (Math.abs(o[slab]) > half[slab]) return null;
      continue;
    }
    const near = (-half[slab] - o[slab]) / d[slab];
    const far = (half[slab] - o[slab]) / d[slab];
    const lo = Math.min(near, far);
    const hi = Math.max(near, far);
    if (lo > enter) {
      enter = lo;
      entryAxis = slab;
    }
    if (hi < exit) exit = hi;
    if (enter > exit) return null;
  }

  if (!Number.isFinite(enter) || exit <= 0) return null;

  const entryPoint = localOrigin.clone().add(localDirection.clone().multiplyScalar(enter));
  const mapping = LOCAL_FACES[entryAxis];
  // The bit enters through the face it is travelling towards.
  const face = d[entryAxis] > 0 ? mapping.negative : mapping.positive;

  return { enter, exit, face, entryPoint };
}

export interface BoredHole {
  partId: string;
  feature: CircularCutFeature;
}

/**
 * Drill every part stacked behind a through hole.
 *
 * Parts are taken in the order the bit reaches them and stop at the first gap:
 * a bit travels through material, not across the room, so a part merely in
 * line with the hole is not in its path.
 */
export function boreThroughAssembly(source: Part, sourceFace: FaceTarget, parts: Part[]): BoredHole[] {
  const bored: BoredHole[] = [];
  const sourceQuaternion = quaternionFor(source);

  for (const hole of getHolesOnFace(source, sourceFace)) {
    // A blind hole is where the bit stopped, so nothing is behind it.
    if (hole.parameters.depthMode !== 'through') continue;

    for (const member of expandCircularCut(hole, source)) {
      const origin = new THREE.Vector3(member.entryPoint.x, member.entryPoint.y, member.entryPoint.z)
        .applyQuaternion(sourceQuaternion)
        .add(new THREE.Vector3(source.position.x, source.position.y, source.position.z));
      const direction = new THREE.Vector3(member.axis.x, member.axis.y, member.axis.z)
        .applyQuaternion(sourceQuaternion)
        .normalize();

      const sourceHit = intersectPart(source, origin, direction);
      let reach = sourceHit ? sourceHit.exit : 0;

      const hits = parts
        .filter((part) => part.id !== source.id)
        .map((part) => ({ part, hit: intersectPart(part, origin, direction) }))
        .filter((entry): entry is { part: Part; hit: LocalRayHit } => entry.hit !== null && entry.hit.exit > 0)
        .sort((a, b) => a.hit.enter - b.hit.enter);

      for (const { part, hit } of hits) {
        if (hit.enter > reach + CONTACT_TOLERANCE) break;
        reach = Math.max(reach, hit.exit);

        const frame = getFaceFrame(part, hit.face);
        const offset = hit.entryPoint.clone().sub(new THREE.Vector3(frame.origin.x, frame.origin.y, frame.origin.z));
        const primary = offset.dot(new THREE.Vector3(frame.primaryAxis.x, frame.primaryAxis.y, frame.primaryAxis.z));
        const secondary = offset.dot(
          new THREE.Vector3(frame.secondaryAxis.x, frame.secondaryAxis.y, frame.secondaryAxis.z)
        );

        bored.push({
          partId: part.id,
          feature: {
            id: uuidv4(),
            kind: 'circular_cut',
            version: 1,
            enabled: true,
            label: 'Bored through',
            target: { type: 'face', face: hit.face },
            reference: { primaryFrom: 'center', secondaryFrom: 'center' },
            cutType: 'round_hole',
            placement: { primary, secondary, rotation: 0 },
            // One pass with one bit, straight through everything it meets.
            parameters: { diameter: hole.parameters.diameter, depthMode: 'through', tilt: 0, direction: 0 }
          }
        });
      }
    }
  }

  return bored;
}
