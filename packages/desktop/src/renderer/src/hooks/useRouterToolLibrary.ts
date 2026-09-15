import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { RouterToolDefinition } from '../types';
import {
  cloneRouterToolDefinition,
  parseRouterToolLibrary,
  validateRouterToolDefinition,
  withRouterToolRevision
} from '../utils/routerTools';
import { logger } from '../utils/logger';

const KEY = 'routerToolLibrary';
let state: RouterToolDefinition[] = [];
let loading = true;
let initialized = false;
const subscribers = new Set<() => void>();
const notify = () => subscribers.forEach((callback) => callback());
const subscribe = (callback: () => void) => {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
};

function init(): void {
  if (initialized) return;
  initialized = true;
  if (typeof window.electronAPI?.getPreference !== 'function') {
    loading = false;
    notify();
    return;
  }
  window.electronAPI
    .getPreference(KEY)
    .then((value) => {
      state = parseRouterToolLibrary(value);
      loading = false;
      notify();
    })
    .catch((error) => {
      logger.error('Failed to load router tool library:', error);
      state = [];
      loading = false;
      notify();
    });
  window.electronAPI.onSettingsChanged?.((changes) => {
    if (KEY in changes) {
      state = parseRouterToolLibrary(changes[KEY]);
      notify();
    }
  });
}

export function useRouterToolLibrary() {
  useEffect(init, []);
  const tools = useSyncExternalStore(subscribe, () => state);
  const [isLoading, setIsLoading] = useState(loading);
  useEffect(() => subscribe(() => setIsLoading(loading)), []);

  const save = useCallback(async (toolsToSave: RouterToolDefinition[]) => {
    toolsToSave.forEach((tool) => {
      const errors = validateRouterToolDefinition({ ...tool, revision: undefined });
      if (errors.length) throw new Error(errors.join('; '));
    });
    if (new Set(toolsToSave.map((tool) => tool.id)).size !== toolsToSave.length)
      throw new Error('Router tool ids must be unique');
    const snapshots = toolsToSave.map(withRouterToolRevision);
    await window.electronAPI.setPreference(KEY, snapshots);
    state = snapshots;
    notify();
  }, []);

  const addTool = useCallback(
    async (tool: RouterToolDefinition) => {
      const current = parseRouterToolLibrary(await window.electronAPI.getPreference(KEY));
      if (current.some((candidate) => candidate.id === tool.id))
        throw new Error(`Router tool id "${tool.id}" already exists`);
      await save([...current, tool]);
    },
    [save]
  );
  const updateTool = useCallback(
    async (id: string, tool: RouterToolDefinition) => {
      if (tool.id !== id) throw new Error('A router tool update cannot change its id');
      const current = parseRouterToolLibrary(await window.electronAPI.getPreference(KEY));
      await save(current.map((candidate) => (candidate.id === id ? tool : candidate)));
    },
    [save]
  );
  const deleteTool = useCallback(
    async (id: string) => {
      const current = parseRouterToolLibrary(await window.electronAPI.getPreference(KEY));
      await save(current.filter((tool) => tool.id !== id));
    },
    [save]
  );
  const findTool = useCallback(
    (id: string) => {
      const tool = tools.find((candidate) => candidate.id === id);
      return tool ? cloneRouterToolDefinition(tool) : undefined;
    },
    [tools]
  );
  return { tools, isLoading, addTool, updateTool, deleteTool, findTool };
}
