import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ChevronRight, ChevronDown, Layers, AlertTriangle } from 'lucide-react';
import { Part, Group, GroupMember, PartValidationIssue } from '../../types';
import { useProjectStore, getAllDescendantPartIds, validatePartsForCutList } from '../../store/projectStore';
import { useAssemblyEditingStore } from '../../store/assemblyEditingStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useUIStore } from '../../store/uiStore';
import { useStockLibrary } from '../../hooks/useStockLibrary';
import { formatMeasurementWithUnit } from '../../utils/fractions';
import { IconButton } from '../common/IconButton';

// ── Tree types ──────────────────────────────────────────────────────────

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

// ── Flat item for virtualization ────────────────────────────────────────

interface FlatPartItem {
  type: 'part';
  data: Part;
  level: number;
  /** Whether this part's parent group is expanded (always true for top-level) */
  parentGroupId: string | null;
}

interface FlatGroupItem {
  type: 'group';
  data: Group;
  level: number;
  childCount: number;
  isExpanded: boolean;
  isSelected: boolean;
  isEditing: boolean;
  hasChildError: boolean;
  hasChildWarning: boolean;
}

type FlatItem = FlatPartItem | FlatGroupItem;

// ── Build tree from flat data ───────────────────────────────────────────

function buildTree(parts: Part[], groups: Group[], groupMembers: GroupMember[]): TreeNode[] {
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

  const topLevelGroups = groups.filter((g) => !groupIdToParentGroupId.has(g.id));
  const topLevelParts = parts.filter((p) => !partIdToGroupId.has(p.id));

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

  return [...topLevelGroups.map((g) => buildNode(g, 'group')), ...topLevelParts.map((p) => buildNode(p, 'part'))];
}

// ── Filter tree by search ───────────────────────────────────────────────

function filterTree(nodes: TreeNode[], searchTerm: string): TreeNode[] {
  const lowerSearch = searchTerm.toLowerCase();

  return nodes.reduce<TreeNode[]>((acc, node) => {
    if (node.type === 'part') {
      if (node.data.name.toLowerCase().includes(lowerSearch)) {
        acc.push(node);
      }
    } else {
      const filteredChildren = filterTree(node.children, searchTerm);
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

// ── Flatten tree for Virtuoso ───────────────────────────────────────────

function flattenTree(
  nodes: TreeNode[],
  expandedGroupIdSet: Set<string>,
  selectedGroupIdSet: Set<string>,
  editingGroupId: string | null,
  validationByPart: Map<string, PartValidationIssue[]>,
  groupMembers: GroupMember[],
  level = 0,
  parentGroupId: string | null = null
): FlatItem[] {
  const result: FlatItem[] = [];

  for (const node of nodes) {
    if (node.type === 'part') {
      result.push({ type: 'part', data: node.data, level, parentGroupId });
    } else {
      const group = node.data;
      const isExpanded = expandedGroupIdSet.has(group.id);
      const isSelected = selectedGroupIdSet.has(group.id);
      const isEditing = editingGroupId === group.id;
      const childCount = getAllDescendantPartIds(group.id, groupMembers).length;

      // Compute descendant issues only for collapsed groups
      let hasChildError = false;
      let hasChildWarning = false;
      if (!isExpanded) {
        const descendantPartIds = getAllDescendantPartIds(group.id, groupMembers);
        for (const partId of descendantPartIds) {
          const issues = validationByPart.get(partId);
          if (issues && issues.length > 0) {
            if (issues.some((i) => i.severity === 'error')) hasChildError = true;
            else hasChildWarning = true;
          } else {
            // Check no-stock (parts with no stockId that had no validation entry)
            // Actually validation already catches no_stock, but check if there's a part with no stockId
            // that somehow has no issues entry
          }
        }
      }

      result.push({
        type: 'group',
        data: group,
        level,
        childCount,
        isExpanded,
        isSelected,
        isEditing,
        hasChildError,
        hasChildWarning: !hasChildError && hasChildWarning
      });

      if (isExpanded && node.children.length > 0) {
        result.push(
          ...flattenTree(
            node.children,
            expandedGroupIdSet,
            selectedGroupIdSet,
            editingGroupId,
            validationByPart,
            groupMembers,
            level + 1,
            group.id
          )
        );
      }
    }
  }

  return result;
}

// ── Memoized PartItem ───────────────────────────────────────────────────

interface PartItemProps {
  part: Part;
  level: number;
  isSelected: boolean;
  hasError: boolean;
  hasWarning: boolean;
  issueMessages: string;
  units: string;
  onPartClick: (partId: string, e: React.MouseEvent) => void;
  onDuplicate: (partId: string) => void;
  onDelete: (partId: string) => void;
}

const PartItem = React.memo(function PartItem({
  part,
  level,
  isSelected,
  hasError,
  hasWarning,
  issueMessages,
  units,
  onPartClick,
  onDuplicate,
  onDelete
}: PartItemProps) {
  const dimsText = `${formatMeasurementWithUnit(part.length, units)} × ${formatMeasurementWithUnit(part.width, units)} × ${formatMeasurementWithUnit(part.thickness, units)}`;

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
});

// ── Memoized GroupItem ──────────────────────────────────────────────────

interface GroupItemProps {
  group: Group;
  level: number;
  childCount: number;
  isSelected: boolean;
  isExpanded: boolean;
  isEditing: boolean;
  hasChildError: boolean;
  hasChildWarning: boolean;
  onGroupClick: (groupId: string, e: React.MouseEvent) => void;
  onGroupDoubleClick: (groupId: string) => void;
  onGroupContextMenu: (groupId: string, e: React.MouseEvent) => void;
  onExpandToggle: (groupId: string) => void;
}

const GroupItem = React.memo(function GroupItem({
  group,
  level,
  childCount,
  isSelected,
  isExpanded,
  isEditing,
  hasChildError,
  hasChildWarning,
  onGroupClick,
  onGroupDoubleClick,
  onGroupContextMenu,
  onExpandToggle
}: GroupItemProps) {
  return (
    <li className="list-none">
      <div
        className={`group-header flex items-center gap-1.5 py-1.5 px-3 cursor-pointer transition-colors duration-100 select-none font-medium hover:bg-surface-hover ${isSelected ? 'selected bg-selected' : ''} ${isEditing ? 'editing bg-primary-bg border-l-2 border-l-primary !pl-2.5' : ''}`}
        style={{ paddingLeft: isEditing ? undefined : `${12 + level * 16}px` }}
        onClick={(e) => onGroupClick(group.id, e)}
        onDoubleClick={() => onGroupDoubleClick(group.id)}
        onContextMenu={(e) => onGroupContextMenu(group.id, e)}
        title={`${group.name} (${childCount} part${childCount === 1 ? '' : 's'})${hasChildError || hasChildWarning ? '\n\n⚠ Contains parts with validation issues' : ''}`}
      >
        <button
          className="group-expand-btn flex items-center justify-center w-[18px] h-[18px] p-0 border-none bg-transparent text-text-muted cursor-pointer shrink-0 hover:text-text"
          onClick={(e) => {
            e.stopPropagation();
            onExpandToggle(group.id);
          }}
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
        <span className="text-[10px] text-text-muted bg-surface-hover py-px px-1.5 rounded-full">{childCount}</span>
      </div>
    </li>
  );
});

// ── Main component ──────────────────────────────────────────────────────

interface HierarchicalPartsListProps {
  onPartClick: (partId: string, e: React.MouseEvent) => void;
  onDuplicate: (partId: string) => void;
  onDelete: (partId: string) => void;
  searchFilter?: string;
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
  const projectStocks = useProjectStore((s) => s.stocks);
  const units = useProjectStore((s) => s.units);
  const selectedPartIds = useSelectionStore((s) => s.selectedPartIds);
  const selectedGroupIds = useSelectionStore((s) => s.selectedGroupIds);
  const expandedGroupIds = useSelectionStore((s) => s.expandedGroupIds);
  const editingGroupId = useSelectionStore((s) => s.editingGroupId);
  const toggleGroupExpanded = useSelectionStore((s) => s.toggleGroupExpanded);
  const selectGroup = useSelectionStore((s) => s.selectGroup);
  const toggleGroupSelection = useSelectionStore((s) => s.toggleGroupSelection);
  const enterGroup = useSelectionStore((s) => s.enterGroup);
  const openContextMenu = useUIStore((s) => s.openContextMenu);
  const isEditingAssembly = useAssemblyEditingStore((s) => s.isEditingAssembly);
  const { stocks: libraryStocks } = useStockLibrary();
  const stocks = isEditingAssembly ? libraryStocks : projectStocks;

  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // Batch validation: run once for all parts, build lookup
  const validationByPart = useMemo(() => {
    const map = new Map<string, PartValidationIssue[]>();
    const allIssues = validatePartsForCutList(parts, stocks);
    for (const issue of allIssues) {
      const existing = map.get(issue.partId) || [];
      existing.push(issue);
      map.set(issue.partId, existing);
    }
    // Ensure parts with no stock still have an entry for convenience
    for (const part of parts) {
      if (!map.has(part.id) && !part.stockId) {
        map.set(part.id, [
          {
            partId: part.id,
            partName: part.name,
            type: 'no_stock',
            message: 'No stock assigned',
            severity: 'error'
          }
        ]);
      }
    }
    return map;
  }, [parts, stocks]);

  // Build tree
  const tree = useMemo(() => buildTree(parts, groups, groupMembers), [parts, groups, groupMembers]);

  // Filter
  const filteredTree = useMemo(() => (searchFilter ? filterTree(tree, searchFilter) : tree), [tree, searchFilter]);

  // Sets for O(1) lookups
  const selectedPartIdSet = useMemo(() => new Set(selectedPartIds), [selectedPartIds]);
  const selectedGroupIdSet = useMemo(() => new Set(selectedGroupIds), [selectedGroupIds]);
  const expandedGroupIdSet = useMemo(() => new Set(expandedGroupIds), [expandedGroupIds]);

  // Flatten tree into a flat list respecting expansion state
  const flatItems = useMemo(
    () =>
      flattenTree(filteredTree, expandedGroupIdSet, selectedGroupIdSet, editingGroupId, validationByPart, groupMembers),
    [filteredTree, expandedGroupIdSet, selectedGroupIdSet, editingGroupId, validationByPart, groupMembers]
  );

  // Scroll to selected part when selection changes from 3D view
  useEffect(() => {
    if (selectedPartIds.length === 1 && virtuosoRef.current) {
      const idx = flatItems.findIndex((item) => item.type === 'part' && item.data.id === selectedPartIds[0]);
      if (idx >= 0) {
        virtuosoRef.current.scrollToIndex({ index: idx, align: 'center', behavior: 'smooth' });
      }
    }
  }, [selectedPartIds, flatItems]);

  // Stable group callbacks
  const handleGroupClick = useCallback(
    (groupId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.shiftKey) {
        toggleGroupSelection(groupId);
      } else {
        selectGroup(groupId);
      }
    },
    [selectGroup, toggleGroupSelection]
  );

  const handleGroupDoubleClick = useCallback(
    (groupId: string) => {
      enterGroup(groupId);
    },
    [enterGroup]
  );

  const handleGroupContextMenu = useCallback(
    (groupId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const isAlreadySelected = useSelectionStore.getState().selectedGroupIds.includes(groupId);
      if (!isAlreadySelected) {
        selectGroup(groupId);
      }
      openContextMenu({ x: e.clientX, y: e.clientY, type: 'part' });
    },
    [selectGroup, openContextMenu]
  );

  const handleExpandToggle = useCallback(
    (groupId: string) => {
      toggleGroupExpanded(groupId);
    },
    [toggleGroupExpanded]
  );

  // Render a single flat item
  const itemContent = useCallback(
    (index: number, item: FlatItem) => {
      if (item.type === 'part') {
        const issues = validationByPart.get(item.data.id) || [];
        const hasNoStock = !item.data.stockId;
        const hasError = hasNoStock || issues.some((i) => i.severity === 'error');
        const hasWarning = !hasError && issues.some((i) => i.severity === 'warning');
        const issueMessages =
          hasNoStock && issues.length === 0 ? 'No stock assigned' : issues.map((i) => i.message).join('\n');

        return (
          <PartItem
            part={item.data}
            level={item.level}
            isSelected={selectedPartIdSet.has(item.data.id)}
            hasError={hasError}
            hasWarning={hasWarning}
            issueMessages={issueMessages}
            units={units}
            onPartClick={onPartClick}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        );
      }

      return (
        <GroupItem
          group={item.data}
          level={item.level}
          childCount={item.childCount}
          isSelected={item.isSelected}
          isExpanded={item.isExpanded}
          isEditing={item.isEditing}
          hasChildError={item.hasChildError}
          hasChildWarning={item.hasChildWarning}
          onGroupClick={handleGroupClick}
          onGroupDoubleClick={handleGroupDoubleClick}
          onGroupContextMenu={handleGroupContextMenu}
          onExpandToggle={handleExpandToggle}
        />
      );
    },
    [
      validationByPart,
      selectedPartIdSet,
      units,
      onPartClick,
      onDuplicate,
      onDelete,
      handleGroupClick,
      handleGroupDoubleClick,
      handleGroupContextMenu,
      handleExpandToggle
    ]
  );

  if (parts.length === 0 && groups.length === 0) {
    return <p className="text-text-muted text-xs italic">No parts yet. Click + to add one.</p>;
  }

  if (searchFilter && filteredTree.length === 0) {
    return <p className="text-text-muted text-xs italic">No parts match &quot;{searchFilter}&quot;</p>;
  }

  return (
    <Virtuoso
      ref={virtuosoRef}
      className="mx-[-12px] flex-1 min-h-0"
      data={flatItems}
      itemContent={itemContent}
      overscan={200}
    />
  );
}
