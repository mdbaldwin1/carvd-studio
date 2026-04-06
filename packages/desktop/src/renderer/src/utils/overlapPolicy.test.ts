import { describe, expect, it } from 'vitest';
import { Part } from '../types';
import {
  overlapCheckEnabled,
  partsOverlap,
  resolveSafeTranslationDelta,
  wouldTransformedPartsOverlap,
  wouldTranslationCauseOverlap
} from './overlapPolicy';

function createPart(overrides: Partial<Part> = {}): Part {
  return {
    id: overrides.id ?? 'part-1',
    name: overrides.name ?? 'Part',
    length: overrides.length ?? 10,
    width: overrides.width ?? 10,
    thickness: overrides.thickness ?? 1,
    position: overrides.position ?? { x: 0, y: 0.5, z: 0 },
    rotation: overrides.rotation ?? { x: 0, y: 0, z: 0 },
    stockId: overrides.stockId ?? null,
    grainSensitive: overrides.grainSensitive ?? false,
    grainDirection: overrides.grainDirection ?? 'length',
    color: overrides.color ?? '#ffffff',
    ignoreOverlap: overrides.ignoreOverlap
  };
}

describe('overlapPolicy', () => {
  it('disables overlap checking when either part ignores overlap', () => {
    const a = createPart({ id: 'a', ignoreOverlap: true });
    const b = createPart({ id: 'b' });

    expect(overlapCheckEnabled(a, b)).toBe(false);
    expect(partsOverlap(a, b)).toBe(false);
  });

  it('treats face touching as non-overlap', () => {
    const a = createPart({ id: 'a', length: 10, position: { x: 0, y: 0.5, z: 0 } });
    const b = createPart({ id: 'b', length: 4, position: { x: 7.0001, y: 0.5, z: 0 } });

    expect(partsOverlap(a, b)).toBe(false);
  });

  it('detects overlap after transformed updates', () => {
    const a = createPart({ id: 'a', position: { x: 0, y: 0.5, z: 0 } });
    const b = createPart({ id: 'b', position: { x: 30, y: 0.5, z: 0 } });

    const transformed = new Map<string, Part>([['b', { ...b, position: { x: 3, y: 0.5, z: 0 } }]]);

    expect(wouldTransformedPartsOverlap([a, b], transformed)).toBe(true);
  });

  it('ignores unrelated existing overlaps when evaluating a transformed part', () => {
    const blockerA = createPart({ id: 'a', length: 10, position: { x: 0, y: 0.5, z: 0 } });
    const blockerB = createPart({ id: 'b', length: 10, position: { x: 5, y: 0.5, z: 0 } });
    const movable = createPart({ id: 'c', length: 4, width: 4, position: { x: 30, y: 0.5, z: 0 } });
    const parts = [blockerA, blockerB, movable];

    expect(partsOverlap(blockerA, blockerB)).toBe(true);
    expect(partsOverlap(movable, blockerA)).toBe(false);
    expect(partsOverlap(movable, blockerB)).toBe(false);

    const transformed = new Map<string, Part>([['c', { ...movable, rotation: { x: 0, y: 0, z: 45 } }]]);

    expect(wouldTransformedPartsOverlap(parts, transformed)).toBe(false);
  });

  it('resolves a safe translation delta before collision', () => {
    const moving = createPart({ id: 'moving', length: 4, position: { x: 0, y: 0.5, z: 0 } });
    const target = createPart({ id: 'target', length: 4, position: { x: 12, y: 0.5, z: 0 } });
    const parts = [moving, target];
    const movingIds = new Set<string>(['moving']);

    const proposed = { x: 12, y: 0, z: 0 };
    expect(wouldTranslationCauseOverlap(parts, movingIds, proposed)).toBe(true);

    const safe = resolveSafeTranslationDelta(parts, movingIds, proposed);
    expect(safe).not.toBeNull();
    expect(safe!.x).toBeGreaterThan(0);
    expect(safe!.x).toBeLessThan(12);
    expect(wouldTranslationCauseOverlap(parts, movingIds, safe!)).toBe(false);
  });

  it('preserves movement direction when a substantial safe fraction exists', () => {
    const moving = createPart({ id: 'moving', length: 4, width: 4, position: { x: 0, y: 0.5, z: 0 } });
    const target = createPart({ id: 'target', length: 4, width: 4, position: { x: 12, y: 0.5, z: 0 } });
    const parts = [moving, target];
    const movingIds = new Set<string>(['moving']);

    const proposed = { x: 12, y: 0, z: 3 };
    expect(wouldTranslationCauseOverlap(parts, movingIds, proposed)).toBe(true);

    const safe = resolveSafeTranslationDelta(parts, movingIds, proposed);
    expect(safe).not.toBeNull();
    expect(safe!.x).toBeGreaterThan(0);
    expect(safe!.z).toBeGreaterThan(0);
    // Direction-preserving solve should keep x:z close to the proposed ratio (12:3).
    expect(safe!.z / safe!.x).toBeCloseTo(3 / 12, 2);
    expect(wouldTranslationCauseOverlap(parts, movingIds, safe!)).toBe(false);
  });

  it('returns null instead of redirecting to another axis when blocked', () => {
    const target = createPart({
      id: 'target',
      length: 8,
      width: 8,
      thickness: 2,
      position: { x: 0, y: 1, z: 0 }
    });
    const moving = createPart({
      id: 'moving',
      length: 4,
      width: 4,
      thickness: 2,
      position: { x: 0, y: 3.001, z: 0 } // Nearly touching target at Y face (tiny clearance)
    });
    const parts = [moving, target];
    const movingIds = new Set<string>(['moving']);

    const proposed = { x: 3, y: -0.3, z: 0 };
    expect(wouldTranslationCauseOverlap(parts, movingIds, proposed)).toBe(true);

    const safe = resolveSafeTranslationDelta(parts, movingIds, proposed);
    expect(safe).toBeNull();
  });
});
