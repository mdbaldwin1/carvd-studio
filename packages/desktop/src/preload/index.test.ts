import { beforeEach, describe, expect, it, vi } from 'vitest';

const electron = vi.hoisted(() => ({
  exposeInMainWorld: vi.fn(),
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn()
}));

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: electron.exposeInMainWorld },
  ipcRenderer: {
    invoke: electron.invoke,
    on: electron.on,
    removeListener: electron.removeListener
  }
}));

describe('preload analytics bridge', () => {
  beforeEach(async () => {
    vi.resetModules();
    electron.exposeInMainWorld.mockClear();
    electron.invoke.mockReset();
    await import('./index');
  });

  it('exposes only the typed analytics operations and forwards their IPC arguments', async () => {
    const api = electron.exposeInMainWorld.mock.calls[0][1] as {
      captureAnalytics: (event: unknown) => void;
      getAnalyticsConsent: () => Promise<unknown>;
      setAnalyticsConsent: (consent: unknown, surface: unknown) => Promise<unknown>;
    };
    const event = { name: 'project_created', properties: { source: 'menu', units: 'metric' } };
    electron.invoke
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce('granted')
      .mockResolvedValueOnce({ success: true });

    expect(api.captureAnalytics(event)).toBeUndefined();

    await expect(api.getAnalyticsConsent()).resolves.toBe('granted');
    await expect(api.setAnalyticsConsent('granted', 'settings')).resolves.toEqual({ success: true });
    expect(electron.invoke).toHaveBeenNthCalledWith(1, 'analytics:capture', event);
    expect(electron.invoke).toHaveBeenNthCalledWith(2, 'analytics:get-consent');
    expect(electron.invoke).toHaveBeenNthCalledWith(3, 'analytics:set-consent', 'granted', 'settings');
  });

  it('swallows a rejected capture invocation', async () => {
    const api = electron.exposeInMainWorld.mock.calls[0][1] as {
      captureAnalytics: (event: unknown) => void;
    };
    electron.invoke.mockRejectedValueOnce(new Error('main process unavailable'));

    expect(api.captureAnalytics({ name: 'app_opened', properties: {} })).toBeUndefined();
    await Promise.resolve();

    expect(electron.invoke).toHaveBeenCalledWith('analytics:capture', { name: 'app_opened', properties: {} });
  });
});
