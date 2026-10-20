import { Euler, MathUtils, Quaternion, Vector3 } from 'three';
import type { Part } from '../types';
import { getFaceFrame } from './roundCutUtils';

export interface RuleJointEdge {
  id: string;
  profile: 'roundover' | 'cove';
  top: boolean;
  side: string;
  radius: number;
  center: Vector3;
  normal: Vector3;
  along: Vector3;
  width: number;
}

/** Only full-thickness circular built-ins have this proven complementary seat.
 * Saved/custom contours and profiles with reveals need their own fit contract.
 */
export function getRuleJointEdges(part: Part): RuleJointEdge[] {
  if (part.blankShape) return [];
  return (part.features ?? []).flatMap((feature): RuleJointEdge[] => {
    if (
      !feature.enabled ||
      feature.kind !== 'edge_profile' ||
      (feature.profile !== 'roundover' && feature.profile !== 'cove') ||
      feature.routerProfileSnapshot ||
      feature.routerProfileId ||
      !/^(top|bottom)_(front|back|left|right)_edge$/.test(feature.target.edge) ||
      Math.abs(feature.parameters.size - part.thickness) > 1e-7 ||
      Math.abs(feature.parameters.depth - part.thickness) > 1e-7 ||
      part.thickness <= 0
    )
      return [];
    const side = feature.target.edge.split('_')[1];
    const face =
      side === 'front' ? 'front_face' : side === 'back' ? 'back_face' : side === 'left' ? 'left_end' : 'right_end';
    const frame = getFaceFrame(part, face);
    const normal = new Vector3(frame.inwardNormal.x, frame.inwardNormal.y, frame.inwardNormal.z).negate();
    return [
      {
        id: `rule-joint:${feature.id}`,
        profile: feature.profile,
        top: feature.target.edge.startsWith('top_'),
        side,
        radius: part.thickness,
        center: new Vector3(frame.origin.x, 0, frame.origin.z).addScaledVector(normal, -part.thickness / 2),
        normal,
        along: new Vector3(frame.primaryAxis.x, frame.primaryAxis.y, frame.primaryAxis.z),
        width: frame.primarySize
      }
    ];
  });
}

export function complementaryRuleJointEdges(a: RuleJointEdge, b: RuleJointEdge): boolean {
  return a.profile !== b.profile && a.top !== b.top && Math.abs(a.radius - b.radius) < 1e-7;
}

const orientation = (part: Part) =>
  new Quaternion().setFromEuler(
    new Euler(
      MathUtils.degToRad(part.rotation.x),
      MathUtils.degToRad(part.rotation.y),
      MathUtils.degToRad(part.rotation.z),
      'XYZ'
    )
  );

/** Translational hand guide only; callers must still check ground and material collisions. */
export function guideRuleJointDrag(part: Part, parts: Part[], delta: { x: number; y: number; z: number }) {
  const q = orientation(part);
  const ownEdges = getRuleJointEdges(part);
  const proposed = new Vector3(delta.x, delta.y, delta.z);
  const tolerance = 0.2;
  const candidates: Vector3[] = [];
  for (const other of parts) {
    if (other.id === part.id) continue;
    const otherQ = orientation(other);
    // Preserve the authored up direction. This does not rotate a board or simulate its hinge.
    const up = new Vector3(0, 1, 0).applyQuaternion(q);
    if (up.dot(new Vector3(0, 1, 0).applyQuaternion(otherQ)) < 1 - 1e-7) continue;
    for (const a of ownEdges)
      for (const b of getRuleJointEdges(other)) {
        if (!complementaryRuleJointEdges(a, b)) continue;
        const normal = a.normal.clone().applyQuaternion(q);
        const along = a.along.clone().applyQuaternion(q);
        if (normal.dot(b.normal.clone().applyQuaternion(otherQ)) > -1 + 1e-7) continue;
        const offset = a.center
          .clone()
          .applyQuaternion(q)
          .add(new Vector3(part.position.x, part.position.y, part.position.z))
          .sub(
            b.center
              .clone()
              .applyQuaternion(otherQ)
              .add(new Vector3(other.position.x, other.position.y, other.position.z))
          );
        // A seated pair follows the withdrawal direction until its bounding blanks clear.
        const aligned = Math.abs(offset.dot(up)) < 1e-7 && Math.abs(offset.dot(along)) < 1e-7;
        const gap = -offset.dot(normal);
        if (aligned && gap >= -1e-7 && gap < a.radius && -offset.clone().add(proposed).dot(normal) < a.radius) {
          candidates.push(normal.clone().multiplyScalar(Math.min(proposed.dot(normal), gap)));
          continue;
        }
        // Re-seat only near the exact centered pose; distant/unrelated edges remain free.
        const remaining = offset.clone().add(proposed);
        if (
          Math.abs(remaining.dot(normal)) <= tolerance &&
          Math.abs(remaining.dot(up)) <= tolerance &&
          Math.abs(remaining.dot(along)) <= tolerance
        )
          candidates.push(offset.negate());
      }
  }
  if (candidates.length !== 1) return null;
  return { x: candidates[0].x || 0, y: candidates[0].y || 0, z: candidates[0].z || 0 };
}
