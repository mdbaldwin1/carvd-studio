import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PerspectiveCamera, Quaternion, Euler, Vector3 } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { createTestPart, createTestStock } from '../../../../../tests/helpers/factories';
import { useSnapStore } from '../../store/snapStore';
import { useProjectStore } from '../../store/projectStore';
import { usePartResize } from './usePartResize';
vi.unmock('three');

describe('round blank length handle release', () => {
  it('can resize length when the camera looks mostly toward the end cap', async () => {
    const part = createTestPart({
      id: 'end-view-pin',
      blankShape: 'round',
      length: 0.75,
      width: 0.25,
      thickness: 0.25,
      position: { x: 0, y: 1, z: 0 }
    });
    useProjectStore.setState({
      parts: [part],
      stocks: [],
      stockConstraints: {
        constrainDimensions: false,
        constrainColor: true,
        constrainGrain: true,
        preventOverlap: false
      }
    });
    useSnapStore.setState({ snapToPartsEnabled: false });
    const camera = new PerspectiveCamera(50, 800 / 600, 0.1, 1000);
    camera.position.set(10, 3, 2);
    camera.lookAt(0, 1, 0);
    camera.updateMatrixWorld();
    const canvas = document.createElement('canvas');
    canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });
    const dims = { x: 0, y: 1, z: 0, length: 0.75, width: 0.25, thickness: 0.25 };
    const setDimensions = vi.fn();
    const { result } = renderHook(() =>
      usePartResize(
        part,
        dims,
        setDimensions,
        new Quaternion(),
        new Quaternion(),
        camera,
        { domElement: canvas } as never,
        null,
        vi.fn(() => true)
      )
    );
    act(() =>
      result.current.handleResizeStart({ x: 1, y: 0, z: 0, type: 'edge-y' }, {
        stopPropagation: vi.fn(),
        nativeEvent: { clientX: 400, clientY: 300 }
      } as unknown as ThreeEvent<PointerEvent>)
    );
    act(() => window.dispatchEvent(new PointerEvent('pointermove', { clientX: 450, clientY: 300, buttons: 1 })));
    await waitFor(() => expect(setDimensions).toHaveBeenCalled());
    const next = setDimensions.mock.calls[0][0](dims);
    expect(Math.abs(next.length - part.length)).toBeGreaterThan(0.05);
    expect(next.width).toBe(0.25);
    expect(next.thickness).toBe(0.25);
  });

  it.each([0.375, 1.5])('keeps the opposite pin end and bore axis fixed on a 1-inch grid at Y=%s', (height) => {
    const stock = createTestStock({ id: 'coarse-rod', form: 'rod', length: 36, width: 0.25, thickness: 0.25 });
    const pin = createTestPart({
      id: 'coarse-pin',
      stockId: stock.id,
      blankShape: 'round',
      length: 0.75,
      width: 0.25,
      thickness: 0.25,
      position: { x: 12.75, y: height, z: 3.75 },
      rotation: { x: 0, y: 0, z: 90 }
    });
    const host = createTestPart({
      id: 'bored-host',
      length: 12,
      width: 3,
      thickness: 0.75,
      position: { x: 12.75, y: 0.375, z: 3.75 },
      features: [
        {
          id: 'bore',
          kind: 'circular_cut',
          version: 1,
          enabled: true,
          cutType: 'round_hole',
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'center', secondaryFrom: 'center' },
          placement: { primary: 0, secondary: 0, rotation: 0 },
          parameters: { diameter: 0.25, depthMode: 'through', tilt: 0, direction: 0 }
        }
      ]
    });
    useProjectStore.setState({
      parts: [pin, host],
      stocks: [stock],
      gridSize: 1,
      stockConstraints: { constrainDimensions: true, constrainColor: true, constrainGrain: true, preventOverlap: true }
    });
    const camera = new PerspectiveCamera(50, 800 / 600, 0.1, 1000);
    camera.position.set(20, 10, 10);
    camera.lookAt(12.75, height, 3.75);
    camera.updateMatrixWorld();
    const canvas = document.createElement('canvas');
    canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });
    const q = new Quaternion().setFromEuler(new Euler(0, 0, Math.PI / 2));
    const update = vi.fn(useProjectStore.getState().updatePart);
    const { result } = renderHook(() =>
      usePartResize(
        pin,
        { ...pin.position, length: 1, width: 0.25, thickness: 0.25 },
        vi.fn(),
        q,
        q.clone().invert(),
        camera,
        { domElement: canvas } as never,
        null,
        update
      )
    );
    act(() =>
      result.current.handleResizeStart({ x: 1, y: 0, z: 0, type: 'edge-y' }, {
        stopPropagation: vi.fn(),
        nativeEvent: { clientX: 400, clientY: 300 }
      } as unknown as ThreeEvent<PointerEvent>)
    );
    act(() => window.dispatchEvent(new PointerEvent('pointerup')));
    expect(update.mock.results[0].value).toBe(true);
    expect(useProjectStore.getState().parts[0]).toMatchObject({
      length: 1,
      width: 0.25,
      thickness: 0.25,
      position: { x: 12.75, y: height + 0.125, z: 3.75 }
    });
  });

  it('keeps the opposite end fixed during an arbitrarily rotated coarse-grid resize', () => {
    const q = new Quaternion().setFromEuler(new Euler(0.3, 0.6, 0.4));
    const part = createTestPart({
      id: 'angled-resize',
      length: 0.75,
      width: 0.25,
      thickness: 0.25,
      position: { x: 12.75, y: 20, z: 3.75 },
      rotation: { x: (0.3 * 180) / Math.PI, y: (0.6 * 180) / Math.PI, z: (0.4 * 180) / Math.PI }
    });
    useProjectStore.setState({
      parts: [part],
      stocks: [],
      gridSize: 1,
      stockConstraints: { constrainDimensions: false, constrainColor: true, constrainGrain: true, preventOverlap: true }
    });
    const camera = new PerspectiveCamera(50, 800 / 600, 0.1, 1000);
    camera.position.set(20, 30, 10);
    camera.lookAt(12.75, 20, 3.75);
    camera.updateMatrixWorld();
    const canvas = document.createElement('canvas');
    canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });
    const { result } = renderHook(() =>
      usePartResize(
        part,
        { ...part.position, length: 1, width: 0.25, thickness: 0.25 },
        vi.fn(),
        q,
        q.clone().invert(),
        camera,
        { domElement: canvas } as never,
        null,
        useProjectStore.getState().updatePart
      )
    );
    act(() =>
      result.current.handleResizeStart({ x: 1, y: 0, z: 0, type: 'edge-y' }, {
        stopPropagation: vi.fn(),
        nativeEvent: { clientX: 400, clientY: 300 }
      } as unknown as ThreeEvent<PointerEvent>)
    );
    act(() => window.dispatchEvent(new PointerEvent('pointerup')));
    const after = useProjectStore.getState().parts[0];
    const end = (p: typeof part) =>
      new Vector3(-p.length / 2, 0, 0).applyQuaternion(q).add(new Vector3(p.position.x, p.position.y, p.position.z));
    expect(after.length).toBe(1);
    expect(end(after).distanceTo(end(part))).toBeLessThan(1e-8);
  });

  it.each([false, true])('preserves quarter-inch diameter with stock constraints=%s', (constrainDimensions) => {
    const stock = createTestStock({ id: 'rod', form: 'rod', length: 36, width: 0.25, thickness: 0.25 });
    const part = createTestPart({
      id: 'pin',
      stockId: stock.id,
      blankShape: 'round',
      length: 0.75,
      width: 0.25,
      thickness: 0.25,
      position: { x: 0, y: 1, z: 0 }
    });
    useProjectStore.setState({
      parts: [part],
      stocks: [stock],
      gridSize: 0.0625,
      stockConstraints: { constrainDimensions, constrainColor: true, constrainGrain: true, preventOverlap: false }
    });
    const camera = new PerspectiveCamera(50, 800 / 600, 0.1, 1000);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const canvas = document.createElement('canvas');
    canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });
    const update = vi.fn(useProjectStore.getState().updatePart);
    const { result } = renderHook(() =>
      usePartResize(
        part,
        { x: 0, y: 1, z: 0, length: 1.25, width: 0.25, thickness: 0.25 },
        vi.fn(),
        new Quaternion(),
        new Quaternion(),
        camera,
        { domElement: canvas } as never,
        null,
        update
      )
    );
    act(() =>
      result.current.handleResizeStart({ x: 1, y: 0, z: 0, type: 'edge-y' }, {
        stopPropagation: vi.fn(),
        nativeEvent: { clientX: 400, clientY: 300 }
      } as unknown as ThreeEvent<PointerEvent>)
    );
    expect(result.current.isResizing).toBe(true);
    act(() => window.dispatchEvent(new PointerEvent('pointerup')));
    expect(update).toHaveBeenCalledWith('pin', expect.objectContaining({ length: 1.25, width: 0.25, thickness: 0.25 }));
    expect(useProjectStore.getState().parts[0]).toMatchObject({ length: 1.25, width: 0.25, thickness: 0.25 });
  });
  it('commits a small prepared T-slot runner without inflating its section', () => {
    const stock = createTestStock({ id: 'rod', form: 'board', length: 4, width: 0.47, thickness: 0.1675 });
    const part = createTestPart({
      id: 'pin',
      stockId: stock.id,
      length: 4,
      width: 0.47,
      thickness: 0.1675,
      position: { x: 0, y: 1, z: 0 }
    });
    useProjectStore.setState({
      parts: [part],
      stocks: [stock],
      gridSize: 0.0025,
      stockConstraints: { constrainDimensions: true, constrainColor: true, constrainGrain: true, preventOverlap: false }
    });
    const camera = new PerspectiveCamera(50, 800 / 600, 0.1, 1000);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const canvas = document.createElement('canvas');
    canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });
    const update = vi.fn(useProjectStore.getState().updatePart);
    const { result } = renderHook(() =>
      usePartResize(
        part,
        { x: 0, y: 1, z: 0, length: 4, width: 0.47, thickness: 0.1675 },
        vi.fn(),
        new Quaternion(),
        new Quaternion(),
        camera,
        { domElement: canvas } as never,
        null,
        update
      )
    );
    act(() =>
      result.current.handleResizeStart({ x: 1, y: 1, z: 1, type: 'corner' }, {
        stopPropagation: vi.fn(),
        nativeEvent: { clientX: 400, clientY: 300 }
      } as unknown as ThreeEvent<PointerEvent>)
    );
    expect(result.current.isResizing).toBe(true);
    act(() => window.dispatchEvent(new PointerEvent('pointerup')));
    expect(update).toHaveBeenCalledWith('pin', expect.objectContaining({ length: 4, width: 0.47, thickness: 0.1675 }));
    expect(useProjectStore.getState().parts[0]).toMatchObject({ length: 4, width: 0.47, thickness: 0.1675 });
  });
});
