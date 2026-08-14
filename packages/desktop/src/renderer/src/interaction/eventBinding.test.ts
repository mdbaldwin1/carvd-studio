import { describe, expect, it, vi } from 'vitest';
import { bindEventListeners } from './eventBinding';

describe('bindEventListeners', () => {
  it('binds multiple listeners and removes the same listeners on cleanup', () => {
    const listeners = new Map<string, unknown>();
    const target = {
      addEventListener: vi.fn((type: string, listener: unknown) => {
        listeners.set(type, listener);
      }),
      removeEventListener: vi.fn((type: string, listener: unknown) => {
        expect(listeners.get(type)).toBe(listener);
        listeners.delete(type);
      })
    };
    const onMove = vi.fn();
    const onUp = vi.fn();

    const cleanup = bindEventListeners(target, [
      ['pointermove', onMove],
      ['pointerup', onUp]
    ]);

    expect(target.addEventListener).toHaveBeenCalledWith('pointermove', onMove);
    expect(target.addEventListener).toHaveBeenCalledWith('pointerup', onUp);

    cleanup();

    expect(listeners.size).toBe(0);
    expect(target.removeEventListener).toHaveBeenCalledWith('pointermove', onMove);
    expect(target.removeEventListener).toHaveBeenCalledWith('pointerup', onUp);
  });

  it('passes listener options when provided', () => {
    const target = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    const onContextMenu = vi.fn();

    const cleanup = bindEventListeners(target, [['contextmenu', onContextMenu, { passive: false }]]);

    expect(target.addEventListener).toHaveBeenCalledWith('contextmenu', onContextMenu, { passive: false });

    cleanup();

    expect(target.removeEventListener).toHaveBeenCalledWith('contextmenu', onContextMenu, { passive: false });
  });
});
