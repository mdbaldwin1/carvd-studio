// ADR-008: React hook that subscribes to projectStore and produces a memoized
// WorkspaceSceneGraph. Consumers call this hook once and read the typed
// adapter — they should not call buildWorkspaceSceneGraph directly.
//
// The hook returns a stable reference for as long as parts/groups/groupMembers
// references stay stable, which they do under Zustand's identity guarantees.

import { useMemo } from 'react';
import { useProjectStore } from '../store/projectStore';
import { buildWorkspaceSceneGraph, type WorkspaceSceneGraph } from './sceneGraph';

export function useWorkspaceSceneGraph(): WorkspaceSceneGraph {
  const parts = useProjectStore((s) => s.parts);
  const groups = useProjectStore((s) => s.groups);
  const groupMembers = useProjectStore((s) => s.groupMembers);
  return useMemo(() => buildWorkspaceSceneGraph({ parts, groups, groupMembers }), [parts, groups, groupMembers]);
}
