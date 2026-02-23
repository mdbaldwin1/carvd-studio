import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Select } from '@renderer/components/ui/select';
import { AppSettings } from '../../types';
import { HelpTooltip } from '../common/HelpTooltip';

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
    <Card className="settings-section mb-6 last:mb-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Defaults for New Projects
          <HelpTooltip
            text="These settings are used when creating a new project. Each project stores its own settings that can be changed later."
            docsSection="app-settings"
            inline
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="settings-row flex items-center justify-between gap-4 mb-3">
          <label className="text-[13px] text-text">Units</label>
          <Select
            className="w-auto"
            value={formData.defaultUnits}
            onChange={(e) => onUnitsChange(e.target.value as 'imperial' | 'metric')}
          >
            <option value="imperial">Imperial (inches)</option>
            <option value="metric">Metric (mm)</option>
          </Select>
        </div>
        <div className="settings-row flex items-center justify-between gap-4 mb-3">
          <label className="text-[13px] text-text">Grid Snap Size</label>
          <Select
            className="w-auto"
            value={displayGridValue}
            onChange={(e) => onSettingChange('defaultGridSize', parseFloat(e.target.value))}
          >
            {gridOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
