import { describe, expect, it, vi } from 'vitest';
import type {
  EdgeProfileFeature,
  RouterCatalogDefinition,
  RouterProfileDefinition,
  RouterProfileSegment,
  RouterToolDefinition
} from '../types';
import { createTestPart } from '../../../../tests/helpers/factories';
import { evaluateRouterProfileBoundary, getEdgeProfileFeatureBoundary } from './edgeProfileShape';
import { clearPartGeometryCache, getPartGeometryCacheSizeForTests, getPartRenderGeometry } from './partFeatureGeometry';
import { analyzeRouterProfileContinuity } from './routerProfileContinuity';
import { analyzeEdgeProfileToolFeasibility } from './edgeProfileToolFeasibility';
import {
  DxfProfileError,
  parseAsciiDxfRouterProfile,
  reverseRouterProfileContour,
  rotateRouterProfileContour,
  scaleRouterProfileContour
} from './routerProfileDxf';
import { SvgProfileError, parseSvgRouterProfile } from './routerProfileSvg';
import { getRouterProfileRevision, parseRouterProfileFile, validateRouterProfileDefinition } from './routerProfiles';
import { parseRouterToolFile, validateRouterToolDefinition } from './routerTools';
import { parseRouterCatalogFile, validateRouterCatalogDefinition } from './routerCatalogs';

vi.unmock('three');

const seeded = (seed: number) => () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 0x100000000;
};
const random = seeded(0x43525033);
const value = (scale = 1) => (random() * 2 - 1) * scale;
const definition = (segments: RouterProfileSegment[], start = { u: 0, v: 0 }): RouterProfileDefinition => ({
  version: 1,
  id: 'fuzz',
  name: 'Fuzz',
  family: 'custom',
  source: 'generic',
  parameters: {},
  boundary: { start, segments }
});
const closePoint = (a: { u: number; v: number }, b: { u: number; v: number }, tolerance = 1e-8) =>
  Math.hypot(a.u - b.u, a.v - b.v) <= tolerance;

describe('CRP-33 deterministic router-profile hardening audit (seed 0x43525033)', () => {
  it('terminates with finite, capped, deterministic output for 160 randomized mixed profiles', () => {
    for (let caseIndex = 0; caseIndex < 160; caseIndex += 1) {
      const start = { u: value(900), v: value(900) };
      let from = start;
      const segments: RouterProfileSegment[] = [];
      const count = 1 + Math.floor(random() * 24);
      for (let index = 0; index < count; index += 1) {
        const to = {
          u: Math.max(-999, Math.min(999, from.u + value(4))),
          v: Math.max(-999, Math.min(999, from.v + value(4)))
        };
        const kind = Math.floor(random() * 4);
        if (kind === 0) segments.push({ kind: 'line', to });
        else if (kind === 1)
          segments.push({
            kind: 'arc',
            to,
            radius: Math.max(Math.hypot(to.u - from.u, to.v - from.v) / 2 + 1e-7, random() * 20),
            clockwise: random() > 0.5
          });
        else if (kind === 2)
          segments.push({
            kind: 'ellipseArc',
            to,
            radiusU: Math.max(Math.abs(to.u - from.u) / 2 + 1e-7, random() * 20),
            radiusV: Math.max(Math.abs(to.v - from.v) / 2 + 1e-7, random() * 20),
            clockwise: random() > 0.5
          });
        else
          segments.push({
            kind: 'cubicBezier',
            control1: { u: from.u + value(12), v: from.v + value(12) },
            control2: { u: to.u + value(12), v: to.v + value(12) },
            to
          });
        from = to;
      }
      const profile = definition(segments, start);
      const first = evaluateRouterProfileBoundary(profile, { chordError: 0.01, maxSegments: 512 });
      const second = evaluateRouterProfileBoundary(profile, { chordError: 0.01, maxSegments: 512 });
      expect(second).toEqual(first);
      expect(first.length).toBeLessThanOrEqual(513);
      expect(first.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
      if (first.length) {
        expect(first[0]).toEqual({ x: start.u, y: start.v });
        expect(first.at(-1)).toEqual({ x: from.u, y: from.v });
      }
    }
  });

  it('caps hostile cubic flatness and invalid numeric budgets without recursion or NaN', () => {
    const hostile = definition([
      { kind: 'cubicBezier', control1: { u: 1e9, v: -1e9 }, control2: { u: -1e9, v: 1e9 }, to: { u: 1, v: 0 } }
    ]);
    expect(evaluateRouterProfileBoundary(hostile, { chordError: 1e-30, maxSegments: 32 })).toEqual([]);
    expect(evaluateRouterProfileBoundary(hostile, { chordError: 1, maxSegments: Number.NaN })).toEqual([]);
    expect(evaluateRouterProfileBoundary(hostile, { chordError: 1, maxSegments: Infinity })).toEqual([]);
  });

  it('round-trips reversal, rotation and uniform scaling without mutating randomized contours', () => {
    for (let index = 0; index < 50; index += 1) {
      const contour = {
        start: { u: value(10), v: value(10) },
        segments: [
          {
            kind: 'cubicBezier' as const,
            control1: { u: value(10), v: value(10) },
            control2: { u: value(10), v: value(10) },
            to: { u: value(10), v: value(10) }
          }
        ],
        closed: false
      };
      const original = globalThis.structuredClone(contour);
      const reversed = reverseRouterProfileContour(reverseRouterProfileContour(contour));
      expect(closePoint(reversed.start, contour.start)).toBe(true);
      expect(closePoint(reversed.segments[0].to, contour.segments[0].to)).toBe(true);
      const restored = rotateRouterProfileContour(rotateRouterProfileContour(contour, 0.731), -0.731);
      expect(closePoint(restored.start, contour.start, 1e-7)).toBe(true);
      const scaled = scaleRouterProfileContour(scaleRouterProfileContour(contour, 17), 1 / 17);
      expect(closePoint(scaled.segments[0].to, contour.segments[0].to, 1e-7)).toBe(true);
      expect(contour).toEqual(original);
    }
  });

  it('bounds maximum legal evaluation, continuity and feasibility by operation counts', () => {
    const segments = Array.from({ length: 2048 }, (_, index) => ({
      kind: 'line' as const,
      to: { u: index + 1, v: 0 }
    }));
    const profile = definition(segments);
    expect(evaluateRouterProfileBoundary(profile, { maxSegments: 4096 })).toHaveLength(2049);
    expect(analyzeRouterProfileContinuity(profile)).toHaveLength(2047);
    expect(analyzeRouterProfileContinuity(definition([...segments, ...segments, ...segments]))).toHaveLength(2048);
    const feature = {
      id: 'max',
      version: 1,
      enabled: true,
      kind: 'edge_profile',
      target: { type: 'edge', edge: 'top_front_edge' },
      reference: { primaryFrom: 'min' },
      profile: 'custom',
      routerProfileId: 'fuzz',
      routerProfileSnapshot: profile,
      parameters: { size: 1, depth: 1 }
    } satisfies EdgeProfileFeature;
    expect(
      analyzeEdgeProfileToolFeasibility(feature, { length: 5000, width: 10, thickness: 10 }).length
    ).toBeLessThanOrEqual(3);
  });

  it('keeps preview/CSG adapter authority, revisions, and geometry cache hits deterministic', () => {
    const profile = definition(
      [{ kind: 'cubicBezier', control1: { u: 0.5, v: 0 }, control2: { u: 0, v: 0.5 }, to: { u: 0, v: 0.5 } }],
      { u: 0.5, v: 0 }
    );
    const feature = {
      id: 'cache',
      version: 1,
      enabled: true,
      kind: 'edge_profile',
      target: { type: 'edge', edge: 'top_front_edge' },
      reference: { primaryFrom: 'min' },
      profile: 'custom',
      routerProfileId: 'fuzz',
      routerProfileSnapshot: profile,
      parameters: { size: 0.5, depth: 0.5 }
    } satisfies EdgeProfileFeature;
    expect(getEdgeProfileFeatureBoundary(feature)).toEqual(evaluateRouterProfileBoundary(profile));
    expect(getRouterProfileRevision(profile)).toBe(getRouterProfileRevision(globalThis.structuredClone(profile)));
    clearPartGeometryCache();
    const part = createTestPart({ features: [feature] });
    const first = getPartRenderGeometry(part);
    const size = getPartGeometryCacheSizeForTests();
    expect(getPartRenderGeometry(part)).toBe(first);
    expect(getPartGeometryCacheSizeForTests()).toBe(size);
    const changed = globalThis.structuredClone(part);
    const changedFeature = changed.features![0] as EdgeProfileFeature;
    if (changedFeature.routerProfileSnapshot?.boundary.segments[0].kind === 'cubicBezier')
      changedFeature.routerProfileSnapshot.boundary.segments[0].control1.u += 0.01;
    expect(getPartRenderGeometry(changed)).not.toBe(first);
    expect(getPartGeometryCacheSizeForTests()).toBe(size + 1);
  });

  it('fuzzes inert SVG and ASCII DXF streams into bounded results or structured errors', () => {
    const alphabet = 'MLCQAZ0123456789.,-+ <>/svgpathg\n';
    for (let caseIndex = 0; caseIndex < 250; caseIndex += 1) {
      const junk = Array.from(
        { length: Math.floor(random() * 180) },
        () => alphabet[Math.floor(random() * alphabet.length)]
      ).join('');
      const svg = `<svg><path d="${junk.replace(/"/g, '')}"/></svg>`;
      try {
        const first = parseSvgRouterProfile(svg, {
          limits: { maxCommands: 64, maxCoordinates: 256, maxSegments: 128 }
        });
        expect(
          parseSvgRouterProfile(svg, { limits: { maxCommands: 64, maxCoordinates: 256, maxSegments: 128 } })
        ).toEqual(first);
        expect(first.contours.reduce((sum, contour) => sum + contour.segments.length, 0)).toBeLessThanOrEqual(128);
      } catch (error) {
        expect(error).toBeInstanceOf(SvgProfileError);
      }
      try {
        const first = parseAsciiDxfRouterProfile(junk, {
          limits: { maxPairs: 128, maxEntities: 64, maxSegments: 128 }
        });
        expect(
          parseAsciiDxfRouterProfile(junk, { limits: { maxPairs: 128, maxEntities: 64, maxSegments: 128 } })
        ).toEqual(first);
      } catch (error) {
        expect(error).toBeInstanceOf(DxfProfileError);
      }
    }
  });

  it('enforces aggregate SVG caps, balanced nesting, external rejection, and near-limit DXF joining', () => {
    const manyPaths = `<svg>${Array.from({ length: 20 }, (_, index) => `<path d="M${index} 0L${index + 0.5} 0"/>`).join('')}</svg>`;
    expect(() => parseSvgRouterProfile(manyPaths, { limits: { maxCommands: 30 } })).toThrow(SvgProfileError);
    expect(() => parseSvgRouterProfile('<svg><g><path d="M0 0L1 0"/></svg>')).toThrow('unclosed');
    expect(() => parseSvgRouterProfile('<svg><image href="https://invalid.example/a"/></svg>')).toThrow('external');
    const entities = Array.from(
      { length: 1500 },
      (_, index) => `0\nLINE\n10\n${index * 2}\n20\n0\n11\n${index * 2 + 1}\n21\n0\n`
    ).join('');
    const source = `0\nSECTION\n2\nENTITIES\n${entities}0\nENDSEC\n0\nEOF\n`;
    expect(parseAsciiDxfRouterProfile(source).contours).toHaveLength(1500);
  });

  it('rejects unknown, prototype-like and deeply nested profile/tool/catalog wrappers safely', () => {
    const profile = definition([{ kind: 'line', to: { u: 1, v: 0 } }]);
    const tool: RouterToolDefinition = {
      version: 1,
      id: 'tool',
      name: 'Tool',
      source: 'generic',
      profileFamily: 'custom',
      cutterDiameter: 1,
      shankDiameter: 0.5,
      cuttingHeight: 1
    };
    const catalog: RouterCatalogDefinition = {
      version: 1,
      id: 'catalog',
      name: 'Catalog',
      source: 'generic',
      profiles: [],
      tools: []
    };
    for (const suspicious of [
      JSON.parse('{"__proto__":{"polluted":true}}'),
      { constructor: { prototype: { polluted: true } } }
    ]) {
      expect(validateRouterProfileDefinition({ ...profile, ...suspicious }).length).toBeGreaterThan(0);
      expect(validateRouterToolDefinition({ ...tool, ...suspicious }).length).toBeGreaterThan(0);
      expect(validateRouterCatalogDefinition({ ...catalog, ...suspicious }).length).toBeGreaterThan(0);
    }
    let nested: unknown = 'leaf';
    for (let index = 0; index < 200; index += 1) nested = { nested };
    expect(() =>
      getRouterProfileRevision({ ...profile, revision: 'x', junk: nested } as RouterProfileDefinition)
    ).not.toThrow();
    expect(getRouterProfileRevision({ ...profile, junk: nested } as RouterProfileDefinition)).toBe(
      'invalid:complex-definition'
    );
    expect(() => parseRouterProfileFile('x'.repeat(1024 * 1024 + 1))).toThrow('limit');
    expect(() => parseRouterToolFile('x'.repeat(1024 * 1024 + 1))).toThrow('limit');
    expect(() => parseRouterCatalogFile('x'.repeat(2 * 1024 * 1024 + 1))).toThrow('limit');
  });
});
