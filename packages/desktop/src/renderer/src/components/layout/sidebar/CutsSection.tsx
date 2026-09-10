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
    units,
    draftFeatures,
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
      {/* No blank header here: the header names the part, and its dimensions
          are drawn on the part in the preview, where they also say which edge
          is which. */}
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
              {/* The same icon affordance Parts and Stock use in this rail. */}
              <Button
                variant="ghost"
                size="icon"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleBeginAdd();
                }}
                title="Add Cut"
              >
                +
              </Button>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="flex min-h-0 flex-1 flex-col">
            {/* No summary strip: the enabled count is visible in the rows'
                checkboxes, and the header's Save and Exit/Cancel already say
                whether there are unsaved changes, as they do for a project. */}
            <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 pt-3">
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-3 pr-1">
                  {draftFeatures.length === 0 ? (
                    // Worded and styled like Stock's and Assemblies' empty
                    // states. No px-4 here: this list's container already
                    // pads, where theirs does not, so the indent matches.
                    <p className="text-xs italic text-text-muted">No cuts yet. Click + to add.</p>
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
