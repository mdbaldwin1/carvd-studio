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
    <div className="mb-6 last:mb-0">
      <h3 className="text-sm font-semibold m-0 mb-3 text-text flex items-center gap-1.5">
        Defaults for New Projects
        <HelpTooltip
          text="These settings are used when creating a new project. Each project stores its own settings that can be changed later."
          docsSection="app-settings"
          inline
        />
      </h3>
      <div className="settings-row flex items-center justify-between gap-4 mb-3">
        <label className="text-[13px] text-text">Units</label>
        <select
          value={formData.defaultUnits}
          onChange={(e) => onUnitsChange(e.target.value as 'imperial' | 'metric')}
          className="w-40 bg-bg border border-border text-text py-1.5 px-2 rounded text-[13px] cursor-pointer outline-none focus:border-accent"
        >
          <option value="imperial">Imperial (inches)</option>
          <option value="metric">Metric (mm)</option>
        </select>
      </div>
      <div className="settings-row flex items-center justify-between gap-4 mb-3">
        <label className="text-[13px] text-text">Grid Snap Size</label>
        <select
          value={displayGridValue}
          onChange={(e) => onSettingChange('defaultGridSize', parseFloat(e.target.value))}
          className="w-40 bg-bg border border-border text-text py-1.5 px-2 rounded text-[13px] cursor-pointer outline-none focus:border-accent"
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
