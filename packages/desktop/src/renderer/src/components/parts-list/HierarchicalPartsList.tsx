import { AlertTriangle, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import React, { useMemo } from 'react';
import { useStockLibrary } from '../../hooks/useStockLibrary';
import { useAssemblyEditingStore } from '../../store/assemblyEditingStore';
import { getAllDescendantPartIds, useProjectStore, validatePartsForCutList } from '../../store/projectStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useUIStore } from '../../store/uiStore';
import { Group, GroupMember, Part, Stock } from '../../types';
import { formatMeasurementWithUnit } from '../../utils/fractions';
import { IconButton } from '../common/IconButton';

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
function buildTree(parts: Part[], groups: Group[], groupMembers: GroupMember[]): TreeNode[] {
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
  const selectedPartIds = useSelectionStore((s) => s.selectedPartIds);
  const projectStocks = useProjectStore((s) => s.stocks);
  const isEditingAssembly = useAssemblyEditingStore((s) => s.isEditingAssembly);
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
  const issueMessages =
    hasNoStock && validationIssues.length === 0
      ? 'No stock assigned'
      : validationIssues.map((i) => i.message).join('\n');

  return (
    <li
      className={`part-item group/part flex items-center gap-2 py-2 px-3 cursor-pointer transition-colors duration-100 select-none hover:bg-surface-hover ${isSelected ? 'selected bg-selected' : ''}`}
      style={{ paddingLeft: `${12 + level * 16}px` }}
      onClick={(e) => onPartClick(part.id, e)}
      title={`${part.name}\n${dimsText}${issueMessages ? '\n\n⚠ ' + issueMessages : ''}`}
    >
      <span className="part-color w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: part.color }} />
      {(hasError || hasWarning) && (
        <span
          className={`part-warning-icon inline-flex items-center justify-center mr-1 shrink-0 ${hasError ? 'error text-danger' : 'warning text-warning'}`}
          title={issueMessages}
        >
          <AlertTriangle size={12} />
        </span>
      )}
      <span className="part-name flex-1 truncate">{part.name}</span>
      <div className="flex gap-0.5 opacity-0 group-hover/part:opacity-100 transition-opacity duration-100">
        <IconButton
          label={`Duplicate ${part.name}`}
          title="Duplicate"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(part.id);
          }}
        >
          ⧉
        </IconButton>
        <IconButton
          label={`Delete ${part.name}`}
          title="Delete"
          color="danger"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(part.id);
          }}
        >
          ×
        </IconButton>
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

// Helper function to recursively check for validation issues in a tree node
function hasDescendantIssues(
  node: TreeNode,
  stocks: Stock[],
  parts: Part[]
): { hasError: boolean; hasWarning: boolean } {
  if (node.type === 'part') {
    const validationIssues = validatePartsForCutList([node.data], stocks);
    const hasNoStock = !node.data.stockId;
    const hasError = hasNoStock || validationIssues.some((i) => i.severity === 'error');
    const hasWarning = !hasError && validationIssues.some((i) => i.severity === 'warning');
    return { hasError, hasWarning };
  }

  // For groups, check all children recursively
  let hasError = false;
  let hasWarning = false;
  for (const child of node.children) {
    const childResult = hasDescendantIssues(child, stocks, parts);
    if (childResult.hasError) hasError = true;
    if (childResult.hasWarning) hasWarning = true;
  }
  return { hasError, hasWarning };
}

function GroupItem({ group, children, level, onPartClick, onDuplicate, onDelete }: GroupItemProps) {
  const selectedGroupIds = useSelectionStore((s) => s.selectedGroupIds);
  const expandedGroupIds = useSelectionStore((s) => s.expandedGroupIds);
  const editingGroupId = useSelectionStore((s) => s.editingGroupId);
  const groupMembers = useProjectStore((s) => s.groupMembers);
  const projectStocks = useProjectStore((s) => s.stocks);
  const allParts = useProjectStore((s) => s.parts);
  const isEditingAssembly = useAssemblyEditingStore((s) => s.isEditingAssembly);
  const toggleGroupExpanded = useSelectionStore((s) => s.toggleGroupExpanded);
  const selectGroup = useSelectionStore((s) => s.selectGroup);
  const toggleGroupSelection = useSelectionStore((s) => s.toggleGroupSelection);
  const enterGroup = useSelectionStore((s) => s.enterGroup);
  const openContextMenu = useUIStore((s) => s.openContextMenu);

  // Use library stocks when editing assembly, project stocks otherwise
  const { stocks: libraryStocks } = useStockLibrary();
  const stocks = isEditingAssembly ? libraryStocks : projectStocks;

  const isSelected = selectedGroupIds.includes(group.id);
  const isExpanded = expandedGroupIds.includes(group.id);
  const isEditing = editingGroupId === group.id;
  const partCount = getAllDescendantPartIds(group.id, groupMembers).length;

  // Check for descendant validation issues (only when collapsed)
  const descendantIssues = useMemo(() => {
    if (isExpanded) return { hasError: false, hasWarning: false };
    // Create a temporary group node to check children
    const groupNode: GroupNode = { type: 'group', data: group, children };
    return hasDescendantIssues(groupNode, stocks, allParts);
  }, [isExpanded, group, children, stocks, allParts]);

  const hasChildError = descendantIssues.hasError;
  const hasChildWarning = !hasChildError && descendantIssues.hasWarning;

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
    <li className="list-none">
      <div
        className={`group-header flex items-center gap-2 py-2 px-3 cursor-pointer transition-colors duration-100 select-none font-medium ${isSelected ? 'selected bg-selected' : ''} ${isEditing ? 'editing bg-primary-bg border-l-2 border-l-primary !pl-2.5' : ''}`}
        style={{ paddingLeft: isEditing ? undefined : `${12 + level * 16}px` }}
        onClick={handleGroupClick}
        onDoubleClick={handleGroupDoubleClick}
        onContextMenu={handleGroupContextMenu}
        title={`${group.name} (${partCount} part${partCount === 1 ? '' : 's'})${hasChildError || hasChildWarning ? '\n\n⚠ Contains parts with validation issues' : ''}`}
      >
        <button
          className={`group-expand-btn btn btn-icon-sm btn-ghost btn-secondary ${isExpanded ? 'active' : ''}`}
          onClick={handleExpandToggle}
          title={isExpanded ? `Collapse ${group.name}` : `Expand ${group.name}`}
          aria-label={isExpanded ? `Collapse ${group.name}` : `Expand ${group.name}`}
          aria-expanded={isExpanded}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {(hasChildError || hasChildWarning) && (
          <span
            className={`group-warning-icon inline-flex items-center justify-center shrink-0 ${hasChildError ? 'error text-danger' : 'warning text-warning'}`}
            title="Contains parts with validation issues"
          >
            <AlertTriangle size={12} />
          </span>
        )}
        <Layers size={14} className="text-text-muted shrink-0" />
        <span className="flex-1 truncate">{group.name}</span>
        <span className="text-[10px] bg-border text-text py-px px-1.5 rounded-full min-w-4 text-center">
          {partCount}
        </span>
      </div>
      {isExpanded && children.length > 0 && (
        <ul className="group-children list-none p-0 m-0">
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
  searchFilter?: string;
}

// Helper function to filter tree nodes based on search term
function filterTree(nodes: TreeNode[], searchTerm: string): TreeNode[] {
  const lowerSearch = searchTerm.toLowerCase();

  return nodes.reduce<TreeNode[]>((acc, node) => {
    if (node.type === 'part') {
      if (node.data.name.toLowerCase().includes(lowerSearch)) {
        acc.push(node);
      }
    } else {
      // For groups, filter children first
      const filteredChildren = filterTree(node.children, searchTerm);
      // Include group if it has matching children or its name matches
      if (filteredChildren.length > 0 || node.data.name.toLowerCase().includes(lowerSearch)) {
        acc.push({
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children
        });
      }
    }
    return acc;
  }, []);
}

export function HierarchicalPartsList({
  onPartClick,
  onDuplicate,
  onDelete,
  searchFilter
}: HierarchicalPartsListProps) {
  const parts = useProjectStore((s) => s.parts);
  const groups = useProjectStore((s) => s.groups);
  const groupMembers = useProjectStore((s) => s.groupMembers);

  // Memoize tree building for performance
  const tree = useMemo(() => buildTree(parts, groups, groupMembers), [parts, groups, groupMembers]);

  // Filter tree based on search
  const filteredTree = useMemo(() => (searchFilter ? filterTree(tree, searchFilter) : tree), [tree, searchFilter]);

  if (parts.length === 0 && groups.length === 0) {
    return <p className="text-text-muted text-xs italic px-4">No parts yet. Click + to add one.</p>;
  }

  if (searchFilter && filteredTree.length === 0) {
    return <p className="text-text-muted text-xs italic">No parts match "{searchFilter}"</p>;
  }

  return (
    <ul className="list-none flex-1 overflow-y-auto min-h-0">
      {filteredTree.map((node) =>
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
