import { useEffect, useState, useCallback } from 'react';
import { useBackdropClose } from '../../hooks/useBackdropClose';
import { AppSettings } from '../../types';
import { mmToInches } from '../../utils/fractions';
import { useUIStore } from '../../store/uiStore';
import { AppearanceSection } from './AppearanceSection';
import { LicenseSection } from './LicenseSection';
import { DefaultsSection } from './DefaultsSection';
import { BehaviorSection } from './BehaviorSection';
import { SnappingSection } from './SnappingSection';
import { StockConstraintsSection } from './StockConstraintsSection';
import { DataManagementSection } from './DataManagementSection';

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
  const showToast = useUIStore((s) => s.showToast);

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
    <div
      className="fixed inset-0 bg-overlay flex items-center justify-center z-[1100]"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div
        className="bg-surface border border-border rounded-lg shadow-[0_8px_32px_var(--color-overlay)] max-w-[90vw] max-h-[85vh] flex flex-col animate-modal-fade-in w-[480px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-settings-modal-title"
      >
        <div className="flex justify-between items-center py-4 px-5 border-b border-border">
          <h2 id="app-settings-modal-title" className="text-base font-semibold text-text m-0">
            App Settings
          </h2>
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="text-xs text-text-muted no-underline transition-colors duration-150 hover:text-accent hover:underline"
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
          <AppearanceSection formData={formData} onSettingChange={handleChange} />

          {licenseData && (
            <LicenseSection
              licenseMode={licenseMode}
              licenseData={licenseData}
              onDeactivateLicense={onDeactivateLicense}
              onShowLicenseModal={onShowLicenseModal}
              onClose={onClose}
            />
          )}

          <DefaultsSection
            formData={formData}
            onSettingChange={handleChange}
            gridOptions={gridOptions}
            displayGridValue={displayGridValue}
            onUnitsChange={handleUnitsChange}
          />

          <BehaviorSection formData={formData} onSettingChange={handleChange} />

          <SnappingSection formData={formData} onSettingChange={handleChange} />

          <StockConstraintsSection formData={formData} onSettingChange={handleChange} />

          <DataManagementSection
            isExporting={isExporting}
            onExport={handleExportAppState}
            onImport={() => {
              onClose();
              onShowImportModal?.();
            }}
          />
        </div>

        <div className="flex justify-end gap-2 py-4 px-5 border-t border-border">
          <button className="btn btn-sm btn-filled btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
