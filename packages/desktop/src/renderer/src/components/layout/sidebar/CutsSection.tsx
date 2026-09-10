import { ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@renderer/components/ui/collapsible';
import { SidebarGroup, SidebarGroupLabel } from '@renderer/components/ui/sidebar';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { Badge } from '@renderer/components/ui/badge';
import { Button } from '@renderer/components/ui/button';
import { Checkbox } from '@renderer/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu';
import { getAvailableMirrorActions, getMirrorActionLabel } from '@renderer/utils/partFeatureActions';
import { getFeatureSummary, getFeatureTargetLabel } from '@renderer/utils/partFeatureSummary';
import { usePartCutsEditor } from '@renderer/components/part-cuts/PartCutsEditorContext';
import { getBlankSizeLabel } from '@renderer/components/part-cuts/blankSize';

interface CutsSectionProps {
  isCollapsed: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The cut list, in the sidebar the project editor already uses for parts.
 *
 * The blank it belongs to is named here rather than in a frame around the
 * preview, so the preview is only the part.
 */
export function CutsSection({ isCollapsed, onOpenChange }: CutsSectionProps) {
  const {
    part,
    units,
    draftFeatures,
    hasUnsavedChanges,
    enabledOperationCount,
    conflictsByFeatureId,
    featureConflicts,
    operationIssues,
    firstInvalidIndex,
    handleBeginAdd,
    handleEditFeature,
    handleRemoveFeature,
    handleDuplicateFeature,
    handleMirrorFeature,
    handleMoveFeature,
    onDraftFeaturesChange
  } = usePartCutsEditor();

  return (
    <>
      {/* The blank being cut names the whole sidebar, so it sits above the
          Cuts section and stays visible when that section is collapsed. */}
      <div className="border-b border-border px-4 py-3">
        <div className="truncate text-sm font-medium text-text" title={part.name}>
          {part.name}
        </div>
        <div className="mt-0.5 text-xs text-text-muted">Blank {getBlankSizeLabel(part, units)}</div>
      </div>

      <Collapsible asChild open={!isCollapsed} onOpenChange={onOpenChange}>
        <SidebarGroup className={isCollapsed ? 'flex-none' : 'flex-1'}>
          <CollapsibleTrigger asChild>
            <div
              className="flex cursor-pointer items-center gap-1.5 rounded-none p-4 pr-2.5 transition-[background-color,margin] duration-150 hover:bg-bg-hover"
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              <span className="inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-[3px] border-none bg-transparent p-0 text-text-muted transition-colors duration-150">
                {isCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
              </span>
              <SidebarGroupLabel>Cuts</SidebarGroupLabel>
              <Button
                size="xs"
                className="ml-auto"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleBeginAdd();
                }}
                title="Add a cut to this part"
              >
                + Add Cut
              </Button>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 pt-3">
              <div className="rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm text-text-secondary">
                <div className="flex items-center justify-between gap-2">
                  <span>
                    <span className="font-medium text-text">{enabledOperationCount}</span> enabled
                  </span>
                  <span className={`font-medium ${hasUnsavedChanges ? 'text-accent' : 'text-text'}`}>
                    {hasUnsavedChanges ? 'Unsaved part changes' : 'No unsaved changes'}
                  </span>
                </div>
              </div>

              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-3 pr-1">
                  {draftFeatures.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border px-3 py-5 text-sm text-text-muted">
                      No cuts yet. Use <span className="font-medium text-text">+ Add Cut</span> to start the first one.
                    </div>
                  ) : (
                    draftFeatures.map((feature, index) => {
                      const conflicts = conflictsByFeatureId.get(feature.id) ?? [];
                      const issue = operationIssues.get(feature.id);
                      return (
                        <div
                          key={feature.id}
                          className="flex items-start gap-2 rounded-md border border-border bg-bg px-3 py-3 transition-colors hover:border-accent hover:bg-accent/5"
                        >
                          <div className="pt-0.5">
                            <Checkbox
                              aria-label={`Enable cut ${index + 1}`}
                              checked={feature.enabled}
                              onChange={(e) => {
                                e.stopPropagation();
                                onDraftFeaturesChange(
                                  draftFeatures.map((f) =>
                                    f.id === feature.id ? { ...f, enabled: e.target.checked } : f
                                  )
                                );
                              }}
                            />
                          </div>
                          <button type="button" className="flex-1 text-left" onClick={() => handleEditFeature(feature)}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-medium text-text">
                                  {index + 1}. {feature.label?.trim() || getFeatureSummary(feature, units)}
                                </div>
                                <div className="mt-1 text-[11px] text-text-muted">
                                  Target: {getFeatureTargetLabel(feature)}
                                </div>
                              </div>
                              <div className="flex flex-wrap justify-end gap-1">
                                {(issue || conflicts.length > 0) && (
                                  <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
                                    {issue
                                      ? 'Invalid cut'
                                      : conflicts.some((conflict) => conflict.severity === 'error')
                                        ? 'Conflict'
                                        : 'Warning'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {(issue || conflicts.length > 0) && (
                              <div className="mt-2 text-[11px] text-warning">{issue || conflicts[0].message}</div>
                            )}
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="mt-0.5 shrink-0 rounded p-1 text-text-muted transition-colors hover:bg-accent/10 hover:text-text"
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`Actions for cut ${index + 1}`}
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleMoveFeature(feature.id, -1)}
                                disabled={index === 0}
                              >
                                Move Up
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleMoveFeature(feature.id, 1)}
                                disabled={index === draftFeatures.length - 1}
                              >
                                Move Down
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDuplicateFeature(feature)}>
                                Duplicate
                              </DropdownMenuItem>
                              {getAvailableMirrorActions(feature).map((action) => (
                                <DropdownMenuItem key={action} onClick={() => handleMirrorFeature(feature, action)}>
                                  {getMirrorActionLabel(action)}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                // Removing the row unmounts this menu's trigger.
                                // Let Radix finish closing first, or the menu is
                                // orphaned on screen over the sidebar.
                                onSelect={() => window.queueMicrotask(() => handleRemoveFeature(feature.id))}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              {firstInvalidIndex >= 0 && (
                <div
                  id="part-cuts-save-errors"
                  role="alert"
                  className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
                >
                  <p>
                    {draftFeatures[firstInvalidIndex].label || `Cut ${firstInvalidIndex + 1}`}:{' '}
                    {operationIssues.get(draftFeatures[firstInvalidIndex].id) ||
                      featureConflicts.find(
                        (conflict) =>
                          conflict.featureId === draftFeatures[firstInvalidIndex].id && conflict.severity === 'error'
                      )?.message}
                  </p>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handleEditFeature(draftFeatures[firstInvalidIndex])}
                  >
                    Fix cut {firstInvalidIndex + 1}
                  </Button>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    </>
  );
}
