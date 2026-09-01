import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('analytics facade', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('forwards a typed analytics event through the restricted preload API', async () => {
    const captureAnalytics = vi.fn();
    window.electronAPI = { captureAnalytics } as never;
    const { analytics } = await import('./analytics');

    analytics.capture('project_created', { source: 'menu', units: 'metric' });

    expect(captureAnalytics).toHaveBeenCalledWith({
      name: 'project_created',
      properties: { source: 'menu', units: 'metric' }
    });
  });

  it('never lets a synchronous preload exception affect renderer control flow', async () => {
    window.electronAPI = {
      captureAnalytics: () => {
        throw new Error('preload unavailable');
      }
    } as never;
    const { analytics } = await import('./analytics');

    expect(() => analytics.capture('app_opened', {})).not.toThrow();
  });

  it('does not expose mutable facade state', async () => {
    window.electronAPI = { captureAnalytics: vi.fn() } as never;
    const { analytics } = await import('./analytics');

    expect(Object.isFrozen(analytics)).toBe(true);
  });
});
