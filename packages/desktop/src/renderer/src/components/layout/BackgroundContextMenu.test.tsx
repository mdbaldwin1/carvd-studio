import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BackgroundContextMenu } from './BackgroundContextMenu';
import { useProjectStore } from '../../store/projectStore';
import { useClipboardStore } from '../../store/clipboardStore';
import { useCameraStore } from '../../store/cameraStore';
import { useUIStore } from '../../store/uiStore';
import React from 'react';

// Mock captureCanvas export
vi.mock('../../store/projectStore', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../store/projectStore')>();
  return {
    ...original,
    captureCanvas: vi.fn().mockResolvedValue(undefined)
  };
});

const createRef = () => React.createRef<HTMLDivElement>();

beforeEach(() => {
  useProjectStore.setState({
    snapGuides: [],
    clearSnapGuides: vi.fn(),
    addSnapGuide: vi.fn()
  });
  useClipboardStore.setState({
    clipboard: { parts: [], stocks: [], groupMembers: [], groups: [] },
    pasteAtPosition: vi.fn()
  });
  useCameraStore.setState({
    requestCenterCameraAtOrigin: vi.fn(),
    requestCenterCameraAtPosition: vi.fn()
  });
  useUIStore.setState({
    captureManualThumbnail: vi.fn().mockResolvedValue(undefined)
  });
});

describe('BackgroundContextMenu', () => {
  it('renders Reset View button', () => {
    render(<BackgroundContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
    expect(screen.getByText('Reset View')).toBeInTheDocument();
  });

  it('calls requestCenterCameraAtOrigin and onClose on Reset View', () => {
    const onClose = vi.fn();
    render(<BackgroundContextMenu menuRef={createRef()} x={100} y={200} onClose={onClose} />);
    fireEvent.click(screen.getByText('Reset View'));
    expect(useCameraStore.getState().requestCenterCameraAtOrigin).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('renders Center View Here button', () => {
    render(
      <BackgroundContextMenu
        menuRef={createRef()}
        x={100}
        y={200}
        onClose={vi.fn()}
        worldPosition={{ x: 5, y: 0, z: 3 }}
      />
    );
    expect(screen.getByText('Center View Here')).toBeInTheDocument();
    expect(screen.getByText('Center View Here')).not.toBeDisabled();
  });

  it('disables Center View Here when no worldPosition', () => {
    render(<BackgroundContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
    expect(screen.getByText('Center View Here')).toBeDisabled();
  });

  it('calls requestCenterCameraAtPosition with worldPosition', () => {
    const onClose = vi.fn();
    const worldPos = { x: 5, y: 2, z: 3 };
    render(<BackgroundContextMenu menuRef={createRef()} x={100} y={200} onClose={onClose} worldPosition={worldPos} />);
    fireEvent.click(screen.getByText('Center View Here'));
    expect(useCameraStore.getState().requestCenterCameraAtPosition).toHaveBeenCalledWith(worldPos);
    expect(onClose).toHaveBeenCalled();
  });

  it('hides Paste Here when clipboard is empty', () => {
    render(<BackgroundContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
    expect(screen.queryByText('Paste Here')).not.toBeInTheDocument();
  });

  it('shows Paste Here when clipboard has parts', () => {
    useClipboardStore.setState({
      clipboard: { parts: [{ id: 'p1' }] as never, stocks: [], groupMembers: [], groups: [] }
    });
    render(
      <BackgroundContextMenu
        menuRef={createRef()}
        x={100}
        y={200}
        onClose={vi.fn()}
        worldPosition={{ x: 1, y: 0, z: 1 }}
      />
    );
    expect(screen.getByText('Paste Here')).toBeInTheDocument();
  });

  it('calls pasteAtPosition when Paste Here clicked', () => {
    const worldPos = { x: 1, y: 0, z: 1 };
    useClipboardStore.setState({
      clipboard: { parts: [{ id: 'p1' }] as never, stocks: [], groupMembers: [], groups: [] },
      pasteAtPosition: vi.fn()
    });
    const onClose = vi.fn();
    render(<BackgroundContextMenu menuRef={createRef()} x={100} y={200} onClose={onClose} worldPosition={worldPos} />);
    fireEvent.click(screen.getByText('Paste Here'));
    expect(useClipboardStore.getState().pasteAtPosition).toHaveBeenCalledWith(worldPos);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders Export as Image button', () => {
    render(<BackgroundContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
    expect(screen.getByText('Export as Image')).toBeInTheDocument();
  });

  it('renders Capture Thumbnail button', () => {
    render(<BackgroundContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
    expect(screen.getByText('Capture Thumbnail')).toBeInTheDocument();
  });

  it('renders Snap Guides section', () => {
    render(<BackgroundContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
    expect(screen.getByText('Snap Guides')).toBeInTheDocument();
  });

  it('disables guide buttons when no worldPosition', () => {
    render(<BackgroundContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
    expect(screen.getByText('Add X Guide Here')).toBeDisabled();
    expect(screen.getByText('Add Y Guide Here')).toBeDisabled();
    expect(screen.getByText('Add Z Guide Here')).toBeDisabled();
  });

  it('enables guide buttons when worldPosition provided', () => {
    render(
      <BackgroundContextMenu
        menuRef={createRef()}
        x={100}
        y={200}
        onClose={vi.fn()}
        worldPosition={{ x: 5, y: 2, z: 3 }}
      />
    );
    expect(screen.getByText('Add X Guide Here')).not.toBeDisabled();
    expect(screen.getByText('Add Y Guide Here')).not.toBeDisabled();
    expect(screen.getByText('Add Z Guide Here')).not.toBeDisabled();
  });

  it('calls addSnapGuide with correct axis when guide buttons clicked', () => {
    const worldPos = { x: 5, y: 2, z: 3 };
    const onClose = vi.fn();
    render(<BackgroundContextMenu menuRef={createRef()} x={100} y={200} onClose={onClose} worldPosition={worldPos} />);

    fireEvent.click(screen.getByText('Add X Guide Here'));
    expect(useProjectStore.getState().addSnapGuide).toHaveBeenCalledWith('x', 5);

    fireEvent.click(screen.getByText('Add Y Guide Here'));
    expect(useProjectStore.getState().addSnapGuide).toHaveBeenCalledWith('y', 2);

    fireEvent.click(screen.getByText('Add Z Guide Here'));
    expect(useProjectStore.getState().addSnapGuide).toHaveBeenCalledWith('z', 3);
  });

  it('hides Clear All Guides when no guides exist', () => {
    render(<BackgroundContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
    expect(screen.queryByText(/Clear All Guides/)).not.toBeInTheDocument();
  });

  it('shows Clear All Guides with count when guides exist', () => {
    useProjectStore.setState({
      snapGuides: [
        { id: 'g1', axis: 'x', position: 5 },
        { id: 'g2', axis: 'z', position: 10 }
      ]
    });
    render(<BackgroundContextMenu menuRef={createRef()} x={100} y={200} onClose={vi.fn()} />);
    expect(screen.getByText('Clear All Guides (2)')).toBeInTheDocument();
  });

  it('calls clearSnapGuides when Clear All Guides clicked', () => {
    useProjectStore.setState({
      snapGuides: [{ id: 'g1', axis: 'x', position: 5 }],
      clearSnapGuides: vi.fn()
    });
    const onClose = vi.fn();
    render(<BackgroundContextMenu menuRef={createRef()} x={100} y={200} onClose={onClose} />);
    fireEvent.click(screen.getByText('Clear All Guides (1)'));
    expect(useProjectStore.getState().clearSnapGuides).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('positions menu at given coordinates', () => {
    const ref = createRef();
    render(<BackgroundContextMenu menuRef={ref} x={150} y={250} onClose={vi.fn()} />);
    const menu = screen.getByText('Reset View').closest('.context-menu')!;
    expect(menu.style.left).toBe('150px');
    expect(menu.style.top).toBe('250px');
  });
});
