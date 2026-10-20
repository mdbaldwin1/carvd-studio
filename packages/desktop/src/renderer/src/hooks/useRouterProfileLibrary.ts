import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { RouterProfileDefinition } from '../types';
import {
  cloneRouterProfileDefinition,
  parseRouterProfileLibrary,
  validateEdgeRouterProfileDefinition,
  withRouterProfileRevision
} from '../utils/routerProfiles';
import { logger } from '../utils/logger';

const PREFERENCE_KEY = 'routerProfileLibrary';

let libraryState: RouterProfileDefinition[] = [];
let libraryLoading = true;
let libraryInitialized = false;
const subscribers = new Set<() => void>();

function notifySubscribers(): void {
  subscribers.forEach((callback) => callback());
}

function subscribe(callback: () => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function getSnapshot(): RouterProfileDefinition[] {
  return libraryState;
}

function getLoadingSnapshot(): boolean {
  return libraryLoading;
}

function initSingleton(): void {
  if (libraryInitialized) return;
  libraryInitialized = true;
  // Component tests and recovery-mode renderers may provide only the Electron
  // APIs needed by their current surface. An unavailable preferences bridge
  // means an empty library, not a crashed Custom Cuts inspector.
  if (typeof window.electronAPI?.getPreference !== 'function') {
    libraryState = [];
    libraryLoading = false;
    notifySubscribers();
    return;
  }
  window.electronAPI
    .getPreference(PREFERENCE_KEY)
    .then((value) => {
      libraryState = parseRouterProfileLibrary(value);
      libraryLoading = false;
      notifySubscribers();
    })
    .catch((error) => {
      logger.error('Failed to load router profile library:', error);
      libraryState = [];
      libraryLoading = false;
      notifySubscribers();
    });

  window.electronAPI.onSettingsChanged?.((changes) => {
    if (PREFERENCE_KEY in changes) {
      libraryState = parseRouterProfileLibrary(changes[PREFERENCE_KEY]);
      notifySubscribers();
    }
  });
}

function validateForSave(profile: RouterProfileDefinition): void {
  const errors = validateEdgeRouterProfileDefinition({ ...profile, revision: undefined });
  if (errors.length > 0) throw new Error(errors.join('; '));
}

export function useRouterProfileLibrary() {
  useEffect(() => initSingleton(), []);
  const profiles = useSyncExternalStore(subscribe, getSnapshot);
  const [isLoading, setIsLoading] = useState(libraryLoading);

  useEffect(() => subscribe(() => setIsLoading(getLoadingSnapshot())), []);

  const saveLibrary = useCallback(async (next: RouterProfileDefinition[]) => {
    next.forEach(validateForSave);
    const ids = new Set(next.map((profile) => profile.id));
    if (ids.size !== next.length) throw new Error('Router profile ids must be unique');
    const cloned = next.map(withRouterProfileRevision);
    await window.electronAPI.setPreference(PREFERENCE_KEY, cloned);
    libraryState = cloned;
    notifySubscribers();
  }, []);

  const addProfile = useCallback(
    async (profile: RouterProfileDefinition) => {
      const current = parseRouterProfileLibrary(await window.electronAPI.getPreference(PREFERENCE_KEY));
      if (current.some((candidate) => candidate.id === profile.id))
        throw new Error(`Router profile id "${profile.id}" already exists`);
      await saveLibrary([...current, profile]);
    },
    [saveLibrary]
  );

  const updateProfile = useCallback(
    async (id: string, profile: RouterProfileDefinition) => {
      if (profile.id !== id) throw new Error('A router profile update cannot change its id');
      const current = parseRouterProfileLibrary(await window.electronAPI.getPreference(PREFERENCE_KEY));
      await saveLibrary(current.map((candidate) => (candidate.id === id ? profile : candidate)));
    },
    [saveLibrary]
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      const current = parseRouterProfileLibrary(await window.electronAPI.getPreference(PREFERENCE_KEY));
      await saveLibrary(current.filter((profile) => profile.id !== id));
    },
    [saveLibrary]
  );

  const findProfile = useCallback(
    (id: string) => {
      const profile = profiles.find((candidate) => candidate.id === id);
      return profile ? cloneRouterProfileDefinition(profile) : undefined;
    },
    [profiles]
  );

  return { profiles, isLoading, addProfile, updateProfile, deleteProfile, findProfile };
}
