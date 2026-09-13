import { create } from 'zustand';
import {
  EMPTY_CAPABILITY_USAGE,
  isSuggestionDue,
  recordProjectUsage,
  suggestCapability,
  type Capability,
  type CapabilitySuggestion,
  type CapabilitySource,
  type CapabilityUsage,
  type SeenProjects
} from '../utils/capabilityDiscovery';

const PREFERENCE_KEY = 'capabilityUsage';

interface StoredShape {
  usage: CapabilityUsage;
  seen: SeenProjects;
}

interface CapabilityDiscoveryState {
  usage: CapabilityUsage;
  seen: SeenProjects;
  loaded: boolean;
  load: () => Promise<void>;
  /** Fold a project in. Safe to call repeatedly; each project counts once. */
  recordProject: (project: CapabilitySource, projectKey: string) => Promise<void>;
  /** The capability worth mentioning now, or nothing. */
  currentSuggestion: (now?: Date) => CapabilitySuggestion | null;
  /** Remember that a suggestion was shown, so the next one waits. */
  markSuggested: () => Promise<void>;
  /** Stop offering this one, for good. */
  dismiss: (capability: Capability) => Promise<void>;
  /** Take back a refusal, for when it was a misclick. */
  undismiss: (capability: Capability) => Promise<void>;
}

async function persist(next: StoredShape): Promise<void> {
  try {
    await window.electronAPI?.setPreference?.(PREFERENCE_KEY, next);
  } catch {
    // Discovery is a nicety. If it cannot be remembered the app carries on
    // without it rather than surfacing a failure nobody can act on.
  }
}

export const useCapabilityDiscoveryStore = create<CapabilityDiscoveryState>((set, get) => ({
  usage: EMPTY_CAPABILITY_USAGE,
  seen: {},
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    try {
      const stored = (await window.electronAPI?.getPreference?.(PREFERENCE_KEY)) as StoredShape | undefined;
      if (stored?.usage) {
        set({
          usage: { ...EMPTY_CAPABILITY_USAGE, ...stored.usage },
          seen: stored.seen ?? {},
          loaded: true
        });
        return;
      }
    } catch {
      // fall through to the empty state
    }
    set({ loaded: true });
  },

  recordProject: async (project, projectKey) => {
    const { usage, seen } = get();
    const next = recordProjectUsage(usage, project, projectKey, seen);
    // An ordinary re-save of a project already accounted for changes nothing,
    // and must not cost a write to disk on every save.
    if (next.usage === usage && next.seen === seen) return;
    set({ usage: next.usage, seen: next.seen });
    await persist({ usage: next.usage, seen: next.seen });
  },

  currentSuggestion: (now = new Date()) => {
    const { usage, loaded } = get();
    if (!loaded) return null;
    if (!isSuggestionDue(usage, now)) return null;
    return suggestCapability(usage);
  },

  markSuggested: async () => {
    const usage = { ...get().usage, lastSuggestedAt: new Date().toISOString() };
    set({ usage });
    await persist({ usage, seen: get().seen });
  },

  undismiss: async (capability) => {
    const current = get().usage;
    if (!current.dismissed.includes(capability)) return;
    const usage = {
      ...current,
      dismissed: current.dismissed.filter((entry) => entry !== capability)
    };
    set({ usage });
    await persist({ usage, seen: get().seen });
  },

  dismiss: async (capability) => {
    const current = get().usage;
    if (current.dismissed.includes(capability)) return;
    const usage = {
      ...current,
      dismissed: [...current.dismissed, capability],
      lastSuggestedAt: new Date().toISOString()
    };
    set({ usage });
    await persist({ usage, seen: get().seen });
  }
}));
