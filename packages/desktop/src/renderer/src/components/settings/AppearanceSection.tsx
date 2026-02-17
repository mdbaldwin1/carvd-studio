import { HelpTooltip } from '../common/HelpTooltip';
import { AppSettings, LightingMode } from '../../types';

interface AppearanceSectionProps {
  formData: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export function AppearanceSection({ formData, onSettingChange }: AppearanceSectionProps) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="text-sm font-semibold m-0 mb-3 text-text flex items-center gap-1.5">Appearance</h3>
      <div className="settings-row flex items-center justify-between gap-4 mb-3">
        <label className="text-[13px] text-text">Theme</label>
        <select
          value={formData.theme}
          onChange={(e) => onSettingChange('theme', e.target.value as AppSettings['theme'])}
          className="w-40 bg-bg border border-border text-text py-1.5 px-2 rounded text-[13px] cursor-pointer outline-none focus:border-accent"
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="system">System</option>
        </select>
      </div>
      <div className="settings-row flex items-center justify-between gap-4 mb-3">
        <label className="text-[13px] text-text">Show Hotkey Hints</label>
        <input
          type="checkbox"
          checked={formData.showHotkeyHints}
          onChange={(e) => onSettingChange('showHotkeyHints', e.target.checked)}
          className="w-[18px] h-[18px] cursor-pointer accent-accent"
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
        <select
          value={formData.lightingMode ?? 'default'}
          onChange={(e) => onSettingChange('lightingMode', e.target.value as LightingMode)}
          className="w-40 bg-bg border border-border text-text py-1.5 px-2 rounded text-[13px] cursor-pointer outline-none focus:border-accent"
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
