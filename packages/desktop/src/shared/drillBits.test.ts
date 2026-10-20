import { describe, expect, it } from 'vitest';
import {
  BRAD_POINT_BITS,
  bitReachesDepth,
  DRILL_BIT_CATALOG,
  FORSTNER_BITS,
  findBitForDiameter,
  METRIC_BRAD_POINT_BITS
} from './drillBits';

describe('drill bits', () => {
  it('ships a fractional brad-point index by sixteenths', () => {
    expect(BRAD_POINT_BITS.map((bit) => bit.diameter)).toEqual([0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]);
    expect(BRAD_POINT_BITS.every((bit) => bit.kind === 'brad_point')).toBe(true);
  });

  it('names fractional bits the way they are marked on the shank', () => {
    const names = DRILL_BIT_CATALOG.map((bit) => bit.name);
    expect(names).toContain('3/8" Brad Point');
    expect(names).toContain('1/2" Brad Point');
    expect(names).toContain('1" Forstner');
    expect(names).toContain('8 mm Brad Point');
  });

  it('ships metric bits for metric dowel', () => {
    const eight = METRIC_BRAD_POINT_BITS.find((bit) => bit.name.startsWith('8 mm'));
    expect(eight?.diameter).toBeCloseTo(8 / 25.4, 9);
  });

  it('gives every bit a distinct id', () => {
    expect(new Set(DRILL_BIT_CATALOG.map((bit) => bit.id)).size).toBe(DRILL_BIT_CATALOG.length);
  });

  it('finds the bit that bores a hole, preferring the kind a dowel wants', () => {
    // 3/8" exists as both brad point and Forstner; a dowel wants the flat rim.
    expect(findBitForDiameter(0.375)?.kind).toBe('brad_point');
    // 1-1/4" is a Forstner size only.
    expect(findBitForDiameter(1.25)?.kind).toBe('forstner');
    expect(findBitForDiameter(0.3)).toBeUndefined();
  });

  it('knows a Forstner runs out of flute long before a twist bit does', () => {
    const forstner = FORSTNER_BITS[0];
    const bradPoint = BRAD_POINT_BITS[2];
    expect(bitReachesDepth(forstner, 1.5)).toBe(true);
    expect(bitReachesDepth(forstner, 2)).toBe(false);
    // The same 2" hole is well within a brad point's reach.
    expect(bitReachesDepth(bradPoint, 2)).toBe(true);
  });
});
