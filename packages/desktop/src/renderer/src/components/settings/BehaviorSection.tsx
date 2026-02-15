import { HelpTooltip } from '../common/HelpTooltip';
import { AppSettings } from '../../types';

interface BehaviorSectionProps {
  formData: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export function BehaviorSection({ formData, onSettingChange }: BehaviorSectionProps) {
  return (
    <div className="settings-section">
      <h3>Behavior</h3>
      <div className="settings-row">
        <div className="label-with-help">
          <label>Auto-Save</label>
          <HelpTooltip
            text="Automatically save your project 30 seconds after changes. If the project hasn't been saved yet, you'll be prompted to choose a location."
            docsSection="app-settings"
          />
        </div>
        <input
          type="checkbox"
          checked={formData.autoSave ?? false}
          onChange={(e) => onSettingChange('autoSave', e.target.checked)}
        />
      </div>
      <div className="settings-row">
        <div className="label-with-help">
          <label>Confirm Before Delete</label>
          <HelpTooltip text="Show a confirmation dialog when deleting parts or stocks." docsSection="app-settings" />
        </div>
        <input
          type="checkbox"
          checked={formData.confirmBeforeDelete}
          onChange={(e) => onSettingChange('confirmBeforeDelete', e.target.checked)}
        />
      </div>

      <div className="settings-row" style={{ marginTop: '16px' }}>
        <div className="label-with-help">
          <label>Welcome Tutorial</label>
          <HelpTooltip text="Reset the welcome tutorial to show it again on next launch." docsSection="quick-start" />
        </div>
        <button
          className="btn btn-sm btn-outlined btn-secondary"
          onClick={async () => {
            if (confirm('Reset the welcome tutorial? The tutorial will show again next time you launch the app.')) {
              await window.electronAPI.resetWelcomeTutorial();
              alert('Tutorial reset! The welcome tutorial will show on your next launch.');
            }
          }}
        >
          Reset Tutorial
        </button>
      </div>
    </div>
  );
}
