import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PartContextMenu } from './PartContextMenu';
import { useProjectStore } from '../../store/projectStore';
import { useClipboardStore } from '../../store/clipboardStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useSnapStore } from '../../store/snapStore';
import { useUIStore } from '../../store/uiStore';
import { useLicenseStore } from '../../store/licenseStore';
import { useCameraStore } from '../../store/cameraStore';
import React from 'react';

const createRef = () => React.createRef<HTMLDivElement>();

const part1 = {
  id: 'p1',
  name: 'Part 1',
  width: 10,
  height: 20,
  depth: 2,
  x: 0,
  y: 10,
  z: 0,
  color: '#cccccc',
  stockId: 'stock-1',
  rotation: { x: 0, y: 0, z: 0 },
  grain: 'none' as const,
  jointAllowances: { left: 0, right: 0, front: 0, back: 0, top: 0, bottom: 0 },
  edgeBanding: null
};

const part2 = {
  ...part1,
  id: 'p2',
  name: 'Part 2',
  stockId: null
};

const group1 = { id: 'g1', name: 'Group 1', color: '#ff0000', isExpanded: true };
const group2 = { id: 'g2', name: 'Group 2', color: '#00ff00', isExpanded: true };

beforeEach(() => {
  useProjectStore.setState({
    parts: [part1, part2],
    groupMembers: [],
    groups: [],
    deleteSelectedParts: vi.fn(),
    resetSelectedPartsToStock: vi.fn(),
    createGroup: vi.fn(),
    removeFromGroup: vi.fn(),
    deleteGroup: vi.fn(),
    addToGroup: vi.fn(),
    mergeGroups: vi.fn()
  });
  useClipboardStore.setState({
    copySelectedParts: vi.fn()
  });
  useSelectionStore.setState({
    selectedPartIds: ['p1'],
    selectedGroupIds: [],
    editingGroupId: null
  });
  useSnapStore.setState({
    referencePartIds: [],
    toggleReference: vi.fn(),
    clearReferences: vi.fn()
  });
  useUIStore.setState({
    openSaveAssemblyModal: vi.fn()
  });
  useLicenseStore.setState({
    licenseMode: 'licensed'
  });
  useCameraStore.setState({
    requestCenterCamera: vi.fn()
  });
});

describe('PartContextMenu', () => {
  it('returns null when nothing selected', () => {
    useSelectionStore.setState({ selectedPartIds: [], selectedGroupIds: [] });
    const { container } = render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows "1 part selected" for single selection', () => {
    render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
    expect(screen.getByText('1 part selected')).toBeInTheDocument();
  });

  it('shows multi-select count', () => {
    useSelectionStore.setState({ selectedPartIds: ['p1', 'p2'] });
    render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
    expect(screen.getByText('2 parts selected')).toBeInTheDocument();
  });

  it('shows group selection count', () => {
    useProjectStore.setState({
      groups: [group1],
      groupMembers: [{ groupId: 'g1', memberId: 'p1', memberType: 'part' }]
    });
    useSelectionStore.setState({ selectedPartIds: [], selectedGroupIds: ['g1'] });
    render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
    expect(screen.getByText('1 group selected')).toBeInTheDocument();
  });

  it('shows mixed selection count', () => {
    useProjectStore.setState({
      groups: [group1],
      groupMembers: [{ groupId: 'g1', memberId: 'p2', memberType: 'part' }]
    });
    useSelectionStore.setState({ selectedPartIds: ['p1'], selectedGroupIds: ['g1'] });
    render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
    expect(screen.getByText('1 part, 1 group')).toBeInTheDocument();
  });

  it('renders Center View button and calls handler', () => {
    const onClose = vi.fn();
    render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={onClose} />);
    fireEvent.click(screen.getByText('Center View'));
    expect(useCameraStore.getState().requestCenterCamera).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('renders Copy button and calls handler', () => {
    const onClose = vi.fn();
    render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={onClose} />);
    fireEvent.click(screen.getByText('Copy'));
    expect(useClipboardStore.getState().copySelectedParts).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('renders Save as Assembly button', () => {
    render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
    expect(screen.getByText('Save as Assembly')).toBeInTheDocument();
  });

  it('disables Save as Assembly in free mode', () => {
    useLicenseStore.setState({ licenseMode: 'free' });
    render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
    expect(screen.getByText('Save as Assembly')).toBeDisabled();
  });

  it('renders Reset to Stock button', () => {
    render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
    expect(screen.getByText('Reset to Stock')).toBeInTheDocument();
  });

  it('enables Reset to Stock when stock assigned', () => {
    render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
    expect(screen.getByText('Reset to Stock')).not.toBeDisabled();
  });

  it('disables Reset to Stock when no stock assigned', () => {
    useSelectionStore.setState({ selectedPartIds: ['p2'] });
    render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
    expect(screen.getByText('Reset to Stock')).toBeDisabled();
  });

  it('calls resetSelectedPartsToStock when clicked', () => {
    const onClose = vi.fn();
    render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={onClose} />);
    fireEvent.click(screen.getByText('Reset to Stock'));
    expect(useProjectStore.getState().resetSelectedPartsToStock).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  describe('reference operations', () => {
    it('shows Set as Reference for non-reference parts', () => {
      render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
      expect(screen.getByText('Set as Reference (R)')).toBeInTheDocument();
    });

    it('shows Clear Reference when all selected are references', () => {
      useSnapStore.setState({ referencePartIds: ['p1'] });
      render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
      expect(screen.getByText('Clear Reference (R)')).toBeInTheDocument();
    });

    it('shows Set All as Reference when some are references', () => {
      useSelectionStore.setState({ selectedPartIds: ['p1', 'p2'] });
      useSnapStore.setState({ referencePartIds: ['p1'] });
      render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
      expect(screen.getByText('Set All as Reference (R)')).toBeInTheDocument();
    });

    it('calls toggleReference', () => {
      const onClose = vi.fn();
      render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={onClose} />);
      fireEvent.click(screen.getByText('Set as Reference (R)'));
      expect(useSnapStore.getState().toggleReference).toHaveBeenCalledWith(['p1']);
      expect(onClose).toHaveBeenCalled();
    });

    it('shows Clear All References when other references exist', () => {
      useSnapStore.setState({ referencePartIds: ['p1', 'p3'] });
      render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
      expect(screen.getByText('Clear All References')).toBeInTheDocument();
    });

    it('hides Clear All References when no other references', () => {
      useSnapStore.setState({ referencePartIds: ['p1'] });
      render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
      expect(screen.queryByText('Clear All References')).not.toBeInTheDocument();
    });
  });

  describe('group operations', () => {
    it('shows Create Group when 2+ ungrouped items selected', () => {
      useSelectionStore.setState({ selectedPartIds: ['p1', 'p2'] });
      render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
      expect(screen.getByText('Create Group (G)')).toBeInTheDocument();
    });

    it('hides Create Group for single part', () => {
      render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
      expect(screen.queryByText('Create Group (G)')).not.toBeInTheDocument();
    });

    it('disables Create Group in free mode', () => {
      useLicenseStore.setState({ licenseMode: 'free' });
      useSelectionStore.setState({ selectedPartIds: ['p1', 'p2'] });
      render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
      expect(screen.getByText('Create Group (G)')).toBeDisabled();
    });

    it('calls createGroup when Create Group clicked', () => {
      useSelectionStore.setState({ selectedPartIds: ['p1', 'p2'] });
      const onClose = vi.fn();
      render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={onClose} />);
      fireEvent.click(screen.getByText('Create Group (G)'));
      expect(useProjectStore.getState().createGroup).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('shows Ungroup when single group selected', () => {
      useProjectStore.setState({
        groups: [group1],
        groupMembers: [{ groupId: 'g1', memberId: 'p1', memberType: 'part' }]
      });
      useSelectionStore.setState({ selectedPartIds: [], selectedGroupIds: ['g1'] });
      render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
      expect(screen.getByText('Ungroup "Group 1"')).toBeInTheDocument();
    });

    it('shows Merge Groups when 2+ groups selected', () => {
      useProjectStore.setState({
        groups: [group1, group2],
        groupMembers: [
          { groupId: 'g1', memberId: 'p1', memberType: 'part' },
          { groupId: 'g2', memberId: 'p2', memberType: 'part' }
        ]
      });
      useSelectionStore.setState({ selectedPartIds: [], selectedGroupIds: ['g1', 'g2'] });
      render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
      expect(screen.getByText('Merge Groups (2) ▸')).toBeInTheDocument();
    });
  });

  it('renders Delete button', () => {
    render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls deleteSelectedParts when Delete clicked', () => {
    const onClose = vi.fn();
    render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={onClose} />);
    fireEvent.click(screen.getByText('Delete'));
    expect(useProjectStore.getState().deleteSelectedParts).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('deletes groups recursively when groups selected', () => {
    useProjectStore.setState({
      groups: [group1],
      groupMembers: [{ groupId: 'g1', memberId: 'p1', memberType: 'part' }],
      deleteGroup: vi.fn()
    });
    useSelectionStore.setState({ selectedPartIds: [], selectedGroupIds: ['g1'] });
    const onClose = vi.fn();
    render(<PartContextMenu menuRef={createRef()} x={100} y={200} onClose={onClose} />);
    fireEvent.click(screen.getByText('Delete'));
    expect(useProjectStore.getState().deleteGroup).toHaveBeenCalledWith('g1', 'recursive');
    expect(onClose).toHaveBeenCalled();
  });

  it('positions menu at given coordinates', () => {
    render(<PartContextMenu menuRef={createRef()} x={150} y={250} onClose={vi.fn()} />);
    const menu = screen.getByText('Center View').closest('.context-menu')!;
    expect(menu.style.left).toBe('150px');
    expect(menu.style.top).toBe('250px');
  });
});
