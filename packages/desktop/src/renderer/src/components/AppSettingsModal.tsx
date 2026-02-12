import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, Key, Download, Upload } from 'lucide-react';
import { useBackdropClose } from '../hooks/useBackdropClose';
import { HelpTooltip } from './HelpTooltip';
import { AppSettings, LightingMode, SnapSensitivity } from '../types';
import { mmToInches } from '../utils/fractions';
import { useProjectStore } from '../store/projectStore';

interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  licenseMode?: 'trial' | 'licensed' | 'free';
  licenseData?: {
    licenseEmail: string | null;
    licenseOrderId: string | null;
    licenseActivatedAt: string | null;
  };
  onDeactivateLicense?: () => void;
  onShowLicenseModal?: () => void;
  onShowImportModal?: () => void;
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
const findClosestGridValue = (currentValue: number, options: { value: number; label: string }[]): number => {
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

export function AppSettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  licenseMode,
  licenseData,
  onDeactivateLicense,
  onShowLicenseModal,
  onShowImportModal
}: AppSettingsModalProps) {
  // Handle backdrop click (only close if mousedown AND mouseup both on backdrop)
  const { handleMouseDown, handleClick } = useBackdropClose(onClose);

  // Local form state
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isExporting, setIsExporting] = useState(false);
  const showToast = useProjectStore((s) => s.showToast);

  // Handle export app state
  const handleExportAppState = useCallback(async () => {
    setIsExporting(true);
    try {
      const result = await window.electronAPI.exportAppState();
      if (result.success && result.filePath) {
        showToast(`Backup saved to ${result.filePath.split('/').pop()}`, 'success');
      } else if (!result.canceled) {
        showToast(result.error || 'Failed to export backup', 'error');
      }
    } catch (error) {
      showToast('Failed to export backup', 'error');
    } finally {
      setIsExporting(false);
    }
  }, [showToast]);

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
      <div
        className="modal app-settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-settings-modal-title"
      >
        <div className="modal-header">
          <h2 id="app-settings-modal-title">App Settings</h2>
          <div className="modal-header-actions">
            <a
              href="#"
              className="modal-help-link"
              onClick={(e) => {
                e.preventDefault();
                window.electronAPI.openExternal('https://carvd-studio.com/docs#settings');
              }}
            >
              View documentation
            </a>
            <button className="btn btn-icon-sm btn-ghost btn-secondary" onClick={onClose} aria-label="Close">
              &times;
            </button>
          </div>
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
                onChange={(e) => handleChange('lightingMode', e.target.value as LightingMode)}
              >
                <option value="default">Default</option>
                <option value="bright">Bright</option>
                <option value="studio">Studio</option>
                <option value="dramatic">Dramatic</option>
              </select>
            </div>
          </div>

          {/* License Information */}
          {licenseData && (
            <div className="settings-section">
              <h3>License</h3>
              {licenseData.licenseEmail ? (
                <>
                  <div className="alert alert-success" style={{ marginBottom: '16px' }}>
                    <CheckCircle size={20} className="alert-icon" />
                    <div className="alert-content">
                      <div className="alert-title">License Active</div>
                      <div className="alert-message">
                        <div>
                          <strong>Email:</strong> {licenseData.licenseEmail}
                        </div>
                        <div>
                          <strong>Order ID:</strong> {licenseData.licenseOrderId}
                        </div>
                        {licenseData.licenseActivatedAt && (
                          <div>
                            <strong>Activated:</strong> {new Date(licenseData.licenseActivatedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {onDeactivateLicense && (
                    <button
                      className="btn btn-sm btn-outlined btn-danger"
                      onClick={() => {
                        if (
                          confirm(
                            'Are you sure you want to deactivate this license? You will need to enter it again to use the app.'
                          )
                        ) {
                          onDeactivateLicense();
                        }
                      }}
                    >
                      Deactivate License
                    </button>
                  )}
                </>
              ) : licenseMode === 'free' ? (
                <div className="upgrade-section">
                  <p className="upgrade-text">
                    You're using the free version of Carvd Studio. Upgrade to unlock all features including assemblies,
                    custom templates, and the cut list optimizer.
                  </p>
                  <div className="upgrade-actions">
                    <a
                      href="https://carvd-studio.com/pricing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-filled btn-primary"
                    >
                      Purchase License
                    </a>
                    {onShowLicenseModal && (
                      <button
                        className="btn btn-sm btn-outlined btn-secondary"
                        onClick={() => {
                          onClose();
                          onShowLicenseModal();
                        }}
                      >
                        Enter License Key
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="alert alert-info">
                  <Key size={20} className="alert-icon" />
                  <span className="alert-message">Trial mode active</span>
                </div>
              )}
            </div>
          )}

          {/* Defaults for New Projects */}
          <div className="settings-section">
            <h3>
              Defaults for New Projects
              <HelpTooltip
                text="These settings are used when creating a new project. Each project stores its own settings that can be changed later."
                docsSection="app-settings"
                inline
              />
            </h3>
            <div className="settings-row">
              <label>Units</label>
              <select
                value={formData.defaultUnits}
                onChange={(e) => handleUnitsChange(e.target.value as 'imperial' | 'metric')}
              >
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
                onChange={(e) => handleChange('autoSave', e.target.checked)}
              />
            </div>
            <div className="settings-row">
              <div className="label-with-help">
                <label>Confirm Before Delete</label>
                <HelpTooltip
                  text="Show a confirmation dialog when deleting parts or stocks."
                  docsSection="app-settings"
                />
              </div>
              <input
                type="checkbox"
                checked={formData.confirmBeforeDelete}
                onChange={(e) => handleChange('confirmBeforeDelete', e.target.checked)}
              />
            </div>

            <div className="settings-row" style={{ marginTop: '16px' }}>
              <div className="label-with-help">
                <label>Welcome Tutorial</label>
                <HelpTooltip
                  text="Reset the welcome tutorial to show it again on next launch."
                  docsSection="quick-start"
                />
              </div>
              <button
                className="btn btn-sm btn-outlined btn-secondary"
                onClick={async () => {
                  if (
                    confirm('Reset the welcome tutorial? The tutorial will show again next time you launch the app.')
                  ) {
                    await window.electronAPI.resetWelcomeTutorial();
                    alert('Tutorial reset! The welcome tutorial will show on your next launch.');
                  }
                }}
              >
                Reset Tutorial
              </button>
            </div>
          </div>

          {/* Snapping */}
          <div className="settings-section">
            <h3>
              Snapping
              <HelpTooltip
                text="Configure how parts snap to other parts, guides, and the grid. Hold Alt/Option while dragging to temporarily bypass snapping."
                docsSection="snapping"
                inline
              />
            </h3>
            <div className="settings-row">
              <div className="label-with-help">
                <label>Snap Sensitivity</label>
                <HelpTooltip
                  text="How close parts need to be before snapping. Tight requires closer proximity."
                  docsSection="snapping"
                />
              </div>
              <select
                value={formData.snapSensitivity ?? 'normal'}
                onChange={(e) => handleChange('snapSensitivity', e.target.value as SnapSensitivity)}
              >
                <option value="tight">Tight (precise)</option>
                <option value="normal">Normal</option>
                <option value="loose">Loose (easier)</option>
              </select>
            </div>
            <div className="settings-row">
              <div className="label-with-help">
                <label>Live Grid Snapping</label>
                <HelpTooltip
                  text="Snap to grid continuously while dragging (instead of only when releasing)."
                  docsSection="snapping"
                />
              </div>
              <input
                type="checkbox"
                checked={formData.liveGridSnap ?? false}
                onChange={(e) => handleChange('liveGridSnap', e.target.checked)}
              />
            </div>
            <div className="settings-row">
              <div className="label-with-help">
                <label>Snap to Origin</label>
                <HelpTooltip text="Snap parts to workspace origin planes (X=0, Y=0, Z=0)." docsSection="snapping" />
              </div>
              <input
                type="checkbox"
                checked={formData.snapToOrigin ?? true}
                onChange={(e) => handleChange('snapToOrigin', e.target.checked)}
              />
            </div>
            <div className="settings-row">
              <div className="label-with-help">
                <label>Match Same Dimensions Only</label>
                <HelpTooltip
                  text="During resize, only match same dimension types (length to length, width to width)."
                  docsSection="snapping"
                />
              </div>
              <input
                type="checkbox"
                checked={formData.dimensionSnapSameTypeOnly ?? false}
                onChange={(e) => handleChange('dimensionSnapSameTypeOnly', e.target.checked)}
              />
            </div>
          </div>

          {/* Stock Constraints */}
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
                  handleChange('stockConstraints', {
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
                  handleChange('stockConstraints', {
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
                  handleChange('stockConstraints', {
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
                  handleChange('stockConstraints', {
                    ...formData.stockConstraints,
                    preventOverlap: e.target.checked
                  })
                }
              />
            </div>
          </div>

          {/* Data Management */}
          <div className="settings-section">
            <h3>Data Management</h3>
            <div className="settings-row settings-row-data-management">
              <div className="settings-label-block">
                <div className="label-with-help">
                  <label>Backup & Sync</label>
                  <HelpTooltip
                    text="Export your templates, assemblies, and stock library to sync with another machine or create a backup."
                    docsSection="backup-sync"
                  />
                </div>
              </div>
              <div className="settings-actions">
                <button
                  className="btn btn-sm btn-outlined btn-secondary"
                  onClick={handleExportAppState}
                  disabled={isExporting}
                >
                  <Download size={14} />
                  {isExporting ? 'Exporting...' : 'Export'}
                </button>
                <button
                  className="btn btn-sm btn-outlined btn-secondary"
                  onClick={() => {
                    onClose();
                    onShowImportModal?.();
                  }}
                >
                  <Upload size={14} />
                  Import
                </button>
              </div>
            </div>
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
