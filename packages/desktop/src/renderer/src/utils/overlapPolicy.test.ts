import { describe, expect, it } from 'vitest';
import { Part } from '../types';
import {
  overlapCheckEnabled,
  partsOverlap,
  resolveSafeTranslationDelta,
  wouldTransformedPartsOverlap,
  wouldTranslationCauseOverlap
} from './overlapPolicy';
import { getPartContourSubBoxes } from './partFeatureGeometry';
import { getPartSubOBBs } from './snapToPartsUtil';

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
    ignoreOverlap: overrides.ignoreOverlap,
    features: overrides.features
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

  it('allows translating a rotated leg under a seat (Dining Bench regression)', () => {
    const seat = createPart({
      id: 'seat',
      name: 'Bench Seat',
      length: 40,
      width: 11,
      thickness: 2,
      position: { x: 1.5625, y: 18.375, z: -16.4375 },
      rotation: { x: 0, y: 0, z: 0 }
    });

    const legStart = createPart({
      id: 'leg',
      name: 'Leg 2 (copy)',
      length: 14.625,
      width: 1,
      thickness: 1,
      position: { x: -14.27589554684791, y: 10.0625, z: -30.61843547323637 },
      rotation: { x: 270, y: 90, z: 0 }
    });

    // Place the leg footprint under the seat corner (keeping its original Y).
    const seatMinX = seat.position.x - seat.length / 2;
    const seatMinZ = seat.position.z - seat.width / 2;
    const legTarget = createPart({
      ...legStart,
      position: { x: seatMinX + 0.5, y: legStart.position.y, z: seatMinZ + 0.5 }
    });

    expect(partsOverlap(legTarget, seat)).toBe(false);

    const parts = [seat, legStart];
    const proposed = {
      x: legTarget.position.x - legStart.position.x,
      y: legTarget.position.y - legStart.position.y,
      z: legTarget.position.z - legStart.position.z
    };
    const safe = resolveSafeTranslationDelta(parts, new Set(['leg']), proposed);
    expect(safe).not.toBeNull();
    expect(safe!.x).toBeCloseTo(proposed.x, 6);
    expect(safe!.y).toBeCloseTo(proposed.y, 6);
    expect(safe!.z).toBeCloseTo(proposed.z, 6);
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

  it('allows movement that does not worsen a pre-existing tiny overlap', () => {
    const moving = createPart({
      id: 'moving',
      length: 192,
      width: 6,
      thickness: 1,
      position: { x: 55.43418603599124, y: 41.198408003138915, z: 7.884627918624318 },
      rotation: { x: 180, y: -90, z: 0 }
    });
    const neighbor = createPart({
      id: 'neighbor',
      length: 192,
      width: 6,
      thickness: 1,
      position: { x: 49.43418603599124, y: 41.19842651456869, z: 7.884627918624319 },
      rotation: { x: 180, y: -90, z: 0 }
    });
    const parts = [moving, neighbor];
    const movingIds = new Set<string>(['moving']);

    // Exact face-axis SAT treats the zero-volume X touch as non-overlapping,
    // so the move away is trivially allowed. The shipped guarantee is the
    // second assertion: dragging away from a pre-existing micro-overlap must
    // not be blocked.
    expect(partsOverlap(moving, neighbor)).toBe(false);
    expect(resolveSafeTranslationDelta(parts, movingIds, { x: 0, y: 0, z: 0.25 })).toEqual({ x: 0, y: 0, z: 0.25 });
  });

  it('blocks movement that worsens an existing overlap on the limiting axis', () => {
    const moving = createPart({
      id: 'moving',
      length: 6,
      width: 24,
      thickness: 1,
      position: { x: 0, y: 0, z: 0 }
    });
    const neighbor = createPart({
      id: 'neighbor',
      length: 6,
      width: 24,
      thickness: 1,
      position: { x: 5.9999, y: 0, z: 0 }
    });
    const parts = [moving, neighbor];
    const movingIds = new Set<string>(['moving']);

    expect(partsOverlap(moving, neighbor)).toBe(true);
    expect(resolveSafeTranslationDelta(parts, movingIds, { x: 1, y: 0, z: 0 })).toBeNull();
  });

  it('allows lengthwise sliding across an already intersecting cross member', () => {
    const deckBoard = createPart({
      id: 'deck-board',
      length: 192,
      width: 6,
      thickness: 1,
      position: { x: 0, y: 0, z: 0 }
    });
    const crossMember = createPart({
      id: 'cross-member',
      length: 10,
      width: 6,
      thickness: 2,
      position: { x: 0, y: 0, z: 1 }
    });
    const parts = [deckBoard, crossMember];
    const movingIds = new Set<string>(['deck-board']);

    expect(partsOverlap(deckBoard, crossMember)).toBe(true);
    expect(resolveSafeTranslationDelta(parts, movingIds, { x: 0, y: 0, z: 0.25 })).toEqual({
      x: 0,
      y: 0,
      z: 0.25
    });
  });

  it('allows beveled face to approach flush against another part (no ghost corner)', () => {
    // Part A: a plain board lying flat
    const partA = createPart({
      id: 'a',
      length: 6,
      width: 4,
      thickness: 0.75,
      position: { x: 0, y: 0.375, z: 0 },
      rotation: { x: 0, y: 0, z: 0 }
    });

    // Part B: same dimensions but with a 45° bevel on the left end.
    // The bevel removes 0.75" of material. The beveled face should be able
    // to sit right next to Part A without a ghost corner blocking it.
    const partB = createPart({
      id: 'b',
      length: 6,
      width: 4,
      thickness: 0.75,
      // Position so the outer (unbeveled) left face lines up with Part A's right end
      // Part A right end is at x = 3. Part B has left bevel removing up to 0.75" from x = -3.
      // With bevel, the leftmost point is at localX = -3 + 0.75 = -2.25 (at one Y extreme)
      // while the other Y extreme is still at localX = -3.
      // Position so the bevel face approaches Part A: partB.position.x = 3 + 3 = 6
      // That puts Part B's left raw edge at x = 3, exactly touching Part A's right edge.
      position: { x: 6, y: 0.375, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      features: [
        {
          id: 'bevel-left',
          kind: 'end_cut' as const,
          cutType: 'bevel' as const,
          enabled: true,
          target: { face: 'left_end' as const },
          lengthMode: 'long_point' as const,
          parameters: {
            horizontalAngle: 0,
            verticalAngle: 45
          }
        }
      ]
    });

    // With OBB only, this would incorrectly report overlap because the OBB
    // includes the ghost corner. With convex shape SAT, no overlap occurs.
    expect(partsOverlap(partA, partB)).toBe(false);
  });

  it('resolves beveled part to flush position without visible gap', () => {
    const partA = createPart({
      id: 'a',
      length: 6,
      width: 4,
      thickness: 0.75,
      position: { x: 0, y: 0.375, z: 0 },
      rotation: { x: 0, y: 0, z: 0 }
    });

    const partB = createPart({
      id: 'b',
      length: 6,
      width: 4,
      thickness: 0.75,
      position: { x: 20, y: 0.375, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      features: [
        {
          id: 'bevel-left',
          kind: 'end_cut' as const,
          cutType: 'bevel' as const,
          enabled: true,
          target: { face: 'left_end' as const },
          lengthMode: 'long_point' as const,
          parameters: {
            horizontalAngle: 0,
            verticalAngle: 45
          }
        }
      ]
    });

    const parts = [partA, partB];
    const movingIds = new Set(['b']);
    const proposedDelta = { x: -14, y: 0, z: 0 };
    const safeDelta = resolveSafeTranslationDelta(parts, movingIds, proposedDelta);

    expect(safeDelta).not.toBeNull();
    const finalX = 20 + safeDelta!.x;
    expect(finalX).toBeCloseTo(6, 1);
  });

  it('exempts specified part IDs from overlap checking', () => {
    const moving = createPart({ id: 'moving', length: 4, position: { x: 0, y: 0.5, z: 0 } });
    const target = createPart({ id: 'target', length: 4, position: { x: 6, y: 0.5, z: 0 } });
    const parts = [moving, target];
    const movingIds = new Set<string>(['moving']);

    // Without exemption, moving into the target area causes overlap
    const proposed = { x: 6, y: 0, z: 0 };
    expect(wouldTranslationCauseOverlap(parts, movingIds, proposed)).toBe(true);

    // With exemption for the target, overlap is ignored for that pair
    const exempt = new Set(['target']);
    expect(wouldTranslationCauseOverlap(parts, movingIds, proposed, undefined, exempt)).toBe(false);

    // resolveSafeTranslationDelta also allows the full delta with exemption
    const safe = resolveSafeTranslationDelta(parts, movingIds, proposed, undefined, exempt);
    expect(safe).not.toBeNull();
    expect(safe!.x).toBeCloseTo(6);
  });

  it('decomposes corner notch contour into correct sub-boxes', () => {
    const cornerNotchFeature = (corner: string): Part['features'] => [
      {
        id: `notch-${corner}`,
        kind: 'rect_cut' as const,
        version: 1,
        enabled: true,
        cutType: 'corner_notch' as const,
        target: { type: 'corner' as const, corner: corner as 'front_left_corner' },
        reference: { primaryFrom: 'min' as const },
        placement: { x: 0, z: 0 },
        parameters: {
          size: { length: 2, width: 2 },
          depthMode: 'through' as const,
          depth: null
        }
      }
    ];

    // Part with front_right_corner notch removed (6x4)
    const a = createPart({
      id: 'a',
      length: 6,
      width: 4,
      thickness: 0.75,
      position: { x: 0, y: 0.375, z: 0 },
      features: cornerNotchFeature('front_right_corner')
    });

    const subBoxesA = getPartContourSubBoxes(a);
    // front_right notch removes x=[1,3] z=[-2,0], should get 3 sub-boxes
    expect(subBoxesA.length).toBe(3);

    const obbsA = getPartSubOBBs(a);
    expect(obbsA.length).toBe(3);

    // Part with back_left_corner notch
    const b = createPart({
      id: 'b',
      length: 6,
      width: 4,
      thickness: 0.75,
      position: { x: 4, y: 0.375, z: 0 },
      features: cornerNotchFeature('back_left_corner')
    });

    const subBoxesB = getPartContourSubBoxes(b);
    expect(subBoxesB.length).toBe(3);

    const obbsB = getPartSubOBBs(b);
    expect(obbsB.length).toBe(3);
  });

  it('allows interlocking corner notch parts to overlap in the removed area', () => {
    // Two 6×4 boards, each with a 2×2 corner notch on complementary corners.
    // Part A has notch at front-right, Part B has notch at back-left.
    // They interlock: in the 2" overlap zone, A's material is in the back half
    // and B's material is in the front half, so no actual solid collision.
    const cornerNotchFeature = (corner: string): Part['features'] => [
      {
        id: `notch-${corner}`,
        kind: 'rect_cut' as const,
        version: 1,
        enabled: true,
        cutType: 'corner_notch' as const,
        target: { type: 'corner' as const, corner: corner as 'front_left_corner' },
        reference: { primaryFrom: 'min' as const },
        placement: { x: 0, z: 0 },
        parameters: {
          size: { length: 2, width: 2 },
          depthMode: 'through' as const,
          depth: null
        }
      }
    ];

    const a = createPart({
      id: 'a',
      length: 6,
      width: 4,
      thickness: 0.75,
      position: { x: 0, y: 0.375, z: 0 },
      features: cornerNotchFeature('front_right_corner')
    });

    // Part B's back-left notch complements A's front-right notch.
    // A at x=0 occupies x=[-3,3]. B at x=4 occupies x=[1,7].
    // Shared zone x=[1,3]: A has material at z=[0,2], B at z=[-2,0].
    const b = createPart({
      id: 'b',
      length: 6,
      width: 4,
      thickness: 0.75,
      position: { x: 4, y: 0.375, z: 0 },
      features: cornerNotchFeature('back_left_corner')
    });

    expect(partsOverlap(a, b)).toBe(false);
  });

  it('still detects overlap when corner notch parts share solid material', () => {
    const cornerNotchFeature = (corner: string): Part['features'] => [
      {
        id: `notch-${corner}`,
        kind: 'rect_cut' as const,
        version: 1,
        enabled: true,
        cutType: 'corner_notch' as const,
        target: { type: 'corner' as const, corner: corner as 'front_left_corner' },
        reference: { primaryFrom: 'min' as const },
        placement: { x: 0, z: 0 },
        parameters: {
          size: { length: 2, width: 2 },
          depthMode: 'through' as const,
          depth: null
        }
      }
    ];

    const a = createPart({
      id: 'a',
      length: 6,
      width: 4,
      thickness: 0.75,
      position: { x: 0, y: 0.375, z: 0 },
      features: cornerNotchFeature('front_right_corner')
    });

    // Position B so its back portion overlaps A's back portion (solid area)
    const b = createPart({
      id: 'b',
      length: 6,
      width: 4,
      thickness: 0.75,
      position: { x: 3, y: 0.375, z: 0 },
      features: cornerNotchFeature('front_left_corner')
    });

    expect(partsOverlap(a, b)).toBe(true);
  });

  it('correctly rotates sub-OBBs for 180-degree Y-equivalent rotation', () => {
    // Rotation {x:-180, y:0, z:180} is equivalent to 180° around Y: X→-X, Z→-Z
    const cornerNotchFeature: Part['features'] = [
      {
        id: 'notch',
        kind: 'rect_cut' as const,
        version: 1,
        enabled: true,
        cutType: 'corner_notch' as const,
        target: { type: 'corner' as const, corner: 'front_left_corner' as const },
        reference: { primaryFrom: 'min' as const },
        placement: { x: 0, z: 0 },
        parameters: {
          size: { length: 2, width: 2 },
          depthMode: 'through' as const,
          depth: null
        }
      }
    ];

    const partB = createPart({
      id: 'b',
      length: 6,
      width: 4,
      thickness: 0.75,
      position: { x: 0, y: 0.375, z: 0 },
      rotation: { x: -180, y: 0, z: 180 },
      features: cornerNotchFeature
    });

    const obbsB = getPartSubOBBs(partB);

    // Should have 3 sub-OBBs (same as unrotated — the notch removes 1 of 4 grid cells)
    expect(obbsB).toHaveLength(3);

    // Axes should reflect 180° Y rotation: X→-X, Z→-Z
    expect(obbsB[0].axes[0].x).toBeCloseTo(-1, 5);
    expect(obbsB[0].axes[2].z).toBeCloseTo(-1, 5);

    // World centers should be negated from local centers (at position origin)
    // Local sub-boxes: (-2, 1), (1, -1), (1, 1)
    // With Z negation in getPartSubOBBs (to match rotateX(-π/2) rendering):
    // World: (2, 1), (-1, -1), (-1, 1)
    const worldCenters = obbsB.map((o) => ({ x: o.center.x, z: o.center.z }));
    expect(worldCenters).toContainEqual(expect.objectContaining({ x: expect.closeTo(2, 3), z: expect.closeTo(1, 3) }));
    expect(worldCenters).toContainEqual(
      expect.objectContaining({ x: expect.closeTo(-1, 3), z: expect.closeTo(-1, 3) })
    );
    expect(worldCenters).toContainEqual(expect.objectContaining({ x: expect.closeTo(-1, 3), z: expect.closeTo(1, 3) }));
  });

  it('allows interlocking rotated corner-notch parts', () => {
    // Two 6×4 parts with 2×2 front_left_corner notches.
    // Part A unrotated at origin, Part B rotated 180° and offset to interlock.
    const cornerNotchFeature: Part['features'] = [
      {
        id: 'notch',
        kind: 'rect_cut' as const,
        version: 1,
        enabled: true,
        cutType: 'corner_notch' as const,
        target: { type: 'corner' as const, corner: 'front_left_corner' as const },
        reference: { primaryFrom: 'min' as const },
        placement: { x: 0, z: 0 },
        parameters: {
          size: { length: 2, width: 2 },
          depthMode: 'through' as const,
          depth: null
        }
      }
    ];

    const partA = createPart({
      id: 'a',
      length: 6,
      width: 4,
      thickness: 0.75,
      position: { x: 0, y: 0.375, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      features: cornerNotchFeature
    });

    // Offset B by -4 in X so B's solid strip fills A's notch and vice versa
    const partB = createPart({
      id: 'b',
      length: 6,
      width: 4,
      thickness: 0.75,
      position: { x: -4, y: 0.375, z: 0 },
      rotation: { x: -180, y: 0, z: 180 },
      features: cornerNotchFeature
    });

    // Parts should interlock — notch areas complement each other
    expect(partsOverlap(partA, partB)).toBe(false);
  });

  it('detects overlap when rotated corner-notch parts collide in solid areas', () => {
    const cornerNotchFeature: Part['features'] = [
      {
        id: 'notch',
        kind: 'rect_cut' as const,
        version: 1,
        enabled: true,
        cutType: 'corner_notch' as const,
        target: { type: 'corner' as const, corner: 'front_left_corner' as const },
        reference: { primaryFrom: 'min' as const },
        placement: { x: 0, z: 0 },
        parameters: {
          size: { length: 2, width: 2 },
          depthMode: 'through' as const,
          depth: null
        }
      }
    ];

    const partA = createPart({
      id: 'a',
      length: 6,
      width: 4,
      thickness: 0.75,
      position: { x: 0, y: 0.375, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      features: cornerNotchFeature
    });

    // Offset B by only -2 — solid areas WILL collide
    const partB = createPart({
      id: 'b',
      length: 6,
      width: 4,
      thickness: 0.75,
      position: { x: -2, y: 0.375, z: 0 },
      rotation: { x: -180, y: 0, z: 180 },
      features: cornerNotchFeature
    });

    expect(partsOverlap(partA, partB)).toBe(true);
  });

  it('allows interlocking at exact project file positions and supports drag approach', () => {
    const cornerNotchFeature: Part['features'] = [
      {
        id: 'notch',
        kind: 'rect_cut' as const,
        version: 1,
        enabled: true,
        cutType: 'corner_notch' as const,
        target: { type: 'corner' as const, corner: 'front_left_corner' as const },
        reference: { primaryFrom: 'min' as const },
        placement: { x: 0, z: 0 },
        parameters: {
          size: { length: 2, width: 2 },
          depthMode: 'through' as const,
          depth: null
        }
      }
    ];

    // Exact positions from project file
    const partA = createPart({
      id: 'a',
      length: 6,
      width: 4,
      thickness: 0.75,
      position: { x: 3, y: 0.375, z: 30.125 },
      rotation: { x: 0, y: 0, z: 0 },
      features: cornerNotchFeature
    });

    const partB = createPart({
      id: 'b',
      length: 6,
      width: 4,
      thickness: 0.75,
      position: { x: 1, y: 0.375, z: 32.125 },
      rotation: { x: -180, y: 0, z: 180 },
      features: cornerNotchFeature
    });

    // Parts are interlocking at project file positions — no overlap
    expect(partsOverlap(partA, partB)).toBe(false);

    // Drag Part B from far away along Z — should reach interlocking position
    const farB = createPart({ ...partB, position: { x: 1, y: 0.375, z: 35.25 } });
    const safeZ = resolveSafeTranslationDelta([partA, farB], new Set([farB.id]), { x: 0, y: 0, z: -3.125 });
    expect(safeZ).toEqual({ x: 0, y: 0, z: -3.125 });

    // Drag Part B from far away along X — should reach interlocking position
    const farBx = createPart({ ...partB, position: { x: -3, y: 0.375, z: 32.125 } });
    const safeX = resolveSafeTranslationDelta([partA, farBx], new Set([farBx.id]), { x: 4, y: 0, z: 0 });
    expect(safeX).toEqual({ x: 4, y: 0, z: 0 });

    // Diagonal approach should also work
    const farBd = createPart({ ...partB, position: { x: -3, y: 0.375, z: 35.25 } });
    const safeDiag = resolveSafeTranslationDelta([partA, farBd], new Set([farBd.id]), { x: 4, y: 0, z: -3.125 });
    expect(safeDiag).toEqual({ x: 4, y: 0, z: -3.125 });
  });

  it('detects overlap correctly for parts with complementary corner notches', () => {
    // Part A: front_left_corner notch, Part B: back_right_corner notch
    // With Z negation (rotateX(-π/2)), A's notch opens toward +Z, B's toward -Z.
    // Interlocking requires A below B in Z: A at z=-2, B at z=0.
    const partA = createPart({
      id: 'a',
      length: 6,
      width: 4,
      thickness: 0.75,
      position: { x: 2, y: 0.375, z: -2 },
      features: [
        {
          id: 'notch-a',
          kind: 'rect_cut' as const,
          version: 1,
          enabled: true,
          cutType: 'corner_notch' as const,
          target: { type: 'corner' as const, corner: 'front_left_corner' as const },
          reference: { primaryFrom: 'min' as const },
          placement: { x: 0, z: 0 },
          parameters: { size: { length: 2, width: 2 }, depthMode: 'through' as const, depth: null }
        }
      ]
    });

    const partB = createPart({
      id: 'b',
      length: 6,
      width: 4,
      thickness: 0.75,
      position: { x: 0, y: 0.375, z: 0 },
      features: [
        {
          id: 'notch-b',
          kind: 'rect_cut' as const,
          version: 1,
          enabled: true,
          cutType: 'corner_notch' as const,
          target: { type: 'corner' as const, corner: 'back_right_corner' as const },
          reference: { primaryFrom: 'min' as const },
          placement: { x: 0, z: 0 },
          parameters: { size: { length: 2, width: 2 }, depthMode: 'through' as const, depth: null }
        }
      ]
    });

    // At interlocking position — notches complement, no solid overlap
    expect(partsOverlap(partA, partB)).toBe(false);

    // When A is directly on top of B, solid areas DO overlap
    const partAonB = createPart({ ...partA, position: { x: 0, y: 0.375, z: 0 } });
    expect(partsOverlap(partAonB, partB)).toBe(true);

    // When A moves slightly toward B, solid areas overlap immediately
    const partAslightX = createPart({ ...partA, position: { x: 1.75, y: 0.375, z: -2 } });
    expect(partsOverlap(partAslightX, partB)).toBe(true);

    const partAslightZ = createPart({ ...partA, position: { x: 2, y: 0.375, z: -1.75 } });
    expect(partsOverlap(partAslightZ, partB)).toBe(true);
  });

  it('prevents drag from interlocked position into solid corner overlap', () => {
    // Same complementary notch setup (Z negated: A at z=-2, B at z=0)
    const partA = createPart({
      id: 'a',
      length: 6,
      width: 4,
      thickness: 0.75,
      position: { x: 2, y: 0.375, z: -2 },
      features: [
        {
          id: 'notch-a',
          kind: 'rect_cut' as const,
          version: 1,
          enabled: true,
          cutType: 'corner_notch' as const,
          target: { type: 'corner' as const, corner: 'front_left_corner' as const },
          reference: { primaryFrom: 'min' as const },
          placement: { x: 0, z: 0 },
          parameters: { size: { length: 2, width: 2 }, depthMode: 'through' as const, depth: null }
        }
      ]
    });

    const partB = createPart({
      id: 'b',
      length: 6,
      width: 4,
      thickness: 0.75,
      position: { x: 0, y: 0.375, z: 0 },
      features: [
        {
          id: 'notch-b',
          kind: 'rect_cut' as const,
          version: 1,
          enabled: true,
          cutType: 'corner_notch' as const,
          target: { type: 'corner' as const, corner: 'back_right_corner' as const },
          reference: { primaryFrom: 'min' as const },
          placement: { x: 0, z: 0 },
          parameters: { size: { length: 2, width: 2 }, depthMode: 'through' as const, depth: null }
        }
      ]
    });

    // Drag A from interlocked position to push back-left corner into B's front-right corner
    // This delta would put A at (3, 0.375, 1) where solid corners overlap
    const safeDelta = resolveSafeTranslationDelta([partA, partB], new Set(['a']), { x: 1, y: 0, z: 3 });
    // Should be blocked or clamped — should NOT allow full delta
    if (safeDelta) {
      const finalX = 2 + safeDelta.x;
      const finalZ = -2 + safeDelta.z;
      const finalA = createPart({ ...partA, position: { x: finalX, y: 0.375, z: finalZ } });
      expect(partsOverlap(finalA, partB)).toBe(false);
    }

    // Drag A with large delta in +Z only (from interlocked to overlapping above)
    const safeDeltaZ = resolveSafeTranslationDelta([partA, partB], new Set(['a']), { x: 0, y: 0, z: 6 });
    if (safeDeltaZ) {
      const finalZonly = createPart({ ...partA, position: { x: 2, y: 0.375, z: -2 + safeDeltaZ.z } });
      expect(partsOverlap(finalZonly, partB)).toBe(false);
    }

    // Drag A with large delta in -X only (from interlocked toward B)
    const safeDeltaX = resolveSafeTranslationDelta([partA, partB], new Set(['a']), { x: -6, y: 0, z: 0 });
    if (safeDeltaX) {
      const finalXonly = createPart({ ...partA, position: { x: 2 + safeDeltaX.x, y: 0.375, z: -2 } });
      expect(partsOverlap(finalXonly, partB)).toBe(false);
    }

    // Diagonal drag that exploits non-convex collision boundary:
    // Moving A right (clear at z=-2) then up into B's solid area.
    // The per-axis search could allow X=+2 then Z=+4, but the combined
    // result would overlap. The final verification must catch this.
    const safeDiag = resolveSafeTranslationDelta([partA, partB], new Set(['a']), { x: 2, y: 0, z: 4 });
    if (safeDiag) {
      const diagFinal = createPart({ ...partA, position: { x: 2 + safeDiag.x, y: 0.375, z: -2 + safeDiag.z } });
      expect(partsOverlap(diagFinal, partB)).toBe(false);
    }

    // Reversed priority: large Z, moderate X — tests corridor from the other direction
    const safeDiag2 = resolveSafeTranslationDelta([partA, partB], new Set(['a']), { x: 3, y: 0, z: 3 });
    if (safeDiag2) {
      const diag2Final = createPart({
        ...partA,
        position: { x: 2 + safeDiag2.x, y: 0.375, z: -2 + safeDiag2.z }
      });
      expect(partsOverlap(diag2Final, partB)).toBe(false);
    }

    // Every delta from interlocked position should produce a safe result
    for (let dx = -4; dx <= 4; dx += 1) {
      for (let dz = -4; dz <= 4; dz += 1) {
        if (dx === 0 && dz === 0) continue;
        const delta = { x: dx, y: 0, z: dz };
        const sd = resolveSafeTranslationDelta([partA, partB], new Set(['a']), delta);
        if (sd) {
          const testPart = createPart({ ...partA, position: { x: 2 + sd.x, y: 0.375, z: -2 + sd.z } });
          expect(partsOverlap(testPart, partB)).toBe(false);
        }
      }
    }
  });

  it('detects solid arm overlap when face-touching parts have corner notches', () => {
    // Regression: mate snap exemption previously bypassed overlap checking entirely,
    // allowing the solid arms of L-shaped (corner notch) parts to overlap.
    // With Z negation: A at z=-2, B at z=0 for interlocking.
    const partA = createPart({
      id: 'a',
      length: 6,
      width: 4,
      thickness: 0.75,
      position: { x: 2, y: 0.375, z: -2 },
      features: [
        {
          id: 'notch-a',
          kind: 'rect_cut' as const,
          version: 1,
          enabled: true,
          cutType: 'corner_notch' as const,
          target: { type: 'corner' as const, corner: 'front_left_corner' as const },
          reference: { primaryFrom: 'min' as const },
          placement: { x: 0, z: 0 },
          parameters: { size: { length: 2, width: 2 }, depthMode: 'through' as const, depth: null }
        }
      ]
    });

    const partB = createPart({
      id: 'b',
      length: 6,
      width: 4,
      thickness: 0.75,
      position: { x: 0, y: 0.375, z: 0 },
      features: [
        {
          id: 'notch-b',
          kind: 'rect_cut' as const,
          version: 1,
          enabled: true,
          cutType: 'corner_notch' as const,
          target: { type: 'corner' as const, corner: 'back_right_corner' as const },
          reference: { primaryFrom: 'min' as const },
          placement: { x: 0, z: 0 },
          parameters: { size: { length: 2, width: 2 }, depthMode: 'through' as const, depth: null }
        }
      ]
    });

    // At interlocked position, no overlap
    expect(partsOverlap(partA, partB)).toBe(false);

    // Move B slightly toward A in -Z — solid arms collide (the "skinny long" arm overlap)
    const partBpushed = createPart({ ...partB, position: { x: 0, y: 0.375, z: -0.5 } });
    expect(partsOverlap(partA, partBpushed)).toBe(true);

    // Even a tiny movement past interlocking should be detected
    const partBtiny = createPart({ ...partB, position: { x: 0, y: 0.375, z: -0.01 } });
    expect(partsOverlap(partA, partBtiny)).toBe(true);

    // Face-touching rectangular parts must still be non-overlapping
    const plainA = createPart({ id: 'a', length: 6, width: 4, thickness: 0.75, position: { x: 0, y: 0.375, z: 0 } });
    const plainB = createPart({ id: 'b', length: 6, width: 4, thickness: 0.75, position: { x: 6, y: 0.375, z: 0 } });
    expect(partsOverlap(plainA, plainB)).toBe(false);
  });

  it('exact project file: drag from interlocked position blocks arm overlap in all directions', () => {
    // Exact project file data: Part A front_left_corner, Part B back_right_corner
    // With Z negation: A at z=-2, B at z=0 for interlocking.
    const partA = createPart({
      id: 'a',
      length: 6,
      width: 4,
      thickness: 0.75,
      position: { x: 2.00006103515625, y: 0.375, z: -2 },
      features: [
        {
          id: 'notch-a',
          kind: 'rect_cut' as const,
          version: 1,
          enabled: true,
          cutType: 'corner_notch' as const,
          target: { type: 'corner' as const, corner: 'front_left_corner' as const },
          reference: { primaryFrom: 'min' as const, secondaryFrom: 'min' as const },
          placement: { x: 0, z: 0 },
          parameters: { size: { length: 2, width: 2 }, depthMode: 'through' as const, depth: null }
        }
      ]
    });

    const partB = createPart({
      id: 'b',
      length: 6,
      width: 4,
      thickness: 0.75,
      position: { x: 0, y: 0.375, z: 0 },
      features: [
        {
          id: 'notch-b',
          kind: 'rect_cut' as const,
          version: 1,
          enabled: true,
          cutType: 'corner_notch' as const,
          target: { type: 'corner' as const, corner: 'back_right_corner' as const },
          reference: { primaryFrom: 'min' as const, secondaryFrom: 'min' as const },
          placement: { x: 0, z: 0 },
          parameters: { size: { length: 2, width: 2 }, depthMode: 'through' as const, depth: null }
        }
      ]
    });

    // 1. At project file positions (interlocked): no overlap
    expect(partsOverlap(partA, partB)).toBe(false);

    // 2. Any movement of B toward A in -Z causes arm overlap
    expect(partsOverlap(partA, createPart({ ...partB, position: { x: 0, y: 0.375, z: -0.001 } }))).toBe(true);
    expect(partsOverlap(partA, createPart({ ...partB, position: { x: 0, y: 0.375, z: -0.5 } }))).toBe(true);
    expect(partsOverlap(partA, createPart({ ...partB, position: { x: 0, y: 0.375, z: -1 } }))).toBe(true);

    // 3. Any movement of B toward A in +X causes arm overlap
    expect(partsOverlap(partA, createPart({ ...partB, position: { x: 0.001, y: 0.375, z: 0 } }))).toBe(true);
    expect(partsOverlap(partA, createPart({ ...partB, position: { x: 0.5, y: 0.375, z: 0 } }))).toBe(true);

    // 4. Movement AWAY from A is allowed
    expect(partsOverlap(partA, createPart({ ...partB, position: { x: -1, y: 0.375, z: 0 } }))).toBe(false);
    expect(partsOverlap(partA, createPart({ ...partB, position: { x: 0, y: 0.375, z: 1 } }))).toBe(false);

    // 5. resolveSafeTranslationDelta blocks B from moving into A
    const parts = [partA, partB];

    // Drag B in -Z from interlocked: must be blocked
    const safeZ = resolveSafeTranslationDelta(parts, new Set(['b']), { x: 0, y: 0, z: -2 });
    expect(safeZ).toBeNull();

    // Drag B in +X from interlocked: must be blocked
    const safeX = resolveSafeTranslationDelta(parts, new Set(['b']), { x: 2, y: 0, z: 0 });
    expect(safeX).toBeNull();

    // Drag B diagonally toward A: must be blocked
    const safeDiag = resolveSafeTranslationDelta(parts, new Set(['b']), { x: 1, y: 0, z: -1 });
    expect(safeDiag).toBeNull();

    // Drag B AWAY from A: allowed
    const safeAway = resolveSafeTranslationDelta(parts, new Set(['b']), { x: -2, y: 0, z: 2 });
    expect(safeAway).toEqual({ x: -2, y: 0, z: 2 });

    // 6. Drag B from far away toward A — must stop at interlocking position
    const farB = createPart({ ...partB, position: { x: 0, y: 0.375, z: 5 } });
    const safeFar = resolveSafeTranslationDelta([partA, farB], new Set(['b']), { x: 0, y: 0, z: -10 });
    expect(safeFar).not.toBeNull();
    if (safeFar) {
      const finalZ = 5 + safeFar.z;
      // Should stop at or before interlocking position (z=0)
      expect(finalZ).toBeGreaterThanOrEqual(-0.001);
      const finalB = createPart({ ...partB, position: { x: 0, y: 0.375, z: finalZ } });
      expect(partsOverlap(partA, finalB)).toBe(false);
    }
  });
  it('does not report overlap in the wedge removed by a long-edge bevel', () => {
    const beveled = createPart({
      id: 'beveled',
      length: 10,
      width: 4,
      thickness: 1,
      position: { x: 0, y: 0.5, z: 0 },
      features: [
        {
          id: 'eb-1',
          kind: 'end_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'front_face' },
          reference: { primaryFrom: 'min' },
          cutType: 'bevel',
          lengthMode: 'long_point',
          parameters: { horizontalAngle: 0, verticalAngle: 45 }
        }
      ]
    });
    // A slat sitting inside the removed top-front wedge: y 0.7..1.0 (upper
    // third of the beveled part), z -1.9..-1.4 (inside the wedge at that height)
    const slat = createPart({
      id: 'slat',
      length: 10,
      width: 0.5,
      thickness: 0.3,
      position: { x: 0, y: 0.85, z: -1.65 }
    });

    expect(partsOverlap(beveled, slat)).toBe(false);

    // Same slat against the unbeveled version of the part must overlap.
    const plain = { ...beveled, features: [] };
    expect(partsOverlap(plain, slat)).toBe(true);
  });
});
