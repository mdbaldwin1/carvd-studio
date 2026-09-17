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

describe('router profile segment and file rejections', () => {
  const withSegment = (segment: unknown) =>
    validateRouterProfileDefinition(
      profile({ boundary: { start: { u: 0, v: 0.5 }, segments: [segment] } } as never)
    ).join(' | ');

  it('rejects a segment that is not a shape with an endpoint', () => {
    expect(withSegment(null)).toContain('segments[0] is invalid');
    expect(withSegment({ kind: 'line', to: { u: Number.NaN, v: 0 } })).toContain('segments[0] is invalid');
    // An unknown kind allows no properties at all, so it is reported that way.
    expect(withSegment({ kind: 'spiral', to: { u: 1, v: 0 } })).toContain('segments[0] has unsupported properties');
    expect(withSegment({ kind: 'line', to: { u: 1, v: 0 }, radius: 1 })).toContain(
      'segments[0] has unsupported properties'
    );
  });

  it('rejects a cubic segment missing either control point', () => {
    expect(withSegment({ kind: 'cubicBezier', to: { u: 1, v: 0 }, control2: { u: 0.5, v: 0.5 } })).toContain(
      'segments[0].control1 is invalid'
    );
    expect(withSegment({ kind: 'cubicBezier', to: { u: 1, v: 0 }, control1: { u: 0.5, v: 0.5 } })).toContain(
      'segments[0].control2 is invalid'
    );
  });

  it('rejects arcs and elliptical arcs with unusable radii or no direction', () => {
    expect(withSegment({ kind: 'arc', to: { u: 1, v: 0 }, radius: 0, clockwise: true })).toContain(
      'segments[0].radius is invalid'
    );
    expect(withSegment({ kind: 'arc', to: { u: 1, v: 0 }, radius: 1 })).toContain('segments[0].clockwise is invalid');
    expect(
      withSegment({ kind: 'ellipseArc', to: { u: 1, v: 0 }, radiusU: -1, radiusV: 0.5, clockwise: true })
    ).toContain('segments[0].radiusU is invalid');
    expect(
      withSegment({ kind: 'ellipseArc', to: { u: 1, v: 0 }, radiusU: 0.5, radiusV: 0, clockwise: true })
    ).toContain('segments[0].radiusV is invalid');
    expect(withSegment({ kind: 'ellipseArc', to: { u: 1, v: 0 }, radiusU: 0.5, radiusV: 0.5 })).toContain(
      'segments[0].clockwise is invalid'
    );
  });

  it('rejects a cubic segment whose controls and endpoint all sit on its start', () => {
    // Every control collapsed onto the start point describes no curve at all.
    expect(
      withSegment({
        kind: 'cubicBezier',
        to: { u: 0, v: 0.5 },
        control1: { u: 0, v: 0.5 },
        control2: { u: 0, v: 0.5 }
      })
    ).toContain('segments[0] is degenerate');
  });

  it('keeps only the first profile for each id when parsing a library', () => {
    const first = profile({ name: 'First' });
    const duplicate = profile({ name: 'Second' });
    const parsed = parseRouterProfileLibrary([first, duplicate, 'not a profile', null]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('First');
    // Parsing stamps the content revision so later library edits are detectable.
    expect(parsed[0].revision).toBe(getRouterProfileRevision(first));
    expect(parseRouterProfileLibrary('not an array')).toEqual([]);
  });

  it('refuses to write a profile that could not be used as an edge profile', () => {
    expect(() =>
      stringifyRouterProfileFile(profile({ boundary: { start: { u: 0, v: 0 }, segments: [] } } as never))
    ).toThrow();
  });

  it('refuses a profile file that is oversized, unparseable, or from another tool', () => {
    expect(() => parseRouterProfileFile('x'.repeat(1024 * 1024 + 1))).toThrow(/1 MiB limit/);
    expect(() => parseRouterProfileFile('{not json')).toThrow(/not valid JSON/);
    expect(() =>
      parseRouterProfileFile(JSON.stringify({ format: 'something-else', version: 1, profile: profile() }))
    ).toThrow(/not a Carvd router profile file/);
    expect(() =>
      parseRouterProfileFile(
        JSON.stringify({ format: 'carvd-router-profile', version: 1, profile: profile(), extra: 1 })
      )
    ).toThrow(/not a Carvd router profile file/);
    expect(() =>
      parseRouterProfileFile(JSON.stringify({ format: 'carvd-router-profile', version: 2, profile: profile() }))
    ).toThrow(/version 2 is not supported/);
    expect(() =>
      parseRouterProfileFile(JSON.stringify({ format: 'carvd-router-profile', version: 1, profile: { version: 1 } }))
    ).toThrow();
  });
});
