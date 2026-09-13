import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import { EMPTY_CAPABILITY_USAGE, type CapabilitySource } from '../utils/capabilityDiscovery';
import { useCapabilityDiscoveryStore } from './capabilityDiscoveryStore';

const getPreference = vi.fn();
const setPreference = vi.fn();

beforeAll(() => {
  window.electronAPI = { getPreference, setPreference } as never;
});

beforeEach(() => {
  getPreference.mockReset().mockResolvedValue(undefined);
  setPreference.mockReset().mockResolvedValue(undefined);
  useCapabilityDiscoveryStore.setState({
    usage: EMPTY_CAPABILITY_USAGE,
    seen: {},
    loaded: false
  });
});

const grouped: CapabilitySource = {
  parts: [createTestPart(), createTestPart()],
  groups: [{ id: 'g' } as never]
};

describe('load', () => {
  it('starts from nothing when there is nothing stored', async () => {
    await useCapabilityDiscoveryStore.getState().load();
    expect(useCapabilityDiscoveryStore.getState().usage).toEqual(EMPTY_CAPABILITY_USAGE);
    expect(useCapabilityDiscoveryStore.getState().loaded).toBe(true);
  });

  it('restores what was remembered', async () => {
    getPreference.mockResolvedValue({
      usage: { ...EMPTY_CAPABILITY_USAGE, projectsSeen: 4, usedIn: { groups: 4 } },
      seen: { 'a.carvd': ['groups'] }
    });
    await useCapabilityDiscoveryStore.getState().load();
    expect(useCapabilityDiscoveryStore.getState().usage.projectsSeen).toBe(4);
    expect(useCapabilityDiscoveryStore.getState().seen).toEqual({ 'a.carvd': ['groups'] });
  });

  it('fills in fields a older stored shape is missing', async () => {
    // Someone upgrading from a build that predates a field should not end up
    // with an undefined `dismissed` and a card that throws on click.
    getPreference.mockResolvedValue({ usage: { projectsSeen: 2 }, seen: undefined });
    await useCapabilityDiscoveryStore.getState().load();
    const { usage, seen } = useCapabilityDiscoveryStore.getState();
    expect(usage.dismissed).toEqual([]);
    expect(usage.usedIn).toEqual({});
    expect(usage.recentPartCounts).toEqual([]);
    expect(seen).toEqual({});
  });

  it('reads once, however many components ask', async () => {
    await useCapabilityDiscoveryStore.getState().load();
    await useCapabilityDiscoveryStore.getState().load();
    expect(getPreference).toHaveBeenCalledTimes(1);
  });

  it('carries on when preferences cannot be read', async () => {
    getPreference.mockRejectedValue(new Error('no disk'));
    await useCapabilityDiscoveryStore.getState().load();
    expect(useCapabilityDiscoveryStore.getState().loaded).toBe(true);
    expect(useCapabilityDiscoveryStore.getState().usage).toEqual(EMPTY_CAPABILITY_USAGE);
  });
});

describe('recordProject', () => {
  it('folds a project in and writes it down', async () => {
    await useCapabilityDiscoveryStore.getState().recordProject(grouped, 'a.carvd');
    const { usage, seen } = useCapabilityDiscoveryStore.getState();
    expect(usage.projectsSeen).toBe(1);
    expect(usage.usedIn.groups).toBe(1);
    expect(seen).toEqual({ 'a.carvd': ['groups'] });
    expect(setPreference).toHaveBeenCalledWith('capabilityUsage', { usage, seen });
  });

  it('counts a project once however often it is saved', async () => {
    const record = useCapabilityDiscoveryStore.getState().recordProject;
    await record(grouped, 'a.carvd');
    setPreference.mockClear();
    await record(grouped, 'a.carvd');
    await record(grouped, 'a.carvd');
    expect(useCapabilityDiscoveryStore.getState().usage.projectsSeen).toBe(1);
    // Saving all afternoon must not mean writing preferences all afternoon.
    expect(setPreference).not.toHaveBeenCalled();
  });

  it('carries on when preferences cannot be written', async () => {
    setPreference.mockRejectedValue(new Error('read-only'));
    await useCapabilityDiscoveryStore.getState().recordProject(grouped, 'a.carvd');
    // The in-memory count still advanced: losing the record is not worth
    // losing the session over.
    expect(useCapabilityDiscoveryStore.getState().usage.projectsSeen).toBe(1);
  });
});

describe('currentSuggestion', () => {
  const seasoned = () =>
    useCapabilityDiscoveryStore.setState({
      usage: { ...EMPTY_CAPABILITY_USAGE, projectsSeen: 6, recentPartCounts: [20, 20, 20] },
      loaded: true
    });

  it('says nothing before the stored usage has been read', () => {
    useCapabilityDiscoveryStore.setState({
      usage: { ...EMPTY_CAPABILITY_USAGE, projectsSeen: 6, recentPartCounts: [20, 20, 20] },
      loaded: false
    });
    // Otherwise a card flashes up on the strength of an empty record and is
    // replaced a moment later by the real one.
    expect(useCapabilityDiscoveryStore.getState().currentSuggestion()).toBeNull();
  });

  it('offers something once there is enough work to judge by', () => {
    seasoned();
    expect(useCapabilityDiscoveryStore.getState().currentSuggestion()?.capability).toBe('stock_assignment');
  });

  it('keeps quiet for a week after the last one', () => {
    seasoned();
    const now = new Date('2026-03-10T12:00:00Z');
    useCapabilityDiscoveryStore.setState({
      usage: { ...useCapabilityDiscoveryStore.getState().usage, lastSuggestedAt: '2026-03-08T12:00:00Z' }
    });
    expect(useCapabilityDiscoveryStore.getState().currentSuggestion(now)).toBeNull();
  });
});

describe('markSuggested', () => {
  it('stamps the time so the next one waits', async () => {
    await useCapabilityDiscoveryStore.getState().markSuggested();
    const stamped = useCapabilityDiscoveryStore.getState().usage.lastSuggestedAt;
    expect(stamped).toBeTruthy();
    expect(Number.isNaN(Date.parse(stamped!))).toBe(false);
    expect(setPreference).toHaveBeenCalled();
  });
});

describe('dismiss', () => {
  it('stops offering the one that was turned down', async () => {
    await useCapabilityDiscoveryStore.getState().dismiss('snap_guides');
    expect(useCapabilityDiscoveryStore.getState().usage.dismissed).toEqual(['snap_guides']);
  });

  it('can be taken back when it was a slip', async () => {
    await useCapabilityDiscoveryStore.getState().dismiss('snap_guides');
    await useCapabilityDiscoveryStore.getState().undismiss('snap_guides');
    expect(useCapabilityDiscoveryStore.getState().usage.dismissed).toEqual([]);
  });

  it('ignores taking back something that was never refused', async () => {
    setPreference.mockClear();
    await useCapabilityDiscoveryStore.getState().undismiss('snap_guides');
    expect(setPreference).not.toHaveBeenCalled();
  });

  it('does not record the same refusal twice', async () => {
    await useCapabilityDiscoveryStore.getState().dismiss('snap_guides');
    setPreference.mockClear();
    await useCapabilityDiscoveryStore.getState().dismiss('snap_guides');
    expect(useCapabilityDiscoveryStore.getState().usage.dismissed).toEqual(['snap_guides']);
    expect(setPreference).not.toHaveBeenCalled();
  });
});
