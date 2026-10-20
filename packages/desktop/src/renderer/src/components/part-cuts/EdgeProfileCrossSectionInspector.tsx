import { useMemo, useState } from 'react';
import { Button } from '@renderer/components/ui/button';
import type { EdgeProfileDraft } from '@renderer/components/part-features/partFeatureEditorState';
import { buildFeatureFromDraft } from '@renderer/components/part-features/partFeatureEditorState';
import { getEdgeProfileFeatureBoundary } from '@renderer/utils/edgeProfileShape';
import { formatMeasurementWithUnit } from '@renderer/utils/fractions';
import type { EdgeTarget } from '@renderer/types';
import type { Part } from '@renderer/types';
import { RouterToolFeasibilitySummary } from './RouterToolFeasibilitySummary';

const ORIENTATION: Record<EdgeTarget, string> = {
  top_front_edge: 'Top/front corner, running along the part length.',
  top_back_edge: 'Top/back corner, running along the part length.',
  bottom_front_edge: 'Bottom/front corner, running along the part length.',
  bottom_back_edge: 'Bottom/back corner, running along the part length.',
  top_left_edge: 'Top/left-end corner, running across the part width.',
  top_right_edge: 'Top/right-end corner, running across the part width.',
  bottom_left_edge: 'Bottom/left-end corner, running across the part width.',
  bottom_right_edge: 'Bottom/right-end corner, running across the part width.',
  front_left_edge: 'Front/left-end corner, running through the part thickness.',
  front_right_edge: 'Front/right-end corner, running through the part thickness.',
  back_left_edge: 'Back/left-end corner, running through the part thickness.',
  back_right_edge: 'Back/right-end corner, running through the part thickness.'
};

export function getEdgeProfileOrientationLabel(edge: EdgeTarget): string {
  return ORIENTATION[edge];
}

export function EdgeProfileCrossSectionInspector({
  draft,
  units,
  part
}: {
  draft: EdgeProfileDraft;
  units: 'imperial' | 'metric';
  part: Pick<Part, 'length' | 'width' | 'thickness'>;
}) {
  const [expanded, setExpanded] = useState(false);
  const feature = useMemo(() => buildFeatureFromDraft(draft), [draft]);
  const boundary = useMemo(
    () => (feature.kind === 'edge_profile' ? getEdgeProfileFeatureBoundary(feature) : []),
    [feature]
  );
  const maxX = Math.max(draft.size, ...boundary.map((point) => point.x), 0.001);
  const maxY = Math.max(draft.depth, ...boundary.map((point) => point.y), 0.001);
  const mapped = boundary.map((point) => `${18 + (point.x / maxX) * 150},${18 + (point.y / maxY) * 110}`).join(' ');
  const removal = `18,18 ${mapped} 18,128`;
  const profileName =
    draft.profile === 'custom'
      ? (draft.routerProfileSnapshot?.name ?? 'Custom profile')
      : draft.profile.replace(/_/g, ' ');
  const provenance =
    draft.profile === 'custom' ? String(draft.routerProfileSnapshot?.parameters.fidelity ?? 'exact') : null;
  const toolName = draft.routerToolSnapshot?.name ?? 'Generic profile — no physical tool assigned';
  return (
    <aside
      role="complementary"
      aria-label="Selected edge profile cross-section"
      className={`absolute bottom-14 right-3 z-40 rounded-md border border-border bg-surface/95 p-3 shadow-lg backdrop-blur ${expanded ? 'w-[min(92%,34rem)]' : 'w-[min(84%,19rem)]'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-accent">Edge cross-section</div>
          <div className="capitalize font-medium text-text">{profileName}</div>
        </div>
        <Button size="xs" variant="ghost" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Collapse' : 'Enlarge'}
        </Button>
      </div>
      <svg
        viewBox="0 0 190 150"
        role="img"
        aria-label={`${profileName} edge profile cross-section`}
        data-boundary={JSON.stringify(boundary)}
        className={expanded ? 'h-64 w-full' : 'h-36 w-full'}
      >
        <polygon points={removal} fill="var(--color-accent)" opacity="0.16" />
        <polyline points={mapped} fill="none" stroke="var(--color-accent)" strokeWidth="4" strokeLinejoin="round" />
        <line x1="18" y1="18" x2="178" y2="18" stroke="var(--color-text-muted)" strokeDasharray="4 3" />
        <line x1="18" y1="18" x2="18" y2="138" stroke="var(--color-text-muted)" strokeDasharray="4 3" />
        <text x="120" y="13" fontSize="9" fill="var(--color-text-muted)">
          Face A — inward
        </text>
        <text x="22" y="143" fontSize="9" fill="var(--color-text-muted)">
          Face B — inward
        </text>
        <text x="105" y="140" fontSize="9" fill="var(--color-accent)">
          material removed
        </text>
      </svg>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-text-muted">Size</dt>
        <dd>{formatMeasurementWithUnit(draft.size, units)}</dd>
        <dt className="text-text-muted">Depth</dt>
        <dd>{formatMeasurementWithUnit(draft.depth, units)}</dd>
        <dt className="text-text-muted">Tool</dt>
        <dd>{toolName}</dd>
        {provenance && (
          <>
            <dt className="text-text-muted">Provenance</dt>
            <dd className="capitalize">{provenance} custom profile</dd>
          </>
        )}
      </dl>
      <p className="mt-2 text-xs text-text-muted">{getEdgeProfileOrientationLabel(draft.edgeTarget)}</p>
      <RouterToolFeasibilitySummary draft={draft} part={part} compact />
    </aside>
  );
}
