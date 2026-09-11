import type { Part } from '../types';
import type { Point3 } from './roundCutUtils';
import { getPartStockPlanes } from './endCutUtils';

const dot = (a: Point3, b: Point3): number => a.x * b.x + a.y * b.y + a.z * b.z;

/** Exact support containment against end/edge planes and nonconvex tenon shoulders. */
export function fitsRemainingStock(
  part: Pick<Part, 'length' | 'width' | 'thickness' | 'features'>,
  center: Point3,
  support: (normal: Point3) => number
): boolean {
  const absoluteSupport = (normal: Point3) => dot(normal, center) + support(normal);
  if (getPartStockPlanes(part).some((plane) => absoluteSupport(plane.normal) > plane.limit + 1e-9)) return false;
  for (const feature of part.features ?? []) {
    if (!feature.enabled || feature.kind !== 'rect_cut' || feature.cutType !== 'tenon') continue;
    const side = feature.target.type === 'face' && feature.target.face === 'left_end' ? -1 : 1;
    const shoulder = part.length / 2 - feature.parameters.size.length;
    if (absoluteSupport({ x: side, y: 0, z: 0 }) <= shoulder + 1e-9) continue;
    const maxZ = part.width / 2 - feature.placement.z;
    const minZ = maxZ - feature.parameters.size.width;
    for (const [normal, limit] of [
      [{ x: 0, y: 1, z: 0 }, Number(feature.parameters.depth) / 2],
      [{ x: 0, y: -1, z: 0 }, Number(feature.parameters.depth) / 2],
      [{ x: 0, y: 0, z: 1 }, maxZ],
      [{ x: 0, y: 0, z: -1 }, -minZ]
    ] as Array<[Point3, number]>) {
      if (absoluteSupport(normal) <= limit + 1e-9) continue;
      // Maximize the profile/cutter support only in the end region x*side >=
      // shoulder. The one-constraint convex dual is a bounded scalar minimum;
      // unlike endpoint sampling it catches breakout between the bore caps.
      const bound = (lambda: number) => absoluteSupport({ ...normal, x: normal.x + lambda * side }) - lambda * shoulder;
      let high = 1;
      let previous = bound(0);
      for (let i = 0; i < 64; i += 1) {
        const value = bound(high);
        if (value >= previous) break;
        previous = value;
        high *= 2;
      }
      let low = 0;
      for (let i = 0; i < 80; i += 1) {
        const left = low + (high - low) / 3;
        const right = high - (high - low) / 3;
        if (bound(left) < bound(right)) high = right;
        else low = left;
      }
      if (Math.min(bound(0), bound((low + high) / 2)) > limit + 1e-9) return false;
    }
  }
  return true;
}
