/**
 * Shared group-aware click/selection logic used by both InstancedParts and Part components.
 * Extracted to avoid duplicating the ancestor group traversal and editing context logic.
 */
import { getAncestorGroupIds } from '../../store/projectStore';
import { GroupMember } from '../../types';

export interface PartGroupContext {
  /** Which group should be selected when this part is clicked (null = select part directly) */
  groupToSelectOnClick: string | null;
  /** True if this part is outside the current group editing scope */
  isOutsideEditingContext: boolean;
  /** The immediate parent group of this part (null if ungrouped) */
  containingGroupId: string | null;
  /** All ancestor group IDs from immediate parent to top-level */
  ancestorGroupIds: string[];
}

/**
 * Compute the group context for a given part, determining what entity
 * should be selected when the part is clicked based on the current editing context.
 */
export function getPartGroupContext(
  partId: string,
  groupMembers: GroupMember[],
  editingGroupId: string | null
): PartGroupContext {
  const ancestorGroupIds = getAncestorGroupIds(partId, groupMembers);
  const containingGroupId = ancestorGroupIds.length > 0 ? ancestorGroupIds[0] : null;
  const topLevelGroupId = ancestorGroupIds.length > 0 ? ancestorGroupIds[ancestorGroupIds.length - 1] : null;

  let groupToSelectOnClick: string | null = null;
  let isOutsideEditingContext = false;

  if (editingGroupId === null) {
    groupToSelectOnClick = topLevelGroupId;
  } else {
    const editingGroupIndex = ancestorGroupIds.indexOf(editingGroupId);
    if (editingGroupIndex > 0) {
      groupToSelectOnClick = ancestorGroupIds[editingGroupIndex - 1];
    } else if (editingGroupIndex === -1) {
      isOutsideEditingContext = true;
    }
  }

  return { groupToSelectOnClick, isOutsideEditingContext, containingGroupId, ancestorGroupIds };
}
