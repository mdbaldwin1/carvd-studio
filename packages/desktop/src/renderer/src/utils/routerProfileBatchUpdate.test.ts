import { describe, expect, it } from 'vitest';
import type { EdgeProfileFeature, RouterProfileDefinition } from '../types';
import { getRouterProfileRevision } from './routerProfiles';
import { buildRouterProfileBatchUpdate } from './routerProfileBatchUpdate';
import { usePartCutsEditingStore } from '../store/partCutsEditingStore';

const profile = (name = 'New Cove'): RouterProfileDefinition => ({
  version: 1,
  id: 'profile',
  name,
  source: 'generic',
  family: 'cove',
  parameters: {},
  boundary: { start: { u: 0, v: 0.25 }, segments: [{ kind: 'line', to: { u: 0.25, v: 0 } }] }
});
const oldProfile = profile('Old Cove');
const oldRevision = getRouterProfileRevision(oldProfile);
const cut = (id: string): EdgeProfileFeature => ({
  id,
  version: 1,
  enabled: true,
  kind: 'edge_profile',
  target: { type: 'edge', edge: 'top_front_edge' },
  reference: { primaryFrom: 'min', secondaryFrom: 'min' },
  profile: 'custom',
  routerProfileId: 'profile',
  routerProfileRevision: oldRevision,
  routerProfileSnapshot: oldProfile,
  parameters: { size: 0.25, depth: 0.25 }
});

describe('buildRouterProfileBatchUpdate', () => {
  it('updates all captured matches while preserving authored cut parameters', () => {
    const result = buildRouterProfileBatchUpdate([cut('a'), cut('b')], profile(), [
      { featureId: 'a', expectedRevision: oldRevision },
      { featureId: 'b', expectedRevision: oldRevision }
    ]);
    expect(result.updatedFeatureIds).toEqual(['a', 'b']);
    expect((result.features[0] as EdgeProfileFeature).parameters).toEqual({ size: 0.25, depth: 0.25 });
    expect((result.features[0] as EdgeProfileFeature).routerProfileRevision).toBe(getRouterProfileRevision(profile()));
  });

  it('skips a captured cut that changed before confirmation and does not mutate input snapshots', () => {
    const original = cut('a');
    const result = buildRouterProfileBatchUpdate([original], profile(), [
      { featureId: 'a', expectedRevision: 'old' },
      { featureId: 'gone', expectedRevision: 'old' }
    ]);
    expect(result.updatedFeatureIds).toEqual([]);
    expect(result.skippedFeatureIds).toEqual(['a', 'gone']);
    expect(original.routerProfileRevision).toBe(oldRevision);
  });

  it('is a no-op for an empty captured set', () => {
    const original = [cut('a')];
    const result = buildRouterProfileBatchUpdate(original, profile(), []);
    expect(result.updatedFeatureIds).toEqual([]);
    expect(result.features).toEqual(original);
  });

  it('commits a multi-cut replacement as exactly one draft undo and redo entry', () => {
    const original = [cut('a'), cut('b')];
    const store = usePartCutsEditingStore.getState();
    store.startEditingPartCuts('part', 'Rail', original);
    const result = buildRouterProfileBatchUpdate(original, profile(), [
      { featureId: 'a', expectedRevision: oldRevision },
      { featureId: 'b', expectedRevision: oldRevision }
    ]);
    store.setDraftFeatures(result.features);
    expect(usePartCutsEditingStore.getState().draftHistory).toHaveLength(1);
    usePartCutsEditingStore.getState().undoDraft();
    expect((usePartCutsEditingStore.getState().draftFeatures[0] as EdgeProfileFeature).routerProfileRevision).toBe(
      oldRevision
    );
    expect(usePartCutsEditingStore.getState().draftFuture).toHaveLength(1);
    usePartCutsEditingStore.getState().redoDraft();
    expect((usePartCutsEditingStore.getState().draftFeatures[0] as EdgeProfileFeature).routerProfileRevision).toBe(
      getRouterProfileRevision(profile())
    );
    expect(usePartCutsEditingStore.getState().draftFuture).toHaveLength(0);
  });
});
