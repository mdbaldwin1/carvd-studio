import { Part, PartFeature } from '@renderer/types';
import { getPartFeatureConflicts, type PartFeatureConflict } from '@renderer/utils/partFeatureConflicts';
import { validateRectCutFeature } from '@renderer/utils/rectCutUtils';
import { validateCircularCut, validateRoundedCut } from '@renderer/utils/roundCutUtils';
import { validateEndCutFeature } from '@renderer/utils/endCutUtils';

export interface PartCutsDraftStatus {
  conflicts: PartFeatureConflict[];
  /** Per-feature validation message, keyed by feature id. Enabled features only. */
  issues: Map<string, string | null>;
  hasBlockingConflicts: boolean;
  /** Index of the first cut that is invalid or in an error conflict, or -1. */
  firstInvalidIndex: number;
  /** False when saving would write a draft the app rejects. */
  canSave: boolean;
}

/**
 * Derive whether a cut draft is savable, and why not.
 *
 * Shared so the header Save button and the workspace agree by construction.
 * When the header owned a different rule than the panel it replaced, Save
 * could accept a draft the panel would have refused.
 */
export function getPartCutsDraftStatus(
  part: Part | null,
  draftFeatures: PartFeature[],
  hasUnsavedChanges: boolean
): PartCutsDraftStatus {
  if (!part) {
    return {
      conflicts: [],
      issues: new Map(),
      hasBlockingConflicts: false,
      firstInvalidIndex: -1,
      canSave: false
    };
  }

  const conflicts = getPartFeatureConflicts(draftFeatures, part);
  const hasBlockingConflicts = conflicts.some((conflict) => conflict.severity === 'error');

  const candidate = { ...part, features: draftFeatures };
  const issues = new Map<string, string | null>(
    draftFeatures
      .filter((feature) => feature.enabled)
      .map((feature) => [
        feature.id,
        feature.kind === 'rect_cut'
          ? validateRectCutFeature(feature, candidate)
          : feature.kind === 'circular_cut'
            ? validateCircularCut(feature, candidate)
            : feature.kind === 'rounded_cut'
              ? validateRoundedCut(feature, candidate)
              : validateEndCutFeature(feature, candidate)
      ])
  );

  const firstInvalidIndex = draftFeatures.findIndex(
    (feature) =>
      issues.get(feature.id) ||
      conflicts.some((conflict) => conflict.featureId === feature.id && conflict.severity === 'error')
  );

  return {
    conflicts,
    issues,
    hasBlockingConflicts,
    firstInvalidIndex,
    canSave: hasUnsavedChanges && !hasBlockingConflicts && firstInvalidIndex < 0
  };
}
