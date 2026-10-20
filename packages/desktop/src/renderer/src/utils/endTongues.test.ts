import { describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { RectCutFeature } from '../types';
import { getEndTongues } from './edgeTongues';
import { getAssemblyReferences, planAssembly, suggestAssembly } from './assemblyLayout';
import { planHousingFit, resolveHousingRoles } from './fitHousing';
import { partsOverlapInMaterial } from './partFeatureGeometry';
vi.unmock('three');
const tongue = (right = false, top = false) =>
  createTestPart({
    id: 'shelf',
    length: 8,
    width: 8,
    thickness: 0.75,
    features: [
      {
        id: 'rebate',
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        cutType: 'cutout',
        target: { type: 'face', face: top ? 'top_face' : 'bottom_face' },
        reference: { primaryFrom: 'min' },
        parameters: { size: { length: 0.25, width: 8 }, depthMode: 'blind', depth: 0.5 },
        placement: { x: right ? 7.75 : 0, z: 0 }
      }
    ]
  });
const host = (rotated = false) =>
  createTestPart({
    id: 'side',
    length: 18,
    width: 8,
    thickness: 0.75,
    position: { x: 3, y: 20, z: 5 },
    rotation: rotated ? { x: 17, y: 31, z: 23 } : { x: 0, y: 0, z: 0 },
    features: [
      {
        id: 'dado',
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        cutType: 'dado',
        target: { type: 'face', face: 'top_face' },
        reference: { primaryFrom: 'min' },
        parameters: { size: { length: 0.25, width: 8 }, depthMode: 'blind', depth: 0.25 },
        placement: { x: 8, z: 0 }
      }
    ]
  });
describe('rebated end tongues in dadoes', () => {
  for (const right of [false, true])
    for (const top of [false, true])
      for (const rotated of [false, true])
        for (const reversed of [false, true])
          it(`seats and fits ${right ? 'right' : 'left'} ${top ? 'top' : 'bottom'} rebate, rotated=${rotated}, reverse=${reversed}`, () => {
            const shelf = tongue(right, top);
            const side = host(rotated);
            const pair: [typeof shelf, typeof side] = reversed ? [side, shelf] : [shelf, side];
            const suggestion = suggestAssembly(pair);
            const moving = pair[suggestion.swapped ? 1 : 0];
            const fixed = pair[suggestion.swapped ? 0 : 1];
            expect(moving.id).toBe(shelf.id);
            expect(suggestion.options.movingReference).toMatch(/^end-tongue:/);
            expect(suggestion.options.insertion).toBe(0);
            const planned = planAssembly(moving, fixed, suggestion.options)!;
            expect(partsOverlapInMaterial(planned, side)).toBe(false);
            expect(partsOverlapInMaterial(planned, { ...side, features: [] })).toBe(true);
            const reference = getAssemblyReferences(shelf).find((ref) => ref.id.startsWith('end-tongue:'))!;
            expect(reference.height).toBe(0.25);
            expect(reference.center.y).toBe(top ? -0.25 : 0.25);
            const fit = planHousingFit(planned, side)!;
            expect(fit.usesTongue).toBe(true);
            expect(fit.width).toBeCloseTo(0.25);
            expect(fit.changed).toBe(false);
            expect(resolveHousingRoles(planned, side)).toEqual(resolveHousingRoles(side, planned));
          });
  it('fits the plain end thickness when the only end tongue faces away from the dado', () => {
    const shelf = tongue();
    const side = host();
    const suggestion = suggestAssembly([shelf, side]);
    const placed = planAssembly(shelf, side, suggestion.options)!;
    // Keep the actual pose, but rebate the opposite end: the plain end now enters.
    const opposite = { ...placed, features: tongue(true).features };
    const fit = planHousingFit(opposite, side)!;
    expect(fit.usesTongue).toBe(false);
    expect(fit.width).toBeCloseTo(0.75);
  });

  it('rejects partial-width, through, zero-thickness, mismatched, or obstructed end cuts', () => {
    const base = tongue();
    const modify = (change: (cut: RectCutFeature) => void) => {
      const part = globalThis.structuredClone(base);
      change(part.features![0] as RectCutFeature);
      return part;
    };
    expect(getEndTongues(modify((cut) => (cut.parameters.size.width = 4)))).toEqual([]);
    expect(getEndTongues(modify((cut) => (cut.parameters.depthMode = 'through')))).toEqual([]);
    expect(getEndTongues(modify((cut) => (cut.parameters.depth = 0.75)))).toEqual([]);
    expect(getEndTongues(modify((cut) => (cut.parameters.taperAngle = 8)))).toEqual([]);
    const two = globalThis.structuredClone(base);
    const second = globalThis.structuredClone(two.features![0]) as RectCutFeature;
    second.id = 'other';
    second.target = { type: 'face', face: 'top_face' };
    second.parameters.depth = 0.125;
    second.parameters.size.length = 0.5;
    two.features!.push(second);
    expect(getEndTongues(two)).toEqual([]);
    second.parameters.size.length = 0.25;
    second.parameters.size.width = 4;
    expect(getEndTongues(two)).toEqual([]);
  });
});
