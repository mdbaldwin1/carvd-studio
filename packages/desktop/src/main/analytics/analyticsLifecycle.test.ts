import { describe, expect, it, vi } from 'vitest';
import { registerAnalyticsLifecycle } from './analyticsLifecycle';

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('registerAnalyticsLifecycle', () => {
  it('initializes and captures app_opened exactly once after Electron is ready', async () => {
    const ready = createDeferred();
    const listeners = new Map<string, () => void>();
    const initialize = vi.fn();
    const capture = vi.fn();

    registerAnalyticsLifecycle(
      {
        whenReady: () => ready.promise,
        on: (event, listener) => {
          listeners.set(event, listener);
        }
      },
      { initialize, capture, shutdown: vi.fn().mockResolvedValue(undefined) }
    );

    expect(initialize).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();

    ready.resolve();
    await ready.promise;
    await Promise.resolve();

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith({ name: 'app_opened', properties: {} });
    expect(listeners.get('before-quit')).toBeDefined();
  });

  it('starts analytics shutdown from Electron before-quit', () => {
    const shutdown = vi.fn().mockResolvedValue(undefined);
    const listeners = new Map<string, () => void>();

    registerAnalyticsLifecycle(
      {
        whenReady: () => Promise.resolve(),
        on: (event, listener) => {
          listeners.set(event, listener);
        }
      },
      { initialize: () => undefined, capture: () => undefined, shutdown }
    );

    listeners.get('before-quit')?.();

    expect(shutdown).toHaveBeenCalledTimes(1);
  });
});
