import { describe, expect, it } from 'vitest';
import type { RouterProfileDefinition, RouterToolDefinition } from '../types';
import {
  cloneRouterToolDefinition,
  getEdgeProfileToolLibraryStatus,
  getRouterToolRevision,
  getRouterToolRadialEnvelopeAt,
  isRouterToolCompatibleWithProfile,
  getRouterToolProfileCompatibility,
  parseRouterToolLibrary,
  normalizeRouterToolEnvelope,
  parseRouterToolFile,
  resolveEdgeProfileToolSnapshot,
  validateRouterToolDefinition,
  withRouterToolRevision,
  stringifyRouterToolFile
} from './routerTools';
import { getRouterProfileRevision } from './routerProfiles';

const tool = (overrides: Partial<RouterToolDefinition> = {}): RouterToolDefinition => ({
  version: 1,
  id: 'tool-1',
  name: '1/2 inch Cove',
  source: 'manufacturer',
  manufacturer: 'Example Tool Co',
  sku: 'COVE-12',
  sourceUrl: 'https://example.com/tools/cove-12',
  profileFamily: 'cove',
  cutterDiameter: 1,
  shankDiameter: 0.5,
  cuttingHeight: 0.5,
  bearingDiameter: 0.375,
  ...overrides
});

describe('routerTools', () => {
  it('validates, revisions, clones, and round-trips a physical tool', () => {
    expect(validateRouterToolDefinition(tool())).toEqual([]);
    const revised = withRouterToolRevision(tool());
    expect(revised.revision).toBe(getRouterToolRevision(revised));
    expect(cloneRouterToolDefinition(revised)).toEqual(revised);
    expect(parseRouterToolLibrary(JSON.parse(JSON.stringify([revised])))).toEqual([revised]);
  });

  it('computes deterministic tool revisions and detects changed physical dimensions', () => {
    const first = tool();
    const reordered = {
      cuttingHeight: first.cuttingHeight,
      shankDiameter: first.shankDiameter,
      cutterDiameter: first.cutterDiameter,
      profileFamily: first.profileFamily,
      sourceUrl: first.sourceUrl,
      sku: first.sku,
      manufacturer: first.manufacturer,
      source: first.source,
      name: first.name,
      id: first.id,
      version: first.version,
      bearingDiameter: first.bearingDiameter
    } as RouterToolDefinition;
    expect(getRouterToolRevision(reordered)).toBe(getRouterToolRevision(first));
    expect(getRouterToolRevision(tool({ cutterDiameter: 1.25 }))).not.toBe(getRouterToolRevision(first));
  });

  it.each([
    [{ cutterDiameter: 0 }, 'cutterDiameter'],
    [{ shankDiameter: -0.25 }, 'shankDiameter'],
    [{ cuttingHeight: Number.NaN }, 'cuttingHeight'],
    [{ neckDiameter: 1 }, 'neckDiameter'],
    [{ bearingDiameter: -1 }, 'bearingDiameter'],
    [{ manufacturer: undefined }, 'manufacturer'],
    [{ sku: undefined }, 'sku'],
    [{ sourceUrl: '' }, 'sourceUrl']
  ])('rejects invalid physical tool data', (override, field) => {
    expect(validateRouterToolDefinition(tool(override as Partial<RouterToolDefinition>)).join('\n')).toContain(field);
  });

  it('checks family and exact-profile compatibility', () => {
    const profile = { id: 'profile-1', family: 'cove' } as RouterProfileDefinition;
    expect(isRouterToolCompatibleWithProfile(tool(), profile)).toBe(true);
    expect(isRouterToolCompatibleWithProfile(tool({ profileFamily: 'ogee' }), profile)).toBe(false);
    expect(isRouterToolCompatibleWithProfile(tool({ routerProfileId: 'other' }), profile)).toBe(false);
  });

  it('distinguishes exact, geometric, scalable, mismatch, and legacy linkage', () => {
    const snapshot: RouterProfileDefinition = {
      version: 1,
      id: 'profile-1',
      name: 'Cove',
      family: 'cove',
      source: 'generic',
      parameters: {},
      boundary: { start: { u: 0, v: 0.5 }, segments: [{ kind: 'line', to: { u: 0.5, v: 0 } }] }
    };
    const linked = tool({
      producedProfiles: [
        { profileId: snapshot.id, profileRevision: getRouterProfileRevision(snapshot), profileSnapshot: snapshot }
      ]
    });
    expect(validateRouterToolDefinition(linked)).toEqual([]);
    expect(getRouterToolProfileCompatibility(linked, snapshot).quality).toBe('exact');
    expect(getRouterToolProfileCompatibility(linked, { ...snapshot, id: 'copy', name: 'Copy' }).quality).toBe(
      'geometrically_equivalent'
    );
    const scalable = tool({
      producedProfiles: [
        {
          profileId: snapshot.id,
          profileRevision: getRouterProfileRevision(snapshot),
          profileSnapshot: snapshot,
          applicability: { scalable: true, minScale: 0.5, maxScale: 2 }
        }
      ]
    });
    const twice = {
      ...snapshot,
      id: 'twice',
      boundary: { start: { u: 0, v: 1 }, segments: [{ kind: 'line' as const, to: { u: 1, v: 0 } }] }
    };
    expect(getRouterToolProfileCompatibility(scalable, twice)).toMatchObject({ quality: 'scalable', scale: 2 });
    expect(getRouterToolProfileCompatibility(linked, twice).quality).toBe('mismatch');
    expect(getRouterToolProfileCompatibility(tool(), snapshot).quality).toBe('family_compatible');
    const cloned = cloneRouterToolDefinition(linked);
    cloned.producedProfiles![0].profileSnapshot.boundary.start.v = 9;
    expect(linked.producedProfiles![0].profileSnapshot.boundary.start.v).toBe(0.5);
  });

  it('detects changed and missing tools while retaining project snapshot authority', () => {
    const snapshot = tool();
    const feature = {
      routerToolId: snapshot.id,
      routerToolRevision: getRouterToolRevision(snapshot),
      routerToolSnapshot: snapshot
    };
    expect(getEdgeProfileToolLibraryStatus(feature, [snapshot])).toBe('current');
    expect(getEdgeProfileToolLibraryStatus(feature, [tool({ cuttingHeight: 0.75 })])).toBe('changed');
    expect(getEdgeProfileToolLibraryStatus(feature, [])).toBe('missing');
    expect(feature.routerToolSnapshot.cuttingHeight).toBe(0.5);
    expect(resolveEdgeProfileToolSnapshot(feature, [tool({ cuttingHeight: 0.75 })])?.cuttingHeight).toBe(0.5);
  });

  it('normalizes legacy tools conservatively without inventing finite axial spans', () => {
    const envelope = normalizeRouterToolEnvelope(tool());
    expect(envelope.precision).toBe('legacy');
    expect(envelope.sections).toContainEqual({ role: 'cutter', start: 0, end: 0.5, diameter: 1 });
    expect(getRouterToolRadialEnvelopeAt(tool(), 10)).toMatchObject({ precision: 'legacy', radius: 0.25 });
  });

  it('validates and evaluates a detailed envelope with a bearing below the cutter', () => {
    const detailed = tool({
      envelopeVersion: 1,
      neckDiameter: 0.2,
      sections: [
        { role: 'bearing', start: -0.2, end: 0, diameter: 0.375 },
        { role: 'cutter', start: 0, end: 0.5, diameter: 1 },
        { role: 'neck', start: 0.5, end: 0.75, diameter: 0.2 },
        { role: 'shank', start: 0.75, end: 2, diameter: 0.5 }
      ],
      overallLength: 3,
      safeColletInsertion: 1
    });
    expect(validateRouterToolDefinition(detailed)).toEqual([]);
    expect(getRouterToolRadialEnvelopeAt(detailed, -0.1)).toEqual({
      precision: 'detailed',
      radius: 0.1875,
      roles: ['bearing']
    });
    expect(getRouterToolRadialEnvelopeAt(detailed, 0.6)).toEqual({
      precision: 'detailed',
      radius: 0.1,
      roles: ['neck']
    });
    const restored = parseRouterToolFile(stringifyRouterToolFile(detailed));
    expect(restored.sections).toEqual(detailed.sections);
    expect(restored.revision).toBe(getRouterToolRevision(detailed));
    expect(
      getRouterToolRevision({
        ...detailed,
        sections: detailed.sections?.map((section, index) => (index === 1 ? { ...section, end: 0.8 } : section))
      })
    ).not.toBe(getRouterToolRevision(detailed));
  });

  it('allows an explicitly stackable bearing above the cutter', () => {
    const detailed = tool({
      envelopeVersion: 1,
      sections: [
        { role: 'cutter', start: 0, end: 0.5, diameter: 1 },
        { role: 'bearing', start: 0.5, end: 0.7, diameter: 0.375, stackable: true },
        { role: 'shank', start: 0.5, end: 2, diameter: 0.5 }
      ]
    });
    expect(validateRouterToolDefinition(detailed)).toEqual([]);
    expect(getRouterToolRadialEnvelopeAt(detailed, 0.6).roles).toEqual(['bearing', 'shank']);
  });

  it.each([
    ['missing cutter', [{ role: 'shank', start: 0, end: 1, diameter: 0.5 }], 'requires a cutter'],
    ['zero span', [{ role: 'cutter', start: 0, end: 0, diameter: 1 }], '.end'],
    [
      'unordered',
      [
        { role: 'shank', start: 0.5, end: 1, diameter: 0.5 },
        { role: 'cutter', start: 0, end: 0.5, diameter: 1 }
      ],
      'must not overlap'
    ],
    [
      'overlap',
      [
        { role: 'cutter', start: 0, end: 0.5, diameter: 1 },
        { role: 'shank', start: 0.4, end: 1, diameter: 0.5 }
      ],
      'must not overlap'
    ],
    [
      'unmarked bearing overlap',
      [
        { role: 'cutter', start: 0, end: 0.5, diameter: 1 },
        { role: 'bearing', start: 0.4, end: 0.6, diameter: 0.375 },
        { role: 'shank', start: 0.5, end: 1, diameter: 0.5 }
      ],
      'explicitly stackable'
    ]
  ])('rejects a detailed envelope with %s', (_name, sections, expected) => {
    expect(
      validateRouterToolDefinition(
        tool({ envelopeVersion: 1, sections: sections as RouterToolDefinition['sections'] })
      ).join('\n')
    ).toContain(expected);
  });

  it('round-trips lossless tool files and rejects future versions', () => {
    const restored = parseRouterToolFile(stringifyRouterToolFile(tool()));
    expect(restored).toEqual(withRouterToolRevision(tool()));
    expect(() =>
      parseRouterToolFile(JSON.stringify({ format: 'carvd-router-tool', version: 2, tool: tool() }))
    ).toThrow('version 2 is not supported');
  });
});

describe('routerTools validation rejections', () => {
  const errs = (overrides: Record<string, unknown>) =>
    validateRouterToolDefinition({ ...tool(), ...overrides }).join(' | ');

  it('rejects a tool that is not a record at all', () => {
    expect(validateRouterToolDefinition(null)).toEqual(['routerTool is invalid']);
    expect(validateRouterToolDefinition('a tool')).toEqual(['routerTool is invalid']);
  });

  it('rejects unsupported properties and a wrong format version', () => {
    expect(errs({ somethingElse: 1 })).toContain('unsupported properties');
    expect(errs({ version: 2 })).toContain('version is invalid');
  });

  it('rejects a revision that does not match the content', () => {
    expect(errs({ revision: 'not-the-real-hash' })).toContain('revision does not match its content');
  });

  it('requires identity fields to be non-empty', () => {
    expect(errs({ id: '   ' })).toContain('.id is invalid');
    expect(errs({ name: '' })).toContain('.name is invalid');
    expect(errs({ profileFamily: '  ' })).toContain('.profileFamily is invalid');
    expect(errs({ source: 'homemade' })).toContain('.source is invalid');
  });

  it('requires a manufacturer tool to name its maker and part number', () => {
    expect(errs({ manufacturer: undefined })).toContain('manufacturer is required for a manufacturer tool');
    expect(errs({ sku: undefined })).toContain('sku is required for a manufacturer tool');
  });

  it('rejects impossible physical dimensions', () => {
    expect(errs({ cutterDiameter: 0 })).toContain('cutterDiameter is invalid');
    expect(errs({ shankDiameter: -1 })).toContain('shankDiameter is invalid');
    expect(errs({ bearingDiameter: Number.NaN })).toContain('bearingDiameter is invalid');
  });

  it('requires an envelope version to come with sections', () => {
    expect(errs({ envelopeVersion: 1 })).toContain('envelopeVersion requires sections');
  });

  it('rejects a malformed axial envelope', () => {
    const withSections = (sections: unknown, envelopeVersion: unknown = 1) =>
      validateRouterToolDefinition({ ...tool(), envelopeVersion, sections }).join(' | ');
    expect(withSections([], 1)).toContain('sections is invalid');
    expect(withSections([{ role: 'cutter', start: 0, end: 0.5, diameter: 1 }], 2)).toContain(
      'envelopeVersion is invalid'
    );
    expect(withSections([{ role: 'nonsense', start: 0, end: 1, diameter: 1 }])).toContain('is invalid');
    expect(withSections([{ role: 'cutter', start: 0, end: 1, diameter: 1, extra: true }])).toContain(
      'unsupported properties'
    );
    // A section must occupy a real span, so its end has to pass its start.
    expect(withSections([{ role: 'cutter', start: 1, end: 0.5, diameter: 1 }])).toContain('.end is invalid');
    expect(withSections([{ role: 'cutter', start: 0, end: 1, diameter: 0 }])).toContain('.diameter is invalid');
  });

  it('allows a stackable bearing and refuses stacking anything else', () => {
    const sections = (role: string) => [
      { role: 'cutter', start: 0, end: 0.5, diameter: 1 },
      { role, start: 0.5, end: 1, diameter: 0.5, stackable: true }
    ];
    expect(
      validateRouterToolDefinition({ ...tool(), envelopeVersion: 1, sections: sections('bearing') }).join(' | ')
    ).not.toContain('stackable is only valid for bearings');
    expect(
      validateRouterToolDefinition({ ...tool(), envelopeVersion: 1, sections: sections('shank') }).join(' | ')
    ).toContain('stackable is only valid for bearings');
  });

  it('requires the overall length to reach every section', () => {
    const errors = validateRouterToolDefinition({
      ...tool(),
      envelopeVersion: 1,
      sections: [
        { role: 'cutter', start: 0, end: 0.5, diameter: 1 },
        { role: 'shank', start: 0.5, end: 2, diameter: 0.5 }
      ],
      overallLength: 1
    }).join(' | ');
    expect(errors).toContain('overallLength must reach every axial section');
  });

  it('refuses a collet insertion deeper than the modeled shank', () => {
    const errors = validateRouterToolDefinition({
      ...tool(),
      envelopeVersion: 1,
      sections: [
        { role: 'cutter', start: 0, end: 0.5, diameter: 1 },
        { role: 'shank', start: 0.5, end: 1, diameter: 0.5 }
      ],
      safeColletInsertion: 3
    }).join(' | ');
    expect(errors).toContain('safeColletInsertion exceeds the modeled shank span');
  });

  it('checks plain dimensions when there is no envelope', () => {
    expect(errs({ overallLength: -2 })).toContain('overallLength is invalid');
    expect(errs({ safeColletInsertion: 0 })).toContain('safeColletInsertion is invalid');
  });
});

describe('router tool produced-profile links', () => {
  const snapshot = {
    version: 1 as const,
    id: 'cove-12',
    name: 'Cove 1/2"',
    family: 'cove',
    source: 'generic' as const,
    parameters: {},
    boundary: { start: { u: 0, v: 0.25 }, segments: [{ kind: 'line' as const, to: { u: 0.25, v: 0 } }] }
  } as unknown as RouterProfileDefinition;

  const link = (overrides: Record<string, unknown> = {}) => ({
    profileId: 'cove-12',
    profileRevision: getRouterProfileRevision(snapshot),
    profileSnapshot: snapshot,
    ...overrides
  });
  const errs = (producedProfiles: unknown) => validateRouterToolDefinition({ ...tool(), producedProfiles }).join(' | ');

  it('accepts a tool that links the profile it cuts', () => {
    expect(errs([link()])).toBe('');
  });

  it('rejects a link list that is empty, malformed, or duplicated', () => {
    expect(errs([])).toContain('producedProfiles is invalid');
    expect(errs(['cove-12'])).toContain('producedProfiles[0] is invalid');
    expect(errs([link({ unexpected: true })])).toContain('producedProfiles[0] is invalid');
    expect(errs([link(), link()])).toContain('profileId is invalid or duplicate');
  });

  it('requires the link to pin a revision that matches the snapshot it carries', () => {
    expect(errs([link({ profileRevision: 42 })])).toContain('profileRevision is invalid');
    expect(errs([link({ profileRevision: 'rev-that-never-was' })])).toContain(
      'profileRevision must match profileSnapshot'
    );
    expect(errs([link({ profileId: 'some-other-profile' })])).toContain('profileId must match profileSnapshot.id');
  });

  it('rejects a nominal size no tool could have', () => {
    expect(errs([link({ nominalSize: 0 })])).toContain('nominalSize is invalid');
  });

  it('rejects a scaling window the tool cannot honour', () => {
    expect(errs([link({ applicability: { scalable: 'sometimes' } })])).toContain('applicability is invalid');
    expect(errs([link({ applicability: { scalable: true, unexpected: 1 } })])).toContain('applicability is invalid');
    expect(errs([link({ applicability: { scalable: true, minScale: -1 } })])).toContain(
      'applicability.minScale is invalid'
    );
    expect(errs([link({ applicability: { scalable: true, maxScale: 0 } })])).toContain(
      'applicability.maxScale is invalid'
    );
    // A window whose floor sits above its ceiling admits nothing.
    expect(errs([link({ applicability: { scalable: true, minScale: 2, maxScale: 1 } })])).toContain(
      'applicability scale range is invalid'
    );
    expect(errs([link({ applicability: { scalable: false, minScale: 1, maxScale: 2 } })])).toContain(
      'applicability scale range requires scalable'
    );
  });

  it('keeps a necked tool narrower than its cutter and no wider than its shank', () => {
    const necked = (neckDiameter: unknown) => validateRouterToolDefinition({ ...tool(), neckDiameter }).join(' | ');
    expect(necked(0)).toContain('neckDiameter is invalid');
    expect(necked(1)).toContain('neckDiameter must be smaller than cutterDiameter');
    expect(necked(0.75)).toContain('neckDiameter cannot exceed shankDiameter');
    expect(necked(0.25)).toBe('');
  });
});
