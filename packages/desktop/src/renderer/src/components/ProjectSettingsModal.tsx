import { useEffect } from 'react';
import { useBackdropClose } from '../hooks/useBackdropClose';
import { useProjectStore } from '../store/projectStore';
import { mmToInches } from '../utils/fractions';
import { FractionInput } from './FractionInput';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export function ProjectSettingsModal({ isOpen, onClose }: ProjectSettingsModalProps) {
  const { handleMouseDown, handleClick } = useBackdropClose(onClose);

  const projectName = useProjectStore((s) => s.projectName);
  const units = useProjectStore((s) => s.units);
  const gridSize = useProjectStore((s) => s.gridSize);
  const kerfWidth = useProjectStore((s) => s.kerfWidth);
  const overageFactor = useProjectStore((s) => s.overageFactor);
  const projectNotes = useProjectStore((s) => s.projectNotes);
  const stockConstraints = useProjectStore((s) => s.stockConstraints);
  const setProjectUnits = useProjectStore((s) => s.setProjectUnits);
  const setProjectGridSize = useProjectStore((s) => s.setProjectGridSize);
  const setKerfWidth = useProjectStore((s) => s.setKerfWidth);
  const setOverageFactor = useProjectStore((s) => s.setOverageFactor);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const setProjectNotes = useProjectStore((s) => s.setProjectNotes);
  const setStockConstraints = useProjectStore((s) => s.setStockConstraints);

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

  // Get the display value - find closest match in current options
  const displayValue = findClosestGridValue(gridSize, gridOptions);

  return (
    <div className="modal-backdrop" onMouseDown={handleMouseDown} onClick={handleClick}>
      <div className="modal project-settings-modal">
        <div className="modal-header">
          <h2>Project Settings</h2>
          <button className="btn btn-icon-sm btn-ghost btn-secondary" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3>Project Name</h3>
            <div className="settings-row">
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project name"
                className="project-name-input"
              />
            </div>
            <p className="settings-hint">
              These settings are saved with this project file and will be used when the project is opened on any
              computer.
            </p>
          </div>

          <div className="settings-section">
            <h3>Units & Grid</h3>
            <div className="settings-row">
              <label>Units</label>
              <select value={units} onChange={(e) => handleUnitsChange(e.target.value as 'imperial' | 'metric')}>
                <option value="imperial">Imperial (inches)</option>
                <option value="metric">Metric (mm)</option>
              </select>
            </div>
            <div className="settings-row">
              <label>Grid Snap Size</label>
              <select value={displayValue} onChange={(e) => setProjectGridSize(parseFloat(e.target.value))}>
                {gridOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="settings-hint">Grid snap determines how parts align when moved or resized.</p>
          </div>

          <div className="settings-section">
            <h3>Cut List Settings</h3>
            <div className="settings-row">
              <label>Blade Kerf</label>
              <FractionInput
                value={kerfWidth}
                onChange={(val) => setKerfWidth(Math.max(0, val))}
                min={0}
              />
            </div>
            <p className="settings-hint">
              Width of your saw blade cut. Common values: 1/8" (table saw), 1/16" (track saw).
            </p>
            <div className="settings-row">
              <label>Material Overage</label>
              <div className="input-with-suffix">
                <input
                  type="number"
                  value={Math.round(overageFactor * 100)}
                  onChange={(e) => setOverageFactor(Math.max(0, Math.min(50, parseInt(e.target.value) || 0)) / 100)}
                  min={0}
                  max={50}
                  step={5}
                />
                <span className="input-suffix">%</span>
              </div>
            </div>
            <p className="settings-hint">
              Extra boards to buy beyond what's calculated, to account for mistakes. 10-15% is typical, max 50%.
            </p>
          </div>

          <div className="settings-section">
            <h3>Project Notes</h3>
            <textarea
              className="project-notes-textarea"
              value={projectNotes}
              onChange={(e) => setProjectNotes(e.target.value)}
              placeholder="Add notes about this project (client info, special instructions, etc.)"
              rows={4}
            />
          </div>

          <div className="settings-section">
            <h3>Stock Constraints</h3>
            <p className="settings-hint">
              Control how parts relate to their assigned stock material.
            </p>
            <div className="settings-row">
              <label>Constrain Dimensions</label>
              <input
                type="checkbox"
                checked={stockConstraints.constrainDimensions}
                onChange={(e) => setStockConstraints({ ...stockConstraints, constrainDimensions: e.target.checked })}
              />
            </div>
            <p className="settings-hint">
              Show warning when part dimensions (including joinery adjustments) exceed stock dimensions.
            </p>
            <div className="settings-row">
              <label>Constrain Grain</label>
              <input
                type="checkbox"
                checked={stockConstraints.constrainGrain}
                onChange={(e) => setStockConstraints({ ...stockConstraints, constrainGrain: e.target.checked })}
              />
            </div>
            <p className="settings-hint">
              Show warning when part grain direction doesn't match stock grain direction.
            </p>
            <div className="settings-row">
              <label>Sync Part Color</label>
              <input
                type="checkbox"
                checked={stockConstraints.constrainColor}
                onChange={(e) => setStockConstraints({ ...stockConstraints, constrainColor: e.target.checked })}
              />
            </div>
            <p className="settings-hint">
              Automatically update part color when stock is assigned.
            </p>
            <div className="settings-row">
              <label>Prevent Overlap</label>
              <input
                type="checkbox"
                checked={stockConstraints.preventOverlap}
                onChange={(e) => setStockConstraints({ ...stockConstraints, preventOverlap: e.target.checked })}
              />
            </div>
            <p className="settings-hint">
              Prevent parts from occupying the same space.
            </p>
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
