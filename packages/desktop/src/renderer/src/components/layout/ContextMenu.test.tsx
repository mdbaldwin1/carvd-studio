import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContextMenu } from './ContextMenu';
import { useProjectStore } from '../../store/projectStore';
import { useAssemblyEditingStore } from '../../store/assemblyEditingStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useSnapStore } from '../../store/snapStore';
import { useUIStore } from '../../store/uiStore';
import { useCameraStore } from '../../store/cameraStore';

describe('ContextMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useProjectStore.setState({
      parts: [],
      groups: [],
      groupMembers: [],
      clipboard: { parts: [], groups: [], groupMembers: [] },
      snapGuides: []
    });
    useAssemblyEditingStore.setState({
      isEditingAssembly: false
    });
    useSnapStore.setState({
      referencePartIds: []
    });
    useSelectionStore.setState({
      selectedPartIds: [],
      selectedGroupIds: [],
      editingGroupId: null
    });
    useUIStore.setState({
      contextMenu: null
    });
  });

  describe('rendering', () => {
    it('returns null when contextMenu is null', () => {
      const { container } = render(<ContextMenu />);
      expect(container.firstChild).toBeNull();
    });

    it('renders background menu when type is background', () => {
      useUIStore.setState({
        contextMenu: {
          type: 'background',
          x: 100,
          y: 200,
          worldPosition: { x: 10, y: 5, z: 0 }
        }
      });

      render(<ContextMenu />);

      expect(screen.getByText('Reset View')).toBeInTheDocument();
      expect(screen.getByText('Center View Here')).toBeInTheDocument();
      expect(screen.getByText('Export as Image')).toBeInTheDocument();
    });

    it('renders part menu when parts are selected', () => {
      useUIStore.setState({
        contextMenu: {
          type: 'part',
          x: 100,
          y: 200,
          partId: 'part-1'
        }
      });
      useSelectionStore.setState({
        selectedPartIds: ['part-1']
      });
      useProjectStore.setState({
        parts: [{ id: 'part-1', name: 'Part 1', stockId: null }]
      });

      render(<ContextMenu />);

      expect(screen.getByText('1 part selected')).toBeInTheDocument();
      expect(screen.getByText('Center View')).toBeInTheDocument();
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });

    it('renders guide menu when type is guide', () => {
      useUIStore.setState({
        contextMenu: {
          type: 'guide',
          x: 100,
          y: 200,
          guideId: 'guide-1'
        }
      });
      useProjectStore.setState({
        snapGuides: [{ id: 'guide-1', axis: 'x', position: 12.5 }]
      });

      render(<ContextMenu />);

      expect(screen.getByText('X Guide at 12.50"')).toBeInTheDocument();
      expect(screen.getByText('Delete This Guide')).toBeInTheDocument();
    });
  });

  describe('background menu', () => {
    beforeEach(() => {
      useUIStore.setState({
        contextMenu: {
          type: 'background',
          x: 100,
          y: 200,
          worldPosition: { x: 10, y: 5, z: 0 }
        },
        closeContextMenu: vi.fn(),
        captureManualThumbnail: vi.fn()
      });
      useCameraStore.setState({
        requestCenterCameraAtOrigin: vi.fn(),
        requestCenterCameraAtPosition: vi.fn()
      });
      useProjectStore.setState({
        pasteAtPosition: vi.fn(),
        addSnapGuide: vi.fn(),
        clearSnapGuides: vi.fn()
      });
    });

    it('calls requestCenterCameraAtOrigin on Reset View', () => {
      render(<ContextMenu />);
      fireEvent.click(screen.getByText('Reset View'));

      expect(useCameraStore.getState().requestCenterCameraAtOrigin).toHaveBeenCalled();
    });

    it('calls requestCenterCameraAtPosition on Center View Here', () => {
      render(<ContextMenu />);
      fireEvent.click(screen.getByText('Center View Here'));

      expect(useCameraStore.getState().requestCenterCameraAtPosition).toHaveBeenCalledWith({
        x: 10,
        y: 5,
        z: 0
      });
    });

    it('shows Paste Here when clipboard has items', () => {
      useProjectStore.setState({
        clipboard: {
          parts: [{ id: 'part-1' }],
          groups: [],
          groupMembers: []
        }
      });

      render(<ContextMenu />);

      expect(screen.getByText('Paste Here')).toBeInTheDocument();
    });

    it('does not show Paste Here when clipboard is empty', () => {
      render(<ContextMenu />);

      expect(screen.queryByText('Paste Here')).not.toBeInTheDocument();
    });

    it('shows snap guide options', () => {
      render(<ContextMenu />);

      expect(screen.getByText('Add X Guide Here')).toBeInTheDocument();
      expect(screen.getByText('Add Y Guide Here')).toBeInTheDocument();
      expect(screen.getByText('Add Z Guide Here')).toBeInTheDocument();
    });

    it('calls addSnapGuide when adding guide', () => {
      render(<ContextMenu />);
      fireEvent.click(screen.getByText('Add X Guide Here'));

      expect(useProjectStore.getState().addSnapGuide).toHaveBeenCalledWith('x', 10);
    });

    it('shows Clear All Guides when guides exist', () => {
      useProjectStore.setState({
        snapGuides: [
          { id: 'g1', axis: 'x', position: 10 },
          { id: 'g2', axis: 'y', position: 20 }
        ]
      });

      render(<ContextMenu />);

      expect(screen.getByText('Clear All Guides (2)')).toBeInTheDocument();
    });
  });

  describe('part menu', () => {
    beforeEach(() => {
      useUIStore.setState({
        contextMenu: {
          type: 'part',
          x: 100,
          y: 200,
          partId: 'part-1'
        },
        closeContextMenu: vi.fn(),
        openSaveAssemblyModal: vi.fn()
      });
      useCameraStore.setState({
        requestCenterCamera: vi.fn()
      });
      useSelectionStore.setState({
        selectedPartIds: ['part-1', 'part-2']
      });
      useProjectStore.setState({
        parts: [
          { id: 'part-1', name: 'Part 1', stockId: 'stock-1' },
          { id: 'part-2', name: 'Part 2', stockId: null }
        ],
        copySelectedParts: vi.fn(),
        deleteSelectedParts: vi.fn(),
        resetSelectedPartsToStock: vi.fn(),
        toggleReference: vi.fn()
      });
    });

    it('shows multi-select header', () => {
      render(<ContextMenu />);

      expect(screen.getByText('2 parts selected')).toBeInTheDocument();
    });

    it('calls copySelectedParts on Copy', () => {
      render(<ContextMenu />);
      fireEvent.click(screen.getByText('Copy'));

      expect(useProjectStore.getState().copySelectedParts).toHaveBeenCalled();
    });

    it('calls deleteSelectedParts on Delete', () => {
      render(<ContextMenu />);
      fireEvent.click(screen.getByText('Delete'));

      expect(useProjectStore.getState().deleteSelectedParts).toHaveBeenCalled();
    });

    it('calls requestCenterCamera on Center View', () => {
      render(<ContextMenu />);
      fireEvent.click(screen.getByText('Center View'));

      expect(useCameraStore.getState().requestCenterCamera).toHaveBeenCalled();
    });

    it('shows Reset to Stock when parts have stock assigned', () => {
      render(<ContextMenu />);

      const resetBtn = screen.getByText('Reset to Stock');
      expect(resetBtn).toBeInTheDocument();
      expect(resetBtn).not.toBeDisabled();
    });

    it('disables Reset to Stock when no parts have stock', () => {
      useProjectStore.setState({
        parts: [
          { id: 'part-1', name: 'Part 1', stockId: null },
          { id: 'part-2', name: 'Part 2', stockId: null }
        ]
      });

      render(<ContextMenu />);

      expect(screen.getByText('Reset to Stock')).toBeDisabled();
    });

    it('calls openSaveAssemblyModal on Save as Assembly', () => {
      render(<ContextMenu />);
      fireEvent.click(screen.getByText('Save as Assembly'));

      expect(useUIStore.getState().openSaveAssemblyModal).toHaveBeenCalled();
    });

    it('shows Set as Reference button', () => {
      render(<ContextMenu />);

      expect(screen.getByText(/Set as Reference/)).toBeInTheDocument();
    });

    it('shows Clear Reference when all parts are references', () => {
      useSnapStore.setState({
        referencePartIds: ['part-1', 'part-2']
      });

      render(<ContextMenu />);

      expect(screen.getByText('Clear Reference (R)')).toBeInTheDocument();
    });
  });

  describe('group operations', () => {
    it('shows Create Group when multiple ungrouped items', () => {
      useUIStore.setState({
        contextMenu: {
          type: 'part',
          x: 100,
          y: 200,
          partId: 'part-1'
        },
        closeContextMenu: vi.fn()
      });
      useSelectionStore.setState({
        selectedPartIds: ['part-1', 'part-2'],
        selectedGroupIds: []
      });
      useProjectStore.setState({
        parts: [
          { id: 'part-1', name: 'Part 1' },
          { id: 'part-2', name: 'Part 2' }
        ],
        groups: [],
        groupMembers: [],
        createGroup: vi.fn()
      });

      render(<ContextMenu />);

      expect(screen.getByText('Create Group (G)')).toBeInTheDocument();
    });

    it('shows Ungroup when a group is selected', () => {
      useUIStore.setState({
        contextMenu: {
          type: 'part',
          x: 100,
          y: 200,
          partId: 'part-1'
        },
        closeContextMenu: vi.fn()
      });
      useSelectionStore.setState({
        selectedPartIds: [],
        selectedGroupIds: ['group-1']
      });
      useProjectStore.setState({
        parts: [],
        groups: [{ id: 'group-1', name: 'My Group' }],
        groupMembers: [{ groupId: 'group-1', memberId: 'part-1', memberType: 'part' }],
        deleteGroup: vi.fn()
      });

      render(<ContextMenu />);

      expect(screen.getByText('Ungroup "My Group"')).toBeInTheDocument();
    });

    it('shows mixed selection header', () => {
      useUIStore.setState({
        contextMenu: {
          type: 'part',
          x: 100,
          y: 200,
          partId: 'part-1'
        },
        closeContextMenu: vi.fn()
      });
      useSelectionStore.setState({
        selectedPartIds: ['part-1'],
        selectedGroupIds: ['group-1']
      });
      useProjectStore.setState({
        parts: [{ id: 'part-1', name: 'Part 1' }],
        groups: [{ id: 'group-1', name: 'Group 1' }],
        groupMembers: []
      });

      render(<ContextMenu />);

      expect(screen.getByText('1 part, 1 group')).toBeInTheDocument();
    });
  });

  describe('guide menu', () => {
    beforeEach(() => {
      useUIStore.setState({
        contextMenu: {
          type: 'guide',
          x: 100,
          y: 200,
          guideId: 'guide-1'
        },
        closeContextMenu: vi.fn()
      });
      useProjectStore.setState({
        snapGuides: [{ id: 'guide-1', axis: 'y', position: 24.75 }],
        removeSnapGuide: vi.fn(),
        clearSnapGuides: vi.fn()
      });
    });

    it('displays guide info', () => {
      render(<ContextMenu />);

      expect(screen.getByText('Y Guide at 24.75"')).toBeInTheDocument();
    });

    it('calls removeSnapGuide on Delete This Guide', () => {
      render(<ContextMenu />);
      fireEvent.click(screen.getByText('Delete This Guide'));

      expect(useProjectStore.getState().removeSnapGuide).toHaveBeenCalledWith('guide-1');
    });

    it('shows Clear All Guides when multiple guides exist', () => {
      useProjectStore.setState({
        snapGuides: [
          { id: 'guide-1', axis: 'y', position: 24.75 },
          { id: 'guide-2', axis: 'x', position: 10 }
        ]
      });

      render(<ContextMenu />);

      expect(screen.getByText('Clear All Guides (2)')).toBeInTheDocument();
    });

    it('returns null when guide not found', () => {
      useProjectStore.setState({
        snapGuides: []
      });

      const { container } = render(<ContextMenu />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('keyboard and click handlers', () => {
    it('closes on Escape key', async () => {
      const closeContextMenu = vi.fn();
      useUIStore.setState({
        contextMenu: {
          type: 'background',
          x: 100,
          y: 200,
          worldPosition: { x: 0, y: 0, z: 0 }
        },
        closeContextMenu
      });

      render(<ContextMenu />);

      // Wait for the setTimeout to add the event listener
      await new Promise((resolve) => setTimeout(resolve, 10));

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(closeContextMenu).toHaveBeenCalled();
    });
  });

  describe('styling', () => {
    it('positions menu at context menu coordinates', () => {
      useUIStore.setState({
        contextMenu: {
          type: 'background',
          x: 150,
          y: 250,
          worldPosition: null
        }
      });

      const { container } = render(<ContextMenu />);
      const menu = container.querySelector('.context-menu');

      expect(menu).toHaveStyle({ left: '150px', top: '250px' });
    });
  });
});
