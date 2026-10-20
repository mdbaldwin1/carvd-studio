/**
 * Every error and warning in the project, in one list.
 *
 * Each row is a way in rather than just a report: clicking it selects the part,
 * and an issue that came from a custom cut opens that part in the cuts editor
 * with the offending operation already selected.
 */

import { useEffect, useMemo, useRef } from 'react';
import { AlertCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import { Badge } from '@renderer/components/ui/badge';
import { Button } from '@renderer/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { useProjectStore, validatePartsForCutList } from '../../store/projectStore';
import { usePartCutsEditingStore } from '../../store/partCutsEditingStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useUIStore } from '../../store/uiStore';
import { describeIssueCounts, summarizeProjectIssues } from '../../utils/projectIssues';
import type { PartValidationIssue } from '../../types';

export function ProjectIssuesModal(): React.JSX.Element | null {
  const isOpen = useUIStore((s) => s.issuesModalOpen);
  const focusPartId = useUIStore((s) => s.issuesModalFocusPartId);
  const closeIssuesModal = useUIStore((s) => s.closeIssuesModal);

  const parts = useProjectStore((s) => s.parts);
  const stocks = useProjectStore((s) => s.stocks);
  const units = useProjectStore((s) => s.units);
  const selectPart = useSelectionStore((s) => s.selectPart);
  const startEditingPartCuts = usePartCutsEditingStore((s) => s.startEditingPartCuts);
  const selectFeature = usePartCutsEditingStore((s) => s.selectFeature);
  const isEditingPartCuts = usePartCutsEditingStore((s) => s.isEditingPartCuts);

  const summary = useMemo(
    () => (isOpen ? summarizeProjectIssues(validatePartsForCutList(parts, stocks, units)) : null),
    [isOpen, parts, stocks, units]
  );

  const focusRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (isOpen && focusPartId) focusRef.current?.scrollIntoView({ block: 'center' });
  }, [isOpen, focusPartId, summary]);

  if (!isOpen || !summary) return null;

  const goToIssue = (issue: PartValidationIssue) => {
    const part = parts.find((candidate) => candidate.id === issue.partId);
    if (!part) return;

    selectPart(part.id);
    closeIssuesModal();

    // An operation is only reachable in the cuts editor, so take the user
    // there rather than leaving them to find it. Never interrupt a session
    // that is already open on another part -- that would discard their draft.
    if ((issue.type === 'feature_validation' || issue.type === 'joint_fit') && !isEditingPartCuts) {
      startEditingPartCuts(part.id, part.name, part.features);
      if (issue.featureId) selectFeature(issue.featureId);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !next && closeIssuesModal()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {summary.errorCount > 0 ? (
              <AlertCircle size={18} className="text-danger" />
            ) : (
              <AlertTriangle size={18} className="text-warning" />
            )}
            Project Issues
            <span className="text-sm font-normal text-text-muted">
              {describeIssueCounts(summary.errorCount, summary.warningCount)}
            </span>
          </DialogTitle>
        </DialogHeader>

        {summary.total === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-text-muted">
            No errors or warnings. Every part validates against its stock and its operations.
          </p>
        ) : (
          <ScrollArea className="max-h-[60vh] px-5 py-4">
            <div className="flex flex-col gap-4">
              {summary.groups.map((group) => (
                <div key={group.partId} ref={group.partId === focusPartId ? focusRef : undefined}>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium">{group.partName}</span>
                    {group.errorCount > 0 && (
                      <Badge variant="outline" className="border-danger px-1.5 py-0 text-[10px] text-danger">
                        {group.errorCount} error{group.errorCount === 1 ? '' : 's'}
                      </Badge>
                    )}
                    {group.warningCount > 0 && (
                      <Badge variant="outline" className="border-warning px-1.5 py-0 text-[10px] text-warning">
                        {group.warningCount} warning{group.warningCount === 1 ? '' : 's'}
                      </Badge>
                    )}
                  </div>
                  <ul className="flex flex-col gap-1">
                    {group.issues.map((issue, index) => (
                      <li key={`${issue.partId}-${issue.type}-${index}`}>
                        <button
                          type="button"
                          onClick={() => goToIssue(issue)}
                          className="group/issue flex w-full items-start gap-2 rounded-md border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover"
                        >
                          {issue.severity === 'error' ? (
                            <AlertCircle size={14} className="mt-0.5 shrink-0 text-danger" />
                          ) : (
                            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
                          )}
                          <span className="min-w-0 flex-1">{issue.message}</span>
                          <span className="mt-0.5 flex shrink-0 items-center gap-1 text-xs text-text-muted opacity-0 transition-opacity group-hover/issue:opacity-100">
                            {issue.type === 'feature_validation' || issue.type === 'joint_fit'
                              ? 'Open cut'
                              : 'Go to part'}
                            <ChevronRight size={12} />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={closeIssuesModal}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
