import { describe, expect, it, vi } from 'vitest';
import type { Group, GroupMember, Part } from '../types';
import { fixtureProject } from '../../../../tests/fixtures';
import { buildWorkspaceSceneGraph } from './sceneGraph';

function makePart(id: string, overrides: Partial<Part> = {}): Part {
  return {
    id,
    name: id,
    length: 12,
    width: 8,
    thickness: 0.75,
    position: { x: 0, y: 0.375, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    stockId: null,
    grainSensitive: false,
    grainDirection: 'length',
    color: '#fff',
    ...overrides
  };
}

function makeGroup(id: string, name: string = id): Group {
  return { id, name };
}

function makeMember(id: string, groupId: string, memberId: string, memberType: 'part' | 'group' = 'part'): GroupMember {
  return { id, groupId, memberId, memberType };
}

describe('buildWorkspaceSceneGraph', () => {
  describe('flat (no groups)', () => {
    it('every part is a root part-node with no children', () => {
      const parts = [makePart('p1'), makePart('p2'), makePart('p3')];
      const graph = buildWorkspaceSceneGraph({ parts, groups: [], groupMembers: [] });

      expect(graph.nodes.size).toBe(3);
      expect(graph.rootIds.sort()).toEqual(['p1', 'p2', 'p3']);
      for (const id of ['p1', 'p2', 'p3']) {
        const node = graph.findNode(id);
        expect(node).toBeDefined();
        expect(node?.kind).toBe('part');
        expect(node?.parentId).toBeNull();
        expect(node?.childIds).toEqual([]);
      }
    });

    it('descendantPartIds of a part returns just that part', () => {
      const parts = [makePart('p1')];
      const graph = buildWorkspaceSceneGraph({ parts, groups: [], groupMembers: [] });
      expect(graph.descendantPartIds('p1')).toEqual(['p1']);
    });

    it('descendantPartIds of an unknown id returns empty', () => {
      const graph = buildWorkspaceSceneGraph({ parts: [], groups: [], groupMembers: [] });
      expect(graph.descendantPartIds('ghost')).toEqual([]);
    });

    it('ancestorGroupIds of a top-level part is empty', () => {
      const parts = [makePart('p1')];
      const graph = buildWorkspaceSceneGraph({ parts, groups: [], groupMembers: [] });
      expect(graph.ancestorGroupIds('p1')).toEqual([]);
    });
  });

  describe('single-level group', () => {
    it('builds group with the right children and parts with the right parentId', () => {
      const parts = [makePart('p1'), makePart('p2')];
      const groups = [makeGroup('g1')];
      const members = [makeMember('m1', 'g1', 'p1'), makeMember('m2', 'g1', 'p2')];

      const graph = buildWorkspaceSceneGraph({ parts, groups, groupMembers: members });

      expect(graph.rootIds).toEqual(['g1']);
      const g1 = graph.findNode('g1');
      expect(g1?.kind).toBe('group');
      expect(g1?.childIds).toEqual(['p1', 'p2']);

      const p1 = graph.findNode('p1');
      expect(p1?.parentId).toBe('g1');
      const p2 = graph.findNode('p2');
      expect(p2?.parentId).toBe('g1');
    });

    it('descendantPartIds of the group returns its part children', () => {
      const parts = [makePart('p1'), makePart('p2')];
      const groups = [makeGroup('g1')];
      const members = [makeMember('m1', 'g1', 'p1'), makeMember('m2', 'g1', 'p2')];

      const graph = buildWorkspaceSceneGraph({ parts, groups, groupMembers: members });
      expect(graph.descendantPartIds('g1').sort()).toEqual(['p1', 'p2']);
    });

    it('ancestorGroupIds of a child part contains its group', () => {
      const parts = [makePart('p1')];
      const groups = [makeGroup('g1')];
      const members = [makeMember('m1', 'g1', 'p1')];

      const graph = buildWorkspaceSceneGraph({ parts, groups, groupMembers: members });
      expect(graph.ancestorGroupIds('p1')).toEqual(['g1']);
    });
  });

  describe('nested groups', () => {
    it('handles 3 levels of nesting', () => {
      const parts = [makePart('p-leaf')];
      const groups = [makeGroup('g-outer'), makeGroup('g-middle'), makeGroup('g-inner')];
      const members = [
        makeMember('m-outer-middle', 'g-outer', 'g-middle', 'group'),
        makeMember('m-middle-inner', 'g-middle', 'g-inner', 'group'),
        makeMember('m-inner-leaf', 'g-inner', 'p-leaf', 'part')
      ];

      const graph = buildWorkspaceSceneGraph({ parts, groups, groupMembers: members });

      expect(graph.rootIds).toEqual(['g-outer']);
      expect(graph.descendantPartIds('g-outer')).toEqual(['p-leaf']);
      expect(graph.descendantPartIds('g-middle')).toEqual(['p-leaf']);
      expect(graph.descendantPartIds('g-inner')).toEqual(['p-leaf']);

      // Ancestor chain — outermost first.
      expect(graph.ancestorGroupIds('p-leaf')).toEqual(['g-outer', 'g-middle', 'g-inner']);
    });

    it('group with mixed-kind children returns all descendant parts', () => {
      const parts = [makePart('p-a'), makePart('p-b'), makePart('p-c')];
      const groups = [makeGroup('g-outer'), makeGroup('g-inner')];
      const members = [
        // g-outer contains p-a directly + g-inner; g-inner contains p-b and p-c.
        makeMember('m1', 'g-outer', 'p-a', 'part'),
        makeMember('m2', 'g-outer', 'g-inner', 'group'),
        makeMember('m3', 'g-inner', 'p-b', 'part'),
        makeMember('m4', 'g-inner', 'p-c', 'part')
      ];

      const graph = buildWorkspaceSceneGraph({ parts, groups, groupMembers: members });
      expect(graph.descendantPartIds('g-outer').sort()).toEqual(['p-a', 'p-b', 'p-c']);
      expect(graph.descendantPartIds('g-inner').sort()).toEqual(['p-b', 'p-c']);
    });
  });

  describe('disjoint trees', () => {
    it('two top-level groups produce two roots', () => {
      const parts = [makePart('p1'), makePart('p2')];
      const groups = [makeGroup('g1'), makeGroup('g2')];
      const members = [makeMember('m1', 'g1', 'p1'), makeMember('m2', 'g2', 'p2')];

      const graph = buildWorkspaceSceneGraph({ parts, groups, groupMembers: members });
      expect(graph.rootIds.sort()).toEqual(['g1', 'g2']);
      expect(graph.descendantPartIds('g1')).toEqual(['p1']);
      expect(graph.descendantPartIds('g2')).toEqual(['p2']);
    });

    it('top-level part coexists with a top-level group', () => {
      const parts = [makePart('p-free'), makePart('p-grouped')];
      const groups = [makeGroup('g1')];
      const members = [makeMember('m1', 'g1', 'p-grouped')];

      const graph = buildWorkspaceSceneGraph({ parts, groups, groupMembers: members });
      expect(graph.rootIds.sort()).toEqual(['g1', 'p-free']);
      expect(graph.findNode('p-free')?.parentId).toBeNull();
      expect(graph.findNode('p-grouped')?.parentId).toBe('g1');
    });
  });

  describe('malformed inputs', () => {
    it('orphan member (group does not exist) is silently skipped', () => {
      const parts = [makePart('p1')];
      const members = [makeMember('m1', 'g-ghost', 'p1')];
      const graph = buildWorkspaceSceneGraph({ parts, groups: [], groupMembers: members });
      expect(graph.findNode('p1')?.parentId).toBeNull();
    });

    it('orphan member (entity does not exist) is silently skipped', () => {
      const groups = [makeGroup('g1')];
      const members = [makeMember('m1', 'g1', 'p-ghost')];
      const graph = buildWorkspaceSceneGraph({ parts: [], groups, groupMembers: members });
      expect(graph.findNode('g1')?.childIds).toEqual([]);
    });

    it('duplicate part id throws', () => {
      const parts = [makePart('dup'), makePart('dup')];
      expect(() => buildWorkspaceSceneGraph({ parts, groups: [], groupMembers: [] })).toThrow(/duplicate part id/);
    });

    it('id appearing as both part and group throws', () => {
      const parts = [makePart('shared')];
      const groups = [makeGroup('shared')];
      expect(() => buildWorkspaceSceneGraph({ parts, groups, groupMembers: [] })).toThrow(/both a part and a group/);
    });

    it('cycle in group hierarchy is tolerated (warns, does not throw)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const groups = [makeGroup('a'), makeGroup('b')];
        const members = [makeMember('m1', 'a', 'b', 'group'), makeMember('m2', 'b', 'a', 'group')];
        const graph = buildWorkspaceSceneGraph({ parts: [], groups, groupMembers: members });
        // Build succeeds, runtime traversal terminates.
        expect(graph.descendantPartIds('a')).toEqual([]);
        expect(graph.descendantPartIds('b')).toEqual([]);
        // ancestorGroupIds also terminates on the cyclic chain.
        const aAncestors = graph.ancestorGroupIds('a');
        expect(aAncestors.length).toBeLessThan(100);
        expect(warnSpy).toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('self-cycle is tolerated (warns, does not throw)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const groups = [makeGroup('a')];
        const members = [makeMember('m1', 'a', 'a', 'group')];
        const graph = buildWorkspaceSceneGraph({ parts: [], groups, groupMembers: members });
        expect(graph.descendantPartIds('a')).toEqual([]);
        expect(warnSpy).toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('part is reachable from a group even when sibling groups cycle', () => {
      // The legacy `getAllDescendantPartIds` returned reachable parts even
      // when malformed group data formed cycles. Match that.
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const parts = [makePart('p1')];
        const groups = [makeGroup('a'), makeGroup('b')];
        const members = [
          makeMember('m1', 'a', 'b', 'group'),
          makeMember('m2', 'b', 'a', 'group'),
          makeMember('m3', 'a', 'p1', 'part')
        ];
        const graph = buildWorkspaceSceneGraph({ parts, groups, groupMembers: members });
        expect(graph.descendantPartIds('a')).toEqual(['p1']);
      } finally {
        warnSpy.mockRestore();
      }
    });
  });

  describe('memoization', () => {
    it('descendantPartIds returns the same reference across calls', () => {
      const parts = [makePart('p1'), makePart('p2')];
      const groups = [makeGroup('g1')];
      const members = [makeMember('m1', 'g1', 'p1'), makeMember('m2', 'g1', 'p2')];
      const graph = buildWorkspaceSceneGraph({ parts, groups, groupMembers: members });
      const a = graph.descendantPartIds('g1');
      const b = graph.descendantPartIds('g1');
      expect(a).toBe(b);
    });

    it('ancestorGroupIds returns the same reference across calls', () => {
      const parts = [makePart('p1')];
      const groups = [makeGroup('g1'), makeGroup('g2')];
      const members = [makeMember('m1', 'g1', 'g2', 'group'), makeMember('m2', 'g2', 'p1', 'part')];
      const graph = buildWorkspaceSceneGraph({ parts, groups, groupMembers: members });
      const a = graph.ancestorGroupIds('p1');
      const b = graph.ancestorGroupIds('p1');
      expect(a).toBe(b);
    });
  });

  describe('fixtures', () => {
    it('S0 empty scene builds an empty graph', () => {
      const project = fixtureProject('S0');
      const graph = buildWorkspaceSceneGraph(project);
      expect(graph.nodes.size).toBe(0);
      expect(graph.rootIds).toEqual([]);
    });

    it('S1 five-part assembly: every part is a root', () => {
      const project = fixtureProject('S1');
      const graph = buildWorkspaceSceneGraph(project);
      expect(graph.nodes.size).toBe(5);
      expect(graph.rootIds.length).toBe(5);
    });

    it('S2 fifty-part with row groups: 5 root groups, each contains 10 parts', () => {
      const project = fixtureProject('S2');
      const graph = buildWorkspaceSceneGraph(project);
      const rootGroups = graph.rootIds
        .map((id) => graph.findNode(id))
        .filter((n): n is NonNullable<typeof n> => n !== undefined && n.kind === 'group');
      expect(rootGroups.length).toBe(5);
      for (const group of rootGroups) {
        expect(group.childIds.length).toBe(10);
        expect(graph.descendantPartIds(group.id).length).toBe(10);
      }
    });

    it('S4 nested-groups: descendantPartIds at outer level rolls up everything reachable', () => {
      const project = fixtureProject('S4');
      const graph = buildWorkspaceSceneGraph(project);
      // Outer group is the only root in S4
      const outer = graph.findNode('S4-outer');
      expect(outer?.kind).toBe('group');
      // S4 has 5 inner + 5 sibling + 10 middle + 10 outer = 30 parts under S4-outer
      expect(graph.descendantPartIds('S4-outer').length).toBe(30);
    });
  });
});
