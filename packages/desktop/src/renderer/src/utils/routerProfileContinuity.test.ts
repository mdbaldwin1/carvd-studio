import { describe, expect, it } from 'vitest';
import type { RouterProfileDefinition, RouterProfileSegment } from '../types';
import {
  reverseRouterProfileContour,
  rotateRouterProfileContour,
  scaleRouterProfileContour,
  type RouterProfileContour
} from './routerProfileDxf';
import {
  analyzeRouterProfileContinuity,
  analyzeRouterProfileJoin,
  enforceRouterProfileJoinTangent,
  getRouterProfileContinuityQualityInfo,
  type RouterProfileSegmentSpan
} from './routerProfileContinuity';

const span = (from: [number, number], segment: RouterProfileSegment): RouterProfileSegmentSpan => ({
  from: { u: from[0], v: from[1] },
  segment
});
const line = (u: number, v: number): RouterProfileSegment => ({ kind: 'line', to: { u, v } });
const cubic = (c1: [number, number], c2: [number, number], to: [number, number]): RouterProfileSegment => ({
  kind: 'cubicBezier',
  control1: { u: c1[0], v: c1[1] },
  control2: { u: c2[0], v: c2[1] },
  to: { u: to[0], v: to[1] }
});
const profile = (segments: RouterProfileSegment[], start = { u: 0, v: 0 }): RouterProfileDefinition => ({
  version: 1,
  id: 'continuity',
  name: 'Continuity',
  family: 'test',
  source: 'generic',
  parameters: {},
  boundary: { start, segments }
});

describe('canonical router-profile join continuity', () => {
  const families = ['line', 'arc', 'ellipseArc', 'cubicBezier'] as const;
  const ending = (kind: (typeof families)[number]): RouterProfileSegmentSpan =>
    span(
      [0, 0],
      kind === 'line'
        ? line(1, 0)
        : kind === 'arc'
          ? { kind, to: { u: 1, v: 0 }, radius: 1, clockwise: false }
          : kind === 'ellipseArc'
            ? { kind, to: { u: 1, v: 0 }, radiusU: 1, radiusV: 0.75, clockwise: false }
            : cubic([0.3, 0], [0.7, 0], [1, 0])
    );
  const starting = (kind: (typeof families)[number]): RouterProfileSegmentSpan =>
    span(
      [1, 0],
      kind === 'line'
        ? line(2, 0)
        : kind === 'arc'
          ? { kind, to: { u: 2, v: 0 }, radius: 1, clockwise: false }
          : kind === 'ellipseArc'
            ? { kind, to: { u: 2, v: 0 }, radiusU: 1, radiusV: 0.75, clockwise: false }
            : cubic([1.3, 0], [1.7, 0], [2, 0])
    );

  it('classifies disconnected, G0, G1, and G2 joins with structured diagnostics', () => {
    expect(analyzeRouterProfileJoin(span([0, 0], line(1, 0)), span([1.1, 0], line(2, 0))).continuity).toBe(
      'disconnected'
    );
    const corner = analyzeRouterProfileJoin(span([0, 0], line(1, 0)), span([1, 0], line(1, 1)), 4);
    expect(corner).toMatchObject({ joinIndex: 4, point: { u: 1, v: 0 }, continuity: 'g0_corner' });
    expect(corner.angleDiscontinuity).toBeCloseTo(Math.PI / 2);
    const tangent = analyzeRouterProfileJoin(span([0, 0], line(1, 0)), span([1, 0], cubic([2, 0], [2, 1], [3, 1])));
    expect(tangent.continuity).toBe('g1_tangent');
    expect(analyzeRouterProfileJoin(span([0, 0], line(1, 0)), span([1, 0], line(2, 0))).continuity).toBe(
      'g2_curvature'
    );
  });

  it.each([
    [span([0, 0], line(1, 0)), span([1, 0], cubic([2, 0], [2, 1], [3, 1]))],
    [span([0, 0], cubic([0, 1], [1, 1], [1, 0])), span([1, 0], line(2, 0))],
    [
      span([1, 0], { kind: 'arc', to: { u: Math.SQRT1_2, v: Math.SQRT1_2 }, radius: 1, clockwise: false }),
      span([Math.SQRT1_2, Math.SQRT1_2], { kind: 'arc', to: { u: 0, v: 1 }, radius: 1, clockwise: false })
    ],
    [
      span([2, 0], {
        kind: 'ellipseArc',
        to: { u: Math.SQRT2, v: Math.SQRT1_2 },
        radiusU: 2,
        radiusV: 1,
        clockwise: false
      }),
      span([Math.SQRT2, Math.SQRT1_2], {
        kind: 'ellipseArc',
        to: { u: 0, v: 1 },
        radiusU: 2,
        radiusV: 1,
        clockwise: false
      })
    ],
    [span([0, 0], cubic([0.3, 0], [0.7, 0], [1, 0])), span([1, 0], cubic([1.3, 0], [1.7, 0], [2, 0]))]
  ] as const)('handles every adjacent segment family pair without NaN', (left, right) => {
    const result = analyzeRouterProfileJoin(left, right);
    expect(result.continuity).not.toBe('disconnected');
    expect(result.angleDiscontinuity === null || Number.isFinite(result.angleDiscontinuity)).toBe(true);
    expect(result.signedCurvatureBefore === null || Number.isFinite(result.signedCurvatureBefore)).toBe(true);
    expect(result.signedCurvatureAfter === null || Number.isFinite(result.signedCurvatureAfter)).toBe(true);
  });

  it.each(families.flatMap((left) => families.map((right) => [left, right] as const)))(
    'analyzes %s-to-%s joins deterministically',
    (leftKind, rightKind) => {
      const result = analyzeRouterProfileJoin(ending(leftKind), starting(rightKind));
      expect(result.continuity).not.toBe('disconnected');
      expect(result.point).toEqual({ u: 1, v: 0 });
      expect(result.message.length).toBeGreaterThan(0);
    }
  );

  it('recognizes an exact curved cubic G2 construction and signed-curvature inflection', () => {
    const left = span([-1, 1], cubic([-2 / 3, 1 / 3], [-1 / 3, 0], [0, 0]));
    const right = span([0, 0], cubic([1 / 3, 0], [2 / 3, 1 / 3], [1, 1]));
    expect(analyzeRouterProfileJoin(left, right).continuity).toBe('g2_curvature');
    const inflected = span([0, 0], cubic([1 / 3, 0], [2 / 3, -1 / 3], [1, -1]));
    const diagnostic = analyzeRouterProfileJoin(left, inflected);
    expect(diagnostic.continuity).toBe('g1_tangent');
    expect((diagnostic.signedCurvatureBefore ?? 0) * (diagnostic.signedCurvatureAfter ?? 0)).toBeLessThan(0);
  });

  it('uses scale-aware tolerances and is invariant under uniform scale, rotation, and reversal', () => {
    const original: RouterProfileContour = {
      start: { u: 1, v: 0 },
      segments: [
        { kind: 'arc' as const, to: { u: Math.SQRT1_2, v: Math.SQRT1_2 }, radius: 1, clockwise: false },
        { kind: 'arc' as const, to: { u: 0, v: 1 }, radius: 1, clockwise: false }
      ],
      closed: false
    };
    const classify = (contour: RouterProfileContour) =>
      analyzeRouterProfileContinuity(profile(contour.segments, contour.start))[0].continuity;
    expect(classify(original)).toBe('g2_curvature');
    expect(classify(scaleRouterProfileContour(original, 100))).toBe('g2_curvature');
    expect(classify(rotateRouterProfileContour(original, 0.73))).toBe('g2_curvature');
    expect(classify(reverseRouterProfileContour(original))).toBe('g2_curvature');
    const near = analyzeRouterProfileJoin(span([0, 0], line(1, 0)), span([1 + 5e-9, 0], line(2, 0)));
    expect(near.continuity).toBe('g2_curvature');
  });

  it('handles zero cubic handles without NaN and reports limited continuity', () => {
    const result = analyzeRouterProfileJoin(
      span([0, 0], cubic([0, 0], [1, 0], [1, 0])),
      span([1, 0], cubic([1, 0], [2, 0], [2, 0]))
    );
    expect(result.continuity).toBe('g1_tangent');
    expect(result.normalizedCurvatureDiscontinuity).toBeNull();
  });

  it('immutably enforces cubic-cubic aligned and mirrored handles', () => {
    const left = span([0, 0], cubic([0.2, 0], [0.8, 0], [1, 0]));
    const right = span([1, 0], cubic([1, 0.4], [2, 0.5], [2, 1]));
    const aligned = enforceRouterProfileJoinTangent(left, right);
    expect(aligned.changed).toBe(true);
    expect(aligned.right.segment).toMatchObject({ control1: { u: 1.4, v: 0 } });
    expect(right.segment).toMatchObject({ control1: { u: 1, v: 0.4 } });
    const mirrored = enforceRouterProfileJoinTangent(left, right, { mode: 'mirrored' });
    expect(mirrored.right.segment).toMatchObject({ control1: { u: 1.2, v: 0 } });
  });

  it('enforces line-cubic and cubic-line tangency while preserving handle length', () => {
    const lineCubic = enforceRouterProfileJoinTangent(
      span([0, 0], line(1, 0)),
      span([1, 0], cubic([1, 0.5], [2, 1], [3, 1]))
    );
    expect(lineCubic.right.segment).toMatchObject({ control1: { u: 1.5, v: 0 } });
    const cubicLine = enforceRouterProfileJoinTangent(
      span([0, 0], cubic([0, 1], [0.5, 1], [1, 1])),
      span([1, 1], line(2, 1)),
      { anchor: 'right' }
    );
    expect(cubicLine.left.segment).toMatchObject({ control2: { u: 0.5, v: 1 } });
  });

  it('recommends cubic conversion instead of silently editing arc radii', () => {
    const result = enforceRouterProfileJoinTangent(
      span([1, 0], { kind: 'arc', to: { u: 0, v: 1 }, radius: 1, clockwise: false }),
      span([0, 1], cubic([0, 2], [1, 2], [1, 3]))
    );
    expect(result.changed).toBe(false);
    expect(result.recommendation).toContain('Convert');
  });

  it('returns optional authoring-quality information without changing validity', () => {
    const definition = profile([line(1, 0), line(1, 1)]);
    expect(getRouterProfileContinuityQualityInfo(definition)).toEqual([expect.stringContaining('g0_corner')]);
    expect(definition.boundary.segments).toHaveLength(2);
  });
});
