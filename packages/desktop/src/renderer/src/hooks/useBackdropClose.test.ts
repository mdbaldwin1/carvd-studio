import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBackdropClose } from './useBackdropClose';

describe('useBackdropClose', () => {
  // Helper to create mock events with matching target and currentTarget
  const createBackdropEvent = () => {
    const element = document.createElement('div');
    return {
      target: element,
      currentTarget: element
    } as unknown as React.MouseEvent;
  };

  // Helper to create mock events with different target and currentTarget (click on content)
  const createContentEvent = () => {
    const backdrop = document.createElement('div');
    const content = document.createElement('div');
    return {
      target: content,
      currentTarget: backdrop
    } as unknown as React.MouseEvent;
  };

  it('returns handleMouseDown and handleClick functions', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useBackdropClose(onClose));

    expect(typeof result.current.handleMouseDown).toBe('function');
    expect(typeof result.current.handleClick).toBe('function');
  });

  it('calls onClose when mousedown and click both happen on backdrop', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useBackdropClose(onClose));

    const backdropEvent = createBackdropEvent();

    act(() => {
      result.current.handleMouseDown(backdropEvent);
    });

    act(() => {
      result.current.handleClick(backdropEvent);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when mousedown is on content but click is on backdrop', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useBackdropClose(onClose));

    const contentEvent = createContentEvent();
    const backdropEvent = createBackdropEvent();

    act(() => {
      result.current.handleMouseDown(contentEvent);
    });

    act(() => {
      result.current.handleClick(backdropEvent);
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not call onClose when mousedown is on backdrop but click is on content', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useBackdropClose(onClose));

    const backdropEvent = createBackdropEvent();
    const contentEvent = createContentEvent();

    act(() => {
      result.current.handleMouseDown(backdropEvent);
    });

    act(() => {
      result.current.handleClick(contentEvent);
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not call onClose when both events are on content', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useBackdropClose(onClose));

    const contentEvent = createContentEvent();

    act(() => {
      result.current.handleMouseDown(contentEvent);
    });

    act(() => {
      result.current.handleClick(contentEvent);
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('resets state after click (requires new mousedown for next click)', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useBackdropClose(onClose));

    const backdropEvent = createBackdropEvent();

    // First interaction
    act(() => {
      result.current.handleMouseDown(backdropEvent);
      result.current.handleClick(backdropEvent);
    });

    expect(onClose).toHaveBeenCalledTimes(1);

    // Second click without mousedown should not trigger close
    act(() => {
      result.current.handleClick(backdropEvent);
    });

    expect(onClose).toHaveBeenCalledTimes(1); // Still 1, not 2
  });

  it('maintains stable function references across renders', () => {
    const onClose = vi.fn();
    const { result, rerender } = renderHook(() => useBackdropClose(onClose));

    const firstHandleMouseDown = result.current.handleMouseDown;
    const firstHandleClick = result.current.handleClick;

    rerender();

    expect(result.current.handleMouseDown).toBe(firstHandleMouseDown);
    expect(result.current.handleClick).toBe(firstHandleClick);
  });

  it('updates handleClick when onClose changes', () => {
    const onClose1 = vi.fn();
    const onClose2 = vi.fn();

    const { result, rerender } = renderHook(({ onClose }) => useBackdropClose(onClose), {
      initialProps: { onClose: onClose1 }
    });

    const backdropEvent = createBackdropEvent();

    // Trigger with first onClose
    act(() => {
      result.current.handleMouseDown(backdropEvent);
      result.current.handleClick(backdropEvent);
    });

    expect(onClose1).toHaveBeenCalledTimes(1);
    expect(onClose2).not.toHaveBeenCalled();

    // Change onClose
    rerender({ onClose: onClose2 });

    // Trigger with second onClose
    act(() => {
      result.current.handleMouseDown(backdropEvent);
      result.current.handleClick(backdropEvent);
    });

    expect(onClose1).toHaveBeenCalledTimes(1);
    expect(onClose2).toHaveBeenCalledTimes(1);
  });
});
