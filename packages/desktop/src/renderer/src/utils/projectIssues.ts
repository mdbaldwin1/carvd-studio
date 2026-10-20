import type { PartValidationIssue } from '../types';

export interface ProjectIssueGroup {
  partId: string;
  partName: string;
  issues: PartValidationIssue[];
  errorCount: number;
  warningCount: number;
}

export interface ProjectIssueSummary {
  errorCount: number;
  warningCount: number;
  total: number;
  /** Issues gathered per part, in the order the parts were validated. */
  groups: ProjectIssueGroup[];
}

/**
 * Counts and groups what validatePartsForCutList reported.
 *
 * The sidebar badge and the issues modal read the same summary, so the count a
 * user sees always matches the list they get when they click it.
 */
export function summarizeProjectIssues(issues: PartValidationIssue[]): ProjectIssueSummary {
  const byPart = new Map<string, ProjectIssueGroup>();

  for (const issue of issues) {
    let group = byPart.get(issue.partId);
    if (!group) {
      group = { partId: issue.partId, partName: issue.partName, issues: [], errorCount: 0, warningCount: 0 };
      byPart.set(issue.partId, group);
    }
    group.issues.push(issue);
    if (issue.severity === 'error') group.errorCount += 1;
    else group.warningCount += 1;
  }

  const groups = [...byPart.values()];
  return {
    errorCount: groups.reduce((sum, group) => sum + group.errorCount, 0),
    warningCount: groups.reduce((sum, group) => sum + group.warningCount, 0),
    total: issues.length,
    groups
  };
}

/** "2 errors, 1 warning" — the label shown on the sidebar badge. */
export function describeIssueCounts(errorCount: number, warningCount: number): string {
  const parts: string[] = [];
  if (errorCount > 0) parts.push(`${errorCount} error${errorCount === 1 ? '' : 's'}`);
  if (warningCount > 0) parts.push(`${warningCount} warning${warningCount === 1 ? '' : 's'}`);
  return parts.join(', ');
}
