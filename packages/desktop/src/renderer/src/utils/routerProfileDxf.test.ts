import { describe, expect, it } from 'vitest';
import {
  DxfProfileError,
  mirrorRouterProfileContour,
  parseAsciiDxfRouterProfile,
  reverseRouterProfileContour,
  rotateRouterProfileContour,
  scaleRouterProfileContour,
  swapRouterProfileContourAxes,
  translateRouterProfileContour,
  validateRouterProfileContour
} from './routerProfileDxf';

const dxf = (entities: string, header = '') =>
  `0\nSECTION\n2\nHEADER\n${header}0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${entities}0\nENDSEC\n0\nEOF\n`;

const line = (x1: number, y1: number, x2: number, y2: number) =>
  `0\nLINE\n10\n${x1}\n20\n${y1}\n11\n${x2}\n21\n${y2}\n`;

describe('ASCII DXF router-profile import', () => {
  it('reads $INSUNITS and connects independently authored lines', () => {
    const result = parseAsciiDxfRouterProfile(dxf(line(1, 0, 1, 1) + line(0, 0, 1, 0), `9\n$INSUNITS\n70\n4\n`));
    expect(result.units).toBe('millimeters');
    expect(result.unitScaleToInches).toBeCloseTo(1 / 25.4);
    expect(result.contours).toHaveLength(1);
    expect(result.contours[0].segments).toHaveLength(2);
    expect(result.contours[0].segments[0].to.u).toBeCloseTo(1 / 25.4);
  });

  it('leaves units explicitly unknown when $INSUNITS is absent', () => {
    const result = parseAsciiDxfRouterProfile(dxf(line(0, 0, 1, 0)));
    expect(result.units).toBe('unknown');
    expect(result.unitScaleToInches).toBeNull();
    expect(result.warnings).toContain('DXF insertion units are missing or unsupported');
  });

  it('joins reversed components regardless of entity order', () => {
    const result = parseAsciiDxfRouterProfile(dxf(line(2, 0, 1, 0) + line(0, 0, 1, 0)));
    expect(result.contours).toHaveLength(1);
    expect(result.contours[0].start).toEqual({ u: 2, v: 0 });
    expect(result.contours[0].segments.at(-1)?.to).toEqual({ u: 0, v: 0 });
  });

  it('repairs only endpoint gaps within the configured conservative tolerance', () => {
    const near = parseAsciiDxfRouterProfile(dxf(line(0, 0, 1, 0) + line(1.00001, 0, 2, 0)), {
      connectTolerance: 1e-8,
      repairTolerance: 1e-4
    });
    const far = parseAsciiDxfRouterProfile(dxf(line(0, 0, 1, 0) + line(1.01, 0, 2, 0)), {
      repairTolerance: 1e-4
    });
    expect(near.contours).toHaveLength(1);
    expect(near.contours[0].segments).toHaveLength(3);
    expect(far.contours).toHaveLength(2);
  });

  it('normalizes ARC and CIRCLE entities to unambiguous semantic arc spans', () => {
    const result = parseAsciiDxfRouterProfile(
      dxf(`0\nARC\n10\n0\n20\n0\n40\n2\n50\n0\n51\n270\n0\nCIRCLE\n10\n5\n20\n0\n40\n1\n`)
    );
    expect(result.contours[0].segments).toHaveLength(2);
    expect(result.contours[0].segments.every((segment) => segment.kind === 'arc')).toBe(true);
    expect(result.contours[1].segments).toHaveLength(4);
    expect(result.contours[1].closed).toBe(true);
  });

  it('converts positive and negative LWPOLYLINE bulges into directed arcs', () => {
    const result = parseAsciiDxfRouterProfile(
      dxf(
        `0\nLWPOLYLINE\n70\n0\n10\n0\n20\n0\n42\n1\n10\n2\n20\n0\n0\nLWPOLYLINE\n70\n0\n10\n3\n20\n0\n42\n-1\n10\n5\n20\n0\n`
      )
    );
    expect(result.contours[0].segments[0]).toMatchObject({ kind: 'arc', clockwise: false, radius: 1 });
    expect(result.contours[1].segments[0]).toMatchObject({ kind: 'arc', clockwise: true, radius: 1 });
  });

  it('supports closed LWPOLYLINE and classic POLYLINE/VERTEX sequences', () => {
    const lightweight = `0\nLWPOLYLINE\n70\n1\n10\n0\n20\n0\n10\n1\n20\n0\n10\n1\n20\n1\n`;
    const classic = `0\nPOLYLINE\n70\n0\n0\nVERTEX\n10\n3\n20\n0\n0\nVERTEX\n10\n4\n20\n0\n0\nSEQEND\n`;
    const result = parseAsciiDxfRouterProfile(dxf(lightweight + classic));
    expect(result.contours[0]).toMatchObject({ closed: true });
    expect(result.contours[0].segments).toHaveLength(3);
    expect(result.contours[1].segments).toHaveLength(1);
  });

  it('reports malformed splines and ignores unsupported entities without following INSERT or XREF data', () => {
    const result = parseAsciiDxfRouterProfile(
      dxf(`0\nSPLINE\n10\n0\n20\n0\n0\nINSERT\n2\nexternal-file\n` + line(0, 0, 1, 0))
    );
    expect(result.unsupportedEntities).toEqual(['INSERT']);
    expect(result.warnings.join('\n')).toContain('malformed SPLINE');
    expect(result.contours).toHaveLength(1);
  });

  it('imports a clamped cubic SPLINE as one exact canonical cubic Bezier', () => {
    const spline = `0\nSPLINE\n70\n8\n71\n3\n72\n8\n73\n4\n40\n0\n40\n0\n40\n0\n40\n0\n40\n1\n40\n1\n40\n1\n40\n1\n10\n0\n20\n0\n10\n0\n20\n1\n10\n1\n20\n1\n10\n1\n20\n0\n`;
    const result = parseAsciiDxfRouterProfile(dxf(spline));
    expect(result.contours).toHaveLength(1);
    expect(result.contours[0].segments).toEqual([
      {
        kind: 'cubicBezier',
        control1: { u: 0, v: 1 },
        control2: { u: 1, v: 1 },
        to: { u: 1, v: 0 }
      }
    ]);
    expect(result.warnings.join('\n')).not.toContain('Approximated');
  });

  it('approximates weighted splines explicitly and rejects periodic or nonplanar forms actionably', () => {
    const common = `71\n3\n72\n8\n73\n4\n40\n0\n40\n0\n40\n0\n40\n0\n40\n1\n40\n1\n40\n1\n40\n1\n10\n0\n20\n0\n10\n0\n20\n1\n10\n1\n20\n1\n10\n1\n20\n0\n`;
    const weighted = parseAsciiDxfRouterProfile(dxf(`0\nSPLINE\n70\n12\n${common}41\n1\n41\n2\n41\n2\n41\n1\n`));
    expect(weighted.contours[0].segments.every((segment) => segment.kind === 'cubicBezier')).toBe(true);
    expect(weighted.warnings.join('\n')).toContain('Approximated degree-3 SPLINE');
    const periodic = parseAsciiDxfRouterProfile(dxf(`0\nSPLINE\n70\n2\n${common}`));
    expect(periodic.warnings.join('\n')).toContain('periodic');
    const nonplanar = parseAsciiDxfRouterProfile(dxf(`0\nSPLINE\n70\n8\n${common}30\n1\n`));
    expect(nonplanar.warnings.join('\n')).toContain('nonplanar');
  });

  it('skips malformed geometric entities without inventing coordinates', () => {
    const result = parseAsciiDxfRouterProfile(
      dxf(`0\nLINE\n10\nnope\n20\n0\n11\n1\n21\n0\n0\nARC\n10\n0\n20\n0\n40\n1\n50\n0\n`)
    );
    expect(result.contours).toEqual([]);
  });

  it.each([
    ['file bytes', '0\nEOF\n', { maxFileBytes: 2 }],
    ['pair count', '0\nEOF\n', { maxPairs: 0 }],
    ['entity count', dxf(line(0, 0, 1, 0)), { maxEntities: 0 }],
    ['coordinate magnitude', dxf(line(0, 0, 1e9, 0)), { maxAbsCoordinate: 100 }],
    ['segment count', dxf(`0\nCIRCLE\n10\n0\n20\n0\n40\n1\n`), { maxSegments: 3 }]
  ] as const)('rejects input exceeding the %s security bound', (_name, source, limits) => {
    expect(() => parseAsciiDxfRouterProfile(source, { limits })).toThrow(DxfProfileError);
  });

  it('rejects binary, unmatched, and invalid group-code input', () => {
    expect(() => parseAsciiDxfRouterProfile('0\nSECTION\n\0')).toThrow('binary');
    expect(() => parseAsciiDxfRouterProfile('0\nSECTION\n2')).toThrow('unmatched');
    expect(() => parseAsciiDxfRouterProfile('zero\nEOF\n')).toThrow('group code');
  });

  it('enforces the configured block bound without interpreting block contents', () => {
    const source = `0\nSECTION\n2\nBLOCKS\n0\nBLOCK\n2\na\n0\nBLOCK\n2\nb\n0\nENDSEC\n0\nEOF\n`;
    expect(() => parseAsciiDxfRouterProfile(source, { limits: { maxBlocks: 1 } })).toThrow('block limit');
  });
});

describe('router-profile contour transforms and validation', () => {
  const contour = {
    start: { u: 0, v: 0 },
    segments: [
      { kind: 'line' as const, to: { u: 2, v: 0 } },
      { kind: 'arc' as const, to: { u: 2, v: 2 }, radius: 1, clockwise: false }
    ],
    closed: false
  };

  it('reverses a contour while preserving semantic segment geometry', () => {
    const reversed = reverseRouterProfileContour(contour);
    expect(reversed.start).toEqual({ u: 2, v: 2 });
    expect(reversed.segments[0]).toMatchObject({ kind: 'arc', to: { u: 2, v: 0 }, clockwise: true });
    expect(reversed.segments.at(-1)?.to).toEqual({ u: 0, v: 0 });
  });

  it('transforms and reverses cubic controls without changing the curve', () => {
    const cubic = {
      start: { u: 0, v: 0 },
      segments: [
        {
          kind: 'cubicBezier' as const,
          control1: { u: 1, v: 0 },
          control2: { u: 1, v: 1 },
          to: { u: 2, v: 1 }
        }
      ],
      closed: false
    };
    expect(reverseRouterProfileContour(cubic).segments[0]).toEqual({
      kind: 'cubicBezier',
      control1: { u: 1, v: 1 },
      control2: { u: 1, v: 0 },
      to: { u: 0, v: 0 }
    });
    expect(mirrorRouterProfileContour(cubic, 'u').segments[0]).toMatchObject({
      control1: { u: -1, v: 0 },
      control2: { u: -1, v: 1 }
    });
  });

  it('detects a self-crossing contour containing cubic geometry', () => {
    const crossing = {
      start: { u: 0, v: 0 },
      segments: [
        {
          kind: 'cubicBezier' as const,
          control1: { u: 0.3, v: 0.3 },
          control2: { u: 0.7, v: 0.7 },
          to: { u: 1, v: 1 }
        },
        { kind: 'line' as const, to: { u: 0, v: 1 } },
        { kind: 'line' as const, to: { u: 1, v: 0 } }
      ],
      closed: false
    };
    expect(validateRouterProfileContour(crossing)).toMatchObject({ selfIntersects: true, valid: false });
  });

  it('translates, rotates, scales, mirrors, and swaps axes without mutating its input', () => {
    expect(translateRouterProfileContour(contour, 1, -1).start).toEqual({ u: 1, v: -1 });
    expect(rotateRouterProfileContour(contour, Math.PI / 2).segments[0].to.u).toBeCloseTo(0);
    expect(scaleRouterProfileContour(contour, 2).segments[1]).toMatchObject({ radius: 2 });
    expect(mirrorRouterProfileContour(contour, 'u').segments[1]).toMatchObject({ clockwise: true });
    expect(swapRouterProfileContourAxes(contour).segments[0].to).toEqual({ u: 0, v: 2 });
    expect(contour.segments[0].to).toEqual({ u: 2, v: 0 });
  });

  it('detects basic line and curved contour self-intersections', () => {
    const crossing = {
      start: { u: 0, v: 0 },
      segments: [
        { kind: 'line' as const, to: { u: 2, v: 2 } },
        { kind: 'line' as const, to: { u: 0, v: 2 } },
        { kind: 'line' as const, to: { u: 2, v: 0 } }
      ],
      closed: false
    };
    expect(validateRouterProfileContour(crossing)).toMatchObject({ valid: false, selfIntersects: true });
    expect(validateRouterProfileContour(contour)).toMatchObject({ valid: true, selfIntersects: false });
  });
});

describe('DXF spline rejections and repair', () => {
  // A clamped cubic with four controls: the one shape that converts exactly.
  const common = `71\n3\n72\n8\n73\n4\n40\n0\n40\n0\n40\n0\n40\n0\n40\n1\n40\n1\n40\n1\n40\n1\n10\n0\n20\n0\n10\n0\n20\n1\n10\n1\n20\n1\n10\n1\n20\n0\n`;

  it('ignores a spline whose knot count does not match its degree and controls', () => {
    const shortKnots = `71\n3\n72\n4\n73\n4\n40\n0\n40\n0\n40\n1\n40\n1\n10\n0\n20\n0\n10\n0\n20\n1\n10\n1\n20\n1\n10\n1\n20\n0\n`;
    const result = parseAsciiDxfRouterProfile(dxf(`0\nSPLINE\n70\n8\n${shortKnots}`));
    expect(result.warnings.join('\n')).toContain('malformed SPLINE');
  });

  it('ignores a spline whose weights are not positive numbers', () => {
    const result = parseAsciiDxfRouterProfile(dxf(`0\nSPLINE\n70\n12\n${common}41\n1\n41\n0\n41\n2\n41\n1\n`));
    expect(result.warnings.join('\n')).toContain('malformed SPLINE');
  });

  it('ignores a spline whose parameter domain is empty', () => {
    // Every knot identical leaves no span to evaluate across.
    const flat = `71\n3\n72\n8\n73\n4\n40\n1\n40\n1\n40\n1\n40\n1\n40\n1\n40\n1\n40\n1\n40\n1\n10\n0\n20\n0\n10\n0\n20\n1\n10\n1\n20\n1\n10\n1\n20\n0\n`;
    const result = parseAsciiDxfRouterProfile(dxf(`0\nSPLINE\n70\n8\n${flat}`));
    expect(result.warnings.join('\n')).toContain('parameter domain is empty');
  });
});

describe('DXF parse limits and contour validation', () => {
  it('refuses limits that are not whole non-negative counts', () => {
    expect(() => parseAsciiDxfRouterProfile(dxf(line(0, 1, 1, 0)), { limits: { maxCoordinates: -1 } })).toThrow(
      DxfProfileError
    );
    expect(() => parseAsciiDxfRouterProfile(dxf(line(0, 1, 1, 0)), { limits: { maxEntities: 1.5 } })).toThrow(
      /non-negative safe integers/
    );
  });

  it('refuses tolerances that are negative or not finite', () => {
    for (const option of ['connectTolerance', 'repairTolerance', 'splineTolerance'] as const) {
      expect(() => parseAsciiDxfRouterProfile(dxf(line(0, 1, 1, 0)), { [option]: -1 })).toThrow(
        new RegExp(`${option} must be a non-negative finite number`)
      );
      expect(() => parseAsciiDxfRouterProfile(dxf(line(0, 1, 1, 0)), { [option]: Number.NaN })).toThrow(
        DxfProfileError
      );
    }
  });

  it('measures the file against its byte length, not its character count', () => {
    // "µ" is two UTF-8 bytes and "𝄞" is four, so a short string can still
    // outweigh a byte budget that its character count would fit inside.
    const drawing = dxf(line(0, 1, 1, 0), `9\n$PROJECTNAME\n1\nµ𝄞\n`);
    expect(() => parseAsciiDxfRouterProfile(drawing, { limits: { maxFileBytes: drawing.length } })).toThrow(
      /exceeds file size limit/
    );
    expect(() => parseAsciiDxfRouterProfile(drawing, { limits: { maxFileBytes: 4096 } })).not.toThrow();
  });

  it('stops reading once a drawing passes its coordinate budget', () => {
    expect(() =>
      parseAsciiDxfRouterProfile(dxf(line(0, 1, 1, 0) + line(2, 0, 3, 1)), { limits: { maxCoordinates: 2 } })
    ).toThrow(/exceeds coordinate limit/);
  });

  it('reports a contour with no segments and one with non-finite coordinates', () => {
    expect(validateRouterProfileContour({ start: { u: 0, v: 0 }, closed: false, segments: [] }).errors).toContain(
      'Contour has no segments'
    );
    expect(
      validateRouterProfileContour({
        start: { u: 0, v: Number.NaN },
        closed: false,
        segments: [{ kind: 'line', to: { u: 1, v: 0 } }]
      }).errors
    ).toContain('Contour contains non-finite coordinates');
  });

  it('reports a segment that goes nowhere and an arc its endpoints cannot reach', () => {
    expect(
      validateRouterProfileContour({
        start: { u: 0, v: 0 },
        closed: false,
        segments: [{ kind: 'line', to: { u: 0, v: 0 } }]
      }).errors
    ).toContain('Contour contains a degenerate segment');
    // A 0.1" radius cannot span a 2" chord.
    expect(
      validateRouterProfileContour({
        start: { u: 0, v: 0 },
        closed: false,
        segments: [{ kind: 'arc', to: { u: 2, v: 0 }, radius: 0.1, clockwise: false }]
      }).errors
    ).toContain('Contour contains an impossible arc radius');
  });

  it('reports a contour marked closed whose ends do not meet', () => {
    expect(
      validateRouterProfileContour({
        start: { u: 0, v: 0 },
        closed: true,
        segments: [{ kind: 'line', to: { u: 1, v: 1 } }]
      }).errors
    ).toContain('Contour is marked closed but has an endpoint gap');
  });

  it('does not count a genuinely closed contour as self-intersecting at its seam', () => {
    const square = validateRouterProfileContour({
      start: { u: 0, v: 0 },
      closed: true,
      segments: [
        { kind: 'line', to: { u: 1, v: 0 } },
        { kind: 'line', to: { u: 1, v: 1 } },
        { kind: 'line', to: { u: 0, v: 1 } },
        { kind: 'line', to: { u: 0, v: 0 } }
      ]
    });
    expect(square.selfIntersects).toBe(false);
    expect(square.errors).toEqual([]);
  });
});
