import { describe, expect, it, vi } from 'vitest';
import type { IpcMain } from 'electron';
import { registerAnalyticsIpcHandlers } from './analyticsIpc';

type Handler = (event: unknown, ...args: unknown[]) => unknown;

function createIpcMain() {
  const handlers = new Map<string, Handler>();

  return {
    handlers,
    handle: (channel: string, handler: Handler) => {
      handlers.set(channel, handler);
    }
  };
}

describe('registerAnalyticsIpcHandlers', () => {
  it('forwards capture input without allowing analytics failures into IPC', () => {
    const ipcMain = createIpcMain();
    const capture = vi.fn(() => {
      throw new Error('unavailable');
    });

    registerAnalyticsIpcHandlers(ipcMain as unknown as Pick<IpcMain, 'handle'>, {
      capture,
      getConsent: () => 'unknown',
      setConsent: () => ({ success: true })
    });

    expect(() => ipcMain.handlers.get('analytics:capture')?.({}, { name: 'app_opened', properties: {} })).not.toThrow();
    expect(capture).toHaveBeenCalledWith({ name: 'app_opened', properties: {} });
  });

  it('returns the persisted consent state', () => {
    const ipcMain = createIpcMain();

    registerAnalyticsIpcHandlers(ipcMain as unknown as Pick<IpcMain, 'handle'>, {
      capture: () => undefined,
      getConsent: () => 'granted',
      setConsent: () => ({ success: true })
    });

    expect(ipcMain.handlers.get('analytics:get-consent')?.({})).toBe('granted');
  });

  it.each(['unknown', 'granted', 'denied'] as const)('accepts the %s consent enum', (consent) => {
    const ipcMain = createIpcMain();
    const setConsent = vi.fn(() => ({ success: true }));

    registerAnalyticsIpcHandlers(ipcMain as unknown as Pick<IpcMain, 'handle'>, {
      capture: () => undefined,
      getConsent: () => 'unknown',
      setConsent
    });

    expect(ipcMain.handlers.get('analytics:set-consent')?.({}, consent, 'settings')).toEqual({ success: true });
    expect(setConsent).toHaveBeenCalledWith(consent);
  });

  it.each([undefined, '', 'yes', 'revoked', null, {}])('rejects an invalid consent value: %j', (consent) => {
    const ipcMain = createIpcMain();
    const setConsent = vi.fn(() => ({ success: true }));

    registerAnalyticsIpcHandlers(ipcMain as unknown as Pick<IpcMain, 'handle'>, {
      capture: () => undefined,
      getConsent: () => 'unknown',
      setConsent
    });

    expect(ipcMain.handlers.get('analytics:set-consent')?.({}, consent, 'onboarding')).toEqual({ success: false });
    expect(setConsent).not.toHaveBeenCalled();
  });

  it.each([undefined, '', 'menu', null, {}])('rejects an invalid consent surface: %j', (surface) => {
    const ipcMain = createIpcMain();
    const setConsent = vi.fn(() => ({ success: true }));

    registerAnalyticsIpcHandlers(ipcMain as unknown as Pick<IpcMain, 'handle'>, {
      capture: () => undefined,
      getConsent: () => 'unknown',
      setConsent
    });

    expect(ipcMain.handlers.get('analytics:set-consent')?.({}, 'granted', surface)).toEqual({ success: false });
    expect(setConsent).not.toHaveBeenCalled();
  });
});
