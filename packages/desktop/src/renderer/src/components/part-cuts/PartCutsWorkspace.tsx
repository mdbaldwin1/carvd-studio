import { Badge } from '@renderer/components/ui/badge';
import { Button } from '@renderer/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { Part } from '@renderer/types';
import { getFeatureSummary, getFeatureTargetLabel } from '@renderer/utils/partFeatureSummary';
import { formatMeasurementWithUnit } from '@renderer/utils/fractions';

interface PartCutsWorkspaceProps {
  part: Part;
  draftFeatures: Part['features'];
  units: 'imperial' | 'metric';
  onExit: () => void;
  onSave: () => void;
  hasUnsavedChanges: boolean;
}

function getBlankSizeLabel(part: Part, units: 'imperial' | 'metric'): string {
  return [
    formatMeasurementWithUnit(part.length, units),
    formatMeasurementWithUnit(part.width, units),
    formatMeasurementWithUnit(part.thickness, units)
  ].join(' × ');
}

export function PartCutsWorkspace({
  part,
  draftFeatures = [],
  units,
  onExit,
  onSave,
  hasUnsavedChanges
}: PartCutsWorkspaceProps) {
  return (
    <div className="app-main flex min-h-0 flex-1 bg-bg">
      <div className="flex min-h-0 flex-1 gap-4 p-4">
        <Card className="flex min-h-0 w-[320px] flex-col">
          <CardHeader className="pb-4">
            <CardTitle>Operations</CardTitle>
            <CardDescription>
              Build the cut stack for <span className="font-medium text-text">{part.name}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm text-text-secondary">
              <div className="font-medium text-text">Blank Size</div>
              <div>{getBlankSizeLabel(part, units)}</div>
            </div>
            <ScrollArea className="min-h-0 flex-1 rounded-md border border-border bg-bg-secondary">
              <div className="space-y-2 p-3">
                {draftFeatures.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-text-muted">
                    No cuts authored yet. Operation authoring moves into this workspace in `carvd-studio-13.3`.
                  </div>
                ) : (
                  draftFeatures.map((feature, index) => (
                    <div key={feature.id} className="rounded-md border border-border bg-bg px-3 py-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="text-sm font-medium text-text">
                          {index + 1}. {feature.label?.trim() || getFeatureTargetLabel(feature)}
                        </div>
                        {!feature.enabled && (
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                            Disabled
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs leading-relaxed text-text-secondary">
                        {getFeatureSummary(feature, units)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-1 flex-col">
          <CardHeader className="pb-4">
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Dedicated 3D part preview and target selection land in `carvd-studio-13.4`.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-[320px] flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-gradient-to-br from-bg-secondary to-bg px-6 py-8 text-center">
              <div className="max-w-md space-y-3">
                <div className="text-lg font-semibold text-text">{part.name}</div>
                <div className="text-sm text-text-secondary">
                  This shell isolates one part so cut editing, ordering, and spatial targeting can happen outside the
                  Properties panel.
                </div>
                <div className="text-xs text-text-muted">Blank size: {getBlankSizeLabel(part, units)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex min-h-0 w-[320px] flex-col">
          <CardHeader className="pb-4">
            <CardTitle>Inspector</CardTitle>
            <CardDescription>Operation detail editing moves here in `carvd-studio-13.3`.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            <div className="rounded-md border border-border bg-bg-secondary px-3 py-3 text-sm text-text-secondary">
              This bead establishes the session shell, entry points, and save/discard contract. The next bead moves the
              full operation editor into this inspector.
            </div>
            <div className="mt-auto flex gap-2">
              <Button variant="outline" onClick={onExit} className="flex-1">
                {hasUnsavedChanges ? 'Cancel' : 'Exit'}
              </Button>
              <Button onClick={onSave} className="flex-1" disabled={!hasUnsavedChanges}>
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
