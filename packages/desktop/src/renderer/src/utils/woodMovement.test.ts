import { describe, expect, it } from 'vitest';
import { createTestPart, createTestStock } from '../../../../tests/helpers/factories';
import type { RectCutFeature } from '../types';
import { estimateSeasonalMovement, getAcrossGrainWidth, movesSeasonally, needsMovementAllowance } from './woodMovement';
import { findGrainCutMismatches, getCutRun } from './grainDirectionCuts';

const panel = (width: number, grainDirection: 'length' | 'width' = 'length') =>
  createTestPart({ id: 'panel', length: 24, width, thickness: 0.75, grainSensitive: true, grainDirection });

const solid = createTestStock({ form: 'board' });

describe('seasonal movement', () => {
  it('moves a solid panel across the grain and not along it', () => {
    // A 12" panel swings about an eighth of an inch over the year.
    expect(estimateSeasonalMovement(panel(12), solid)).toBeCloseTo(0.125);
    expect(estimateSeasonalMovement(panel(24), solid)).toBeCloseTo(0.25);
  });

  it('measures the width that actually runs across the grain', () => {
    // Grain along the length: the width moves.
    expect(getAcrossGrainWidth(panel(12))).toBe(12);
    // Cross-cut from a wide board: now it is the length that moves.
    expect(getAcrossGrainWidth(panel(12, 'width'))).toBe(24);
    expect(estimateSeasonalMovement(panel(12, 'width'), solid)).toBeCloseTo(0.25);
  });

  it('does not infer material movement from sheet face grain', () => {
    const ply = createTestPart({ id: 'ply', length: 24, width: 24, grainSensitive: true });
    expect(movesSeasonally(ply, createTestStock({ form: 'sheet' }))).toBe(false);
    expect(estimateSeasonalMovement(ply, createTestStock({ form: 'sheet' }))).toBe(0);
    expect(needsMovementAllowance(ply, createTestStock({ form: 'sheet' }))).toBe(false);
  });

  it('says nothing about a rail narrow enough for the joint to swallow it', () => {
    // A 3" rail moves about a thirty-second, which disappears into any joint.
    expect(needsMovementAllowance(panel(3), solid)).toBe(false);
    expect(needsMovementAllowance(panel(12), solid)).toBe(true);
  });

  it('retains solid-stock movement with free nesting and does not guess unknown material', () => {
    const part = { ...panel(12), grainSensitive: false };
    expect(estimateSeasonalMovement(part, solid)).toBeCloseTo(0.125);
    expect(estimateSeasonalMovement(part)).toBe(0);
    expect(estimateSeasonalMovement(part, createTestStock())).toBe(0);
  });

  it('scales with the width rather than being a fixed fudge', () => {
    const narrow = estimateSeasonalMovement(panel(8), solid);
    const wide = estimateSeasonalMovement(panel(16), solid);
    expect(wide).toBeCloseTo(narrow * 2);
  });
});

describe('a dado is cut across the grain and a groove runs with it', () => {
  const channel = (cutType: RectCutFeature['cutType']): RectCutFeature => ({
    id: `${cutType}-1`,
    kind: 'rect_cut',
    version: 1,
    enabled: true,
    cutType,
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'min' },
    parameters: { size: { length: 0.75, width: 0 }, depthMode: 'blind', depth: 0.25 },
    placement: { x: 4, z: 0 }
  });

  it('knows which way each channel travels', () => {
    expect(getCutRun('dado')).toBe('across_width');
    expect(getCutRun('half_lap')).toBe('across_width');
    expect(getCutRun('groove')).toBe('along_length');
    expect(getCutRun('mortise')).toBeNull();
  });

  it('says nothing while the grain runs along the board', () => {
    // The ordinary case: a dado spans the width and so crosses the grain.
    const ordinary = createTestPart({ grainSensitive: true, grainDirection: 'length', features: [channel('dado')] });
    expect(findGrainCutMismatches(ordinary)).toEqual([]);
  });

  it('calls out a dado that actually runs with the grain', () => {
    const crossCut = createTestPart({ grainSensitive: true, grainDirection: 'width', features: [channel('dado')] });
    const [issue] = findGrainCutMismatches(crossCut);
    expect(issue.shouldBe).toBe('groove');
    expect(issue.message).toMatch(/with the grain/i);
  });

  it('calls out a groove that actually crosses the grain', () => {
    const crossCut = createTestPart({ grainSensitive: true, grainDirection: 'width', features: [channel('groove')] });
    expect(findGrainCutMismatches(crossCut)[0].shouldBe).toBe('dado');
  });

  it('holds no opinion about sheet goods, where neither name is wrong', () => {
    const ply = createTestPart({ grainSensitive: false, grainDirection: 'width', features: [channel('dado')] });
    expect(findGrainCutMismatches(ply)).toEqual([]);
  });

  it('ignores cuts that are neither, and disabled ones', () => {
    const part = createTestPart({
      grainSensitive: true,
      grainDirection: 'width',
      features: [channel('mortise'), { ...channel('dado'), id: 'off', enabled: false }]
    });
    expect(findGrainCutMismatches(part)).toEqual([]);
  });
});
