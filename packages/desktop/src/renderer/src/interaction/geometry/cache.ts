// ADR-009: Read-through geometry bundle cache.
//
// Callers pass a `Part`; the cache returns a fresh `PartGeometryBundle` if the
// part's version key matches the cached one, or rebuilds + caches if it
// doesn't. Consumers never call the deriver directly.

import type { Part } from '../../types';
import { computeBoxVersionKey, deriveBoxBundle } from './boxBundle';
import type { GeometryVersion, PartGeometryBundle } from './types';

export interface GeometryCache {
  /** Get or build the bundle for `part`. Re-derives if the version changed. */
  get(part: Part): PartGeometryBundle;
  /** Drop the cached bundle for `partId`. Next `get` rebuilds. */
  invalidate(partId: string): void;
  /** Clear the entire cache. */
  clear(): void;
  /** Current cached entry count (for tests + metrics). */
  size(): number;
}

interface CacheEntry {
  versionKey: GeometryVersion;
  bundle: PartGeometryBundle;
}

export function createGeometryCache(): GeometryCache {
  const entries = new Map<string, CacheEntry>();

  return {
    get(part) {
      const existing = entries.get(part.id);
      const nextVersion = computeBoxVersionKey(part);
      if (existing && existing.versionKey === nextVersion) {
        return existing.bundle;
      }
      const bundle = deriveBoxBundle(part);
      entries.set(part.id, { versionKey: bundle.versionKey, bundle });
      return bundle;
    },
    invalidate(partId) {
      entries.delete(partId);
    },
    clear() {
      entries.clear();
    },
    size() {
      return entries.size;
    }
  };
}
