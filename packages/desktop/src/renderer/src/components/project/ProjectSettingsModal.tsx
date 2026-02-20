import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { mmToInches } from '../../utils/fractions';
import { FractionInput } from '../common/FractionInput';
import { HelpTooltip } from '../common/HelpTooltip';
import { Button } from '@renderer/components/ui/button';
import { Checkbox } from '@renderer/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog';
import { Select } from '@renderer/components/ui/select';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditingTemplate?: boolean;
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

export function ProjectSettingsModal({ isOpen, onClose, isEditingTemplate = false }: ProjectSettingsModalProps) {
  const projectName = useProjectStore((s) => s.projectName);
  const units = useProjectStore((s) => s.units);
  const gridSize = useProjectStore((s) => s.gridSize);
  const kerfWidth = useProjectStore((s) => s.kerfWidth);
  const overageFactor = useProjectStore((s) => s.overageFactor);
  const projectNotes = useProjectStore((s) => s.projectNotes);
  const stockConstraints = useProjectStore((s) => s.stockConstraints);
  const filePath = useProjectStore((s) => s.filePath);
  const showToast = useUIStore((s) => s.showToast);
  const setProjectUnits = useProjectStore((s) => s.setProjectUnits);
  const setProjectGridSize = useProjectStore((s) => s.setProjectGridSize);
  const setKerfWidth = useProjectStore((s) => s.setKerfWidth);
  const setOverageFactor = useProjectStore((s) => s.setOverageFactor);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const setProjectNotes = useProjectStore((s) => s.setProjectNotes);
  const setStockConstraints = useProjectStore((s) => s.setStockConstraints);

  // Favorite state
  const [isFavorite, setIsFavorite] = useState(false);

  // Check if current project is a favorite when modal opens
  useEffect(() => {
    if (isOpen && filePath) {
      window.electronAPI.isFavoriteProject(filePath).then(setIsFavorite);
    }
  }, [isOpen, filePath]);

  const handleToggleFavorite = async () => {
    if (!filePath) {
      showToast('Save project first to add to favorites');
      return;
    }

    if (isFavorite) {
      await window.electronAPI.removeFavoriteProject(filePath);
      setIsFavorite(false);
      showToast('Removed from favorites');
    } else {
      await window.electronAPI.addFavoriteProject(filePath);
      setIsFavorite(true);
      showToast('Added to favorites');
    }
  };

  const gridOptions = units === 'metric' ? METRIC_GRID_OPTIONS : IMPERIAL_GRID_OPTIONS;

  // Find the closest matching grid size option for the current value
  const findClosestGridValue = (currentValue: number, options: typeof gridOptions) => {
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

  // Handle units change - convert grid size to closest equivalent
  const handleUnitsChange = (newUnits: 'imperial' | 'metric') => {
    const newOptions = newUnits === 'metric' ? METRIC_GRID_OPTIONS : IMPERIAL_GRID_OPTIONS;
    const newGridSize = findClosestGridValue(gridSize, newOptions);
    setProjectUnits(newUnits);
    setProjectGridSize(newGridSize);
  };

  // Get the display value - find closest match in current options
  const displayValue = findClosestGridValue(gridSize, gridOptions);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[450px]" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{isEditingTemplate ? 'Template Settings' : 'Project Settings'}</DialogTitle>
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
          <div className="mb-6 last:mb-0">
            <h3 className="text-sm font-semibold m-0 mb-3 text-text flex items-center gap-1.5">
              {isEditingTemplate ? 'Template Name' : 'Project Name'}
            </h3>
            <div className="settings-row flex items-center justify-between gap-4 mb-3">
              <input
                type="text"
                value={projectName ?? ''}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder={isEditingTemplate ? 'Template name' : 'Project name'}
                className="flex-1 bg-bg border border-border text-text py-2 px-3 rounded text-sm font-medium outline-none focus:border-accent"
              />
            </div>
            {!isEditingTemplate && (
              <>
                <div className="settings-row flex items-center justify-between gap-4 mb-3 mt-3">
                  <div className="inline-flex items-center gap-1">
                    <label className="text-[13px] text-text">Favorite</label>
                    {!filePath && (
                      <HelpTooltip text="Save this project to add it to favorites." docsSection="project-settings" />
                    )}
                  </div>
                  <button
                    className={`flex items-center gap-2 py-2 px-4 bg-bg border rounded-md text-[13px] cursor-pointer transition-all duration-150 ${isFavorite ? 'border-warning text-warning bg-[rgba(255,193,7,0.1)]' : 'border-border text-text-muted hover:border-warning hover:text-text'} disabled:opacity-50 disabled:cursor-not-allowed`}
                    onClick={handleToggleFavorite}
                    title={
                      filePath ? (isFavorite ? 'Remove from favorites' : 'Add to favorites') : 'Save project first'
                    }
                    disabled={!filePath}
                  >
                    <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} />
                    {isFavorite ? 'Favorited' : 'Add to favorites'}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="mb-6 last:mb-0">
            <h3 className="text-sm font-semibold m-0 mb-3 text-text flex items-center gap-1.5">
              {isEditingTemplate ? 'Template Description' : 'Project Notes'}
              <HelpTooltip
                text={
                  isEditingTemplate
                    ? 'This description will be shown when browsing templates.'
                    : 'These settings are saved with this project file and will be used when the project is opened on any computer.'
                }
                docsSection={isEditingTemplate ? 'templates' : 'project-settings'}
                inline
              />
            </h3>
            <textarea
              className="w-full min-h-[80px] bg-bg border border-border text-text p-2 rounded text-[13px] font-[inherit] resize-y leading-snug outline-none focus:border-accent placeholder:text-text-muted"
              value={projectNotes ?? ''}
              onChange={(e) => setProjectNotes(e.target.value)}
              placeholder={
                isEditingTemplate
                  ? 'Brief description of this template'
                  : 'Add notes about this project (client info, special instructions, etc.)'
              }
              rows={4}
            />
          </div>

          <div className="mb-6 last:mb-0">
            <h3 className="text-sm font-semibold m-0 mb-3 text-text flex items-center gap-1.5">Units & Grid</h3>
            <div className="settings-row flex items-center justify-between gap-4 mb-3">
              <label className="text-[13px] text-text">Units</label>
              <Select
                variant="sm"
                value={units}
                onChange={(e) => handleUnitsChange(e.target.value as 'imperial' | 'metric')}
              >
                <option value="imperial">Imperial (inches)</option>
                <option value="metric">Metric (mm)</option>
              </Select>
            </div>
            <div className="settings-row flex items-center justify-between gap-4 mb-3">
              <div className="inline-flex items-center gap-1">
                <label className="text-[13px] text-text">Grid Snap Size</label>
                <HelpTooltip
                  text="Grid snap determines how parts align when moved or resized."
                  docsSection="project-settings"
                />
              </div>
              <Select
                variant="sm"
                value={displayValue}
                onChange={(e) => setProjectGridSize(parseFloat(e.target.value))}
              >
                {gridOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mb-6 last:mb-0">
            <h3 className="text-sm font-semibold m-0 mb-3 text-text flex items-center gap-1.5">Cut List Settings</h3>
            <div className="settings-row flex items-center justify-between gap-4 mb-3">
              <div className="inline-flex items-center gap-1">
                <label className="text-[13px] text-text">Blade Kerf</label>
                <HelpTooltip
                  text='Width of your saw blade cut. Common values: 1/8" (table saw), 1/16" (track saw).'
                  docsSection="project-settings"
                />
              </div>
              <FractionInput value={kerfWidth} onChange={(val) => setKerfWidth(Math.max(0, val))} min={0} />
            </div>
            <div className="settings-row flex items-center justify-between gap-4 mb-3">
              <div className="inline-flex items-center gap-1">
                <label className="text-[13px] text-text">Material Overage</label>
                <HelpTooltip
                  text="Extra boards to buy beyond what's calculated, to account for mistakes. 10-15% is typical, max 50%."
                  docsSection="project-settings"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  className="bg-bg border border-border text-text w-[88px] py-2 px-2.5 text-sm rounded-[var(--radius-sm)] focus:outline-none focus:border-accent"
                  type="number"
                  value={Math.round(overageFactor * 100)}
                  onChange={(e) => setOverageFactor(Math.max(0, Math.min(50, parseInt(e.target.value) || 0)) / 100)}
                  min={0}
                  max={50}
                  step={5}
                />
                <span className="text-text-muted text-sm">%</span>
              </div>
            </div>
          </div>

          <div className="mb-6 last:mb-0">
            <h3 className="text-sm font-semibold m-0 mb-3 text-text flex items-center gap-1.5">
              Stock Constraints
              <HelpTooltip
                text="Control how parts relate to their assigned stock material."
                docsSection="project-settings"
                inline
              />
            </h3>
            <div className="settings-row flex items-center justify-between gap-4 mb-3">
              <div className="inline-flex items-center gap-1">
                <label className="text-[13px] text-text">Constrain Dimensions</label>
                <HelpTooltip
                  text="Show warning when part dimensions (including joinery adjustments) exceed stock dimensions."
                  docsSection="project-settings"
                />
              </div>
              <Checkbox
                checked={stockConstraints.constrainDimensions}
                onChange={(e) => setStockConstraints({ ...stockConstraints, constrainDimensions: e.target.checked })}
              />
            </div>
            <div className="settings-row flex items-center justify-between gap-4 mb-3">
              <div className="inline-flex items-center gap-1">
                <label className="text-[13px] text-text">Constrain Grain</label>
                <HelpTooltip
                  text="Show warning when part grain direction doesn't match stock grain direction."
                  docsSection="project-settings"
                />
              </div>
              <Checkbox
                checked={stockConstraints.constrainGrain}
                onChange={(e) => setStockConstraints({ ...stockConstraints, constrainGrain: e.target.checked })}
              />
            </div>
            <div className="settings-row flex items-center justify-between gap-4 mb-3">
              <div className="inline-flex items-center gap-1">
                <label className="text-[13px] text-text">Sync Part Color</label>
                <HelpTooltip
                  text="Automatically update part color when stock is assigned."
                  docsSection="project-settings"
                />
              </div>
              <Checkbox
                checked={stockConstraints.constrainColor}
                onChange={(e) => setStockConstraints({ ...stockConstraints, constrainColor: e.target.checked })}
              />
            </div>
            <div className="settings-row flex items-center justify-between gap-4 mb-3">
              <div className="inline-flex items-center gap-1">
                <label className="text-[13px] text-text">Prevent Overlap</label>
                <HelpTooltip text="Prevent parts from occupying the same space." docsSection="project-settings" />
              </div>
              <Checkbox
                checked={stockConstraints.preventOverlap}
                onChange={(e) => setStockConstraints({ ...stockConstraints, preventOverlap: e.target.checked })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button size="sm" variant="secondary" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
