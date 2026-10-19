import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCapabilityDiscoveryStore } from '@renderer/store/capabilityDiscoveryStore';
import { EMPTY_CAPABILITY_USAGE, type CapabilityUsage } from '@renderer/utils/capabilityDiscovery';
import { NextSkillCard } from './NextSkillCard';

const getPreference = vi.fn();
const setPreference = vi.fn();
const openExternal = vi.fn();

/** Observers created by the card, so a test can say what is on screen. */
let observers: Array<{ callback: IntersectionObserverCallback; disconnected: boolean }> = [];

class TestIntersectionObserver {
  constructor(private callback: IntersectionObserverCallback) {
    observers.push({ callback, disconnected: false });
  }
  observe = (): void => {};
  unobserve = (): void => {};
  disconnect = (): void => {
    const entry = observers.find((candidate) => candidate.callback === this.callback);
    if (entry) entry.disconnected = true;
  };
  takeRecords = (): IntersectionObserverEntry[] => [];
  root = null;
  rootMargin = '';
  thresholds = [];
}

/** Tell the card whether it is on screen. */
async function setOnScreen(isIntersecting: boolean): Promise<void> {
  // The heading can commit before the passive effect installs its observer.
  // Do not deliver visibility or advance the impression clock before it exists.
  await waitFor(() => expect(observers.some((observer) => !observer.disconnected)).toBe(true));
  act(() => {
    for (const observer of observers) {
      if (!observer.disconnected) {
        observer.callback([{ isIntersecting } as IntersectionObserverEntry], null as never);
      }
    }
  });
}

/** Let the impression timer run out. */
async function waitOutImpression(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
}

beforeAll(() => {
  window.electronAPI = { getPreference, setPreference, openExternal } as never;
});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  observers = [];
  vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);
  getPreference.mockReset().mockResolvedValue(undefined);
  setPreference.mockReset().mockResolvedValue(undefined);
  openExternal.mockReset();
  useCapabilityDiscoveryStore.setState({ usage: EMPTY_CAPABILITY_USAGE, seen: {}, loaded: false });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
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

    await setOnScreen(true);
    await waitOutImpression();
    await waitFor(() => expect(useCapabilityDiscoveryStore.getState().usage.lastSuggestedAt).toBeTruthy());
  });

  it('does not spend the week on a card nobody saw', async () => {
    // Mounting behind another window, scrolled out of view, or flashing past
    // on the way into a recent project is not a suggestion delivered.
    getPreference.mockResolvedValue({ usage: seasoned(), seen: {} });
    render(<NextSkillCard />);
    await screen.findByText('Guides');

    await setOnScreen(false);
    await waitOutImpression();
    expect(useCapabilityDiscoveryStore.getState().usage.lastSuggestedAt).toBeUndefined();
  });

  it('does not spend the week on a glance too brief to read', async () => {
    getPreference.mockResolvedValue({ usage: seasoned(), seen: {} });
    render(<NextSkillCard />);
    await screen.findByText('Guides');

    await setOnScreen(true);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    await setOnScreen(false);
    await waitOutImpression();
    expect(useCapabilityDiscoveryStore.getState().usage.lastSuggestedAt).toBeUndefined();
  });

  it('does not spend the week while the window is hidden', async () => {
    getPreference.mockResolvedValue({ usage: seasoned(), seen: {} });
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    render(<NextSkillCard />);
    await screen.findByText('Guides');

    await setOnScreen(true);
    await waitOutImpression();
    expect(useCapabilityDiscoveryStore.getState().usage.lastSuggestedAt).toBeUndefined();
    visibility.mockRestore();
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
    await userEvent.click(await screen.findByRole('button', { name: 'Maybe later' }));
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
    expect(screen.getByRole('button', { name: 'Maybe later' })).toBeTruthy();
  });

  it('lets a misclicked refusal be taken back', async () => {
    // "Don't suggest this" is for good, which is exactly why it needs a way
    // back when it was a slip.
    getPreference.mockResolvedValue({ usage: seasoned(), seen: {} });
    render(<NextSkillCard />);
    await userEvent.click(await screen.findByRole('button', { name: /don.t suggest this/i }));
    await waitFor(() => expect(useCapabilityDiscoveryStore.getState().usage.dismissed).toEqual(['snap_guides']));

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(useCapabilityDiscoveryStore.getState().usage.dismissed).toEqual([]));
  });

  it('gives the suggestion a region a screen reader can find', async () => {
    getPreference.mockResolvedValue({ usage: seasoned(), seen: {} });
    render(<NextSkillCard />);
    expect(await screen.findByRole('region', { name: 'Guides' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Guides' })).toBeTruthy();
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
