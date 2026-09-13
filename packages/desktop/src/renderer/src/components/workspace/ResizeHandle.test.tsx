import { fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResizeHandle } from './ResizeHandle';
import type { HandlePosition, LiveDimensions } from './partTypes';

vi.unmock('three');

const liveDims: LiveDimensions = {
  x: 0,
  y: 0.5,
  z: 0,
  length: 10,
  width: 4,
  thickness: 1
};

const corner: HandlePosition = { x: 1, y: 1, z: 1, type: 'corner' };

function renderHandle(overrides: Partial<Parameters<typeof ResizeHandle>[0]> = {}) {
  const onResizeStart = vi.fn();
  const props = {
    partId: 'part-1',
    liveDims,
    handlePos: corner,
    isResizing: false,
    ...overrides,
    onResizeStart
  };
  const result = render(createElement(ResizeHandle, props));
  return { ...result, props };
}

/** The oversized, near-invisible mesh that actually catches the pointer. */
const hitTarget = (container: HTMLElement) => container.querySelectorAll('mesh')[0];

beforeEach(() => {
  document.body.style.cursor = '';
});

describe('ResizeHandle', () => {
  it('sits at the corner it belongs to', () => {
    const { container } = renderHandle();
    // Half of 10 x 1 x 4, which is the corner of the blank.
    expect(container.querySelector('group')?.getAttribute('position')).toBe('5,0.5,2');
  });

  it('sits at the middle of an axis it does not pull on', () => {
    const { container } = renderHandle({ handlePos: { x: 1, y: 0, z: 0, type: 'edge-y' } });
    expect(container.querySelector('group')?.getAttribute('position')).toBe('5,0,0');
  });

  it('starts a resize when pressed, saying which handle was taken', () => {
    const { container, props } = renderHandle();
    fireEvent.pointerDown(hitTarget(container), { button: 0, pointerId: 1 });
    expect(props.onResizeStart).toHaveBeenCalledTimes(1);
    expect(props.onResizeStart.mock.calls[0]![0]).toBe(corner);
  });

  it('ignores a right-click, which belongs to the context menu', () => {
    const { container, props } = renderHandle();
    fireEvent.pointerDown(hitTarget(container), { button: 2, pointerId: 1 });
    expect(props.onResizeStart).not.toHaveBeenCalled();
  });

  it.each([
    ['corner', { x: 1, y: 1, z: 1, type: 'corner' } as HandlePosition, 'nwse-resize'],
    ['edge-x', { x: 0, y: 1, z: 1, type: 'edge-x' } as HandlePosition, 'ns-resize'],
    ['edge-y', { x: 1, y: 0, z: 1, type: 'edge-y' } as HandlePosition, 'ew-resize'],
    ['edge-z', { x: 1, y: 1, z: 0, type: 'edge-z' } as HandlePosition, 'nesw-resize']
  ])('shows the %s cursor for the direction it pulls in', (_name, handlePos, cursor) => {
    const { container } = renderHandle({ handlePos });
    fireEvent.pointerOver(hitTarget(container));
    expect(document.body.style.cursor).toBe(cursor);
  });

  it('puts the cursor back on the way out', () => {
    const { container } = renderHandle();
    fireEvent.pointerOver(hitTarget(container));
    fireEvent.pointerOut(hitTarget(container));
    expect(document.body.style.cursor).toBe('auto');
  });

  it('keeps the resize cursor while a drag is still under way', () => {
    // The pointer leaves the handle almost immediately when dragging, and
    // reverting the cursor then would make the drag look finished.
    const { container } = renderHandle({ isResizing: true });
    fireEvent.pointerOver(hitTarget(container));
    fireEvent.pointerOut(hitTarget(container));
    expect(document.body.style.cursor).toBe('nwse-resize');
  });

  it('grows when hovered, so the target is obvious', () => {
    const { container } = renderHandle();
    const before = container.querySelectorAll('mesh').length;
    fireEvent.pointerOver(hitTarget(container));
    expect(container.querySelectorAll('mesh').length).toBeGreaterThan(before);
  });

  it('stays grown while the resize runs, without being hovered', () => {
    const { container } = renderHandle({ isResizing: true });
    expect(container.querySelectorAll('mesh').length).toBe(4);
  });

  it('stays grabbable on a part too thin to draw a big handle on', () => {
    // The visible handle shrinks with the stock, but the thing you have to
    // hit must not shrink with it.
    const veneer = { ...liveDims, thickness: 0.08 };
    const { container } = renderHandle({ liveDims: veneer });
    const hitScale = Number(hitTarget(container).getAttribute('scale'));
    expect(hitScale).toBeGreaterThanOrEqual(0.68);
  });

  it('carries what the hit-test service needs to name it', () => {
    const { container } = renderHandle();
    expect(hitTarget(container).getAttribute('userdata')).toBeTruthy();
  });
});
