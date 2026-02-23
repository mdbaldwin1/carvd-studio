import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Checkbox } from '@renderer/components/ui/checkbox';
import { Select } from '@renderer/components/ui/select';
import { AppSettings, LightingMode } from '../../types';
import { HelpTooltip } from '../common/HelpTooltip';

interface AppearanceSectionProps {
  formData: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export function AppearanceSection({ formData, onSettingChange }: AppearanceSectionProps) {
  return (
    <Card className="settings-section mb-6 last:mb-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">Appearance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="settings-row flex items-center justify-between gap-4 mb-3">
          <label className="text-[13px] text-text">Theme</label>
          <Select
            className="w-auto"
            value={formData.theme}
            onChange={(e) => onSettingChange('theme', e.target.value as AppSettings['theme'])}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </Select>
        </div>
        <div className="settings-row flex items-center justify-between gap-4 mb-3">
          <label className="text-[13px] text-text">Show Hotkey Hints</label>
          <Checkbox
            checked={formData.showHotkeyHints}
            onChange={(e) => onSettingChange('showHotkeyHints', e.target.checked)}
          />
        </div>
        <div className="settings-row flex items-center justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-1">
            <label className="text-[13px] text-text">Lighting Mode</label>
            <HelpTooltip
              text='Adjust 3D workspace lighting. "Bright" is recommended for dark-colored materials.'
              docsSection="app-settings"
            />
          </div>
          <Select
            className="w-auto"
            value={formData.lightingMode ?? 'default'}
            onChange={(e) => onSettingChange('lightingMode', e.target.value as LightingMode)}
          >
            <option value="default">Default</option>
            <option value="bright">Bright</option>
            <option value="studio">Studio</option>
            <option value="dramatic">Dramatic</option>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
