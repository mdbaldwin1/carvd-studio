import { fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCameraStore } from '../../store/cameraStore';
import { useSelectionStore } from '../../store/selectionStore';
import { RotationHandle } from './RotationHandle';
import type { LiveDimensions } from './partTypes';

vi.unmock('three');

vi.mock('@react-three/drei', () => ({
  Html: ({ children }: { children?: React.ReactNode }) => createElement('div', { 'data-html': true }, children)
}));

vi.mock('@react-three/fiber', async () => {
  const THREE = await vi.importActual<typeof import('three')>('three');
  const camera = new THREE.PerspectiveCamera(50, 800 / 600, 0.1, 1000);
  camera.position.set(20, 20, 20);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();

  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600,
    toJSON: () => ({})
  });

  return {
    useThree: () => ({ camera, gl: { domElement: canvas }, size: { width: 800, height: 600 } })
  };
});

const liveDims: LiveDimensions = {
  x: 0,
  y: 0.5,
  z: 0,
  length: 10,
  width: 4,
  thickness: 1
};

function renderHandle(overrides: Partial<Parameters<typeof RotationHandle>[0]> = {}) {
  const callbacks = {
    onRotate: vi.fn(),
    onRotateDelta: vi.fn(),
    onRotateStart: vi.fn(),
    onRotateEnd: vi.fn()
  };
  const props = {
    partId: 'part-1',
    liveDims,
    axis: 'y' as const,
    side: 1 as const,
    ...overrides,
    ...callbacks
  };
  const result = render(createElement(RotationHandle, props));

  // Rendered through React DOM rather than R3F's reconciler, the ref holds a
  // <group> element rather than a THREE.Group. The component asks it where it
  // is in the world when a drag begins, so the stand-in has to be able to say.
  const group = result.container.querySelector('group');
  if (group) {
    Object.assign(group, {
      getWorldPosition: (target: { set: (x: number, y: number, z: number) => unknown }) => target.set(0, 0.7, 0),
      getWorldQuaternion: (target: unknown) => target
    });
  }
  return { ...result, props };
}

/** The invisible ring, which is the click-to-rotate-90 target. */
const ringHitArea = (container: HTMLElement) => container.querySelectorAll('mesh')[0];

/** The outer sphere on the stalk, which is the drag target. */
const grabHandle = (container: HTMLElement) => {
  const meshes = Array.from(container.querySelectorAll('mesh'));
  const grab = meshes.find((mesh) => mesh.querySelector('spheregeometry'));
  if (!grab) throw new Error('no grab handle rendered');
  return grab;
};

beforeEach(() => {
  useSelectionStore.setState({ dragIntent: null });
  useCameraStore.setState({ displayMode: 'solid' });
  document.body.style.cursor = '';
});

describe('RotationHandle', () => {
  it('draws a ring and a grab handle to take hold of', () => {
    const { container } = render(
      createElement(RotationHandle, {
        partId: 'part-1',
        liveDims,
        axis: 'y',
        side: 1,
        onRotate: vi.fn(),
        onRotateDelta: vi.fn(),
        onRotateStart: vi.fn(),
        onRotateEnd: vi.fn()
      })
    );
    expect(container.querySelectorAll('mesh').length).toBeGreaterThan(2);
    expect(grabHandle(container)).toBeTruthy();
  });

  it.each(['x', 'y', 'z'] as const)('turns the part a quarter turn about %s when the ring is clicked', (axis) => {
    const { container, props } = renderHandle({ axis });
    fireEvent.click(ringHitArea(container));
    expect(props.onRotate).toHaveBeenCalledWith(axis);
  });

  it.each([1, -1] as const)('renders on the %p side of the axis', (side) => {
    const { container } = renderHandle({ side });
    expect(container.querySelector('group')).toBeTruthy();
  });

  describe('dragging the grab handle', () => {
    const press = (element: Element, overrides: Record<string, unknown> = {}) =>
      fireEvent.pointerDown(element, {
        button: 0,
        pointerId: 7,
        clientX: 420,
        clientY: 300,
        ...overrides
      });

    it('starts a rotation and says so', () => {
      const { container, props } = renderHandle();
      press(grabHandle(container));
      expect(props.onRotateStart).toHaveBeenCalledTimes(1);
      // The part must not also be nudged along while it is being turned.
      expect(props.onRotate).not.toHaveBeenCalled();
    });

    it('reports the turn as the pointer moves, and finishes on release', () => {
      const { container, props } = renderHandle();
      press(grabHandle(container));

      act(() => {
        window.dispatchEvent(
          new PointerEvent('pointermove', { pointerId: 7, clientX: 520, clientY: 360, bubbles: true })
        );
      });
      act(() => {
        window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, bubbles: true }));
      });

      expect(props.onRotateEnd).toHaveBeenCalledTimes(1);
    });

    it('reports the angle turned as the pointer swings round', () => {
      // The part has to follow the hand during the drag, not only at the end.
      const { container, props } = renderHandle();
      press(grabHandle(container));

      for (const [clientX, clientY] of [
        [520, 300],
        [520, 420],
        [420, 460],
        [320, 420]
      ]) {
        act(() => {
          window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 7, clientX, clientY, bubbles: true }));
        });
      }

      expect(props.onRotateDelta).toHaveBeenCalled();
      const [axis, degrees] = props.onRotateDelta.mock.calls.at(-1)!;
      expect(['x', 'y', 'z']).toContain(axis);
      expect(Number.isFinite(degrees)).toBe(true);
    });

    it('ignores a different pointer mid-drag', () => {
      // A second finger, or a stylus arriving partway through, must not be
      // taken for the one doing the turning.
      const { container, props } = renderHandle();
      press(grabHandle(container));
      props.onRotateDelta.mockClear();

      act(() => {
        window.dispatchEvent(
          new PointerEvent('pointermove', { pointerId: 99, clientX: 700, clientY: 120, bubbles: true })
        );
      });
      expect(props.onRotateDelta).not.toHaveBeenCalled();
    });

    it('does not start on a right-click', () => {
      const { container, props } = renderHandle();
      press(grabHandle(container), { button: 2 });
      expect(props.onRotateStart).not.toHaveBeenCalled();
    });
  });

  describe('the ring press', () => {
    it('records where the drag was aimed, so a drag can take over from a click', () => {
      const { container } = renderHandle();
      fireEvent.pointerDown(ringHitArea(container), { button: 0, pointerId: 3, clientX: 200, clientY: 150 });
      expect(useSelectionStore.getState().dragIntent).toMatchObject({ partId: 'part-1', screenX: 200, screenY: 150 });
    });

    it('records nothing when there is no part to turn', () => {
      const { container } = renderHandle({ partId: null });
      fireEvent.pointerDown(ringHitArea(container), { button: 0, pointerId: 3, clientX: 200, clientY: 150 });
      expect(useSelectionStore.getState().dragIntent).toBeNull();
    });

    it('ignores a right-click', () => {
      const { container } = renderHandle();
      fireEvent.pointerDown(ringHitArea(container), { button: 2, pointerId: 3, clientX: 200, clientY: 150 });
      expect(useSelectionStore.getState().dragIntent).toBeNull();
    });
  });

  describe('hovering', () => {
    it('marks the handle as something to take hold of, and puts the cursor back', () => {
      const { container } = renderHandle();
      fireEvent.pointerOver(grabHandle(container));
      expect(document.body.style.cursor).toBe('pointer');

      fireEvent.pointerOut(grabHandle(container));
      expect(document.body.style.cursor).not.toBe('pointer');
    });

    it('offers a pointer cursor over the ring', () => {
      const { container } = renderHandle();
      fireEvent.pointerOver(ringHitArea(container));
      expect(document.body.style.cursor).toBe('pointer');

      fireEvent.pointerOut(ringHitArea(container));
      expect(document.body.style.cursor).not.toBe('pointer');
    });
  });

  it('draws through the part when the view is not solid', () => {
    // In wireframe and ghost views the handle has to stay reachable even when
    // it sits behind the board it belongs to.
    useCameraStore.setState({ displayMode: 'wireframe' });
    const { container } = renderHandle();
    expect(grabHandle(container)).toBeTruthy();
  });
});
