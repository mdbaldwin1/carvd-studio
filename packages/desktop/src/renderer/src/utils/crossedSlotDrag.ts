import { Euler, MathUtils, Quaternion, Vector3 } from 'three';
import type { Part } from '../types';
import { getRectCutPlanBounds, isLengthwiseEdgeTarget } from './rectCutUtils';
import { getPartOBB, obbsOverlap } from './snapToPartsUtil';
import { partsOverlapInMaterial } from './partFeatureGeometry';

type Delta = { x: number; y: number; z: number };
const FIT_EPSILON = 0.005;
const quaternion = (part: Part) =>
  new Quaternion().setFromEuler(
    new Euler(
      ...([part.rotation.x, part.rotation.y, part.rotation.z].map(MathUtils.degToRad) as [number, number, number]),
      'XYZ'
    )
  );

function slots(part: Part) {
  const q = quaternion(part);
  return (part.features ?? []).flatMap((feature) => {
    if (
      !feature.enabled ||
      feature.kind !== 'rect_cut' ||
      feature.cutType !== 'edge_notch' ||
      feature.parameters.depthMode !== 'through' ||
      feature.target.type !== 'edge' ||
      !isLengthwiseEdgeTarget(feature.target.edge)
    )
      return [];
    const bounds = getRectCutPlanBounds(feature, part);
    return [
      {
        width: bounds.maxX - bounds.minX,
        center: new Vector3((bounds.minX + bounds.maxX) / 2 - part.length / 2, 0, 0)
          .applyQuaternion(q)
          .add(new Vector3(part.position.x, part.position.y, part.position.z)),
        across: new Vector3(1, 0, 0).applyQuaternion(q),
        normal: new Vector3(0, 1, 0).applyQuaternion(q),
        opening: new Vector3(0, 0, feature.target.edge.includes('front') ? 1 : -1).applyQuaternion(q)
      }
    ];
  });
}

/** Guide an already interlocked crossed-slot pair along its shared withdrawal axis.
 * This only proposes a body-drag delta; the usual ground and material collision
 * checks must still accept it. No numeric edit or unrelated joint is constrained.
 */
export function guideCrossedSlotDrag(part: Part, projectParts: Part[], delta: Delta): Delta | null {
  const ownSlots = slots(part);
  if (!ownSlots.length) return null;
  let guide: Vector3 | null = null;
  const hosts: Part[] = [];
  for (const other of projectParts) {
    if (other.id === part.id || !obbsOverlap(getPartOBB(part, part.position), getPartOBB(other, other.position)))
      continue;
    if (partsOverlapInMaterial(part, other)) continue;
    for (const a of ownSlots)
      for (const b of slots(other)) {
        if (
          Math.abs(a.width - other.thickness) > FIT_EPSILON ||
          Math.abs(b.width - part.thickness) > FIT_EPSILON ||
          Math.abs(a.normal.dot(b.normal)) > 1e-6 ||
          a.opening.dot(b.opening) > -1 + 1e-6
        )
          continue;
        const centers = b.center.clone().sub(a.center);
        if (Math.abs(centers.dot(a.across)) > FIT_EPSILON || Math.abs(centers.dot(b.across)) > FIT_EPSILON) continue;
        if (guide && Math.abs(guide.dot(a.opening)) < 1 - 1e-6) return null;
        guide = a.opening;
        hosts.push(other);
      }
  }
  if (!guide) return null;
  const proposed = new Vector3(delta.x, delta.y, delta.z);
  const axial = guide.clone().multiplyScalar(proposed.dot(guide));
  const slid: Part = {
    ...part,
    position: { x: part.position.x + axial.x, y: part.position.y + axial.y, z: part.position.z + axial.z }
  };
  // Once fully out of every slot, let the hand move freely again. Before then,
  // any lateral component from the camera plane would push through slot walls.
  if (hosts.every((host) => !obbsOverlap(getPartOBB(slid, slid.position), getPartOBB(host, host.position))))
    return delta;
  return { x: axial.x, y: axial.y, z: axial.z };
}
