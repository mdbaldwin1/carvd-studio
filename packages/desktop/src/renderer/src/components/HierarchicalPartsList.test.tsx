import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { HierarchicalPartsList } from './HierarchicalPartsList';
import { useProjectStore } from '../store/projectStore';
import { Part, Group, GroupMember, Stock } from '../types';

// Mock useStockLibrary
vi.mock('../hooks/useStockLibrary', () => ({
  useStockLibrary: () => ({ stocks: [] })
}));

// Mock window.electronAPI
beforeAll(() => {
  window.electronAPI = {
    getPreference: vi.fn(),
    setPreference: vi.fn()
  } as unknown as typeof window.electronAPI;
});

describe('HierarchicalPartsList', () => {
  const mockParts: Part[] = [
    {
      id: 'part-1',
      name: 'Side Panel',
      length: 24,
      width: 12,
      thickness: 0.75,
      x: 0,
      y: 0,
      z: 0,
      color: '#c4a574'
    },
    {
      id: 'part-2',
      name: 'Top Panel',
      length: 36,
      width: 18,
      thickness: 0.75,
      x: 0,
      y: 0,
      z: 0,
      color: '#a5784c',
      stockId: 'stock-1'
    }
  ];

  const mockStocks: Stock[] = [
    {
      id: 'stock-1',
      name: 'Plywood',
      length: 96,
      width: 48,
      thickness: 0.75,
      grainDirection: 'length',
      pricingUnit: 'per_item',
      pricePerUnit: 50,
      color: '#c4a574'
    }
  ];

  const mockGroups: Group[] = [
    {
      id: 'group-1',
      name: 'Cabinet Parts'
    }
  ];

  const mockGroupMembers: GroupMember[] = [];

  const defaultProps = {
    onPartClick: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useProjectStore.setState({
      parts: mockParts,
      groups: [],
      groupMembers: [],
      stocks: mockStocks,
      selectedPartIds: [],
      selectedGroupIds: [],
      expandedGroupIds: [],
      editingGroupId: null,
      isEditingAssembly: false,
      units: 'imperial'
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('renders parts list', () => {
      render(<HierarchicalPartsList {...defaultProps} />);

      expect(screen.getByText('Side Panel')).toBeInTheDocument();
      expect(screen.getByText('Top Panel')).toBeInTheDocument();
    });

    it('shows empty message when no parts', () => {
      useProjectStore.setState({ parts: [], groups: [] });
      render(<HierarchicalPartsList {...defaultProps} />);

      expect(screen.getByText('No parts yet. Click + to add one.')).toBeInTheDocument();
    });

    it('renders part colors', () => {
      const { container } = render(<HierarchicalPartsList {...defaultProps} />);

      const colorSwatches = container.querySelectorAll('.part-color');
      expect(colorSwatches).toHaveLength(2);
    });

    it('renders part action buttons', () => {
      render(<HierarchicalPartsList {...defaultProps} />);

      const duplicateButtons = screen.getAllByTitle('Duplicate');
      const deleteButtons = screen.getAllByTitle('Delete');

      expect(duplicateButtons).toHaveLength(2);
      expect(deleteButtons).toHaveLength(2);
    });
  });

  describe('part selection', () => {
    it('calls onPartClick when part clicked', () => {
      const onPartClick = vi.fn();
      render(<HierarchicalPartsList {...defaultProps} onPartClick={onPartClick} />);

      fireEvent.click(screen.getByText('Side Panel'));

      expect(onPartClick).toHaveBeenCalledWith('part-1', expect.any(Object));
    });

    it('shows selected style when part is selected', () => {
      useProjectStore.setState({ selectedPartIds: ['part-1'] });
      const { container } = render(<HierarchicalPartsList {...defaultProps} />);

      const selectedPart = container.querySelector('.part-item.selected');
      expect(selectedPart).toBeInTheDocument();
    });
  });

  describe('part actions', () => {
    it('calls onDuplicate when duplicate clicked', () => {
      const onDuplicate = vi.fn();
      render(<HierarchicalPartsList {...defaultProps} onDuplicate={onDuplicate} />);

      const duplicateButtons = screen.getAllByTitle('Duplicate');
      fireEvent.click(duplicateButtons[0]);

      expect(onDuplicate).toHaveBeenCalledWith('part-1');
    });

    it('calls onDelete when delete clicked', () => {
      const onDelete = vi.fn();
      render(<HierarchicalPartsList {...defaultProps} onDelete={onDelete} />);

      const deleteButtons = screen.getAllByTitle('Delete');
      fireEvent.click(deleteButtons[0]);

      expect(onDelete).toHaveBeenCalledWith('part-1');
    });

    it('stops propagation on duplicate click', () => {
      const onPartClick = vi.fn();
      const onDuplicate = vi.fn();
      render(<HierarchicalPartsList {...defaultProps} onPartClick={onPartClick} onDuplicate={onDuplicate} />);

      const duplicateButtons = screen.getAllByTitle('Duplicate');
      fireEvent.click(duplicateButtons[0]);

      expect(onDuplicate).toHaveBeenCalled();
      expect(onPartClick).not.toHaveBeenCalled();
    });

    it('stops propagation on delete click', () => {
      const onPartClick = vi.fn();
      const onDelete = vi.fn();
      render(<HierarchicalPartsList {...defaultProps} onPartClick={onPartClick} onDelete={onDelete} />);

      const deleteButtons = screen.getAllByTitle('Delete');
      fireEvent.click(deleteButtons[0]);

      expect(onDelete).toHaveBeenCalled();
      expect(onPartClick).not.toHaveBeenCalled();
    });
  });

  describe('validation warnings', () => {
    it('shows warning icon for part without stock', () => {
      const { container } = render(<HierarchicalPartsList {...defaultProps} />);

      // Part-1 has no stockId, so should have warning
      const warningIcons = container.querySelectorAll('.part-warning-icon');
      expect(warningIcons.length).toBeGreaterThan(0);
    });

    it('shows error class for parts without stock', () => {
      const { container } = render(<HierarchicalPartsList {...defaultProps} />);

      const errorIcons = container.querySelectorAll('.part-warning-icon.error');
      expect(errorIcons.length).toBeGreaterThan(0);
    });
  });

  describe('groups', () => {
    it('renders groups', () => {
      useProjectStore.setState({
        groups: mockGroups,
        groupMembers: []
      });
      render(<HierarchicalPartsList {...defaultProps} />);

      expect(screen.getByText('Cabinet Parts')).toBeInTheDocument();
    });

    it('shows group part count', () => {
      useProjectStore.setState({
        groups: mockGroups,
        groupMembers: [{ id: 'gm-1', groupId: 'group-1', memberId: 'part-1', memberType: 'part' }]
      });
      render(<HierarchicalPartsList {...defaultProps} />);

      // Group shows count
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('shows expand/collapse button for groups', () => {
      useProjectStore.setState({
        groups: mockGroups,
        groupMembers: [{ id: 'gm-1', groupId: 'group-1', memberId: 'part-1', memberType: 'part' }]
      });
      const { container } = render(<HierarchicalPartsList {...defaultProps} />);

      const expandBtn = container.querySelector('.group-expand-btn');
      expect(expandBtn).toBeInTheDocument();
    });

    it('expands group when expand button clicked', () => {
      useProjectStore.setState({
        groups: mockGroups,
        groupMembers: [{ id: 'gm-1', groupId: 'group-1', memberId: 'part-1', memberType: 'part' }],
        expandedGroupIds: []
      });
      const { container } = render(<HierarchicalPartsList {...defaultProps} />);

      const expandBtn = container.querySelector('.group-expand-btn')!;
      fireEvent.click(expandBtn);

      // Should have called toggleGroupExpanded
      expect(useProjectStore.getState().expandedGroupIds).toContain('group-1');
    });

    it('shows children when group is expanded', () => {
      useProjectStore.setState({
        groups: mockGroups,
        groupMembers: [{ id: 'gm-1', groupId: 'group-1', memberId: 'part-1', memberType: 'part' }],
        expandedGroupIds: ['group-1']
      });
      render(<HierarchicalPartsList {...defaultProps} />);

      // Part should be visible as child of group
      expect(screen.getByText('Side Panel')).toBeInTheDocument();
    });

    it('applies selected style to selected group', () => {
      useProjectStore.setState({
        groups: mockGroups,
        selectedGroupIds: ['group-1']
      });
      const { container } = render(<HierarchicalPartsList {...defaultProps} />);

      const selectedGroup = container.querySelector('.group-header.selected');
      expect(selectedGroup).toBeInTheDocument();
    });
  });

  describe('nested groups', () => {
    it('renders nested groups', () => {
      useProjectStore.setState({
        parts: mockParts,
        groups: [
          { id: 'group-1', name: 'Outer Group' },
          { id: 'group-2', name: 'Inner Group' }
        ],
        groupMembers: [
          { id: 'gm-1', groupId: 'group-1', memberId: 'group-2', memberType: 'group' },
          { id: 'gm-2', groupId: 'group-2', memberId: 'part-1', memberType: 'part' }
        ],
        expandedGroupIds: ['group-1', 'group-2']
      });
      render(<HierarchicalPartsList {...defaultProps} />);

      expect(screen.getByText('Outer Group')).toBeInTheDocument();
      expect(screen.getByText('Inner Group')).toBeInTheDocument();
    });
  });

  describe('search filtering', () => {
    it('filters parts by search term', () => {
      render(<HierarchicalPartsList {...defaultProps} searchFilter="Side" />);

      expect(screen.getByText('Side Panel')).toBeInTheDocument();
      expect(screen.queryByText('Top Panel')).not.toBeInTheDocument();
    });

    it('shows no results message when no matches', () => {
      render(<HierarchicalPartsList {...defaultProps} searchFilter="xyz" />);

      expect(screen.getByText('No parts match "xyz"')).toBeInTheDocument();
    });

    it('case-insensitive search', () => {
      render(<HierarchicalPartsList {...defaultProps} searchFilter="side" />);

      expect(screen.getByText('Side Panel')).toBeInTheDocument();
    });

    it('includes group when group name matches', () => {
      useProjectStore.setState({
        groups: mockGroups,
        groupMembers: []
      });
      render(<HierarchicalPartsList {...defaultProps} searchFilter="Cabinet" />);

      expect(screen.getByText('Cabinet Parts')).toBeInTheDocument();
    });

    it('includes group when child part matches', () => {
      useProjectStore.setState({
        groups: mockGroups,
        groupMembers: [{ id: 'gm-1', groupId: 'group-1', memberId: 'part-1', memberType: 'part' }],
        expandedGroupIds: ['group-1']
      });
      render(<HierarchicalPartsList {...defaultProps} searchFilter="Side" />);

      // Group should be included because child matches
      expect(screen.getByText('Cabinet Parts')).toBeInTheDocument();
      expect(screen.getByText('Side Panel')).toBeInTheDocument();
    });
  });

  describe('group interactions', () => {
    it('selects group on click', () => {
      useProjectStore.setState({
        groups: mockGroups,
        selectedGroupIds: []
      });
      render(<HierarchicalPartsList {...defaultProps} />);

      fireEvent.click(screen.getByText('Cabinet Parts'));

      expect(useProjectStore.getState().selectedGroupIds).toContain('group-1');
    });

    it('toggles group selection on shift+click', () => {
      useProjectStore.setState({
        groups: mockGroups,
        selectedGroupIds: []
      });
      render(<HierarchicalPartsList {...defaultProps} />);

      fireEvent.click(screen.getByText('Cabinet Parts'), { shiftKey: true });

      expect(useProjectStore.getState().selectedGroupIds).toContain('group-1');
    });

    it('enters group on double click', () => {
      useProjectStore.setState({
        groups: mockGroups,
        editingGroupId: null
      });
      render(<HierarchicalPartsList {...defaultProps} />);

      fireEvent.doubleClick(screen.getByText('Cabinet Parts'));

      expect(useProjectStore.getState().editingGroupId).toBe('group-1');
    });

    it('opens context menu on right click', () => {
      useProjectStore.setState({
        groups: mockGroups,
        contextMenu: null
      });
      render(<HierarchicalPartsList {...defaultProps} />);

      fireEvent.contextMenu(screen.getByText('Cabinet Parts'));

      expect(useProjectStore.getState().contextMenu).not.toBeNull();
    });
  });

  describe('group warning indicators', () => {
    it('shows warning on collapsed group with parts having issues', () => {
      useProjectStore.setState({
        groups: mockGroups,
        groupMembers: [{ id: 'gm-1', groupId: 'group-1', memberId: 'part-1', memberType: 'part' }],
        expandedGroupIds: [] // Group is collapsed
      });
      const { container } = render(<HierarchicalPartsList {...defaultProps} />);

      // Group should show warning because part-1 has no stock
      const groupWarning = container.querySelector('.group-warning-icon');
      expect(groupWarning).toBeInTheDocument();
    });

    it('does not show warning on expanded group', () => {
      useProjectStore.setState({
        groups: mockGroups,
        groupMembers: [{ id: 'gm-1', groupId: 'group-1', memberId: 'part-1', memberType: 'part' }],
        expandedGroupIds: ['group-1'] // Group is expanded
      });
      const { container } = render(<HierarchicalPartsList {...defaultProps} />);

      // Group warning should not show when expanded (issues visible in children)
      const groupWarning = container.querySelector('.group-warning-icon');
      expect(groupWarning).not.toBeInTheDocument();
    });
  });

  describe('indentation levels', () => {
    it('applies correct indentation for top-level parts', () => {
      const { container } = render(<HierarchicalPartsList {...defaultProps} />);

      const partItems = container.querySelectorAll('.part-item');
      // Top-level parts should have base padding (12px + 0 * 16px = 12px)
      expect(partItems[0]).toHaveStyle({ paddingLeft: '12px' });
    });

    it('applies increased indentation for nested parts', () => {
      useProjectStore.setState({
        groups: mockGroups,
        groupMembers: [{ id: 'gm-1', groupId: 'group-1', memberId: 'part-1', memberType: 'part' }],
        expandedGroupIds: ['group-1']
      });
      const { container } = render(<HierarchicalPartsList {...defaultProps} />);

      // Find the nested part (inside group)
      const groupChildren = container.querySelector('.group-children');
      const nestedPart = groupChildren?.querySelector('.part-item');
      // Level 1 parts should have 12px + 1 * 16px = 28px
      expect(nestedPart).toHaveStyle({ paddingLeft: '28px' });
    });
  });
});
