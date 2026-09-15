import { act, renderHook } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RouterProfileDefinition } from '../types';

vi.mock('../utils/logger', () => ({ logger: { error: vi.fn() } }));

const createProfile = (overrides: Partial<RouterProfileDefinition> = {}): RouterProfileDefinition => ({
  version: 1,
  id: 'profile-1',
  name: 'Custom Cove',
  family: 'cove',
  source: 'generic',
  parameters: { radius: 0.25 },
  boundary: {
    start: { u: 0, v: 0.25 },
    segments: [{ kind: 'arc', to: { u: 0.25, v: 0 }, radius: 0.25, clockwise: false }]
  },
  ...overrides
});

beforeAll(() => {
  window.electronAPI = {
    getPreference: vi.fn().mockResolvedValue([]),
    setPreference: vi.fn().mockResolvedValue(undefined),
    onSettingsChanged: vi.fn().mockReturnValue(() => {})
  } as unknown as typeof window.electronAPI;
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(window.electronAPI.getPreference).mockResolvedValue([]);
  vi.mocked(window.electronAPI.setPreference).mockResolvedValue(undefined);
  vi.mocked(window.electronAPI.onSettingsChanged).mockReturnValue(() => {});
});

async function freshHook() {
  vi.resetModules();
  const { useRouterProfileLibrary } = await import('./useRouterProfileLibrary');
  return renderHook(() => useRouterProfileLibrary());
}

describe('useRouterProfileLibrary', () => {
  it('loads only valid canonical profiles from preferences', async () => {
    const valid = createProfile();
    vi.mocked(window.electronAPI.getPreference).mockResolvedValue([valid, { ...valid, id: '' }]);
    const hook = await freshHook();
    await act(async () => void (await Promise.resolve()));
    expect(hook.result.current.profiles).toEqual([expect.objectContaining({ ...valid, revision: expect.any(String) })]);
    expect(hook.result.current.isLoading).toBe(false);
  });

  it('adds, updates, finds, and deletes profiles through the preference', async () => {
    const hook = await freshHook();
    const original = createProfile();
    await act(async () => hook.result.current.addProfile(original));
    expect(window.electronAPI.setPreference).toHaveBeenLastCalledWith('routerProfileLibrary', [
      expect.objectContaining({ ...original, revision: expect.any(String) })
    ]);

    vi.mocked(window.electronAPI.getPreference).mockResolvedValue([original]);
    const updated = createProfile({ name: 'Updated Cove' });
    await act(async () => hook.result.current.updateProfile(original.id, updated));
    expect(hook.result.current.findProfile(original.id)?.name).toBe('Updated Cove');

    await act(async () => hook.result.current.deleteProfile(original.id));
    expect(window.electronAPI.setPreference).toHaveBeenLastCalledWith('routerProfileLibrary', []);
  });

  it('rejects invalid and duplicate definitions before saving', async () => {
    const hook = await freshHook();
    await expect(hook.result.current.addProfile(createProfile({ id: '' }))).rejects.toThrow('id');
    vi.mocked(window.electronAPI.getPreference).mockResolvedValue([createProfile()]);
    await expect(hook.result.current.addProfile(createProfile())).rejects.toThrow('already exists');
  });

  it('syncs valid cross-instance preference changes', async () => {
    let listener: ((changes: Record<string, unknown>) => void) | undefined;
    vi.mocked(window.electronAPI.onSettingsChanged).mockImplementation((callback) => {
      listener = callback;
      return () => {};
    });
    const hook = await freshHook();
    await act(async () => void (await Promise.resolve()));
    const next = createProfile({ id: 'profile-2' });
    act(() => listener?.({ routerProfileLibrary: [next] }));
    expect(hook.result.current.profiles).toEqual([expect.objectContaining({ ...next, revision: expect.any(String) })]);
  });
});
