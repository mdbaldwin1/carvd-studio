import { describe, expect, it } from 'vitest';
import {
  getAllDescendantGroupIds,
  getAllDescendantPartIds,
  resolveReferenceEntities,
  resolveExplicitSelectedPartIds,
  resolveSelectionEntities,
  resolveMeasurementSelectionEntities
} from './interactionSelection';
import type { GroupMember } from '../types';

const groupMembers: GroupMember[] = [
  { id: 'gm1', groupId: 'g1', memberType: 'part', memberId: 'p1' },
  { id: 'gm2', groupId: 'g1', memberType: 'group', memberId: 'g2' },
  { id: 'gm3', groupId: 'g2', memberType: 'part', memberId: 'p2' },
  { id: 'gm4', groupId: 'g3', memberType: 'part', memberId: 'p3' }
];

describe('interactionSelection', () => {
  it('resolves explicit selected parts through group descendants', () => {
    expect(
      resolveExplicitSelectedPartIds({ selectedPartIds: [], selectedGroupIds: ['g1'] }, groupMembers).sort()
    ).toEqual(['p1', 'p2']);
    expect(getAllDescendantPartIds('g1', groupMembers).sort()).toEqual(['p1', 'p2']);
  });

  it('resolves descendant parts for empty, direct, and nested groups', () => {
    expect(getAllDescendantPartIds('g1', groupMembers).sort()).toEqual(['p1', 'p2']);
    expect(getAllDescendantPartIds('g3', groupMembers)).toEqual(['p3']);
    expect(getAllDescendantPartIds('missing', groupMembers)).toEqual([]);
  });

  it('resolves descendant groups with legacy self-inclusive semantics', () => {
    expect(getAllDescendantGroupIds('g1', groupMembers)).toEqual(['g1', 'g2']);
    expect(getAllDescendantGroupIds('g3', groupMembers)).toEqual(['g3']);
  });

  it('builds measurement entities from selected groups and standalone parts', () => {
    expect(
      resolveMeasurementSelectionEntities({ selectedPartIds: ['p3'], selectedGroupIds: ['g1'] }, groupMembers)
    ).toEqual([
      { id: 'g1', kind: 'group', partIds: ['p1', 'p2'] },
      { id: 'p3', kind: 'part', partIds: ['p3'] }
    ]);
  });

  it('builds generic selection entities from selected groups and standalone parts', () => {
    expect(resolveSelectionEntities({ selectedPartIds: ['p3'], selectedGroupIds: ['g1'] }, groupMembers)).toEqual([
      { id: 'g1', kind: 'group', partIds: ['p1', 'p2'] },
      { id: 'p3', kind: 'part', partIds: ['p3'] }
    ]);
  });

  it('suppresses nested selected groups when a parent group is also selected', () => {
    expect(
      resolveMeasurementSelectionEntities({ selectedPartIds: [], selectedGroupIds: ['g1', 'g2'] }, groupMembers)
    ).toEqual([{ id: 'g1', kind: 'group', partIds: ['p1', 'p2'] }]);
  });

  it('suppresses selected parts already covered by a selected group', () => {
    expect(
      resolveMeasurementSelectionEntities({ selectedPartIds: ['p1', 'p3'], selectedGroupIds: ['g1'] }, groupMembers)
    ).toEqual([
      { id: 'g1', kind: 'group', partIds: ['p1', 'p2'] },
      { id: 'p3', kind: 'part', partIds: ['p3'] }
    ]);
  });

  it('collapses fully referenced descendant groups into the highest fully referenced group', () => {
    expect(resolveReferenceEntities(['p1', 'p2'], groupMembers)).toEqual([
      { id: 'g1', kind: 'group', partIds: ['p1', 'p2'] }
    ]);
  });

  it('keeps partially referenced groups as standalone parts', () => {
    expect(resolveReferenceEntities(['p1'], groupMembers)).toEqual([{ id: 'p1', kind: 'part', partIds: ['p1'] }]);
  });

  it('mixes inferred reference groups with loose reference parts', () => {
    expect(resolveReferenceEntities(['p1', 'p2', 'p3'], groupMembers)).toEqual([
      { id: 'g1', kind: 'group', partIds: ['p1', 'p2'] },
      { id: 'g3', kind: 'group', partIds: ['p3'] }
    ]);
  });
});
