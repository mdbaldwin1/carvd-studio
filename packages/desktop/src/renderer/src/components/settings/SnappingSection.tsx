import { HelpTooltip } from '../common/HelpTooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Checkbox } from '@renderer/components/ui/checkbox';
import { Select } from '@renderer/components/ui/select';
import { AppSettings, SnapSensitivity } from '../../types';

interface SnappingSectionProps {
  formData: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export function SnappingSection({ formData, onSettingChange }: SnappingSectionProps) {
  return (
    <Card className="settings-section mb-6 last:mb-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Snapping
          <HelpTooltip
            text="Configure how parts snap to other parts, guides, and the grid. Hold Alt/Option while dragging to temporarily bypass snapping."
            docsSection="snapping"
            inline
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="settings-row flex items-center justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-1">
            <label className="text-[13px] text-text">Snap Sensitivity</label>
            <HelpTooltip
              text="How close parts need to be before snapping. Tight requires closer proximity."
              docsSection="snapping"
            />
          </div>
          <Select
            variant="sm"
            value={formData.snapSensitivity ?? 'normal'}
            onChange={(e) => onSettingChange('snapSensitivity', e.target.value as SnapSensitivity)}
          >
            <option value="tight">Tight (precise)</option>
            <option value="normal">Normal</option>
            <option value="loose">Loose (easier)</option>
          </Select>
        </div>
        <div className="settings-row flex items-center justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-1">
            <label className="text-[13px] text-text">Live Grid Snapping</label>
            <HelpTooltip
              text="Snap to grid continuously while dragging (instead of only when releasing)."
              docsSection="snapping"
            />
          </div>
          <Checkbox
            checked={formData.liveGridSnap ?? false}
            onChange={(e) => onSettingChange('liveGridSnap', e.target.checked)}
          />
        </div>
        <div className="settings-row flex items-center justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-1">
            <label className="text-[13px] text-text">Snap to Origin</label>
            <HelpTooltip text="Snap parts to workspace origin planes (X=0, Y=0, Z=0)." docsSection="snapping" />
          </div>
          <Checkbox
            checked={formData.snapToOrigin ?? true}
            onChange={(e) => onSettingChange('snapToOrigin', e.target.checked)}
          />
        </div>
        <div className="settings-row flex items-center justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-1">
            <label className="text-[13px] text-text">Match Same Dimensions Only</label>
            <HelpTooltip
              text="During resize, only match same dimension types (length to length, width to width)."
              docsSection="snapping"
            />
          </div>
          <Checkbox
            checked={formData.dimensionSnapSameTypeOnly ?? false}
            onChange={(e) => onSettingChange('dimensionSnapSameTypeOnly', e.target.checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
