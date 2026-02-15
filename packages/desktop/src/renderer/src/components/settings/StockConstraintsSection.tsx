import { HelpTooltip } from '../common/HelpTooltip';
import { AppSettings } from '../../types';

interface StockConstraintsSectionProps {
  formData: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export function StockConstraintsSection({ formData, onSettingChange }: StockConstraintsSectionProps) {
  return (
    <div className="settings-section">
      <h3>
        Stock Constraints (Defaults)
        <HelpTooltip
          text="These settings are applied when creating a new project. Each project has its own settings that can be changed in Project Settings."
          docsSection="app-settings"
          inline
        />
      </h3>
      <div className="settings-row">
        <div className="label-with-help">
          <label>Constrain Dimensions</label>
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
        />
      </div>
      <div className="settings-row">
        <div className="label-with-help">
          <label>Constrain Grain Direction</label>
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
        />
      </div>
      <div className="settings-row">
        <div className="label-with-help">
          <label>Auto-sync Color</label>
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
        />
      </div>
      <div className="settings-row">
        <div className="label-with-help">
          <label>Prevent Overlap</label>
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
        />
      </div>
    </div>
  );
}
