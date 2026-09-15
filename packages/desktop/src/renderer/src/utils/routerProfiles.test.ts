import { describe, expect, it } from 'vitest';
import type { RouterProfileDefinition } from '../types';
import {
  cloneRouterProfileDefinition,
  getEdgeProfileLibraryStatus,
  getRouterProfileRevision,
  isRouterProfileDefinition,
  parseRouterProfileLibrary,
  resolveEdgeProfileSnapshot,
  validateRouterProfileDefinition,
  validateEdgeRouterProfileDefinition,
  parseRouterProfileFile,
  stringifyRouterProfileFile
} from './routerProfiles';

export function profile(overrides: Partial<RouterProfileDefinition> = {}): RouterProfileDefinition {
  return {
    version: 1,
    id: 'custom-ogee-1',
    name: 'Shop Ogee',
    family: 'ogee',
    source: 'generic',
    parameters: { firstRadius: 0.25, secondRadius: 0.25, variant: 'roman' },
    boundary: {
      start: { u: 0, v: 0.5 },
      segments: [
        { kind: 'arc', to: { u: 0.25, v: 0.25 }, radius: 0.25, clockwise: true },
        { kind: 'ellipseArc', to: { u: 0.5, v: 0 }, radiusU: 0.25, radiusV: 0.2, clockwise: false },
        { kind: 'line', to: { u: 0.625, v: 0 } }
      ]
    },
    ...overrides
  };
}

describe('routerProfiles', () => {
  it('round-trips a profile losslessly through the versioned interchange format', () => {
    const original = profile({
      boundary: {
        start: { u: 0, v: 0.5 },
        segments: [{ kind: 'ellipseArc', to: { u: 0.5, v: 0 }, radiusU: 0.6, radiusV: 0.3, clockwise: true }]
      }
    });
    expect(parseRouterProfileFile(stringifyRouterProfileFile(original))).toEqual(original);
  });

  it('rejects future interchange versions explicitly', () => {
    const text = JSON.stringify({ format: 'carvd-router-profile', version: 99, profile: profile() });
    expect(() => parseRouterProfileFile(text)).toThrow('version 99 is not supported');
  });

  it('rejects degenerate removal area and off-axis endpoints with actionable messages', () => {
    const degenerate = profile({
      boundary: { start: { u: 0, v: 0.25 }, segments: [{ kind: 'line', to: { u: 0, v: 0.5 } }] }
    });
    expect(validateEdgeRouterProfileDefinition(degenerate).join('\n')).toContain('encloses no material-removal area');
    const offAxis = profile({
      boundary: { start: { u: 0.1, v: 0.25 }, segments: [{ kind: 'line', to: { u: 0.25, v: 0.1 } }] }
    });
    expect(validateEdgeRouterProfileDefinition(offAxis).join('\n')).toContain('must start on one stock face axis');
  });

  it('accepts reversed and swapped face-axis endpoints', () => {
    const reversed = profile({
      boundary: { start: { u: 0.25, v: 0 }, segments: [{ kind: 'line', to: { u: 0, v: 0.25 } }] }
    });
    expect(validateEdgeRouterProfileDefinition(reversed)).toEqual([]);
  });
  it('validates semantic line, arc, and ellipse-arc boundaries', () => {
    expect(validateRouterProfileDefinition(profile())).toEqual([]);
    expect(isRouterProfileDefinition(profile())).toBe(true);
  });

  it('validates, clones, and revisions cubic Bezier controls', () => {
    const cubic = profile({
      boundary: {
        start: { u: 0, v: 0.5 },
        segments: [
          {
            kind: 'cubicBezier',
            control1: { u: 0.1, v: 0.5 },
            control2: { u: 0.5, v: 0.1 },
            to: { u: 0.5, v: 0 }
          }
        ]
      }
    });
    expect(validateRouterProfileDefinition(cubic)).toEqual([]);
    const clone = cloneRouterProfileDefinition(cubic);
    if (clone.boundary.segments[0].kind !== 'cubicBezier') throw new Error('expected cubic');
    clone.boundary.segments[0].control1.u = 9;
    expect(getRouterProfileRevision(clone)).not.toBe(getRouterProfileRevision(cubic));
    expect(cubic.boundary.segments[0]).toMatchObject({ control1: { u: 0.1 } });
  });

  it.each([
    [{ version: 2 }, 'version'],
    [{ id: '' }, 'id'],
    [{ source: 'internet' }, 'source'],
    [{ parameters: { radius: Number.NaN } }, 'parameters.radius'],
    [{ boundary: { start: { u: 0, v: 0 }, segments: [] } }, 'segments'],
    [{ boundary: { start: { u: Infinity, v: 0 }, segments: [{ kind: 'line', to: { u: 1, v: 0 } }] } }, 'boundary'],
    [
      {
        boundary: { start: { u: 0, v: 0 }, segments: [{ kind: 'arc', to: { u: 1, v: 0 }, radius: 0, clockwise: true }] }
      },
      'radius'
    ],
    [
      {
        boundary: {
          start: { u: 0, v: 0 },
          segments: [{ kind: 'ellipseArc', to: { u: 1, v: 0 }, radiusU: 1, radiusV: -1, clockwise: true }]
        }
      },
      'radiusV'
    ]
  ])('rejects malformed canonical data', (override, field) => {
    expect(validateRouterProfileDefinition({ ...profile(), ...override }).join('\n')).toContain(field);
  });

  it('deep-clones parameters, points, and segments', () => {
    const original = profile();
    const clone = cloneRouterProfileDefinition(original);
    clone.parameters.firstRadius = 1;
    clone.boundary.start.u = 2;
    clone.boundary.segments[0].to.v = 3;

    expect(original.parameters.firstRadius).toBe(0.25);
    expect(original.boundary.start.u).toBe(0);
    expect(original.boundary.segments[0].to.v).toBe(0.25);
  });

  it('round-trips through JSON and filters malformed or duplicate library entries', () => {
    const valid = profile();
    const restored = JSON.parse(JSON.stringify(valid));
    expect(parseRouterProfileLibrary([restored, { ...valid, id: '' }, restored])).toEqual([
      { ...valid, revision: getRouterProfileRevision(valid) }
    ]);
  });

  it('computes deterministic revisions independent of key order and the revision field', () => {
    const first = profile();
    const reordered = { ...first, parameters: { variant: 'roman', secondRadius: 0.25, firstRadius: 0.25 } };
    expect(getRouterProfileRevision(first)).toBe(getRouterProfileRevision(reordered));
    expect(getRouterProfileRevision({ ...first, revision: 'stale' })).toBe(getRouterProfileRevision(first));
    expect(getRouterProfileRevision({ ...first, name: 'Changed' })).not.toBe(getRouterProfileRevision(first));
  });

  it('reports current, changed, and deleted library references without changing the snapshot', () => {
    const snapshot = profile();
    const feature = {
      routerProfileId: snapshot.id,
      routerProfileRevision: getRouterProfileRevision(snapshot),
      routerProfileSnapshot: snapshot
    };
    expect(getEdgeProfileLibraryStatus(feature, [snapshot])).toBe('current');
    expect(getEdgeProfileLibraryStatus(feature, [{ ...snapshot, name: 'Library Changed' }])).toBe('changed');
    expect(getEdgeProfileLibraryStatus(feature, [])).toBe('missing');
    expect(feature.routerProfileSnapshot).toBe(snapshot);
    expect(resolveEdgeProfileSnapshot(feature, [{ ...snapshot, name: 'Library Changed' }])?.name).toBe(snapshot.name);
  });
});
