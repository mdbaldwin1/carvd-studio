import { describe, expect, it } from 'vitest';
import type { EdgeProfile, EdgeProfileFeature, RouterProfileDefinition } from '../types';
import {
  evaluateRouterProfileBoundary,
  getEdgeProfileBoundary,
  getEdgeProfileFeatureBoundary,
  getNormalizedEdgeProfileBoundary
} from './edgeProfileShape';

const profiles: EdgeProfile[] = ['roundover', 'cove', 'chamfer', 'rabbet', 'bead', 'ogee', 'thumbnail'];

describe('edgeProfileShape', () => {
  it.each(profiles)('%s spans the full advertised size and depth', (profile) => {
    const boundary = getEdgeProfileBoundary(profile, 0.5, 0.25);
    expect(boundary[0]).toEqual({ x: 0.5, y: 0 });
    expect(boundary.at(-1)?.x).toBeCloseTo(0, 12);
    expect(boundary.at(-1)?.y).toBeCloseTo(0.25, 12);
    expect(boundary.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
  });

  it('keeps every selector profile geometrically distinct', () => {
    const signatures = profiles.map((profile) =>
      JSON.stringify(getNormalizedEdgeProfileBoundary(profile, 20).map(({ x, y }) => [x.toFixed(4), y.toFixed(4)]))
    );
    expect(new Set(signatures).size).toBe(profiles.length);
  });
});

describe('canonical router profile evaluation', () => {
  const definition = (segments: RouterProfileDefinition['boundary']['segments']): RouterProfileDefinition => ({
    version: 1,
    id: 'profile',
    name: 'Profile',
    family: 'custom',
    source: 'generic',
    parameters: {},
    boundary: { start: { u: 1, v: 0 }, segments }
  });

  it('preserves exact endpoints and circular radius within chord-error tolerance', () => {
    const points = evaluateRouterProfileBoundary(
      definition([{ kind: 'arc', to: { u: 0, v: 1 }, radius: 1, clockwise: false }]),
      { chordError: 0.005 }
    );
    expect(points[0]).toEqual({ x: 1, y: 0 });
    expect(points.at(-1)).toEqual({ x: 0, y: 1 });
    expect(points.every(({ x, y }) => Math.abs(Math.hypot(x, y) - 1) < 1e-10)).toBe(true);
    expect(Math.max(...points.map(({ x }) => x))).toBeCloseTo(1);
    expect(Math.max(...points.map(({ y }) => y))).toBeCloseTo(1);
  });

  it('evaluates axis-aligned ellipse arcs from the same semantic segments', () => {
    const profile = definition([{ kind: 'ellipseArc', to: { u: 0, v: 1 }, radiusU: 2, radiusV: 1, clockwise: false }]);
    profile.boundary.start = { u: 2, v: 0 };
    const points = evaluateRouterProfileBoundary(profile, { chordError: 0.005 });
    expect(points.at(-1)).toEqual({ x: 0, y: 1 });
    expect(points.every(({ x, y }) => Math.abs((x / 2) ** 2 + y ** 2 - 1) < 1e-10)).toBe(true);
  });

  it('approximates a quarter-circle removal area within its chord-error bound', () => {
    const points = [
      { x: 0, y: 0 },
      ...evaluateRouterProfileBoundary(definition([{ kind: 'arc', to: { u: 0, v: 1 }, radius: 1, clockwise: false }]), {
        chordError: 0.001
      })
    ];
    const area = Math.abs(
      points.reduce((sum, point, index) => {
        const next = points[(index + 1) % points.length];
        return sum + point.x * next.y - next.x * point.y;
      }, 0) / 2
    );
    expect(area).toBeCloseTo(Math.PI / 4, 2);
  });

  it('caps hostile tolerances and segment counts safely', () => {
    const profile = definition([{ kind: 'arc', to: { u: 0, v: 1 }, radius: 1, clockwise: false }]);
    expect(evaluateRouterProfileBoundary(profile, { chordError: 0 })).toEqual([]);
    expect(evaluateRouterProfileBoundary(profile, { chordError: 1e-30, maxSegments: 3 })).toEqual([]);
  });

  it('adaptively evaluates cubic Beziers with exact endpoints and bounded output', () => {
    const profile = definition([
      {
        kind: 'cubicBezier',
        control1: { u: 1, v: 1 },
        control2: { u: 0, v: 1 },
        to: { u: 0, v: 0 }
      }
    ]);
    profile.boundary.start = { u: 1, v: 0 };
    const points = evaluateRouterProfileBoundary(profile, { chordError: 0.001, maxSegments: 128 });
    expect(points[0]).toEqual({ x: 1, y: 0 });
    expect(points.at(-1)).toEqual({ x: 0, y: 0 });
    expect(Math.max(...points.map(({ y }) => y))).toBeCloseTo(0.75, 2);
    expect(points.length).toBeLessThanOrEqual(129);
    expect(points.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
    expect(evaluateRouterProfileBoundary(profile, { chordError: 1e-20, maxSegments: 4 })).toEqual([]);
    const feature = {
      id: 'cubic',
      kind: 'edge_profile',
      version: 1,
      enabled: true,
      target: { type: 'edge', edge: 'top_front_edge' },
      reference: { primaryFrom: 'min' },
      profile: 'custom',
      routerProfileId: profile.id,
      routerProfileSnapshot: profile,
      parameters: { size: 9, depth: 9 }
    } satisfies EdgeProfileFeature;
    expect(getEdgeProfileFeatureBoundary(feature, { chordError: 0.001, maxSegments: 128 })).toEqual(points);
  });

  it('feeds custom preview consumers and CSG consumers the identical evaluated boundary', () => {
    const profile = definition([
      { kind: 'arc', to: { u: 0.5, v: 0.5 }, radius: 0.5, clockwise: false },
      { kind: 'line', to: { u: 0, v: 0.5 } }
    ]);
    const feature = {
      id: 'custom',
      kind: 'edge_profile',
      version: 1,
      enabled: true,
      target: { type: 'edge', edge: 'top_front_edge' },
      reference: { primaryFrom: 'min' },
      profile: 'custom',
      routerProfileId: profile.id,
      routerProfileSnapshot: profile,
      parameters: { size: 99, depth: 99 }
    } satisfies EdgeProfileFeature;
    expect(getEdgeProfileFeatureBoundary(feature)).toEqual(evaluateRouterProfileBoundary(profile));
  });
});
