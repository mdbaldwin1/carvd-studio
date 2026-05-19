// Phase §5b parity tests: bundle-backed `getPartBounds` must produce
// identical AABBs to the inline implementation for box parts. The seam is
// validated here so future custom-cut bundles can ship different corners
// (§6) without breaking existing snap callers.
//
// Separate file because it needs real three.js for the rotation math; the
// global vitest setup mocks three for component tests.

import { describe, expect, it, vi } from 'vitest';

vi.unmock('three');
vi.mock('three', async () => await vi.importActual('three'));

import type { Part } from '../types';
import { createGeometryCache } from '../interaction/geometry/cache';
import { getPartBounds, getPartBoundsAtPosition, getPartOBB, type PartOBB } from './snapToPartsUtil';

function makePart(overrides: Partial<Part> = {}): Part {
  return {
    id: 'p1',
    name: 'p1',
    length: 24,
    width: 12,
    thickness: 0.75,
    position: { x: 0, y: 0.375, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    stockId: null,
    grainSensitive: false,
    grainDirection: 'length',
    color: '#fff',
    ...overrides
  };
}

function expectBoundsEqual(a: ReturnType<typeof getPartBounds>, b: ReturnType<typeof getPartBounds>, precision = 6) {
  expect(a.id).toBe(b.id);
  expect(a.minX).toBeCloseTo(b.minX, precision);
  expect(a.maxX).toBeCloseTo(b.maxX, precision);
  expect(a.minY).toBeCloseTo(b.minY, precision);
  expect(a.maxY).toBeCloseTo(b.maxY, precision);
  expect(a.minZ).toBeCloseTo(b.minZ, precision);
  expect(a.maxZ).toBeCloseTo(b.maxZ, precision);
  expect(a.centerX).toBeCloseTo(b.centerX, precision);
  expect(a.centerY).toBeCloseTo(b.centerY, precision);
  expect(a.centerZ).toBeCloseTo(b.centerZ, precision);
}

describe('getPartBounds bundle parity', () => {
  it('axis-aligned box at origin produces identical AABB', () => {
    const part = makePart();
    const cache = createGeometryCache();
    expectBoundsEqual(getPartBounds(part), getPartBounds(part, cache));
  });

  it('axis-aligned box at offset position', () => {
    const part = makePart({ position: { x: 7, y: 0.375, z: -3 } });
    const cache = createGeometryCache();
    expectBoundsEqual(getPartBounds(part), getPartBounds(part, cache));
  });

  it('90° rotation around Y', () => {
    const part = makePart({ rotation: { x: 0, y: 90, z: 0 } });
    const cache = createGeometryCache();
    expectBoundsEqual(getPartBounds(part), getPartBounds(part, cache));
  });

  it('arbitrary three-axis rotation', () => {
    const part = makePart({ rotation: { x: 17, y: 42, z: -23 } });
    const cache = createGeometryCache();
    expectBoundsEqual(getPartBounds(part), getPartBounds(part, cache));
  });

  it('non-uniform dimensions with rotation', () => {
    const part = makePart({
      length: 36,
      width: 4,
      thickness: 1.5,
      rotation: { x: 30, y: 0, z: 0 },
      position: { x: 1, y: 2, z: 3 }
    });
    const cache = createGeometryCache();
    expectBoundsEqual(getPartBounds(part), getPartBounds(part, cache));
  });

  it('returns the same reference identity on repeat bundle reads (cache hit)', () => {
    const part = makePart();
    const cache = createGeometryCache();
    // Two bounds calls; the underlying bundle is cached so the corner set
    // returned by the bundle on the second call is the same reference.
    const a = getPartBounds(part, cache);
    const b = getPartBounds(part, cache);
    // We're checking AABB equality (not identity — PartBounds is rebuilt
    // each call), but the cache hit avoided rebuilding the bundle.
    expectBoundsEqual(a, b);
    expect(cache.size()).toBe(1);
  });
});

describe('getPartBoundsAtPosition bundle parity', () => {
  it('produces identical AABB at a hypothetical position', () => {
    const part = makePart({ position: { x: 0, y: 0.375, z: 0 } });
    const hypothetical = { x: 10, y: 5, z: -2 };
    const cache = createGeometryCache();
    expectBoundsEqual(getPartBoundsAtPosition(part, hypothetical), getPartBoundsAtPosition(part, hypothetical, cache));
  });

  it('hypothetical position works with rotation', () => {
    const part = makePart({ rotation: { x: 0, y: 45, z: 0 } });
    const hypothetical = { x: 20, y: 0.5, z: 7 };
    const cache = createGeometryCache();
    expectBoundsEqual(getPartBoundsAtPosition(part, hypothetical), getPartBoundsAtPosition(part, hypothetical, cache));
  });
});

function expectObbEqual(a: PartOBB, b: PartOBB, precision = 6) {
  expect(a.center.x).toBeCloseTo(b.center.x, precision);
  expect(a.center.y).toBeCloseTo(b.center.y, precision);
  expect(a.center.z).toBeCloseTo(b.center.z, precision);
  for (let i = 0; i < 3; i++) {
    expect(a.axes[i].x).toBeCloseTo(b.axes[i].x, precision);
    expect(a.axes[i].y).toBeCloseTo(b.axes[i].y, precision);
    expect(a.axes[i].z).toBeCloseTo(b.axes[i].z, precision);
    expect(a.halfExtents[i]).toBeCloseTo(b.halfExtents[i], precision);
  }
}

describe('getPartOBB bundle parity', () => {
  it('axis-aligned box at origin', () => {
    const part = makePart();
    const cache = createGeometryCache();
    expectObbEqual(getPartOBB(part), getPartOBB(part, part.position, cache));
  });

  it('axis-aligned box at offset position', () => {
    const part = makePart({ position: { x: 12, y: 0.375, z: -8 } });
    const cache = createGeometryCache();
    expectObbEqual(getPartOBB(part), getPartOBB(part, part.position, cache));
  });

  it('90° Y rotation', () => {
    const part = makePart({ rotation: { x: 0, y: 90, z: 0 } });
    const cache = createGeometryCache();
    expectObbEqual(getPartOBB(part), getPartOBB(part, part.position, cache));
  });

  it('three-axis rotation with non-uniform dimensions', () => {
    const part = makePart({
      length: 36,
      width: 4,
      thickness: 1.5,
      rotation: { x: 15, y: 70, z: -25 }
    });
    const cache = createGeometryCache();
    expectObbEqual(getPartOBB(part), getPartOBB(part, part.position, cache));
  });

  it('hypothetical position parameter still respected', () => {
    const part = makePart();
    const hypothetical = { x: 100, y: 50, z: -25 };
    const cache = createGeometryCache();
    expectObbEqual(getPartOBB(part, hypothetical), getPartOBB(part, hypothetical, cache));
  });

  it('reuses cached bundle across repeat calls', () => {
    const part = makePart();
    const cache = createGeometryCache();
    getPartOBB(part, part.position, cache);
    getPartOBB(part, part.position, cache);
    expect(cache.size()).toBe(1);
  });
});
