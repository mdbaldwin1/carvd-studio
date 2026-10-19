import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';

interface EdgeRun {
  start: number;
  end: number;
  normal: Vector3;
}
interface LineRuns {
  direction: Vector3;
  origin: Vector3;
  runs: EdgeRun[];
}

/** Resolve collinear T-junctions before deciding which triangle edges are creases. */
export function buildCleanOutlineGeometry(source: BufferGeometry, threshold = 15): BufferGeometry {
  const lines = new Map<string, LineRuns>();
  const position = source.getAttribute('position');
  const index = source.index;
  const count = index?.count ?? position.count;
  const epsilon = 1e-5;
  const rounded = (v: Vector3) => [v.x, v.y, v.z].map((n) => Math.round(n / epsilon)).join(',');
  for (let i = 0; i + 2 < count; i += 3) {
    const points = [0, 1, 2].map((j) => new Vector3().fromBufferAttribute(position, index ? index.getX(i + j) : i + j));
    if (!points.every((point) => [point.x, point.y, point.z].every(Number.isFinite))) continue;
    const normal = new Vector3().crossVectors(points[1].clone().sub(points[0]), points[2].clone().sub(points[0]));
    if (normal.lengthSq() < 1e-16) continue;
    normal.normalize();
    for (let j = 0; j < 3; j++) {
      const a = points[j],
        b = points[(j + 1) % 3];
      const direction = b.clone().sub(a);
      if (direction.lengthSq() < epsilon * epsilon) continue;
      direction.normalize();
      const lead = [direction.x, direction.y, direction.z].find((value) => Math.abs(value) > epsilon)!;
      if (lead < 0) direction.negate();
      const moment = a.clone().cross(direction);
      const key = `${rounded(direction)}:${rounded(moment)}`;
      let line = lines.get(key);
      if (!line) {
        line = { direction, origin: direction.clone().cross(moment), runs: [] };
        lines.set(key, line);
      }
      const start = a.dot(line.direction),
        end = b.dot(line.direction);
      line.runs.push({ start: Math.min(start, end), end: Math.max(start, end), normal });
    }
  }
  const segments: number[] = [];
  const cosine = Math.cos((threshold * Math.PI) / 180);
  for (const line of lines.values()) {
    const nodes = line.runs
      .flatMap((run) => [run.start, run.end])
      .sort((a, b) => a - b)
      .filter((value, i, all) => i === 0 || value - all[i - 1] > epsilon);
    for (let i = 0; i + 1 < nodes.length; i++) {
      const middle = (nodes[i] + nodes[i + 1]) / 2;
      const normals: Vector3[] = [];
      for (const run of line.runs) {
        if (middle < run.start - epsilon || middle > run.end + epsilon) continue;
        // The layered stock model has opposing internal caps. They do not
        // create an exterior crease and must cancel before comparing normals.
        const opposite = normals.findIndex((normal) => normal.dot(run.normal) < -0.99999);
        if (opposite >= 0) normals.splice(opposite, 1);
        else normals.push(run.normal);
      }
      if (!normals.length || (normals.length > 1 && normals.every((normal) => normal.dot(normals[0]) >= cosine)))
        continue;
      for (const distance of [nodes[i], nodes[i + 1]]) {
        const point = line.origin.clone().addScaledVector(line.direction, distance);
        segments.push(point.x, point.y, point.z);
      }
    }
  }
  const result = new BufferGeometry();
  result.setAttribute('position', new Float32BufferAttribute(segments, 3));
  if (segments.length) result.computeBoundingSphere();
  return result;
}
