import React, { useMemo } from 'react';
import { ChevronRight, ChevronDown, Layers, AlertTriangle } from 'lucide-react';
import { Part, Group, GroupMember } from '../types';
import { useProjectStore, getAllDescendantPartIds, validatePartsForCutList } from '../store/projectStore';
import { useStockLibrary } from '../hooks/useStockLibrary';
import { formatMeasurementWithUnit } from '../utils/fractions';

// Tree node types for rendering
interface PartNode {
  type: 'part';
  data: Part;
}

interface GroupNode {
  type: 'group';
  data: Group;
  children: TreeNode[];
}

type TreeNode = PartNode | GroupNode;

// Build the hierarchical tree from flat data
function buildTree(
  parts: Part[],
  groups: Group[],
  groupMembers: GroupMember[]
): TreeNode[] {
  // Create lookup maps
  const membersByGroup = new Map<string, GroupMember[]>();
  const partIdToGroupId = new Map<string, string>();
  const groupIdToParentGroupId = new Map<string, string>();

  for (const member of groupMembers) {
    if (member.memberType === 'part') {
      partIdToGroupId.set(member.memberId, member.groupId);
    } else {
      groupIdToParentGroupId.set(member.memberId, member.groupId);
    }
    const members = membersByGroup.get(member.groupId) || [];
    members.push(member);
    membersByGroup.set(member.groupId, members);
  }

  // Find top-level items (not inside any group)
  const topLevelGroups = groups.filter((g) => !groupIdToParentGroupId.has(g.id));
  const topLevelParts = parts.filter((p) => !partIdToGroupId.has(p.id));

  // Recursively build tree
  function buildNode(item: Part | Group, itemType: 'part' | 'group'): TreeNode {
    if (itemType === 'part') {
      return { type: 'part', data: item as Part };
    }

    const group = item as Group;
    const members = membersByGroup.get(group.id) || [];
    const children: TreeNode[] = [];

    for (const member of members) {
      if (member.memberType === 'part') {
        const part = parts.find((p) => p.id === member.memberId);
        if (part) children.push(buildNode(part, 'part'));
      } else {
        const childGroup = groups.find((g) => g.id === member.memberId);
        if (childGroup) children.push(buildNode(childGroup, 'group'));
      }
    }

    return { type: 'group', data: group, children };
  }

  // Build top-level tree
  const tree: TreeNode[] = [
    ...topLevelGroups.map((g) => buildNode(g, 'group')),
    ...topLevelParts.map((p) => buildNode(p, 'part'))
  ];

  return tree;
}

interface PartItemProps {
  part: Part;
  level: number;
  onPartClick: (partId: string, e: React.MouseEvent) => void;
  onDuplicate: (partId: string) => void;
  onDelete: (partId: string) => void;
}

function PartItem({ part, level, onPartClick, onDuplicate, onDelete }: PartItemProps) {
  const selectedPartIds = useProjectStore((s) => s.selectedPartIds);
  const projectStocks = useProjectStore((s) => s.stocks);
  const isEditingAssembly = useProjectStore((s) => s.isEditingAssembly);
  const units = useProjectStore((s) => s.units);

  // Use library stocks when editing assembly, project stocks otherwise
  const { stocks: libraryStocks } = useStockLibrary();
  const stocks = isEditingAssembly ? libraryStocks : projectStocks;

  const isSelected = selectedPartIds.includes(part.id);
  const dimsText = `${formatMeasurementWithUnit(part.length, units)} × ${formatMeasurementWithUnit(part.width, units)} × ${formatMeasurementWithUnit(part.thickness, units)}`;

  // Validate this part for cut list issues
  const validationIssues = useMemo(() => {
    return validatePartsForCutList([part], stocks);
  }, [part, stocks]);

  // Also check directly for no-stock case (belt and suspenders)
  const hasNoStock = !part.stockId;
  const hasError = hasNoStock || validationIssues.some((i) => i.severity === 'error');
  const hasWarning = !hasError && validationIssues.some((i) => i.severity === 'warning');
  const issueMessages = hasNoStock && validationIssues.length === 0
    ? 'No stock assigned'
    : validationIssues.map((i) => i.message).join('\n');

  return (
    <li
      className={`part-item ${isSelected ? 'selected' : ''}`}
      style={{ paddingLeft: `${12 + level * 16}px` }}
      onClick={(e) => onPartClick(part.id, e)}
      title={`${part.name}\n${dimsText}${issueMessages ? '\n\n⚠ ' + issueMessages : ''}`}
    >
      <span className="part-color" style={{ backgroundColor: part.color }} />
      {(hasError || hasWarning) && (
        <span
          className={`part-warning-icon ${hasError ? 'error' : 'warning'}`}
          title={issueMessages}
        >
          <AlertTriangle size={12} />
        </span>
      )}
      <span className="part-name">{part.name}</span>
      <span className="part-dims">{dimsText}</span>
      <div className="part-actions">
        <button
          className="btn btn-icon-sm btn-ghost btn-secondary"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(part.id);
          }}
          title="Duplicate"
        >
          ⧉
        </button>
        <button
          className="btn btn-icon-sm btn-ghost btn-danger"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(part.id);
          }}
          title="Delete"
        >
          ×
        </button>
      </div>
    </li>
  );
}

interface GroupItemProps {
  group: Group;
  children: TreeNode[];
  level: number;
  onPartClick: (partId: string, e: React.MouseEvent) => void;
  onDuplicate: (partId: string) => void;
  onDelete: (partId: string) => void;
}

function GroupItem({ group, children, level, onPartClick, onDuplicate, onDelete }: GroupItemProps) {
  const selectedGroupIds = useProjectStore((s) => s.selectedGroupIds);
  const expandedGroupIds = useProjectStore((s) => s.expandedGroupIds);
  const editingGroupId = useProjectStore((s) => s.editingGroupId);
  const groupMembers = useProjectStore((s) => s.groupMembers);
  const toggleGroupExpanded = useProjectStore((s) => s.toggleGroupExpanded);
  const selectGroup = useProjectStore((s) => s.selectGroup);
  const toggleGroupSelection = useProjectStore((s) => s.toggleGroupSelection);
  const enterGroup = useProjectStore((s) => s.enterGroup);
  const openContextMenu = useProjectStore((s) => s.openContextMenu);

  const isSelected = selectedGroupIds.includes(group.id);
  const isExpanded = expandedGroupIds.includes(group.id);
  const isEditing = editingGroupId === group.id;
  const partCount = getAllDescendantPartIds(group.id, groupMembers).length;

  const handleGroupClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey) {
      // Shift+click: toggle selection (add/remove from multi-select)
      toggleGroupSelection(group.id);
    } else {
      // Regular click: replace selection
      selectGroup(group.id);
    }
  };

  const handleGroupContextMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Don't change selection if this group is already selected
    if (!isSelected) {
      selectGroup(group.id);
    }
    openContextMenu({ x: e.clientX, y: e.clientY, type: 'part' });
  };

  const handleGroupDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    enterGroup(group.id);
  };

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleGroupExpanded(group.id);
  };

  return (
    <li className="group-item">
      <div
        className={`group-header ${isSelected ? 'selected' : ''} ${isEditing ? 'editing' : ''}`}
        style={{ paddingLeft: `${12 + level * 16}px` }}
        onClick={handleGroupClick}
        onDoubleClick={handleGroupDoubleClick}
        onContextMenu={handleGroupContextMenu}
        title={`${group.name} (${partCount} part${partCount === 1 ? '' : 's'})`}
      >
        <button className="group-expand-btn" onClick={handleExpandToggle}>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <Layers size={14} className="group-icon" />
        <span className="group-name">{group.name}</span>
        <span className="group-count">{partCount}</span>
      </div>
      {isExpanded && children.length > 0 && (
        <ul className="group-children">
          {children.map((child) =>
            child.type === 'part' ? (
              <PartItem
                key={child.data.id}
                part={child.data}
                level={level + 1}
                onPartClick={onPartClick}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            ) : (
              <GroupItem
                key={child.data.id}
                group={child.data}
                children={child.children}
                level={level + 1}
                onPartClick={onPartClick}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            )
          )}
        </ul>
      )}
    </li>
  );
}

interface HierarchicalPartsListProps {
  onPartClick: (partId: string, e: React.MouseEvent) => void;
  onDuplicate: (partId: string) => void;
  onDelete: (partId: string) => void;
}

export function HierarchicalPartsList({ onPartClick, onDuplicate, onDelete }: HierarchicalPartsListProps) {
  const parts = useProjectStore((s) => s.parts);
  const groups = useProjectStore((s) => s.groups);
  const groupMembers = useProjectStore((s) => s.groupMembers);

  // Memoize tree building for performance
  const tree = useMemo(
    () => buildTree(parts, groups, groupMembers),
    [parts, groups, groupMembers]
  );

  if (parts.length === 0 && groups.length === 0) {
    return <p className="placeholder-text">No parts yet. Click + to add one.</p>;
  }

  return (
    <ul className="parts-list hierarchical">
      {tree.map((node) =>
        node.type === 'part' ? (
          <PartItem
            key={node.data.id}
            part={node.data}
            level={0}
            onPartClick={onPartClick}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        ) : (
          <GroupItem
            key={node.data.id}
            group={node.data}
            children={node.children}
            level={0}
            onPartClick={onPartClick}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        )
      )}
    </ul>
  );
}
