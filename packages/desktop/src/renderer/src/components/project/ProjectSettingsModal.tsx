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
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Input } from '@renderer/components/ui/input';
import { Select } from '@renderer/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs';
import { Textarea } from '@renderer/components/ui/textarea';
import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { getDocsUrl } from '../../utils/docsLinks';
import { mmToInches } from '../../utils/fractions';
import { FractionInput } from '../common/FractionInput';
import { HelpTooltip } from '../common/HelpTooltip';

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
      showToast('Save project first to add to favorites', 'warning');
      return;
    }

    if (isFavorite) {
      await window.electronAPI.removeFavoriteProject(filePath);
      setIsFavorite(false);
      showToast('Removed from favorites', 'success');
    } else {
      await window.electronAPI.addFavoriteProject(filePath);
      setIsFavorite(true);
      showToast('Added to favorites', 'success');
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
      <DialogContent className="w-[560px] max-w-[92vw]" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{isEditingTemplate ? 'Template Settings' : 'Project Settings'}</DialogTitle>
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="text-xs text-text-muted no-underline transition-colors duration-150 hover:text-accent hover:underline"
              onClick={(e) => {
                e.preventDefault();
                window.electronAPI.openExternal(getDocsUrl('project-settings'));
              }}
            >
              View documentation
            </a>
            {!isEditingTemplate && (
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className={`rounded-full ${filePath ? 'text-warning hover:bg-[rgba(255,193,7,0.12)] hover:text-warning' : 'text-text-muted'} ${isFavorite ? 'text-warning' : ''}`}
                onClick={handleToggleFavorite}
                title={filePath ? (isFavorite ? 'Remove from favorites' : 'Add to favorites') : 'Save project first'}
                aria-label={
                  filePath ? (isFavorite ? 'Remove from favorites' : 'Add to favorites') : 'Save project first'
                }
                disabled={!filePath}
              >
                <Star size={16} className={isFavorite ? 'fill-current' : ''} />
              </Button>
            )}
            <DialogClose onClose={onClose} />
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex flex-1 min-h-0 flex-col">
          <TabsList className="mx-5 my-2 border-b border-border">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="details" forceMount className="px-5 pt-4 pb-5 overflow-y-auto max-h-[60vh]">
            <p className="mb-4 text-xs text-text-muted">
              {isEditingTemplate
                ? 'Update template metadata shown in the template browser.'
                : 'Update project identity and working notes for this file.'}
            </p>
            <Card className="settings-section mb-6 last:mb-0">
              <CardHeader>
                <CardTitle>{isEditingTemplate ? 'Template Name' : 'Project Name'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="settings-row flex items-center justify-between gap-4 mb-3">
                  <Input
                    type="text"
                    value={projectName ?? ''}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder={isEditingTemplate ? 'Template name' : 'Project name'}
                    className="flex-1 bg-bg font-medium"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="settings-section mb-6 last:mb-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5">
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
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  className="min-h-[220px] bg-bg p-2 text-[13px] leading-snug"
                  value={projectNotes ?? ''}
                  onChange={(e) => setProjectNotes(e.target.value)}
                  placeholder={
                    isEditingTemplate
                      ? 'Brief description of this template'
                      : 'Add notes about this project (client info, special instructions, etc.)'
                  }
                  rows={8}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" forceMount className="px-5 pt-4 pb-5 overflow-y-auto max-h-[60vh]">
            <p className="mb-4 text-xs text-text-muted">
              Project-level rules for units, cut list generation, and constraints.
            </p>

            <Card className="settings-section mb-6 last:mb-0">
              <CardHeader>
                <CardTitle>Units & Grid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="settings-row flex items-center justify-between gap-4 mb-3">
                  <label className="text-[13px] text-text">Units</label>
                  <Select
                    className="w-auto"
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
                    className="w-auto"
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
              </CardContent>
            </Card>

            <Card className="settings-section mb-6 last:mb-0">
              <CardHeader>
                <CardTitle>Cut List Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="settings-row flex items-center justify-between gap-4 mb-3">
                  <div className="inline-flex items-center gap-1">
                    <label className="text-[13px] text-text">Blade Kerf</label>
                    <HelpTooltip
                      text='Width of your saw blade cut. Common values: 1/8" (table saw), 1/16" (track saw).'
                      docsSection="project-settings"
                    />
                  </div>
                  <FractionInput
                    className="w-auto"
                    value={kerfWidth}
                    onChange={(val) => setKerfWidth(Math.max(0, val))}
                    min={0}
                  />
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
                    <Input
                      className="w-[88px] bg-bg px-2.5"
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
              </CardContent>
            </Card>

            <Card className="settings-section mb-6 last:mb-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5">
                  Stock Constraints
                  <HelpTooltip
                    text="Control how parts relate to their assigned stock material."
                    docsSection="project-settings"
                    inline
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                    onChange={(e) =>
                      setStockConstraints({ ...stockConstraints, constrainDimensions: e.target.checked })
                    }
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button size="sm" variant="secondary" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
