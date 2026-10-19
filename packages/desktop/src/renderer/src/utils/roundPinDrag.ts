import { Euler, MathUtils, Quaternion, Vector3 } from 'three';
import type { Part } from '../types';
import { getPartFeatureSockets } from './snapToPartsUtil';

type Delta = { x: number; y: number; z: number };
/** Propose axial hand movement only for a round pin already engaged in an authored coaxial bore.
 * Callers still apply the standard ground and collision guards to this proposal.
 */
export function guideRoundPinDrag(part: Part, parts: Part[], delta: Delta): Delta | null {
  if (part.blankShape !== 'round' || Math.abs(part.width - part.thickness) > 1e-6) return null;
  const q = new Quaternion().setFromEuler(
    new Euler(
      ...([part.rotation.x, part.rotation.y, part.rotation.z].map(MathUtils.degToRad) as [number, number, number])
    )
  );
  const axis = new Vector3(1, 0, 0).applyQuaternion(q);
  const center = new Vector3(part.position.x, part.position.y, part.position.z);
  const engaged = parts
    .filter((host) => host.id !== part.id)
    .flatMap((host) =>
      getPartFeatureSockets(host).filter((socket) =>
        // Socket depth is a face-normal span for through bores. Restrict this
        // guide to square drilling so that full-clearance tests stay exact.
        host.features?.some(
          (feature) =>
            feature.id === socket.featureId &&
            feature.kind === 'circular_cut' &&
            Math.abs(feature.parameters.tilt) < 1e-6
        )
      )
    )
    .filter((socket) => {
      if (socket.mateKind !== 'round_hole' || Math.abs(socket.halfExtent1 * 2 - part.width) > 0.005) return false;
      const normal = new Vector3(socket.openingNormal.x, socket.openingNormal.y, socket.openingNormal.z);
      if (Math.abs(axis.dot(normal)) < 1 - 1e-6) return false;
      const offset = center
        .clone()
        .sub(new Vector3(socket.openingCenter.x, socket.openingCenter.y, socket.openingCenter.z));
      const along = offset.dot(normal);
      if (offset.addScaledVector(normal, -along).length() > 1e-6) return false;
      return along - part.length / 2 < -1e-6 && along + part.length / 2 > -socket.depth + 1e-6;
    });
  if (!engaged.length) return null;
  const axial = axis.multiplyScalar(new Vector3(delta.x, delta.y, delta.z).dot(axis));
  const clear = engaged.every((socket) => {
    const normal = new Vector3(socket.openingNormal.x, socket.openingNormal.y, socket.openingNormal.z);
    const along = center
      .clone()
      .add(axial)
      .sub(new Vector3(socket.openingCenter.x, socket.openingCenter.y, socket.openingCenter.z))
      .dot(normal);
    return along - part.length / 2 >= 0 || (socket.through && along + part.length / 2 <= -socket.depth);
  });
  return clear ? delta : { x: axial.x, y: axial.y, z: axial.z };
}
