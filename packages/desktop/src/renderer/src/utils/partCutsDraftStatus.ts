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
}

/**
 * Which cuts in a draft are invalid, and why.
 *
 * Save itself is never gated on this. usePartCutsEditing.saveAndExit blurs the
 * focused field, commits the inspector, then validates every enabled cut and
 * reports the first problem, keeping the workspace open. Disabling the header
 * button instead would deadlock an edit that is still focused: the click that
 * would commit it can never land while the button is disabled.
 */
export function getPartCutsDraftStatus(part: Part | null, draftFeatures: PartFeature[]): PartCutsDraftStatus {
  if (!part) {
    return {
      conflicts: [],
      issues: new Map(),
      hasBlockingConflicts: false,
      firstInvalidIndex: -1
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
    firstInvalidIndex
  };
}
