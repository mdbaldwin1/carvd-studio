/**
 * The project's error and warning count, sitting just above Generate Cut List.
 *
 * Red when anything is an error, yellow when it is only warnings, and absent
 * entirely when the project is clean, so it reads as a status line rather than
 * permanent chrome.
 */

import { useMemo } from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { useProjectStore, validatePartsForCutList } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { describeIssueCounts, summarizeProjectIssues } from '../../utils/projectIssues';

export function ProjectIssuesSummary(): React.JSX.Element | null {
  const parts = useProjectStore((s) => s.parts);
  const stocks = useProjectStore((s) => s.stocks);
  const units = useProjectStore((s) => s.units);
  const openIssuesModal = useUIStore((s) => s.openIssuesModal);

  const summary = useMemo(
    () => summarizeProjectIssues(validatePartsForCutList(parts, stocks, units)),
    [parts, stocks, units]
  );

  if (summary.total === 0) return null;

  const hasErrors = summary.errorCount > 0;
  const Icon = hasErrors ? AlertCircle : AlertTriangle;

  return (
    <button
      type="button"
      onClick={() => openIssuesModal()}
      title="Show every error and warning in this project"
      className={`project-issues-summary flex w-full items-center justify-center gap-1.5 rounded-md py-1 text-xs font-medium underline-offset-2 transition-colors hover:underline ${
        hasErrors ? 'text-danger' : 'text-warning'
      }`}
    >
      <Icon size={12} className="shrink-0" />
      {describeIssueCounts(summary.errorCount, summary.warningCount)}
    </button>
  );
}
