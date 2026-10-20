import { describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import { planJointLayout } from './jointLayout';
import { clonePartFeaturesForCopy } from './partFeatures';
vi.unmock('three');

describe('shared joint layout', () => {
  const a = createTestPart({ id: 'a', length: 12, width: 3, thickness: 0.75 });
  const b = createTestPart({ id: 'b', length: 12, width: 3, thickness: 0.75 });
  const options = { kind: 'box' as const, count: 2, slope: 10, blindDepth: 0.5 };
  it('keeps copied layouts independent and drops incomplete pair references', () => {
    const initial = planJointLayout(a, b, options);
    const copied = clonePartFeaturesForCopy(
      initial.first,
      new Map([
        ['a', 'copy-a'],
        ['b', 'copy-b']
      ]),
      new Map()
    )!;
    expect(copied[0].metadata?.jointLayout).toMatchObject({
      firstPartId: 'copy-a',
      secondPartId: 'copy-b',
      key: 'joint-layout:copy-a:copy-b'
    });
    const single = clonePartFeaturesForCopy(initial.first, new Map([['a', 'single']]), new Map())!;
    expect(single[0].metadata?.jointLayout).toBeUndefined();
    expect(initial.first[0].metadata?.jointLayout).toMatchObject({ firstPartId: 'a', secondPartId: 'b' });
  });
  it('uses the other board’s actual thickness and complementary finger positions', () => {
    const result = planJointLayout(a, { ...b, thickness: 0.71875 }, options);
    expect(result.error).toBeNull();
    expect(result.first).toMatchObject([
      { parameters: { size: { length: 0.71875, width: 0.75 } }, placement: { z: 0 } },
      { placement: { z: 1.5 } }
    ]);
    expect(result.second).toMatchObject([
      { parameters: { size: { length: 0.75, width: 0.75 } }, placement: { z: 0.75 } },
      { placement: { z: 2.25 } }
    ]);
  });
  it('transfers dovetail splay into the complementary socket walls', () => {
    const result = planJointLayout(a, b, { ...options, kind: 'through_dovetail' });
    expect(result.error).toBeNull();
    expect(result.first).toHaveLength(3);
    expect(result.second).toHaveLength(2);
    expect(result.first[1]).toMatchObject({
      parameters: { taperAngle: 10, size: { length: 0.75, width: 0.4 } },
      placement: { z: 1.3 }
    });
    expect(result.second[0]).toMatchObject({ parameters: { sideWallAngle: -10 } });
  });
  it('leaves the front intact for half-blind sockets and accounts for the narrow mouth', () => {
    const result = planJointLayout(a, b, { ...options, kind: 'half_blind_dovetail' });
    expect(result.error).toBeNull();
    expect(result.second[0]).toMatchObject({
      cutType: 'mortise',
      parameters: { depthMode: 'blind', depth: 0.5, sideWallAngle: 10 }
    });
    if (result.second[0].kind !== 'rect_cut') throw new Error('Expected socket');
    expect(result.second[0].parameters.size.width).toBeCloseTo(0.9 - Math.tan(Math.PI / 18));
  });
  it('replaces only its own cuts when the count changes', () => {
    const initial = planJointLayout(a, b, options);
    const unrelated = { ...initial.first[0], id: 'unrelated', metadata: undefined };
    const changed = planJointLayout(
      { ...a, features: [...initial.first, unrelated] },
      { ...b, features: initial.second },
      { ...options, count: 3 }
    );
    expect(changed.first).toHaveLength(4);
    expect(changed.first[0]).toBe(unrelated);
    expect(changed.second).toHaveLength(3);
  });
  it('rejects impossible layouts before changing either board', () => {
    expect(planJointLayout(a, b, { ...options, kind: 'sliding_dovetail', housingDepth: 0.75 }).error).toContain(
      'Leave wood'
    );
    expect(planJointLayout(a, b, { ...options, kind: 'sliding_dovetail', receiverOffset: 12 }).error).not.toBeNull();
    expect(planJointLayout(a, b, { ...options, count: 32 }).error).toContain('narrower');
    expect(planJointLayout(a, b, { ...options, kind: 'half_blind_dovetail', blindDepth: 0.75 }).error).toContain(
      'leave wood'
    );
  });
  it('keeps a sliding housing on its center mark as cutter depth and slope change', () => {
    for (const [housingDepth, slope] of [
      [0.25, 7],
      [0.375, 14],
      [0.5, 20]
    ]) {
      const plan = planJointLayout(a, b, {
        ...options,
        kind: 'sliding_dovetail',
        housingCenter: 4,
        housingDepth,
        slope
      });
      expect(plan.error).toBeNull();
      const housing = plan.second[0];
      if (housing.kind !== 'rect_cut') throw new Error('Expected housing');
      expect(housing.placement.x + housing.parameters.size.length / 2).toBeCloseTo(4, 12);
      expect(housing.metadata?.jointLayout).toMatchObject({ housingCenter: 4 });
    }
  });
});
