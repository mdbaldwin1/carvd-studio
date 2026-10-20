import { act, renderHook } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RouterToolDefinition } from '../types';

vi.mock('../utils/logger', () => ({ logger: { error: vi.fn() } }));

const tool = (overrides: Partial<RouterToolDefinition> = {}): RouterToolDefinition => ({
  version: 1,
  id: 'tool-1',
  name: 'Shop Cove',
  source: 'generic',
  profileFamily: 'cove',
  cutterDiameter: 1,
  shankDiameter: 0.5,
  cuttingHeight: 0.5,
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
  const { useRouterToolLibrary } = await import('./useRouterToolLibrary');
  return renderHook(() => useRouterToolLibrary());
}

describe('useRouterToolLibrary', () => {
  it('persists revisioned CRUD state and returns defensive snapshots', async () => {
    const hook = await freshHook();
    await act(async () => hook.result.current.addTool(tool()));
    const saved = vi.mocked(window.electronAPI.setPreference).mock.calls.at(-1)?.[1] as RouterToolDefinition[];
    expect(saved[0].revision).toMatch(/^fnv1a64:/);
    expect(hook.result.current.findTool('tool-1')).toEqual(saved[0]);

    vi.mocked(window.electronAPI.getPreference).mockResolvedValue(saved);
    await act(async () => hook.result.current.updateTool('tool-1', tool({ name: 'Updated' })));
    expect(hook.result.current.findTool('tool-1')?.name).toBe('Updated');
    await act(async () => hook.result.current.deleteTool('tool-1'));
    expect(window.electronAPI.setPreference).toHaveBeenLastCalledWith('routerToolLibrary', []);
  });

  it('rejects invalid and duplicate tools', async () => {
    const hook = await freshHook();
    await expect(hook.result.current.addTool(tool({ cutterDiameter: 0 }))).rejects.toThrow('cutterDiameter');
    vi.mocked(window.electronAPI.getPreference).mockResolvedValue([tool()]);
    await expect(hook.result.current.addTool(tool())).rejects.toThrow('already exists');
  });
});
