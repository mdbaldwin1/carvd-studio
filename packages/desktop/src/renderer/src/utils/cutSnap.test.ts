import { describe, expect, it } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { AppSettings, CircularCutFeature, Part, RectCutFeature, RoundedCutFeature } from '../types';
import {
  faceCoordinateToReference,
  getCutFaceBox,
  getCutSnapThreshold,
  referenceToFaceCoordinate,
  resolveCutSnap
} from './cutSnap';

const part: Part = createTestPart({ length: 24, width: 12, thickness: 0.75 });

const anchors: Pick<AppSettings, 'enableFractionalAnchors' | 'enableSurfaceAnchors' | 'enableGoldenRatioAnchors'> = {
  enableFractionalAnchors: true,
  enableSurfaceAnchors: true,
  enableGoldenRatioAnchors: false
};

function pocket(x: number, z: number, length = 4, width = 2): RectCutFeature {
  return {
    id: `pocket-${x}-${z}`,
    kind: 'rect_cut',
    version: 1,
    enabled: true,
    cutType: 'mortise',
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'min', secondaryFrom: 'min' },
    parameters: { size: { length, width }, depthMode: 'blind', depth: 0.25 },
    placement: { x, z }
  };
}

function hole(primary: number, secondary: number, diameter = 1): CircularCutFeature {
  return {
    id: 'hole',
    kind: 'circular_cut',
    version: 1,
    enabled: true,
    cutType: 'round_hole',
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'center', secondaryFrom: 'center' },
    placement: { primary, secondary, rotation: 0 },
    parameters: { diameter, depthMode: 'through', tilt: 0, direction: 0 }
  };
}

describe('face coordinates', () => {
  it.each([
    ['min' as const, 3, 3],
    ['center' as const, 0, 12],
    ['center' as const, 3, 15],
    ['max' as const, 3, 21]
  ])('converts a %s-referenced offset of %p', (from, value, expected) => {
    expect(referenceToFaceCoordinate(value, 24, from)).toBeCloseTo(expected);
    expect(faceCoordinateToReference(expected, 24, from)).toBeCloseTo(value);
  });
});

describe('getCutFaceBox', () => {
  it('measures a pocket from the face minimum', () => {
    const box = getCutFaceBox(part, pocket(5, 2))!;
    expect(box.primary).toMatchObject({ min: 5, center: 7, max: 9 });
    expect(box.secondary).toMatchObject({ min: 2, center: 3, max: 4 });
  });

  it('measures a centre-referenced hole around its centre', () => {
    const box = getCutFaceBox(part, hole(0, 0, 2))!;
    expect(box.primary).toMatchObject({ min: 11, center: 12, max: 13 });
    expect(box.secondary).toMatchObject({ min: 5, center: 6, max: 7 });
  });

  it('reports the footprint of a rotated opening', () => {
    const rotated: RoundedCutFeature = {
      id: 'slot',
      kind: 'rounded_cut',
      version: 1,
      enabled: true,
      cutType: 'rounded_rectangle',
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'center', secondaryFrom: 'center' },
      placement: { primary: 0, secondary: 0, rotation: 90 },
      parameters: { length: 6, width: 2, cornerRadius: 0.25, depthMode: 'through' }
    };
    const box = getCutFaceBox(part, rotated)!;
    // Turned on its side, the long axis now runs across the board.
    expect(box.primary.max - box.primary.min).toBeCloseTo(2);
    expect(box.secondary.max - box.secondary.min).toBeCloseTo(6);
  });

  it('ignores cuts that cannot be dragged on a face', () => {
    const edgeNotch = {
      ...pocket(0, 0),
      cutType: 'edge_notch' as const,
      target: { type: 'edge' as const, edge: 'top_front_edge' as const }
    };
    expect(getCutFaceBox(part, edgeNotch)).toBeNull();
  });
});

describe('resolveCutSnap', () => {
  const snap = (moving: RectCutFeature, others: RectCutFeature[] = [], threshold = 0.5) =>
    resolveCutSnap({
      part,
      moving: getCutFaceBox(part, moving)!,
      others: others.map((feature) => getCutFaceBox(part, feature)!),
      settings: anchors,
      threshold
    });

  it('pulls a pocket onto the centre of the face', () => {
    // 4 long on a 24 board centres at x = 10; drop it just short of that.
    const result = snap(pocket(9.8, 4.9));
    expect(result.primaryDelta).toBeCloseTo(0.2);
    expect(result.secondaryDelta).toBeCloseTo(0.1);
    expect(result.guides.map((guide) => guide.label)).toEqual(['Centre', 'Centre']);
  });

  it('pulls onto the quarter line', () => {
    const result = snap(pocket(3.9, 0));
    expect(result.primaryDelta).toBeCloseTo(0.1);
    expect(result.guides[0]).toMatchObject({ label: '1/4', position: 6, axis: 'primary' });
  });

  it('lines two cuts up centre to centre', () => {
    // Chosen so the other cut's centre is the only thing in reach: the face
    // quarter lines on a 12" width sit at 3, 6 and 9, all far outside.
    const anchor = pocket(2, 5.5, 4, 3);
    const result = snap(pocket(16, 5.45, 4, 3), [anchor], 0.1);
    expect(result.secondaryDelta).toBeCloseTo(0.05);
    expect(result.guides.some((guide) => guide.axis === 'secondary' && guide.source === 'cut')).toBe(true);
  });

  it('lines a cut up with another cut', () => {
    // The face anchors along a 24" board sit at 0, 6, 12, 18 and 24, none of
    // them within reach here, so only the other cut can pull this one.
    const anchor = pocket(7, 0);
    const result = snap(pocket(7.1, 8), [anchor], 0.15);
    expect(result.primaryDelta).toBeCloseTo(-0.1);
    expect(result.guides.some((guide) => guide.axis === 'primary' && guide.source === 'cut')).toBe(true);
  });

  it('leaves a cut alone when nothing is within reach', () => {
    const result = snap(pocket(3.3, 3.3), [], 0.05);
    expect(result).toEqual({ primaryDelta: 0, secondaryDelta: 0, guides: [] });
  });

  it('resolves each axis on its own', () => {
    // Centred across the board, nowhere near an anchor along it.
    const result = snap(pocket(3.1, 4.95));
    expect(result.secondaryDelta).toBeCloseTo(0.05);
    expect(result.guides.filter((guide) => guide.axis === 'secondary')).toHaveLength(1);
  });

  it('honours the anchor toggles', () => {
    const off = resolveCutSnap({
      part,
      moving: getCutFaceBox(part, pocket(9.8, 4.9))!,
      others: [],
      settings: { enableFractionalAnchors: false, enableSurfaceAnchors: false, enableGoldenRatioAnchors: false },
      threshold: 0.5
    });
    expect(off.guides).toEqual([]);
    expect(off.primaryDelta).toBe(0);
  });

  it('offers the golden ratio only when asked', () => {
    // Centre 9.05 along the board; 38.2% of 24 is 9.168, and nothing else is
    // within the tenth of an inch this asks for.
    const near = getCutFaceBox(part, pocket(7.05, 4.4))!;
    const without = resolveCutSnap({ part, moving: near, others: [], settings: anchors, threshold: 0.2 });
    const withGolden = resolveCutSnap({
      part,
      moving: near,
      others: [],
      settings: { ...anchors, enableGoldenRatioAnchors: true },
      threshold: 0.2
    });
    expect(without.guides).toEqual([]);
    expect(withGolden.guides[0]).toMatchObject({ label: '38.2%' });
  });
});

describe('what a cut aligns by', () => {
  it('lets a pocket catch an anchor with either edge', () => {
    const moving = getCutFaceBox(part, pocket(5.9, 0, 4, 2))!; // min 5.9, centre 7.9
    const result = resolveCutSnap({ part, moving, others: [], settings: anchors, threshold: 0.2 });
    // The face's quarter line is at 6, and the pocket's leading edge catches it.
    expect(result.primaryDelta).toBeCloseTo(0.1);
  });

  it('aligns a hole by its centre, never its rim', () => {
    // Rim 0.125 from the centreline, centre 0.125 the other side of it. Left
    // to its own devices the rim is just as close, and a hole snapping by its
    // edge to a board's middle is not what anyone means.
    const moving = getCutFaceBox(part, hole(0.125, 0, 0.25))!;
    const byCentre = resolveCutSnap({
      part,
      moving,
      others: [],
      settings: anchors,
      threshold: 0.3,
      movingEdges: ['center']
    });
    expect(byCentre.primaryDelta).toBeCloseTo(-0.125);
    expect(byCentre.guides[0]).toMatchObject({ label: 'Centre' });
  });
});

describe('getCutSnapThreshold', () => {
  it('scales with the board and the sensitivity setting', () => {
    expect(getCutSnapThreshold(part, 'tight')).toBeCloseTo(0.12);
    expect(getCutSnapThreshold(part, 'normal')).toBeCloseTo(0.24);
    expect(getCutSnapThreshold(part, 'loose')).toBeCloseTo(0.48);
  });
});
