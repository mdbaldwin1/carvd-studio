import { describe, expect, it } from 'vitest';
import type { Part } from '../../types';
import { computeBoxVersionKey, deriveBoxBundle } from './boxBundle';

function makePart(overrides?: Partial<Part>): Part {
  return {
    id: 'p1',
    name: 'p1',
    length: 24,
    width: 12,
    thickness: 0.75,
    position: { x: 5, y: 0.375, z: -3 }, // arbitrary; bundles are local-space
    rotation: { x: 0, y: 0, z: 0 },
    stockId: null,
    grainSensitive: false,
    grainDirection: 'length',
    color: '#fff',
    ...overrides
  };
}

describe('computeBoxVersionKey', () => {
  it('returns identical keys for parts with same dimensions and rotation', () => {
    const a = makePart();
    const b = makePart({ id: 'p2', position: { x: 99, y: 99, z: 99 } });
    expect(computeBoxVersionKey(a)).toBe(computeBoxVersionKey(b));
  });

  it('changes when length changes', () => {
    const a = makePart();
    const b = makePart({ length: 25 });
    expect(computeBoxVersionKey(a)).not.toBe(computeBoxVersionKey(b));
  });

  it('changes when rotation changes', () => {
    const a = makePart();
    const b = makePart({ rotation: { x: 0, y: 45, z: 0 } });
    expect(computeBoxVersionKey(a)).not.toBe(computeBoxVersionKey(b));
  });

  it('does NOT change when position changes', () => {
    const a = makePart({ position: { x: 0, y: 0, z: 0 } });
    const b = makePart({ position: { x: 100, y: 50, z: -25 } });
    expect(computeBoxVersionKey(a)).toBe(computeBoxVersionKey(b));
  });
});

describe('deriveBoxBundle — bounds', () => {
  it('localAabb is centered at origin with half-extents matching dimensions', () => {
    const part = makePart({ length: 24, width: 12, thickness: 0.75 });
    const bundle = deriveBoxBundle(part);
    expect(bundle.bounds.localAabb).toEqual({
      min: { x: -12, y: -0.375, z: -6 },
      max: { x: 12, y: 0.375, z: 6 }
    });
  });

  it('localObb has identity basis and matching half-extents', () => {
    const part = makePart({ length: 24, width: 12, thickness: 0.75 });
    const bundle = deriveBoxBundle(part);
    expect(bundle.bounds.localObb.center).toEqual({ x: 0, y: 0, z: 0 });
    expect(bundle.bounds.localObb.halfExtents).toEqual({ x: 12, y: 0.375, z: 6 });
    expect(bundle.bounds.localObb.axisU).toEqual({ x: 1, y: 0, z: 0 });
    expect(bundle.bounds.localObb.axisV).toEqual({ x: 0, y: 1, z: 0 });
    expect(bundle.bounds.localObb.axisW).toEqual({ x: 0, y: 0, z: 1 });
  });
});

describe('deriveBoxBundle — render mesh', () => {
  it('describes a unit box scaled to part dimensions', () => {
    const part = makePart({ length: 24, width: 12, thickness: 0.75 });
    const bundle = deriveBoxBundle(part);
    expect(bundle.renderMesh).toEqual({
      geometryKey: 'unit-box',
      scale: { length: 24, width: 12, thickness: 0.75 }
    });
  });
});

describe('deriveBoxBundle — snap anchor graph', () => {
  it('exposes 6 faces, one per ±axis', () => {
    const bundle = deriveBoxBundle(makePart());
    expect(bundle.snapGraph.faces).toHaveLength(6);
    const axes = bundle.snapGraph.faces.map((f) => `${f.axis}${f.side}`).sort();
    expect(axes).toEqual(['x-1', 'x1', 'y-1', 'y1', 'z-1', 'z1']);
  });

  it('exposes 12 edges, 4 per axis', () => {
    const bundle = deriveBoxBundle(makePart());
    expect(bundle.snapGraph.edges).toHaveLength(12);
    const byAxis = { x: 0, y: 0, z: 0 };
    for (const edge of bundle.snapGraph.edges) byAxis[edge.axis]++;
    expect(byAxis).toEqual({ x: 4, y: 4, z: 4 });
  });

  it('exposes 8 corners', () => {
    const bundle = deriveBoxBundle(makePart());
    expect(bundle.snapGraph.corners).toHaveLength(8);
  });

  it('exposes fraction lines: 6 faces × 2 in-face axes × 3 fractions = 36', () => {
    const bundle = deriveBoxBundle(makePart());
    expect(bundle.snapGraph.fractionLines).toHaveLength(36);
  });

  it('center is at local origin', () => {
    const bundle = deriveBoxBundle(makePart());
    expect(bundle.snapGraph.center).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('face normals point outward', () => {
    const bundle = deriveBoxBundle(makePart());
    const xPlus = bundle.snapGraph.faces.find((f) => f.axis === 'x' && f.side === 1);
    const xMinus = bundle.snapGraph.faces.find((f) => f.axis === 'x' && f.side === -1);
    expect(xPlus?.normal).toEqual({ x: 1, y: 0, z: 0 });
    expect(xMinus?.normal).toEqual({ x: -1, y: 0, z: 0 });
  });
});

describe('deriveBoxBundle — measure graph', () => {
  it('primary segments match part dimensions', () => {
    const part = makePart({ length: 24, width: 12, thickness: 0.75 });
    const bundle = deriveBoxBundle(part);
    expect(bundle.measureGraph.primarySegments.length.length).toBe(24);
    expect(bundle.measureGraph.primarySegments.width.length).toBe(12);
    expect(bundle.measureGraph.primarySegments.thickness.length).toBe(0.75);
  });

  it('length segment runs along x axis', () => {
    const bundle = deriveBoxBundle(makePart());
    expect(bundle.measureGraph.primarySegments.length.axis).toBe('x');
  });
});

describe('deriveBoxBundle — hit + collision proxies', () => {
  it('hitProxy localAabb matches bounds.localAabb', () => {
    const bundle = deriveBoxBundle(makePart());
    expect(bundle.hitProxy.localAabb).toEqual(bundle.bounds.localAabb);
  });

  it('collisionProxy mirrors bounds for box parts', () => {
    const bundle = deriveBoxBundle(makePart());
    expect(bundle.collisionProxy.localAabb).toEqual(bundle.bounds.localAabb);
    expect(bundle.collisionProxy.localObb).toEqual(bundle.bounds.localObb);
  });
});
