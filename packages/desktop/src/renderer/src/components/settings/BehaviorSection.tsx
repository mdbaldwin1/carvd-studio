import { HelpTooltip } from '../common/HelpTooltip';
import { Button } from '@renderer/components/ui/button';
import { AppSettings } from '../../types';

interface BehaviorSectionProps {
  formData: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export function BehaviorSection({ formData, onSettingChange }: BehaviorSectionProps) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="text-sm font-semibold m-0 mb-3 text-text flex items-center gap-1.5">Behavior</h3>
      <div className="settings-row flex items-center justify-between gap-4 mb-3">
        <div className="inline-flex items-center gap-1">
          <label className="text-[13px] text-text">Auto-Save</label>
          <HelpTooltip
            text="Automatically save your project 30 seconds after changes. If the project hasn't been saved yet, you'll be prompted to choose a location."
            docsSection="app-settings"
          />
        </div>
        <input
          type="checkbox"
          checked={formData.autoSave ?? false}
          onChange={(e) => onSettingChange('autoSave', e.target.checked)}
          className="w-[18px] h-[18px] cursor-pointer accent-accent"
        />
      </div>
      <div className="settings-row flex items-center justify-between gap-4 mb-3">
        <div className="inline-flex items-center gap-1">
          <label className="text-[13px] text-text">Confirm Before Delete</label>
          <HelpTooltip text="Show a confirmation dialog when deleting parts or stocks." docsSection="app-settings" />
        </div>
        <input
          type="checkbox"
          checked={formData.confirmBeforeDelete}
          onChange={(e) => onSettingChange('confirmBeforeDelete', e.target.checked)}
          className="w-[18px] h-[18px] cursor-pointer accent-accent"
        />
      </div>

      <div className="settings-row flex items-center justify-between gap-4 mb-3 mt-4">
        <div className="inline-flex items-center gap-1">
          <label className="text-[13px] text-text">Welcome Tutorial</label>
          <HelpTooltip text="Reset the welcome tutorial to show it again on next launch." docsSection="quick-start" />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            if (confirm('Reset the welcome tutorial? The tutorial will show again next time you launch the app.')) {
              await window.electronAPI.resetWelcomeTutorial();
              alert('Tutorial reset! The welcome tutorial will show on your next launch.');
            }
          }}
        >
          Reset Tutorial
        </Button>
      </div>
    </div>
  );
}
