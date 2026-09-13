import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCapabilityDiscoveryStore } from '@renderer/store/capabilityDiscoveryStore';
import { EMPTY_CAPABILITY_USAGE, type CapabilityUsage } from '@renderer/utils/capabilityDiscovery';
import { NextSkillCard } from './NextSkillCard';

const getPreference = vi.fn();
const setPreference = vi.fn();
const openExternal = vi.fn();

beforeAll(() => {
  window.electronAPI = { getPreference, setPreference, openExternal } as never;
});

beforeEach(() => {
  getPreference.mockReset().mockResolvedValue(undefined);
  setPreference.mockReset().mockResolvedValue(undefined);
  openExternal.mockReset();
  useCapabilityDiscoveryStore.setState({ usage: EMPTY_CAPABILITY_USAGE, seen: {}, loaded: false });
});

/** Someone with six projects behind them who has never dropped a guide plane. */
function seasoned(overrides: Partial<CapabilityUsage> = {}): CapabilityUsage {
  return {
    ...EMPTY_CAPABILITY_USAGE,
    projectsSeen: 6,
    recentPartCounts: [20, 20, 20],
    usedIn: {
      stock_assignment: 6,
      cut_lists: 5,
      groups: 4,
      custom_cuts: 3,
      joinery: 2,
      glue_up_panels: 1,
      assemblies: 1
    },
    ...overrides
  };
}

describe('NextSkillCard', () => {
  it('says nothing to someone with barely any work behind them', async () => {
    getPreference.mockResolvedValue({ usage: { ...EMPTY_CAPABILITY_USAGE, projectsSeen: 1 }, seen: {} });
    const { container } = render(<NextSkillCard />);
    await waitFor(() => expect(useCapabilityDiscoveryStore.getState().loaded).toBe(true));
    expect(container).toBeEmptyDOMElement();
  });

  it('offers the capability that has never been reached for', async () => {
    getPreference.mockResolvedValue({ usage: seasoned(), seen: {} });
    render(<NextSkillCard />);
    expect(await screen.findByText('Guides')).toBeTruthy();
    expect(screen.getByText(/align parts to it instead of measuring/i)).toBeTruthy();
  });

  it('records that it was shown, so the next one waits a week', async () => {
    getPreference.mockResolvedValue({ usage: seasoned(), seen: {} });
    render(<NextSkillCard />);
    await screen.findByText('Guides');
    await waitFor(() => expect(useCapabilityDiscoveryStore.getState().usage.lastSuggestedAt).toBeTruthy());
  });

  it('opens the right page of the docs', async () => {
    getPreference.mockResolvedValue({ usage: seasoned(), seen: {} });
    render(<NextSkillCard />);
    await userEvent.click(await screen.findByRole('button', { name: 'Show me how' }));
    expect(openExternal).toHaveBeenCalledWith('https://carvd-studio.com/docs/snapping');
  });

  it('goes away for now without holding it against the capability', async () => {
    getPreference.mockResolvedValue({ usage: seasoned(), seen: {} });
    render(<NextSkillCard />);
    await userEvent.click(await screen.findByRole('button', { name: 'Not now' }));
    await waitFor(() => expect(screen.queryByText('Guides')).toBeNull());
    expect(useCapabilityDiscoveryStore.getState().usage.dismissed).toEqual([]);
  });

  it('never offers it again once turned down', async () => {
    getPreference.mockResolvedValue({ usage: seasoned(), seen: {} });
    render(<NextSkillCard />);
    await userEvent.click(await screen.findByRole('button', { name: /don.t suggest this/i }));
    await waitFor(() => expect(useCapabilityDiscoveryStore.getState().usage.dismissed).toEqual(['snap_guides']));
    expect(screen.queryByText('Guides')).toBeNull();
  });

  it('says why it is there at all', async () => {
    getPreference.mockResolvedValue({ usage: seasoned(), seen: {} });
    render(<NextSkillCard />);
    expect(await screen.findByText(/something you haven.t tried/i)).toBeTruthy();
  });

  it('offers one way to put it aside and one to end it', async () => {
    getPreference.mockResolvedValue({ usage: seasoned(), seen: {} });
    render(<NextSkillCard />);
    await screen.findByText('Guides');
    // Two dismissals that differ only in wording read as clutter on a card
    // whose whole job is to be easy to wave away.
    expect(screen.queryByRole('button', { name: 'Hide suggestion' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Not now' })).toBeTruthy();
  });

  it('holds still once shown, even as the store settles', async () => {
    getPreference.mockResolvedValue({ usage: seasoned(), seen: {} });
    render(<NextSkillCard />);
    await screen.findByText('Guides');

    // A project recorded in the background must not swap the card out from
    // under someone mid-read.
    await useCapabilityDiscoveryStore.getState().recordProject({ parts: [] }, 'another.carvd');
    expect(screen.getByText('Guides')).toBeTruthy();
  });
});
