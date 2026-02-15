import { HelpTooltip } from '../common/HelpTooltip';
import { AppSettings, LightingMode } from '../../types';

interface AppearanceSectionProps {
  formData: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export function AppearanceSection({ formData, onSettingChange }: AppearanceSectionProps) {
  return (
    <div className="settings-section">
      <h3>Appearance</h3>
      <div className="settings-row">
        <label>Theme</label>
        <select
          value={formData.theme}
          onChange={(e) => onSettingChange('theme', e.target.value as AppSettings['theme'])}
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="system">System</option>
        </select>
      </div>
      <div className="settings-row">
        <label>Show Hotkey Hints</label>
        <input
          type="checkbox"
          checked={formData.showHotkeyHints}
          onChange={(e) => onSettingChange('showHotkeyHints', e.target.checked)}
        />
      </div>
      <div className="settings-row">
        <div className="label-with-help">
          <label>Lighting Mode</label>
          <HelpTooltip
            text='Adjust 3D workspace lighting. "Bright" is recommended for dark-colored materials.'
            docsSection="app-settings"
          />
        </div>
        <select
          value={formData.lightingMode ?? 'default'}
          onChange={(e) => onSettingChange('lightingMode', e.target.value as LightingMode)}
        >
          <option value="default">Default</option>
          <option value="bright">Bright</option>
          <option value="studio">Studio</option>
          <option value="dramatic">Dramatic</option>
        </select>
      </div>
    </div>
  );
}
