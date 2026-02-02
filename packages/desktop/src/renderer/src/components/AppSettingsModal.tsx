import { useEffect, useState } from 'react';
import { CheckCircle, Key } from 'lucide-react';
import { useBackdropClose } from '../hooks/useBackdropClose';
import { AppSettings } from '../types';
import { mmToInches } from '../utils/fractions';

interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  licenseData?: {
    licenseEmail: string | null;
    licenseOrderId: string | null;
    licenseActivatedAt: string | null;
  };
  onDeactivateLicense?: () => void;
}

// Imperial grid size options (values in inches)
const IMPERIAL_GRID_OPTIONS = [
  { value: 0.0625, label: '1/16"' },
  { value: 0.125, label: '1/8"' },
  { value: 0.25, label: '1/4"' },
  { value: 0.5, label: '1/2"' },
  { value: 1, label: '1"' }
];

// Metric grid size options (values stored in inches, displayed as mm)
const METRIC_GRID_OPTIONS = [
  { value: mmToInches(1), label: '1mm' },
  { value: mmToInches(2), label: '2mm' },
  { value: mmToInches(5), label: '5mm' },
  { value: mmToInches(10), label: '10mm' },
  { value: mmToInches(25), label: '25mm' }
];

// Find the closest matching grid size option for a value
const findClosestGridValue = (
  currentValue: number,
  options: { value: number; label: string }[]
): number => {
  let closest = options[0].value;
  let minDiff = Math.abs(currentValue - closest);
  for (const opt of options) {
    const diff = Math.abs(currentValue - opt.value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = opt.value;
    }
  }
  return closest;
};

export function AppSettingsModal({ isOpen, onClose, settings, onUpdateSettings, licenseData, onDeactivateLicense }: AppSettingsModalProps) {
  // Handle backdrop click (only close if mousedown AND mouseup both on backdrop)
  const { handleMouseDown, handleClick } = useBackdropClose(onClose);

  // Local form state
  const [formData, setFormData] = useState<AppSettings>(settings);

  // Sync form data when settings change
  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const gridOptions = formData.defaultUnits === 'metric' ? METRIC_GRID_OPTIONS : IMPERIAL_GRID_OPTIONS;
  const displayGridValue = findClosestGridValue(formData.defaultGridSize, gridOptions);

  const handleChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const newData = { ...formData, [key]: value };
    setFormData(newData);
    // Auto-save on change
    onUpdateSettings({ [key]: value });
  };

  // Handle units change - convert grid size to closest equivalent
  const handleUnitsChange = (newUnits: 'imperial' | 'metric') => {
    const newOptions = newUnits === 'metric' ? METRIC_GRID_OPTIONS : IMPERIAL_GRID_OPTIONS;
    const newGridSize = findClosestGridValue(formData.defaultGridSize, newOptions);
    const newData = { ...formData, defaultUnits: newUnits, defaultGridSize: newGridSize };
    setFormData(newData);
    onUpdateSettings({ defaultUnits: newUnits, defaultGridSize: newGridSize });
  };

  return (
    <div className="modal-backdrop" onMouseDown={handleMouseDown} onClick={handleClick}>
      <div className="modal app-settings-modal">
        <div className="modal-header">
          <h2>App Settings</h2>
          <button className="btn btn-icon-sm btn-ghost btn-secondary" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="settings-content">
          {/* Theme */}
          <div className="settings-section">
            <h3>Appearance</h3>
            <div className="settings-row">
              <label>Theme</label>
              <select
                value={formData.theme}
                onChange={(e) => handleChange('theme', e.target.value as AppSettings['theme'])}
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
                onChange={(e) => handleChange('showHotkeyHints', e.target.checked)}
              />
            </div>
          </div>

          {/* License Information */}
          {licenseData && (
            <div className="settings-section">
              <h3>License</h3>
              {licenseData.licenseEmail ? (
                <>
                  <div style={{
                    padding: '16px',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid var(--color-success)',
                    borderRadius: '8px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <CheckCircle size={20} color="var(--color-success)" />
                      <span style={{ color: 'var(--color-success)', fontSize: '14px', fontWeight: 600 }}>
                        License Active
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                      <div><strong>Email:</strong> {licenseData.licenseEmail}</div>
                      <div><strong>Order ID:</strong> {licenseData.licenseOrderId}</div>
                      {licenseData.licenseActivatedAt && (
                        <div>
                          <strong>Activated:</strong> {new Date(licenseData.licenseActivatedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  {onDeactivateLicense && (
                    <button
                      className="btn btn-sm btn-outlined btn-danger"
                      onClick={() => {
                        if (confirm('Are you sure you want to deactivate this license? You will need to enter it again to use the app.')) {
                          onDeactivateLicense();
                        }
                      }}
                    >
                      Deactivate License
                    </button>
                  )}
                </>
              ) : (
                <div style={{
                  padding: '16px',
                  backgroundColor: 'rgba(196, 84, 84, 0.1)',
                  border: '1px solid var(--color-danger)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <Key size={20} color="var(--color-danger)" />
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                    No active license
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Defaults for New Projects */}
          <div className="settings-section">
            <h3>Defaults for New Projects</h3>
            <p className="settings-hint">
              These settings are used when creating a new project. Each project stores its own settings.
            </p>
            <div className="settings-row">
              <label>Units</label>
              <select value={formData.defaultUnits} onChange={(e) => handleUnitsChange(e.target.value as 'imperial' | 'metric')}>
                <option value="imperial">Imperial (inches)</option>
                <option value="metric">Metric (mm)</option>
              </select>
            </div>
            <div className="settings-row">
              <label>Grid Snap Size</label>
              <select
                value={displayGridValue}
                onChange={(e) => handleChange('defaultGridSize', parseFloat(e.target.value))}
              >
                {gridOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Behavior */}
          <div className="settings-section">
            <h3>Behavior</h3>
            <div className="settings-row">
              <label>Confirm Before Delete</label>
              <input
                type="checkbox"
                checked={formData.confirmBeforeDelete}
                onChange={(e) => handleChange('confirmBeforeDelete', e.target.checked)}
              />
            </div>
            <p className="settings-hint">Show a confirmation dialog when deleting parts or stocks.</p>

            <div className="settings-row" style={{ marginTop: '16px' }}>
              <label>Welcome Tutorial</label>
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
            <p className="settings-hint">Reset the welcome tutorial to show it again on next launch.</p>
          </div>

          {/* Stock Constraints */}
          <div className="settings-section">
            <h3>Stock Constraints (Defaults)</h3>
            <p className="settings-hint">
              These settings are applied when creating a new project. Each project has its own settings that can be changed in Project Settings.
            </p>
            <div className="settings-row">
              <label>Constrain Dimensions</label>
              <input
                type="checkbox"
                checked={formData.stockConstraints?.constrainDimensions ?? true}
                onChange={(e) => handleChange('stockConstraints', {
                  ...formData.stockConstraints,
                  constrainDimensions: e.target.checked
                })}
              />
            </div>
            <p className="settings-hint">Show warning when part dimensions (including joinery adjustments) exceed stock dimensions.</p>
            <div className="settings-row">
              <label>Constrain Grain Direction</label>
              <input
                type="checkbox"
                checked={formData.stockConstraints?.constrainGrain ?? true}
                onChange={(e) => handleChange('stockConstraints', {
                  ...formData.stockConstraints,
                  constrainGrain: e.target.checked
                })}
              />
            </div>
            <p className="settings-hint">Show warning when part grain direction doesn't match stock grain direction.</p>
            <div className="settings-row">
              <label>Auto-sync Color</label>
              <input
                type="checkbox"
                checked={formData.stockConstraints?.constrainColor ?? true}
                onChange={(e) => handleChange('stockConstraints', {
                  ...formData.stockConstraints,
                  constrainColor: e.target.checked
                })}
              />
            </div>
            <p className="settings-hint">Automatically update part color when stock is assigned.</p>
            <div className="settings-row">
              <label>Prevent Overlap</label>
              <input
                type="checkbox"
                checked={formData.stockConstraints?.preventOverlap ?? true}
                onChange={(e) => handleChange('stockConstraints', {
                  ...formData.stockConstraints,
                  preventOverlap: e.target.checked
                })}
              />
            </div>
            <p className="settings-hint">Prevent parts from occupying the same space.</p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-sm btn-filled btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
