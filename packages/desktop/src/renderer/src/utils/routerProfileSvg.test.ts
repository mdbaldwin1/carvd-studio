import { describe, expect, it } from 'vitest';
import { SvgProfileError, parseSvgRouterProfile } from './routerProfileSvg';
import { validateRouterProfileContour } from './routerProfileDxf';

const svg = (body: string, attributes = '') => `<svg xmlns="http://www.w3.org/2000/svg" ${attributes}>${body}</svg>`;

describe('inert SVG router-profile import', () => {
  it('supports relative, repeated, horizontal, vertical, cubic and shorthand commands', () => {
    const result = parseSvgRouterProfile(svg('<path d="m 0 2 l 1 0 1 -1 h 1 v -1 c 1 0 1 1 2 1 s 1 -1 2 -1"/>'));
    expect(result.errors).toEqual([]);
    expect(result.contours[0].start).toEqual({ u: 0, v: 2 });
    expect(result.contours[0].segments.map((segment) => segment.kind)).toEqual([
      'line',
      'line',
      'line',
      'line',
      'cubicBezier',
      'cubicBezier'
    ]);
    expect(result.contours[0].segments.at(-1)?.to).toEqual({ u: 7, v: 0 });
  });

  it('converts quadratic and smooth quadratic commands exactly to cubics', () => {
    const result = parseSvgRouterProfile(svg('<path d="M0 1 Q 1 0 2 1 T4 1"/>'));
    expect(result.fidelity).toBe('exact');
    expect(result.contours[0].segments[0]).toMatchObject({ kind: 'cubicBezier', to: { u: 2, v: 1 } });
    const first = result.contours[0].segments[0];
    if (first.kind !== 'cubicBezier') throw new Error('expected cubic');
    expect(first.control1.u).toBeCloseTo(2 / 3);
    expect(first.control1.v).toBeCloseTo(1 / 3);
    expect(first.control2.u).toBeCloseTo(4 / 3);
    expect(first.control2.v).toBeCloseTo(1 / 3);
    expect(result.contours[0].segments[1]).toMatchObject({ kind: 'cubicBezier', to: { u: 4, v: 1 } });
  });

  it('preserves axis-aligned SVG arcs exactly and splits large arcs deterministically', () => {
    const result = parseSvgRouterProfile(svg('<path d="M2 0 A2 1 0 1 1 0 0"/>'));
    expect(result.fidelity).toBe('exact');
    expect(result.contours[0].segments.length).toBeGreaterThan(1);
    expect(result.contours[0].segments.every((segment) => segment.kind === 'ellipseArc')).toBe(true);
    expect(result.contours[0].segments.at(-1)?.to).toEqual({ u: 0, v: 0 });
  });

  it('approximates rotated elliptical arcs explicitly with canonical cubics', () => {
    const result = parseSvgRouterProfile(svg('<path d="M2 0 A2 1 30 0 1 0 2"/>'));
    expect(result.fidelity).toBe('approximated');
    expect(result.warnings.join('\n')).toContain('approximated');
    expect(result.contours[0].segments.every((segment) => segment.kind === 'cubicBezier')).toBe(true);
  });

  it('applies nested translate, scale, rotate, and matrix transforms to endpoints and controls', () => {
    const result = parseSvgRouterProfile(
      svg(
        '<g transform="translate(2 3)"><g transform="scale(2)"><path transform="matrix(1 0 0 1 1 0)" d="M0 0 C1 0 1 1 2 1"/></g></g>'
      )
    );
    expect(result.contours[0].start).toEqual({ u: 4, v: 3 });
    expect(result.contours[0].segments[0]).toMatchObject({ control1: { u: 6, v: 3 }, to: { u: 8, v: 5 } });
    const rotated = parseSvgRouterProfile(svg('<path transform="rotate(90)" d="M1 0 L2 0"/>'));
    expect(rotated.contours[0].start.u).toBeCloseTo(0);
    expect(rotated.contours[0].start.v).toBeCloseTo(1);
  });

  it('handles viewBox and physical units without executing browser layout', () => {
    const result = parseSvgRouterProfile(
      svg('<path d="M0 0 L100 50"/>', 'viewBox="0 0 100 50" width="25.4mm" height="12.7mm"')
    );
    expect(result.units).toBe('millimeters');
    expect(result.unitScaleToInches).toBeCloseTo(1 / 25.4);
    expect(result.provenance.viewBox).toEqual([0, 0, 100, 50]);
    expect(result.contours[0].segments[0].to.u).toBeCloseTo(1);
    expect(result.contours[0].segments[0].to.v).toBeCloseTo(0.5);
  });

  it('reports closed and multiple ambiguous contours for later user selection', () => {
    const result = parseSvgRouterProfile(svg('<path d="M0 0 L1 0 Z"/><path d="M2 0 L3 0"/>'));
    expect(result.contours).toHaveLength(2);
    expect(result.errors.join('\n')).toContain('Closed SVG contours');
    expect(result.errors.join('\n')).toContain('multiple contours');
  });

  it('joins touching open path elements and reverses a matching component when needed', () => {
    const result = parseSvgRouterProfile(svg('<path d="M0 0 L1 0"/><path d="M2 0 L1 0"/>'));
    expect(result.errors).toEqual([]);
    expect(result.contours).toHaveLength(1);
    expect(result.contours[0].segments.at(-1)?.to).toEqual({ u: 2, v: 0 });
  });

  it('produces contours consumable by canonical topology validation', () => {
    const result = parseSvgRouterProfile(svg('<path d="M0 1 C.2 1 .8 .2 1 0"/>'));
    expect(validateRouterProfileContour(result.contours[0])).toMatchObject({ valid: true, selfIntersects: false });
  });

  it.each([
    '<script>alert(1)</script>',
    '<image href="https://example.com/a.png"/>',
    '<use href="#shape"/>',
    '<style>path{fill:url(https://example.com/x)}</style>',
    '<path d="M0 0 L1 1" onclick="fetch(\'x\')"/>'
  ])('rejects active or external content: %s', (content) => {
    expect(() => parseSvgRouterProfile(svg(content))).toThrow(SvgProfileError);
  });

  it('rejects malformed paths, arc flags, DTDs and configured resource-limit violations', () => {
    expect(() => parseSvgRouterProfile('<!DOCTYPE svg><svg/>')).toThrow('DTD');
    expect(() => parseSvgRouterProfile(svg('<path d="M0 nope"/>'))).toThrow('Malformed SVG path data');
    expect(() => parseSvgRouterProfile(svg('<path d="M0 0 A1 1 0 2 0 1 1"/>'))).toThrow('flags');
    expect(() => parseSvgRouterProfile(svg('<path d="M0 0 L1 0 L2 0"/>'), { limits: { maxCommands: 2 } })).toThrow(
      'command limit'
    );
    expect(() =>
      parseSvgRouterProfile(svg('<g><g><path d="M0 0 L1 0"/></g></g>'), { limits: { maxNesting: 2 } })
    ).toThrow('nesting limit');
  });
});

describe('SVG transform and limit rejections', () => {
  const parse = (body: string, options = {}) => parseSvgRouterProfile(svg(body), options);

  it('rejects each malformed transform with the arity it expected', () => {
    expect(() => parse('<path d="M0 1 L1 0" transform="matrix(1 0 0 1 0)"/>')).toThrow(/matrix\(\) requires six/);
    expect(() => parse('<path d="M0 1 L1 0" transform="translate(1 2 3)"/>')).toThrow(
      /translate\(\) requires one or two/
    );
    expect(() => parse('<path d="M0 1 L1 0" transform="scale(1 2 3)"/>')).toThrow(/scale\(\) requires one or two/);
    expect(() => parse('<path d="M0 1 L1 0" transform="rotate(10 20)"/>')).toThrow(/rotate\(\) requires one or three/);
  });

  it('rejects a transform attribute it cannot parse at all', () => {
    expect(() => parse('<path d="M0 1 L1 0" transform="not-a-transform"/>')).toThrow(SvgProfileError);
  });

  it('refuses a document with more transforms than the limit allows', () => {
    const nested = 'translate(1 1) '.repeat(40);
    expect(() => parse(`<path d="M0 1 L1 0" transform="${nested}"/>`, { limits: { maxTransforms: 4 } })).toThrow(
      /transform limit/
    );
  });

  it('measures the document against its byte size, not its character count', () => {
    // Multi-byte characters must count for what they actually weigh.
    const wide = '<path d="M0 1 L1 0"/>' + `<!-- ${'é'.repeat(200)} -->`;
    expect(() => parse(wide, { limits: { maxFileBytes: 120 } })).toThrow(SvgProfileError);
  });

  it('applies a well formed transform rather than rejecting it', () => {
    const result = parse('<path d="M0 1 L1 0" transform="translate(1 1)"/>');
    expect(result.errors).toEqual([]);
    expect(result.contours[0].start).toEqual({ u: 1, v: 2 });
  });
});
