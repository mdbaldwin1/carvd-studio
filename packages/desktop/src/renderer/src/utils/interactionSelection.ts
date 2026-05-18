import type { GroupMember } from '../types';

export interface InteractionSelectionInput {
  selectedPartIds: string[];
  selectedGroupIds: string[];
  editingGroupId: string | null;
}

export interface InteractionSelectionEntity {
  id: string;
  kind: 'part' | 'group';
  partIds: string[];
}

export type MeasurementSelectionEntity = InteractionSelectionEntity;
export type ReferenceSelectionEntity = InteractionSelectionEntity;

let descendantPartCacheMembersRef: WeakRef<GroupMember[]> | null = null;
let descendantPartCache = new Map<string, string[]>();

function ensureDescendantPartCache(groupMembers: GroupMember[]) {
  if (!descendantPartCacheMembersRef || descendantPartCacheMembersRef.deref() !== groupMembers) {
    descendantPartCacheMembersRef = new WeakRef(groupMembers);
    descendantPartCache = new Map();
  }
}

export function getContainingGroupId(partId: string, groupMembers: GroupMember[]): string | null {
  const member = groupMembers.find((gm) => gm.memberType === 'part' && gm.memberId === partId);
  return member ? member.groupId : null;
}

export function getAllDescendantPartIds(groupId: string, groupMembers: GroupMember[]): string[] {
  ensureDescendantPartCache(groupMembers);
  const cached = descendantPartCache.get(groupId);
  if (cached) return cached;

  const collect = (currentGroupId: string, visited: Set<string>): string[] => {
    if (visited.has(currentGroupId)) return [];
    const nextVisited = new Set(visited);
    nextVisited.add(currentGroupId);

    const partIds: string[] = [];
    const members = groupMembers.filter((gm) => gm.groupId === currentGroupId);
    for (const member of members) {
      if (member.memberType === 'part') {
        partIds.push(member.memberId);
      } else {
        partIds.push(...collect(member.memberId, nextVisited));
      }
    }

    return partIds;
  };

  const partIds = collect(groupId, new Set());
  descendantPartCache.set(groupId, partIds);
  return partIds;
}

export function getAllDescendantGroupIds(groupId: string, groupMembers: GroupMember[]): string[] {
  const groupIds: string[] = [groupId];
  const members = groupMembers.filter((gm) => gm.groupId === groupId);
  for (const member of members) {
    if (member.memberType === 'group') {
      groupIds.push(...getAllDescendantGroupIds(member.memberId, groupMembers));
    }
  }
  return groupIds;
}

export function getAncestorGroupIds(partId: string, groupMembers: GroupMember[]): string[] {
  const ancestors: string[] = [];
  let currentId: string | null = partId;
  let currentType: 'part' | 'group' = 'part';

  while (currentId) {
    const member = groupMembers.find((gm) => gm.memberType === currentType && gm.memberId === currentId);
    if (!member) break;
    ancestors.push(member.groupId);
    currentId = member.groupId;
    currentType = 'group';
  }

  return ancestors;
}

export function getAncestorGroupIdsForGroup(groupId: string, groupMembers: GroupMember[]): string[] {
  const ancestors: string[] = [];
  let currentGroupId: string | null = groupId;

  while (currentGroupId) {
    const member = groupMembers.find((gm) => gm.memberType === 'group' && gm.memberId === currentGroupId);
    if (!member) break;
    ancestors.push(member.groupId);
    currentGroupId = member.groupId;
  }

  return ancestors;
}

export function isDescendantOfGroup(
  potentialDescendantId: string,
  potentialAncestorId: string,
  groupMembers: GroupMember[]
): boolean {
  if (potentialDescendantId === potentialAncestorId) return true;
  return getAllDescendantGroupIds(potentialAncestorId, groupMembers).includes(potentialDescendantId);
}

export function resolveExplicitSelectedPartIds(
  selection: Pick<InteractionSelectionInput, 'selectedPartIds' | 'selectedGroupIds'>,
  groupMembers: GroupMember[]
): string[] {
  const partIds = new Set(selection.selectedPartIds);
  for (const groupId of selection.selectedGroupIds) {
    const descendantPartIds = getAllDescendantPartIds(groupId, groupMembers);
    descendantPartIds.forEach((id) => partIds.add(id));
  }
  return [...partIds];
}

export function resolveSelectedGroupIdsWithDescendants(
  selectedGroupIds: string[],
  groupMembers: GroupMember[]
): string[] {
  const groupIds = new Set<string>();
  for (const groupId of selectedGroupIds) {
    const descendantGroupIds = getAllDescendantGroupIds(groupId, groupMembers);
    descendantGroupIds.forEach((id) => groupIds.add(id));
  }
  return [...groupIds];
}

export function resolveTransformSelectedPartIds(
  selection: InteractionSelectionInput,
  groupMembers: GroupMember[]
): string[] {
  const partIds = new Set(resolveExplicitSelectedPartIds(selection, groupMembers));

  if (selection.editingGroupId !== null) {
    return [...partIds];
  }

  for (const partId of selection.selectedPartIds) {
    const containingGroupId = getContainingGroupId(partId, groupMembers);
    if (!containingGroupId) continue;
    const siblingPartIds = getAllDescendantPartIds(containingGroupId, groupMembers);
    siblingPartIds.forEach((id) => partIds.add(id));
  }

  return [...partIds];
}

function filterRootGroupIds(groupIds: string[], groupMembers: GroupMember[]): string[] {
  return groupIds.filter(
    (groupId) =>
      !groupIds.some(
        (otherGroupId) => otherGroupId !== groupId && isDescendantOfGroup(groupId, otherGroupId, groupMembers)
      )
  );
}

export function resolveSelectionEntities(
  selection: Pick<InteractionSelectionInput, 'selectedPartIds' | 'selectedGroupIds'>,
  groupMembers: GroupMember[]
): InteractionSelectionEntity[] {
  const rootSelectedGroupIds = filterRootGroupIds(selection.selectedGroupIds, groupMembers);

  const groupEntities: InteractionSelectionEntity[] = rootSelectedGroupIds.map((groupId) => ({
    id: groupId,
    kind: 'group',
    partIds: getAllDescendantPartIds(groupId, groupMembers)
  }));

  const standalonePartEntities: InteractionSelectionEntity[] = selection.selectedPartIds
    .filter(
      (partId) => !rootSelectedGroupIds.some((groupId) => getAncestorGroupIds(partId, groupMembers).includes(groupId))
    )
    .map((partId) => ({
      id: partId,
      kind: 'part',
      partIds: [partId]
    }));

  return [...groupEntities, ...standalonePartEntities];
}

export function resolveMeasurementSelectionEntities(
  selection: Pick<InteractionSelectionInput, 'selectedPartIds' | 'selectedGroupIds'>,
  groupMembers: GroupMember[]
): MeasurementSelectionEntity[] {
  return resolveSelectionEntities(selection, groupMembers);
}

export function resolveReferenceEntities(
  referencePartIds: string[],
  groupMembers: GroupMember[]
): ReferenceSelectionEntity[] {
  const referencePartIdSet = new Set(referencePartIds);
  if (referencePartIdSet.size === 0) return [];

  const candidateGroupIds = new Set<string>();
  for (const member of groupMembers) {
    candidateGroupIds.add(member.groupId);
    if (member.memberType === 'group') {
      candidateGroupIds.add(member.memberId);
    }
  }

  const fullyReferencedGroupIds = [...candidateGroupIds].filter((groupId) => {
    const descendantPartIds = getAllDescendantPartIds(groupId, groupMembers);
    return descendantPartIds.length > 0 && descendantPartIds.every((partId) => referencePartIdSet.has(partId));
  });

  const rootReferencedGroupIds = filterRootGroupIds(fullyReferencedGroupIds, groupMembers);

  const groupEntities: ReferenceSelectionEntity[] = rootReferencedGroupIds.map((groupId) => ({
    id: groupId,
    kind: 'group',
    partIds: getAllDescendantPartIds(groupId, groupMembers)
  }));

  const coveredPartIds = new Set(groupEntities.flatMap((entity) => entity.partIds));
  const standalonePartEntities: ReferenceSelectionEntity[] = referencePartIds
    .filter((partId) => !coveredPartIds.has(partId))
    .map((partId) => ({
      id: partId,
      kind: 'part',
      partIds: [partId]
    }));

  return [...groupEntities, ...standalonePartEntities];
}
