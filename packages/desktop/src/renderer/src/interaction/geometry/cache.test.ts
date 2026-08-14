import { describe, expect, it } from 'vitest';
import type { Part } from '../../types';
import { createGeometryCache } from './cache';

function makePart(overrides?: Partial<Part>): Part {
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

describe('createGeometryCache', () => {
  it('starts empty', () => {
    const cache = createGeometryCache();
    expect(cache.size()).toBe(0);
  });

  it('caches a bundle on first read', () => {
    const cache = createGeometryCache();
    cache.get(makePart());
    expect(cache.size()).toBe(1);
  });

  it('returns the same bundle reference on repeat reads with unchanged version', () => {
    const cache = createGeometryCache();
    const part = makePart();
    const a = cache.get(part);
    const b = cache.get(part);
    expect(a).toBe(b);
  });

  it('returns the same bundle reference even when the Part instance changes but version key does not', () => {
    const cache = createGeometryCache();
    const partA = makePart();
    const partB = makePart({ position: { x: 99, y: 99, z: 99 } }); // position not in key
    const a = cache.get(partA);
    const b = cache.get(partB);
    expect(a).toBe(b);
  });

  it('rebuilds when dimensions change', () => {
    const cache = createGeometryCache();
    const partA = makePart({ length: 24 });
    const partB = makePart({ length: 30 });
    const a = cache.get(partA);
    const b = cache.get(partB);
    expect(a).not.toBe(b);
    expect(a.versionKey).not.toBe(b.versionKey);
  });

  it('rebuilds when rotation changes', () => {
    const cache = createGeometryCache();
    const partA = makePart({ rotation: { x: 0, y: 0, z: 0 } });
    const partB = makePart({ rotation: { x: 0, y: 45, z: 0 } });
    const a = cache.get(partA);
    const b = cache.get(partB);
    expect(a).not.toBe(b);
  });

  it('keeps separate entries per partId', () => {
    const cache = createGeometryCache();
    cache.get(makePart({ id: 'a' }));
    cache.get(makePart({ id: 'b' }));
    expect(cache.size()).toBe(2);
  });

  it('invalidate(partId) drops the entry; next get rebuilds', () => {
    const cache = createGeometryCache();
    const part = makePart();
    const a = cache.get(part);
    cache.invalidate(part.id);
    expect(cache.size()).toBe(0);
    const b = cache.get(part);
    expect(b).not.toBe(a);
  });

  it('invalidate of unknown id is a no-op', () => {
    const cache = createGeometryCache();
    expect(() => cache.invalidate('ghost')).not.toThrow();
    expect(cache.size()).toBe(0);
  });

  it('clear empties the cache', () => {
    const cache = createGeometryCache();
    cache.get(makePart({ id: 'a' }));
    cache.get(makePart({ id: 'b' }));
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it('bundle.partId matches the part it was derived from', () => {
    const cache = createGeometryCache();
    const part = makePart({ id: 'specific-id' });
    expect(cache.get(part).partId).toBe('specific-id');
  });
});
