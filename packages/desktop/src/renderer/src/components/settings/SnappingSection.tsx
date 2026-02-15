import { HelpTooltip } from '../common/HelpTooltip';
import { AppSettings, SnapSensitivity } from '../../types';

interface SnappingSectionProps {
  formData: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export function SnappingSection({ formData, onSettingChange }: SnappingSectionProps) {
  return (
    <div className="settings-section">
      <h3>
        Snapping
        <HelpTooltip
          text="Configure how parts snap to other parts, guides, and the grid. Hold Alt/Option while dragging to temporarily bypass snapping."
          docsSection="snapping"
          inline
        />
      </h3>
      <div className="settings-row">
        <div className="label-with-help">
          <label>Snap Sensitivity</label>
          <HelpTooltip
            text="How close parts need to be before snapping. Tight requires closer proximity."
            docsSection="snapping"
          />
        </div>
        <select
          value={formData.snapSensitivity ?? 'normal'}
          onChange={(e) => onSettingChange('snapSensitivity', e.target.value as SnapSensitivity)}
        >
          <option value="tight">Tight (precise)</option>
          <option value="normal">Normal</option>
          <option value="loose">Loose (easier)</option>
        </select>
      </div>
      <div className="settings-row">
        <div className="label-with-help">
          <label>Live Grid Snapping</label>
          <HelpTooltip
            text="Snap to grid continuously while dragging (instead of only when releasing)."
            docsSection="snapping"
          />
        </div>
        <input
          type="checkbox"
          checked={formData.liveGridSnap ?? false}
          onChange={(e) => onSettingChange('liveGridSnap', e.target.checked)}
        />
      </div>
      <div className="settings-row">
        <div className="label-with-help">
          <label>Snap to Origin</label>
          <HelpTooltip text="Snap parts to workspace origin planes (X=0, Y=0, Z=0)." docsSection="snapping" />
        </div>
        <input
          type="checkbox"
          checked={formData.snapToOrigin ?? true}
          onChange={(e) => onSettingChange('snapToOrigin', e.target.checked)}
        />
      </div>
      <div className="settings-row">
        <div className="label-with-help">
          <label>Match Same Dimensions Only</label>
          <HelpTooltip
            text="During resize, only match same dimension types (length to length, width to width)."
            docsSection="snapping"
          />
        </div>
        <input
          type="checkbox"
          checked={formData.dimensionSnapSameTypeOnly ?? false}
          onChange={(e) => onSettingChange('dimensionSnapSameTypeOnly', e.target.checked)}
        />
      </div>
    </div>
  );
}
