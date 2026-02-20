import { useEffect, useState, useCallback } from 'react';
import { Button } from '@renderer/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog';
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
    } catch {
      showToast('Failed to export backup', 'error');
    } finally {
      setIsExporting(false);
    }
  }, [showToast]);

  // Sync form data when settings change
  useEffect(() => {
    setFormData(settings);
  }, [settings]);

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

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[480px]" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>App Settings</DialogTitle>
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
            <DialogClose onClose={onClose} />
          </div>
        </DialogHeader>

        <div className="p-5 overflow-y-auto max-h-[60vh]">
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

        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
