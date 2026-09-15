import { useMemo, useState } from 'react';
import { Button } from '@renderer/components/ui/button';
import type { EdgeProfileDraft } from '@renderer/components/part-features/partFeatureEditorState';
import { buildFeatureFromDraft } from '@renderer/components/part-features/partFeatureEditorState';
import type { Part } from '@renderer/types';
import {
  analyzeEdgeProfileToolFeasibility,
  type RouterToolFeasibilityFinding
} from '@renderer/utils/edgeProfileToolFeasibility';
import { normalizeRouterToolEnvelope } from '@renderer/utils/routerTools';

export function getRouterToolFeasibilityPresentation(findings: RouterToolFeasibilityFinding[], hasTool: boolean) {
  if (!hasTool)
    return {
      label: 'Generic profile',
      tone: 'text-text-muted',
      detail: 'Assign a physical router tool to check cutter reach and clearance.'
    };
  if (findings.some((finding) => finding.severity === 'error'))
    return {
      label: 'Not feasible',
      tone: 'text-danger',
      detail: 'Resolve the blocking tool or stock conditions before fabrication.'
    };
  if (findings.some((finding) => finding.severity === 'warning'))
    return {
      label: 'Needs attention',
      tone: 'text-warning',
      detail: 'Review conservative clearance cautions before routing.'
    };
  return { label: 'Ready', tone: 'text-success', detail: 'The assigned tool satisfies the modeled profile checks.' };
}

export function RouterToolFeasibilitySummary({
  draft,
  part,
  compact = false
}: {
  draft: EdgeProfileDraft;
  part: Pick<Part, 'length' | 'width' | 'thickness'>;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(!compact);
  const findings = useMemo(() => {
    const feature = buildFeatureFromDraft(draft);
    return feature.kind === 'edge_profile' ? analyzeEdgeProfileToolFeasibility(feature, part) : [];
  }, [draft, part]);
  const presentation = getRouterToolFeasibilityPresentation(findings, !!draft.routerToolSnapshot);
  const envelopePrecision = draft.routerToolSnapshot
    ? normalizeRouterToolEnvelope(draft.routerToolSnapshot).precision
    : undefined;
  const errors = findings.filter((finding) => finding.severity === 'error');
  const cautions = findings.filter((finding) => finding.severity === 'warning');
  const information = findings.filter((finding) => finding.severity === 'info' && finding.code !== 'no_physical_tool');
  const assumptions = findings.flatMap((finding) =>
    typeof finding.details.assumption === 'string' ? [finding.details.assumption] : []
  );
  return (
    <section aria-label="Router tool feasibility" className="mt-2 rounded-md border border-border bg-bg/60 p-2 text-xs">
      <div
        role={compact ? 'group' : 'status'}
        aria-label={compact ? 'Compact feasibility status' : undefined}
        aria-live={compact ? 'off' : 'polite'}
        aria-atomic="true"
        className="flex items-center justify-between gap-2"
      >
        <div>
          <span className={`font-semibold ${presentation.tone}`}>{presentation.label}</span>
          <span className="ml-2 text-text-muted">{presentation.detail}</span>
          {envelopePrecision && (
            <span className="ml-2 rounded-full border border-border px-1.5 py-0.5 text-[10px] text-text-muted">
              {envelopePrecision === 'detailed' ? 'Verified from detailed envelope' : 'Estimated from basic dimensions'}
            </span>
          )}
        </div>
        {compact && (
          <Button size="xs" variant="ghost" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
            {expanded ? 'Hide details' : 'Details'}
          </Button>
        )}
      </div>
      {expanded && draft.routerToolSnapshot && (
        <div className="mt-2 space-y-2">
          {errors.length > 0 && <FindingGroup title="Errors" findings={errors} />}
          {cautions.length > 0 && <FindingGroup title="Cautions" findings={cautions} />}
          {information.length > 0 && <FindingGroup title="Information" findings={information} />}
          {errors.length === 0 && cautions.length === 0 && information.length === 0 && (
            <p className="text-text-muted">No modeled feasibility issues found.</p>
          )}
          <details>
            <summary className="cursor-pointer text-text-muted">Analysis assumptions</summary>
            <p className="mt-1 text-text-muted">
              The analyzer uses the sampled canonical profile, incident stock dimensions, and the immutable
              assigned-tool envelope. Router holder, setup offsets, feed direction, and unrecorded neck length are not
              modeled.
            </p>
            {assumptions.map((assumption) => (
              <p key={assumption} className="mt-1 text-text-muted">
                {assumption}.
              </p>
            ))}
          </details>
        </div>
      )}
    </section>
  );
}

function FindingGroup({ title, findings }: { title: string; findings: RouterToolFeasibilityFinding[] }) {
  return (
    <div role="group" aria-label={`${title} (${findings.length})`}>
      <h4 className="font-semibold text-text">{title}</h4>
      <ul className="mt-1 list-disc space-y-1 pl-4 text-text-muted">
        {findings.map((finding) => (
          <li key={finding.code}>{finding.message}</li>
        ))}
      </ul>
    </div>
  );
}
