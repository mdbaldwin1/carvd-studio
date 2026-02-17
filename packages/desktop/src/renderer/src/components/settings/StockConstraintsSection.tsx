import { HelpTooltip } from '../common/HelpTooltip';
import { AppSettings } from '../../types';

interface StockConstraintsSectionProps {
  formData: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export function StockConstraintsSection({ formData, onSettingChange }: StockConstraintsSectionProps) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="text-sm font-semibold m-0 mb-3 text-text flex items-center gap-1.5">
        Stock Constraints (Defaults)
        <HelpTooltip
          text="These settings are applied when creating a new project. Each project has its own settings that can be changed in Project Settings."
          docsSection="app-settings"
          inline
        />
      </h3>
      <div className="settings-row flex items-center justify-between gap-4 mb-3">
        <div className="label-with-help">
          <label className="text-[13px] text-text">Constrain Dimensions</label>
          <HelpTooltip
            text="Show warning when part dimensions (including joinery adjustments) exceed stock dimensions."
            docsSection="stock"
          />
        </div>
        <input
          type="checkbox"
          checked={formData.stockConstraints?.constrainDimensions ?? true}
          onChange={(e) =>
            onSettingChange('stockConstraints', {
              ...formData.stockConstraints,
              constrainDimensions: e.target.checked
            })
          }
          className="w-[18px] h-[18px] cursor-pointer accent-accent"
        />
      </div>
      <div className="settings-row flex items-center justify-between gap-4 mb-3">
        <div className="label-with-help">
          <label className="text-[13px] text-text">Constrain Grain Direction</label>
          <HelpTooltip
            text="Show warning when part grain direction doesn't match stock grain direction."
            docsSection="stock"
          />
        </div>
        <input
          type="checkbox"
          checked={formData.stockConstraints?.constrainGrain ?? true}
          onChange={(e) =>
            onSettingChange('stockConstraints', {
              ...formData.stockConstraints,
              constrainGrain: e.target.checked
            })
          }
          className="w-[18px] h-[18px] cursor-pointer accent-accent"
        />
      </div>
      <div className="settings-row flex items-center justify-between gap-4 mb-3">
        <div className="label-with-help">
          <label className="text-[13px] text-text">Auto-sync Color</label>
          <HelpTooltip text="Automatically update part color when stock is assigned." docsSection="stock" />
        </div>
        <input
          type="checkbox"
          checked={formData.stockConstraints?.constrainColor ?? true}
          onChange={(e) =>
            onSettingChange('stockConstraints', {
              ...formData.stockConstraints,
              constrainColor: e.target.checked
            })
          }
          className="w-[18px] h-[18px] cursor-pointer accent-accent"
        />
      </div>
      <div className="settings-row flex items-center justify-between gap-4 mb-3">
        <div className="label-with-help">
          <label className="text-[13px] text-text">Prevent Overlap</label>
          <HelpTooltip
            text="Prevent parts from occupying the same space. Shows warnings when parts overlap."
            docsSection="parts"
          />
        </div>
        <input
          type="checkbox"
          checked={formData.stockConstraints?.preventOverlap ?? true}
          onChange={(e) =>
            onSettingChange('stockConstraints', {
              ...formData.stockConstraints,
              preventOverlap: e.target.checked
            })
          }
          className="w-[18px] h-[18px] cursor-pointer accent-accent"
        />
      </div>
    </div>
  );
}
