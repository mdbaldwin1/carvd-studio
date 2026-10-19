import { fireEvent, render, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPart, createTestStock } from '../../../../../tests/helpers/factories';
import { useInteractionStore } from '../../store/interactionStore';
import { useProjectStore } from '../../store/projectStore';
import { useSelectionStore } from '../../store/selectionStore';
import { Part } from './Part';

vi.unmock('three');

vi.mock('@react-three/drei', () => ({
  Edges: () => null
}));

vi.mock('@react-three/fiber', async () => {
  const THREE = await vi.importActual<typeof import('three')>('three');
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  camera.position.set(20, 20, 20);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();

  return {
    useThree: () => ({
      camera,
      gl: { domElement: document.createElement('canvas') },
      controls: { enabled: true },
      size: { width: 800, height: 600 }
    })
  };
});

vi.mock('./useGroupDrag', () => ({
  useGroupDrag: () => ({ startGroupDrag: vi.fn() })
}));

vi.mock('./usePartDrag', async () => {
  const { useEffect } = await vi.importActual<typeof import('react')>('react');

  return {
    usePartDrag: (
      _part: unknown,
      _liveDims: unknown,
      setLiveDims: (dimensions: {
        x: number;
        y: number;
        z: number;
        length: number;
        width: number;
        thickness: number;
      }) => void
    ) => {
      useEffect(() => {
        setLiveDims({ x: 90, y: 80, z: 70, length: 99, width: 88, thickness: 77 });
      }, [setLiveDims]);

      return {
        isDragging: true,
        justFinishedDragging: { current: false },
        handlePointerDown: vi.fn()
      };
    }
  };
});

vi.mock('./usePartResize', () => ({
  usePartResize: () => ({ isResizing: false, handleResizeStart: vi.fn() })
}));

vi.mock('./ResizeHandle', () => ({
  ResizeHandle: ({ handlePos }: { handlePos: { x: number; y: number; z: number } }) =>
    createElement('button', { 'aria-label': `Resize ${handlePos.x} ${handlePos.y} ${handlePos.z}` })
}));

describe('Part render ownership', () => {
  beforeEach(() => {
    useProjectStore.setState({ groupMembers: [], stocks: [] });
    useSelectionStore.setState({
      selectedPartIds: [],
      selectedGroupIds: [],
      hoveredPartId: null,
      editingGroupId: null
    });
    useInteractionStore.setState({ activeSession: null });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it.each(['board', 'rod', 'insert'] as const)('only offers supported resize handles for %s stock', (form) => {
    const stock = createTestStock({
      id: 'resize-stock',
      form,
      ...(form === 'insert' ? { insertKind: 'dowel_pin' as const } : {})
    });
    const part = createTestPart({ id: 'resize-part', stockId: stock.id, length: 0.75, width: 0.25, thickness: 0.25 });
    useProjectStore.setState({ stocks: [stock], parts: [part] });
    useSelectionStore.setState({ selectedPartIds: [part.id], hoveredPartId: part.id });
    const view = render(createElement(Part, { part }));
    const handles = view.queryAllByRole('button', { name: /^Resize / });
    expect(handles).toHaveLength(form === 'rod' ? 2 : form === 'insert' ? 0 : 20);
    if (form === 'rod') {
      expect(view.getByRole('button', { name: 'Resize -1 0 0' })).toBeTruthy();
      expect(view.getByRole('button', { name: 'Resize 1 0 0' })).toBeTruthy();
    }
  });

  it('keeps round length handles reachable after the pointer leaves the pin, without changing board hover behavior', async () => {
    const stock = createTestStock({ id: 'round-grips', form: 'rod' });
    const pin = createTestPart({ id: 'pin-grips', stockId: stock.id, length: 0.75, width: 0.25, thickness: 0.25 });
    useProjectStore.setState({ stocks: [stock], parts: [pin] });
    useSelectionStore.setState({ selectedPartIds: [pin.id], hoveredPartId: null });
    const view = render(createElement(Part, { part: pin }));
    expect(view.getAllByRole('button', { name: /^Resize / })).toHaveLength(2);
    fireEvent.pointerOver(view.container.querySelector('mesh')!);
    fireEvent.pointerOut(view.container.querySelector('mesh')!);
    await waitFor(() => expect(view.getAllByRole('button', { name: /^Resize / })).toHaveLength(2));
    view.unmount();
    const board = { ...pin, stockId: null };
    const regular = render(createElement(Part, { part: board }));
    expect(regular.queryAllByRole('button', { name: /^Resize / })).toHaveLength(0);
  });

  it('renders an affected group move instead of a displaced part hook preview', async () => {
    const part = createTestPart({
      id: 'takeover-divider',
      length: 10,
      width: 4,
      thickness: 1,
      position: { x: 10, y: 5, z: -2 }
    });
    useInteractionStore.getState().beginMoveSession({
      affectedPartIds: [part.id],
      primaryPartId: part.id,
      moveOwner: 'group',
      initialDelta: { x: 1, y: 2, z: 3 }
    });

    const { container } = render(createElement(Part, { part }));

    await waitFor(() => {
      expect(container.querySelector('group')?.getAttribute('position')).toBe('11,7,1');
      expect(container.querySelector('boxgeometry')?.getAttribute('args')).toBe('10,1,4');
    });
  });

  /** The part's own body, which is the first mesh rendered. */
  const body = (container: HTMLElement) => container.querySelectorAll('mesh')[0];

  it('selects the part when it is clicked', () => {
    const part = createTestPart({ id: 'clickable' });
    useProjectStore.setState({ parts: [part] });
    const { container } = render(createElement(Part, { part }));

    fireEvent.click(body(container));
    expect(useSelectionStore.getState().selectedPartIds).toContain('clickable');
  });

  it('marks the part as hovered, and lets go again', () => {
    const part = createTestPart({ id: 'hoverable' });
    useProjectStore.setState({ parts: [part] });
    const { container } = render(createElement(Part, { part }));

    fireEvent.pointerOver(body(container));
    expect(useSelectionStore.getState().hoveredPartId).toBe('hoverable');

    fireEvent.pointerOut(body(container));
    expect(useSelectionStore.getState().hoveredPartId).toBeNull();
  });

  it('leaves the cursor alone while a drag is under way', () => {
    // This fixture holds the part mid-drag. Hovering must not take the
    // grabbing cursor away and make the drag look finished.
    document.body.style.cursor = 'grabbing';
    const part = createTestPart({ id: 'dragging' });
    useProjectStore.setState({ parts: [part] });
    const { container } = render(createElement(Part, { part }));

    fireEvent.pointerOver(body(container));
    expect(document.body.style.cursor).toBe('grabbing');

    fireEvent.pointerOut(body(container));
    expect(document.body.style.cursor).toBe('grabbing');
  });

  it('selects the part on a double-click too', () => {
    const part = createTestPart({ id: 'double' });
    useProjectStore.setState({ parts: [part] });
    const { container } = render(createElement(Part, { part }));

    fireEvent.doubleClick(body(container));
    expect(useSelectionStore.getState().selectedPartIds).toContain('double');
  });

  describe('turning a selected part', () => {
    const selectedPart = () => {
      const part = createTestPart({
        id: 'turnable',
        length: 10,
        width: 4,
        thickness: 1,
        position: { x: 0, y: 0.5, z: 0 },
        rotation: { x: 0, y: 0, z: 0 }
      });
      useProjectStore.setState({ parts: [part] });
      useSelectionStore.setState({ selectedPartIds: [part.id] });
      return part;
    };

    it('offers a rotation handle for each axis once a part is the only one selected', () => {
      const part = selectedPart();
      const { container } = render(createElement(Part, { part }));
      // Three rings, one per axis, each with its own grab handle on a stalk.
      expect(container.querySelectorAll('spheregeometry').length).toBeGreaterThanOrEqual(6);
    });

    it('turns the part a quarter turn when a ring is clicked', () => {
      // This is the rotate control itself, from the part's side of it.
      const part = selectedPart();
      const { container } = render(createElement(Part, { part }));

      const rings = Array.from(container.querySelectorAll('mesh')).filter(
        (mesh) => mesh.getAttribute('userdata') !== null && !mesh.querySelector('spheregeometry')
      );
      fireEvent.click(rings[rings.length - 1]);

      const turned = useProjectStore.getState().parts.find((candidate) => candidate.id === 'turnable')!;
      const { x, y, z } = turned.rotation;
      expect(Math.abs(x) + Math.abs(y) + Math.abs(z)).toBeGreaterThan(0);
    });

    it('does not turn a part that is one of several selected', () => {
      // Rotating a multi-selection is the group handle's job, not this one's.
      const part = selectedPart();
      useSelectionStore.setState({ selectedPartIds: [part.id, 'another'] });
      const { container } = render(createElement(Part, { part }));
      expect(container.querySelectorAll('spheregeometry').length).toBe(0);
    });
  });
});
