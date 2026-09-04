import { Button } from '@renderer/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Part } from '@renderer/types';
import { getPartFeatureConflicts } from '@renderer/utils/partFeatureConflicts';
import {
  getAuthoredFeatureCount,
  getEnabledFeatureCount,
  getFeatureBadgeLabel,
  getPrimaryFeatureText
} from '@renderer/utils/partFeatureSummary';

interface SinglePartCutsSummaryCardProps {
  selectedPart: Part;
  units: 'imperial' | 'metric';
  onEditCuts: () => void;
}

export function SinglePartCutsSummaryCard({ selectedPart, units, onEditCuts }: SinglePartCutsSummaryCardProps) {
  const authoredCount = getAuthoredFeatureCount(selectedPart.features);
  const enabledCount = getEnabledFeatureCount(selectedPart.features);
  const badgeLabel = getFeatureBadgeLabel(selectedPart.features);
  const primaryText = getPrimaryFeatureText(selectedPart.features, units);
  const conflicts = getPartFeatureConflicts(selectedPart.features ?? [], selectedPart);
  const hasErrors = conflicts.some((conflict) => conflict.severity === 'error');
  const conflictSummary = conflicts[0]?.message ?? null;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Part Cuts</CardTitle>
          {badgeLabel && (
            <span className="rounded-full border border-border bg-bg-secondary px-2 py-0.5 text-[11px] font-medium text-text-secondary">
              {badgeLabel}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm text-text-secondary">
          {authoredCount === 0 ? (
            <span>No operations authored yet.</span>
          ) : (
            <>
              <div className="font-medium text-text">
                {authoredCount} operation{authoredCount === 1 ? '' : 's'}
                {enabledCount !== authoredCount ? ` (${enabledCount} enabled)` : ''}
              </div>
              {primaryText && <div className="mt-1 text-xs leading-relaxed">{primaryText}</div>}
              {conflictSummary && (
                <div className={`mt-2 text-xs leading-relaxed ${hasErrors ? 'text-danger' : 'text-warning'}`}>
                  {hasErrors ? 'Conflict: ' : 'Warning: '}
                  {conflictSummary}
                </div>
              )}
            </>
          )}
        </div>
        <Button size="sm" className="w-full" onClick={onEditCuts}>
          Edit Part Cuts
        </Button>
      </CardContent>
    </Card>
  );
}
