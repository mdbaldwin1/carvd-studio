import { describe, expect, it } from 'vitest';
import {
  ALL_FIXTURE_IDS,
  customRotationScene,
  emptyScene,
  fiftyPartAssembly,
  fiveHundredPartStress,
  fivePartAssembly,
  fixtureProject,
  nestedGroupsScene
} from './index';

describe('fixtures', () => {
  it('S0 empty scene has no parts, stocks, or groups', () => {
    const p = emptyScene();
    expect(p.parts).toHaveLength(0);
    expect(p.stocks).toHaveLength(0);
    expect(p.groups).toHaveLength(0);
    expect(p.groupMembers).toHaveLength(0);
  });

  it('S1 five-part assembly has 5 parts and 1 stock', () => {
    const p = fivePartAssembly();
    expect(p.parts).toHaveLength(5);
    expect(p.stocks).toHaveLength(1);
    expect(p.parts.every((part) => part.stockId === p.stocks[0].id)).toBe(true);
  });

  it('S2 fifty-part assembly has 50 parts in 5 row groups', () => {
    const p = fiftyPartAssembly();
    expect(p.parts).toHaveLength(50);
    expect(p.groups).toHaveLength(5);
    expect(p.groupMembers).toHaveLength(50);
  });

  it('S3 stress scene has 500 parts', () => {
    const p = fiveHundredPartStress();
    expect(p.parts).toHaveLength(500);
    expect(p.groups).toHaveLength(10);
  });

  it('S4 nested-group scene has groups three levels deep', () => {
    const p = nestedGroupsScene();
    expect(p.groups.map((g) => g.id).sort()).toEqual(['S4-inner', 'S4-middle', 'S4-outer', 'S4-sibling'].sort());
    // outer -> middle (group)
    expect(
      p.groupMembers.find((gm) => gm.groupId === 'S4-outer' && gm.memberId === 'S4-middle' && gm.memberType === 'group')
    ).toBeDefined();
    // middle -> inner (group)
    expect(
      p.groupMembers.find((gm) => gm.groupId === 'S4-middle' && gm.memberId === 'S4-inner' && gm.memberType === 'group')
    ).toBeDefined();
  });

  it('S5 custom-rotation scene has 20 angled parts', () => {
    const p = customRotationScene();
    expect(p.parts).toHaveLength(20);
    expect(p.parts.some((part) => part.rotation.y !== 0)).toBe(true);
  });

  it('every fixture is deterministic — two calls produce identical projects', () => {
    for (const id of ALL_FIXTURE_IDS) {
      const a = fixtureProject(id);
      const b = fixtureProject(id);
      expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
    }
  });

  it('every fixture has distinct part IDs', () => {
    for (const id of ALL_FIXTURE_IDS) {
      const p = fixtureProject(id);
      const ids = new Set(p.parts.map((part) => part.id));
      expect(ids.size).toBe(p.parts.length);
    }
  });

  it('every fixture has distinct group IDs', () => {
    for (const id of ALL_FIXTURE_IDS) {
      const p = fixtureProject(id);
      const ids = new Set(p.groups.map((g) => g.id));
      expect(ids.size).toBe(p.groups.length);
    }
  });

  it('group members reference real groups + parts', () => {
    for (const id of ALL_FIXTURE_IDS) {
      const p = fixtureProject(id);
      const groupIds = new Set(p.groups.map((g) => g.id));
      const partIds = new Set(p.parts.map((part) => part.id));
      for (const gm of p.groupMembers) {
        expect(groupIds.has(gm.groupId)).toBe(true);
        if (gm.memberType === 'part') {
          expect(partIds.has(gm.memberId)).toBe(true);
        } else {
          expect(groupIds.has(gm.memberId)).toBe(true);
        }
      }
    }
  });
});
