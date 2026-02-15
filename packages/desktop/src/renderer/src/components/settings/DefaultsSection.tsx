import { HelpTooltip } from '../common/HelpTooltip';
import { AppSettings } from '../../types';

interface DefaultsSectionProps {
  formData: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  gridOptions: { value: number; label: string }[];
  displayGridValue: number;
  onUnitsChange: (units: 'imperial' | 'metric') => void;
}

export function DefaultsSection({
  formData,
  onSettingChange,
  gridOptions,
  displayGridValue,
  onUnitsChange
}: DefaultsSectionProps) {
  return (
    <div className="settings-section">
      <h3>
        Defaults for New Projects
        <HelpTooltip
          text="These settings are used when creating a new project. Each project stores its own settings that can be changed later."
          docsSection="app-settings"
          inline
        />
      </h3>
      <div className="settings-row">
        <label>Units</label>
        <select value={formData.defaultUnits} onChange={(e) => onUnitsChange(e.target.value as 'imperial' | 'metric')}>
          <option value="imperial">Imperial (inches)</option>
          <option value="metric">Metric (mm)</option>
        </select>
      </div>
      <div className="settings-row">
        <label>Grid Snap Size</label>
        <select
          value={displayGridValue}
          onChange={(e) => onSettingChange('defaultGridSize', parseFloat(e.target.value))}
        >
          {gridOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
