import { render, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../../tests/helpers/factories';
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

describe('Part render ownership', () => {
  beforeEach(() => {
    useProjectStore.setState({ groupMembers: [] });
    useSelectionStore.setState({
      selectedPartIds: [],
      selectedGroupIds: [],
      hoveredPartId: null,
      editingGroupId: null
    });
    useInteractionStore.setState({ activeSession: null });
    vi.spyOn(console, 'error').mockImplementation(() => {});
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
});
