import type { PartFeature, RouterProfileDefinition } from '../types';
import { clonePartFeatures, validateSerializedPartFeatures } from './partFeatures';
import { cloneRouterProfileDefinition, getRouterProfileRevision } from './routerProfiles';
import { isRouterToolCompatibleWithProfile } from './routerTools';

export interface RouterProfileUpdateTarget {
  featureId: string;
  expectedRevision?: string;
}

export interface RouterProfileBatchResult {
  features: PartFeature[];
  updatedFeatureIds: string[];
  skippedFeatureIds: string[];
  clearedToolFeatureIds: string[];
}

/**
 * Builds an all-or-nothing replacement for a set of edge-profile cuts.
 * Callers commit `features` once, giving draft/project history one transaction.
 */
export function buildRouterProfileBatchUpdate(
  currentFeatures: readonly PartFeature[],
  profile: RouterProfileDefinition,
  targets: readonly RouterProfileUpdateTarget[]
): RouterProfileBatchResult {
  const targetMap = new Map(targets.map((target) => [target.featureId, target]));
  const updatedFeatureIds: string[] = [];
  const skippedFeatureIds: string[] = [];
  const clearedToolFeatureIds: string[] = [];
  const revision = getRouterProfileRevision(profile);
  const features = clonePartFeatures([...currentFeatures]).map((feature) => {
    const target = targetMap.get(feature.id);
    if (!target) return feature;
    const currentRevision = feature.kind === 'edge_profile' ? feature.routerProfileRevision : undefined;
    if (
      feature.kind !== 'edge_profile' ||
      feature.profile !== 'custom' ||
      feature.routerProfileId !== profile.id ||
      currentRevision !== target.expectedRevision
    ) {
      skippedFeatureIds.push(feature.id);
      return feature;
    }
    updatedFeatureIds.push(feature.id);
    const next = {
      ...feature,
      routerProfileRevision: revision,
      routerProfileSnapshot: cloneRouterProfileDefinition(profile)
    };
    if (next.routerToolSnapshot && !isRouterToolCompatibleWithProfile(next.routerToolSnapshot, profile)) {
      clearedToolFeatureIds.push(feature.id);
      next.routerToolId = undefined;
      next.routerToolRevision = undefined;
      next.routerToolSnapshot = undefined;
    }
    return next;
  });
  for (const target of targets) {
    if (!currentFeatures.some((feature) => feature.id === target.featureId)) skippedFeatureIds.push(target.featureId);
  }
  const errors = validateSerializedPartFeatures(features, 'features');
  if (errors.length) throw new Error(`No cuts were updated: ${errors[0]}`);
  return { features, updatedFeatureIds, skippedFeatureIds: [...new Set(skippedFeatureIds)], clearedToolFeatureIds };
}
