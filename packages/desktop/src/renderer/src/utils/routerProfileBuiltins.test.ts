import { describe, expect, it } from 'vitest';
import type { EdgeProfileFeature, RouterProfileDefinition } from '../types';
import {
  adaptBuiltInRouterProfile,
  evaluateRouterProfileBoundary,
  getEdgeProfileFeatureBoundary
} from './edgeProfileShape';
import { BUILT_IN_ROUTER_PROFILE_REGISTRY, BUILT_IN_ROUTER_PROFILES } from './routerProfileBuiltins';
import { validateRouterProfileContour } from './routerProfileDxf';
import { validateRouterProfileDefinition } from './routerProfiles';

describe('built-in router profile registry', () => {
  it('contains one valid, labeled canonical definition for every built-in profile', () => {
    expect(Object.keys(BUILT_IN_ROUTER_PROFILE_REGISTRY).sort()).toEqual([
      'bead',
      'chamfer',
      'cove',
      'ogee',
      'rabbet',
      'roundover',
      'thumbnail'
    ]);
    for (const registration of BUILT_IN_ROUTER_PROFILES) {
      expect(registration.label.length).toBeGreaterThan(0);
      expect(registration.description.length).toBeGreaterThan(0);
      expect(validateRouterProfileDefinition(registration.definition)).toEqual([]);
      expect(
        registration.definition.boundary.segments.every(
          (segment) => segment.kind === 'line' || segment.kind === 'arc' || segment.kind === 'ellipseArc'
        )
      ).toBe(true);
    }
  });

  it('evaluates valid profile data independently of its id, name, and family', () => {
    const original = BUILT_IN_ROUTER_PROFILE_REGISTRY.ogee.definition;
    const renamed: RouterProfileDefinition = { ...original, id: 'anything', name: 'Anything', family: 'anything' };
    expect(evaluateRouterProfileBoundary(renamed)).toEqual(evaluateRouterProfileBoundary(original));
  });

  it.each(BUILT_IN_ROUTER_PROFILES.map(({ profile }) => profile))(
    '%s adapts to exact endpoints, finite bounds, and a non-self-crossing boundary',
    (profile) => {
      const definition = adaptBuiltInRouterProfile(profile, 0.6, 0.35);
      const points = evaluateRouterProfileBoundary(definition);
      expect(points[0]).toEqual({ x: 0.6, y: 0 });
      expect(points.at(-1)).toEqual({ x: 0, y: 0.35 });
      expect(points.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
      expect(Math.min(...points.map(({ x }) => x))).toBeGreaterThanOrEqual(-1e-10);
      expect(Math.max(...points.map(({ x }) => x))).toBeLessThanOrEqual(0.6 + 1e-10);
      expect(Math.min(...points.map(({ y }) => y))).toBeGreaterThanOrEqual(-1e-10);
      expect(Math.max(...points.map(({ y }) => y))).toBeLessThanOrEqual(0.35 + 1e-10);
      expect(
        validateRouterProfileContour({
          start: definition.boundary.start,
          segments: definition.boundary.segments,
          closed: false
        })
      ).toMatchObject({ valid: true, selfIntersects: false });
    }
  );

  it.each(['roundover', 'cove'] as const)(
    '%s preserves a true circular radius and uses deterministic reveals for unequal dimensions',
    (profile) => {
      const definition = adaptBuiltInRouterProfile(profile, 0.6, 0.35);
      expect(definition.parameters).toMatchObject({ radius: 0.35, unequalDimensions: 'straight-reveals' });
      expect(definition.boundary.segments).toContainEqual(expect.objectContaining({ kind: 'arc', radius: 0.35 }));
      expect(definition.boundary.segments[0]).toEqual({ kind: 'line', to: { u: 0.35, v: 0 } });
    }
  );

  it('keeps every intended built-in boundary geometrically distinct after adaptation', () => {
    const signatures = BUILT_IN_ROUTER_PROFILES.map(({ profile }) =>
      JSON.stringify(evaluateRouterProfileBoundary(adaptBuiltInRouterProfile(profile, 0.5, 0.5)))
    );
    expect(new Set(signatures).size).toBe(BUILT_IN_ROUTER_PROFILES.length);
  });

  it.each(BUILT_IN_ROUTER_PROFILES.map(({ profile }) => profile))(
    '%s exposes the same evaluated boundary to preview adapters and CSG',
    (profile) => {
      const feature: EdgeProfileFeature = {
        id: `builtin-${profile}`,
        version: 1,
        enabled: true,
        kind: 'edge_profile',
        target: { type: 'edge', edge: 'top_front_edge' },
        reference: { primaryFrom: 'min', secondaryFrom: 'min' },
        profile,
        parameters: { size: 0.6, depth: 0.35 }
      };
      const previewBoundary = evaluateRouterProfileBoundary(adaptBuiltInRouterProfile(profile, 0.6, 0.35), {
        chordError: 0.6 * (1 - Math.cos(Math.PI / 32)),
        maxSegments: 128
      });
      expect(getEdgeProfileFeatureBoundary(feature)).toEqual(previewBoundary);
    }
  );
});
