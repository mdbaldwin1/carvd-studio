import { describe, expect, it, vi } from 'vitest';
import { Euler, MathUtils, Quaternion, Vector3 } from 'three';
import type { EdgeProfileFeature, Part } from '../types';
import { createTestPart } from '../../../../tests/helpers/factories';
import { getRuleJointEdges, guideRuleJointDrag } from './ruleJoint';
import { getAssemblyReferences, planAssembly, suggestAssembly } from './assemblyLayout';
import { partsOverlapInMaterial } from './partFeatureGeometry';

vi.unmock('three');
const profile = (kind: 'roundover' | 'cove', edge: EdgeProfileFeature['target']['edge']): EdgeProfileFeature => ({
  id: kind,
  kind: 'edge_profile',
  version: 1,
  enabled: true,
  profile: kind,
  target: { type: 'edge', edge },
  reference: { primaryFrom: 'min', secondaryFrom: 'min' },
  parameters: { size: 0.75, depth: 0.75 }
});
const table = () =>
  createTestPart({
    id: 'table',
    length: 12,
    width: 8,
    thickness: 0.75,
    position: { x: 12.75, y: 0.375, z: 3.75 },
    features: [profile('roundover', 'top_front_edge')]
  });
const leaf = () =>
  createTestPart({
    id: 'leaf',
    length: 12,
    width: 8,
    thickness: 0.75,
    position: { x: 12.75, y: 0.375, z: 11 },
    features: [profile('cove', 'bottom_back_edge')]
  });
const arrange = (pair: [Part, Part]) => {
  const suggestion = suggestAssembly(pair);
  return {
    suggestion,
    placed: planAssembly(pair[suggestion.swapped ? 1 : 0], pair[suggestion.swapped ? 0 : 1], suggestion.options)!
  };
};

describe('exact circular rule-joint public assembly path', () => {
  it('recognizes the UI-authored native fixture in either selection order and overlaps by one radius', () => {
    for (const pair of [
      [table(), leaf()],
      [leaf(), table()]
    ] as [Part, Part][]) {
      const before = JSON.stringify(pair);
      const { suggestion, placed } = arrange(pair);
      expect(suggestion.options.movingReference).toBe('rule-joint:cove');
      expect(suggestion.options.fixedReference).toBe('rule-joint:roundover');
      expect(placed.position.x).toBeCloseTo(12.75);
      expect(placed.position.y).toBeCloseTo(0.375);
      expect(placed.position.z).toBeCloseTo(11);
      expect(partsOverlapInMaterial(placed, table())).toBe(false);
      expect(partsOverlapInMaterial({ ...placed, features: [] }, table())).toBe(true);
      expect(JSON.stringify(pair)).toBe(before);
      expect(getAssemblyReferences(placed).find((ref) => ref.id === 'rule-joint:cove')?.label).toContain('cove');
    }
  });

  it('seats rotated boards in the fixed board local frame', () => {
    const fixed = { ...table(), rotation: { x: 13, y: 31, z: 7 } };
    const { placed } = arrange([leaf(), fixed]);
    const q = new Quaternion().setFromEuler(
      new Euler(...([13, 31, 7].map(MathUtils.degToRad) as [number, number, number]))
    );
    const expected = new Vector3(0, 0, 7.25).applyQuaternion(q).add(new Vector3(12.75, 0.375, 3.75));
    expect(new Vector3(placed.position.x, placed.position.y, placed.position.z).distanceTo(expected)).toBeLessThan(
      1e-7
    );
    expect(partsOverlapInMaterial(placed, fixed)).toBe(false);
  });

  it.each([
    ['front', 'back'],
    ['back', 'front'],
    ['left', 'right'],
    ['right', 'left']
  ] as const)('seats complementary %s/%s edges without material penetration', (roundSide, coveSide) => {
    for (const roundTop of [true, false]) {
      const a = { ...table(), features: [profile('roundover', `${roundTop ? 'top' : 'bottom'}_${roundSide}_edge`)] };
      const b = { ...leaf(), features: [profile('cove', `${roundTop ? 'bottom' : 'top'}_${coveSide}_edge`)] };
      const { placed } = arrange([b, a]);
      expect(partsOverlapInMaterial(placed, a)).toBe(false);
      expect(partsOverlapInMaterial({ ...placed, features: [] }, a)).toBe(true);
    }
  });

  it.each(['front_left_edge', 'front_right_edge', 'back_left_edge', 'back_right_edge'] as const)(
    'does not misclassify the vertical %s corner as a horizontal profiled edge',
    (edge) => {
      const vertical = { ...leaf(), features: [profile('cove', edge)] };
      expect(getRuleJointEdges(vertical)).toEqual([]);
      expect(getAssemblyReferences(vertical).some((reference) => reference.kind === 'profile')).toBe(false);
      expect(suggestAssembly([vertical, table()]).options.movingReference).not.toBe('rule-joint:cove');
      expect(guideRuleJointDrag(vertical, [table()], { x: 0, y: 0, z: 0 })).toBeNull();
    }
  );

  it('rejects unsafe profile mixing, reveals and saved custom contours', () => {
    const a = table();
    const b = leaf();
    for (const bad of [
      { ...b, thickness: 1 },
      { ...b, features: [{ ...profile('cove', 'bottom_back_edge'), parameters: { size: 0.5, depth: 0.75 } }] },
      { ...b, features: [{ ...profile('cove', 'bottom_back_edge'), routerProfileId: 'custom-cove' }] },
      { ...b, features: [{ ...profile('cove', 'bottom_back_edge'), enabled: false }] }
    ])
      expect(getRuleJointEdges(bad)).toEqual([]);
    const options = arrange([b, a]).suggestion.options;
    expect(planAssembly(b, a, { ...options, quarterTurns: 1 })).toBeNull();
    expect(planAssembly(b, a, { ...options, across: 'start' })).toBeNull();
    expect(planAssembly(b, a, { ...options, fixedReference: 'front_face' })).toBeNull();
    expect(planAssembly({ ...b, features: [profile('cove', 'top_back_edge')] }, a, options)).toBeNull();
  });
});

describe('rule-joint hand guidance', () => {
  it('keeps an engaged pair level on withdrawal and stops at its seat', () => {
    const a = table();
    const b = leaf();
    expect(guideRuleJointDrag(b, [a, b], { x: 0.12, y: 0.3, z: 0.4 })).toEqual({ x: 0, y: 0, z: 0.4 });
    expect(guideRuleJointDrag(b, [a, b], { x: 0.12, y: 0.3, z: -0.4 })).toEqual({ x: 0, y: 0, z: 0 });
    expect(guideRuleJointDrag(b, [a, b], { x: 1, y: 0, z: 2 })).toBeNull();
  });
  it('guides in the rotated joint frame rather than world horizontal', () => {
    const rotation = { x: 0, y: 37, z: 0 };
    const a = { ...table(), rotation };
    const b = arrange([leaf(), a]).placed;
    const q = new Quaternion().setFromEuler(new Euler(0, MathUtils.degToRad(37), 0));
    const expected = new Vector3(0, 0, 0.4).applyQuaternion(q);
    const hand = new Vector3(0.1, 0.15, 0.4).applyQuaternion(q);
    const guided = guideRuleJointDrag(b, [a, b], hand)!;
    expect(new Vector3(guided.x, guided.y, guided.z).distanceTo(expected)).toBeLessThan(1e-7);
    expect(guideRuleJointDrag({ ...b, rotation: { x: 0, y: 0, z: 0 } }, [a], hand)).toBeNull();
  });

  it('re-seats a nearby withdrawn board without lifting it and ignores distant candidates', () => {
    const a = table();
    const b = { ...leaf(), position: { x: 13.75, y: 0.375, z: 13 } };
    const guide = guideRuleJointDrag(b, [a, b], { x: -0.9, y: 0.1, z: -1.9 });
    expect(guide).toEqual({ x: -1, y: 0, z: -2 });
    expect(guideRuleJointDrag(b, [a, b], { x: 0, y: 0, z: 0 })).toBeNull();
    expect(guideRuleJointDrag(b, [a, { ...a, id: 'ambiguous' }, b], { x: -0.9, y: 0.1, z: -1.9 })).toBeNull();
  });
});
