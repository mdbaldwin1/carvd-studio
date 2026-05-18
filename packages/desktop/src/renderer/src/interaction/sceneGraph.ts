// ADR-008: The workspace scene graph is a derived adapter over `projectStore`,
// not a persisted shape. Domain truth lives in `parts / groups / groupMembers`;
// this module memoizes a hierarchical view for downstream consumers.
//
// Phase §1a (this commit): adapter + traversal helpers + tests. No consumer
// migration. Phase §1b/§1c migrate the ad-hoc `getAllDescendantPartIds` /
// `getPartGroupContext` / `resolveMoveSelection` / etc. call sites to read
// from this adapter.
//
// World transforms are intentionally out of scope here — they belong to §5
// (Geometry Query Layer). This module exposes hierarchy + local transform
// references only.

import type { Group, GroupMember, Part } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A node identifier. Today, `NodeId` shares the same string space as `Part.id`
 * and `Group.id` (both UUIDs from `uuidv4()`). Collisions across parts and
 * groups are astronomically unlikely; the adapter detects them at build time
 * and throws (better than silent corruption).
 */
export type NodeId = string;

export interface PartNode {
  readonly kind: 'part';
  readonly id: NodeId;
  readonly parentId: NodeId | null;
  /** Always empty for parts. Reserved for future feature-node children (§6). */
  readonly childIds: ReadonlyArray<NodeId>;
  readonly partRef: Part;
}

export interface GroupNode {
  readonly kind: 'group';
  readonly id: NodeId;
  readonly parentId: NodeId | null;
  readonly childIds: ReadonlyArray<NodeId>;
  readonly groupRef: Group;
}

export type SceneNode = PartNode | GroupNode;

export interface WorkspaceSceneGraph {
  /** Every node keyed by id. O(1) lookup. */
  readonly nodes: ReadonlyMap<NodeId, SceneNode>;
  /** Top-level roots (parentId === null). */
  readonly rootIds: ReadonlyArray<NodeId>;
  /**
   * Part IDs reachable from a node:
   * - For a `part` node: just `[id]`.
   * - For a `group` node: all descendant parts in tree order.
   * - Returns `[]` if the node is unknown.
   */
  descendantPartIds(id: NodeId): ReadonlyArray<string>;
  /**
   * Group IDs on the parent chain, **outermost first**. (i.e. closest ancestor
   * is the last element.) Empty array for top-level nodes or unknown ids.
   */
  ancestorGroupIds(id: NodeId): ReadonlyArray<NodeId>;
  /** O(1) lookup by id. */
  findNode(id: NodeId): SceneNode | undefined;
}

export interface BuildWorkspaceSceneGraphInput {
  parts: ReadonlyArray<Part>;
  groups: ReadonlyArray<Group>;
  groupMembers: ReadonlyArray<GroupMember>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a memoized scene graph from raw project state. Pure: no React, no
 * Three.js, no store hooks. Callers should wrap in `useMemo` so the graph is
 * only rebuilt when its inputs change.
 *
 * Validation behavior:
 *   - Duplicate ids across parts and groups (throws — real corruption).
 *   - Cycles in the group hierarchy (tolerated — runtime traversals carry a
 *     visited set, logged via `console.warn`). This matches the legacy
 *     `getAllDescendantPartIds` behavior of silently handling malformed
 *     cyclic group data without breaking the UI.
 *   - Orphan group members (silently skipped).
 */
export function buildWorkspaceSceneGraph(input: BuildWorkspaceSceneGraphInput): WorkspaceSceneGraph {
  // Step 1: validate id uniqueness across parts + groups.
  const seenIds = new Set<NodeId>();
  for (const part of input.parts) {
    if (seenIds.has(part.id)) {
      throw new Error(`buildWorkspaceSceneGraph: duplicate part id "${part.id}"`);
    }
    seenIds.add(part.id);
  }
  for (const group of input.groups) {
    if (seenIds.has(group.id)) {
      throw new Error(`buildWorkspaceSceneGraph: id "${group.id}" appears as both a part and a group`);
    }
    seenIds.add(group.id);
  }

  // Step 2: build parent links by walking groupMembers.
  // parentByChild: nodeId -> its parent group id (null for top-level).
  const parentByChild = new Map<NodeId, NodeId | null>();
  for (const part of input.parts) parentByChild.set(part.id, null);
  for (const group of input.groups) parentByChild.set(group.id, null);

  // childrenByGroup: groupId -> nodeIds it contains, in groupMembers order.
  const childrenByGroup = new Map<NodeId, NodeId[]>();
  for (const group of input.groups) childrenByGroup.set(group.id, []);

  for (const member of input.groupMembers) {
    // Orphan member: the group it claims to belong to no longer exists.
    if (!childrenByGroup.has(member.groupId)) continue;
    // Orphan member: the entity it references no longer exists.
    if (!seenIds.has(member.memberId)) continue;

    // Membership wins over the default `parentId: null`.
    parentByChild.set(member.memberId, member.groupId);
    childrenByGroup.get(member.groupId)!.push(member.memberId);
  }

  // Step 3: detect cycles via DFS coloring.
  detectCycles(input.groups, childrenByGroup);

  // Step 4: build nodes.
  const nodes = new Map<NodeId, SceneNode>();
  for (const part of input.parts) {
    nodes.set(part.id, {
      kind: 'part',
      id: part.id,
      parentId: parentByChild.get(part.id) ?? null,
      childIds: [],
      partRef: part
    });
  }
  for (const group of input.groups) {
    nodes.set(group.id, {
      kind: 'group',
      id: group.id,
      parentId: parentByChild.get(group.id) ?? null,
      childIds: childrenByGroup.get(group.id) ?? [],
      groupRef: group
    });
  }

  // Step 5: roots are anything with parentId === null.
  const rootIds: NodeId[] = [];
  for (const node of nodes.values()) {
    if (node.parentId === null) rootIds.push(node.id);
  }

  // Step 6: memoized traversals via closure caches.
  const descendantCache = new Map<NodeId, ReadonlyArray<string>>();
  const ancestorCache = new Map<NodeId, ReadonlyArray<NodeId>>();

  function descendantPartIds(id: NodeId): ReadonlyArray<string> {
    const cached = descendantCache.get(id);
    if (cached) return cached;
    // Visited set guards against malformed cyclic group data (see
    // `detectCycles`). Once a group is in `visited`, we don't recurse back
    // through it.
    const result = collectDescendantPartIds(id, new Set());
    descendantCache.set(id, result);
    return result;
  }

  function collectDescendantPartIds(id: NodeId, visited: Set<NodeId>): string[] {
    if (visited.has(id)) return [];
    visited.add(id);

    const node = nodes.get(id);
    if (!node) return [];

    if (node.kind === 'part') return [node.id];

    const out: string[] = [];
    for (const childId of node.childIds) {
      const child = nodes.get(childId);
      if (!child) continue;
      if (child.kind === 'part') {
        out.push(child.id);
      } else {
        out.push(...collectDescendantPartIds(child.id, visited));
      }
    }
    return out;
  }

  function ancestorGroupIds(id: NodeId): ReadonlyArray<NodeId> {
    const cached = ancestorCache.get(id);
    if (cached) return cached;

    const out: NodeId[] = [];
    const visited = new Set<NodeId>();
    let current = nodes.get(id);
    while (current && current.parentId !== null) {
      if (visited.has(current.parentId)) break; // cycle guard
      visited.add(current.parentId);
      out.unshift(current.parentId);
      current = nodes.get(current.parentId);
    }
    ancestorCache.set(id, out);
    return out;
  }

  return {
    nodes,
    rootIds,
    descendantPartIds,
    ancestorGroupIds,
    findNode: (id) => nodes.get(id)
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cycle detection (tolerant)
//
// Cycles in `groupMembers` are malformed but tolerated — the UI must keep
// rendering. Build-time detection logs the cycle; runtime traversals
// (descendantPartIds, ancestorGroupIds) carry a visited set so they
// terminate. Matches the legacy `getAllDescendantPartIds` behavior.
// ─────────────────────────────────────────────────────────────────────────────

function detectCycles(groups: ReadonlyArray<Group>, childrenByGroup: ReadonlyMap<NodeId, ReadonlyArray<NodeId>>): void {
  const color = new Map<NodeId, 'gray' | 'black'>();

  function visit(groupId: NodeId, path: NodeId[]): void {
    const current = color.get(groupId);
    if (current === 'black') return;
    if (current === 'gray') {
      const cycle = [...path, groupId].join(' -> ');
      console.warn(`[sceneGraph] cycle detected in group hierarchy: ${cycle}`);
      return;
    }
    color.set(groupId, 'gray');
    const childIds = childrenByGroup.get(groupId) ?? [];
    for (const childId of childIds) {
      // Only recurse into groups (parts are leaves and cannot start cycles).
      if (childrenByGroup.has(childId)) {
        visit(childId, [...path, groupId]);
      }
    }
    color.set(groupId, 'black');
  }

  for (const group of groups) {
    visit(group.id, []);
  }
}
