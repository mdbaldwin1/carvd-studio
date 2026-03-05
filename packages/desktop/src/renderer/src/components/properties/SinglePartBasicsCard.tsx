import { FractionInput } from '@renderer/components/common/FractionInput';
import { HelpTooltip } from '@renderer/components/common/HelpTooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@renderer/components/ui/accordion';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Part, Stock } from '@renderer/types';
import { formatMeasurementWithUnit } from '@renderer/utils/fractions';

interface SinglePartBasicsCardProps {
  selectedPart: Part;
  units: 'imperial' | 'metric';
  isDimensionConstrained: boolean;
  assignedStock: Stock | null;
  onNameChange: (name: string) => void;
  onLengthChange: (length: number) => void;
  onWidthChange: (width: number) => void;
  onThicknessChange: (thickness: number) => void;
  onPositionXChange: (x: number) => void;
  onPositionYChange: (y: number) => void;
  onPositionZChange: (z: number) => void;
  onRotationXChange: (x: number) => void;
  onRotationYChange: (y: number) => void;
  onRotationZChange: (z: number) => void;
  onResetRotation: () => void;
  snapEnabled: boolean;
  onSnapEnabledChange: (enabled: boolean) => void;
  snapIncrement: number;
  onSnapIncrementChange: (degrees: number) => void;
}

export function SinglePartBasicsCard({
  selectedPart,
  units,
  isDimensionConstrained,
  assignedStock,
  onNameChange,
  onLengthChange,
  onWidthChange,
  onThicknessChange,
  onPositionXChange,
  onPositionYChange,
  onPositionZChange,
  onRotationXChange,
  onRotationYChange,
  onRotationZChange,
  onResetRotation,
  snapEnabled,
  onSnapEnabledChange,
  snapIncrement,
  onSnapIncrementChange
}: SinglePartBasicsCardProps) {
  return (
    <div className="properties-card">
      <div className="property-group">
        <Label>Name</Label>
        <Input type="text" value={selectedPart.name} onChange={(e) => onNameChange(e.target.value)} />
      </div>

      <div className="property-group">
        <label>Dimensions (L × W × T)</label>
        <div className="dimension-inputs flex items-center gap-1">
          <FractionInput
            key={`${selectedPart.id}-length`}
            value={selectedPart.length}
            onChange={onLengthChange}
            min={0.5}
          />
          <span>×</span>
          <FractionInput
            key={`${selectedPart.id}-width`}
            value={selectedPart.width}
            onChange={onWidthChange}
            min={0.5}
          />
          <span>×</span>
          <FractionInput
            key={`${selectedPart.id}-thickness`}
            value={selectedPart.thickness}
            onChange={onThicknessChange}
            min={0.25}
          />
        </div>
        {isDimensionConstrained && assignedStock && (
          <p className="text-[11px] text-text-muted mt-1">
            Max: {formatMeasurementWithUnit(assignedStock.length, units)} ×{' '}
            {formatMeasurementWithUnit(assignedStock.width, units)} ×{' '}
            {formatMeasurementWithUnit(assignedStock.thickness, units)} (from {assignedStock.name})
          </p>
        )}
      </div>

      <Accordion type="single" collapsible className="property-group">
        <AccordionItem value="position" className="mt-0 rounded-[var(--radius-sm)] border border-border">
          <div className="flex items-center">
            <AccordionTrigger>Position (X, Y, Z)</AccordionTrigger>
            <HelpTooltip
              text="Use arrow keys to nudge selected parts. Hold Shift for 1 inch increments."
              docsSection="shortcuts"
              inline
            />
          </div>
          <AccordionContent className="px-[14px] pb-[14px]">
            <div className="flex items-center gap-1">
              <FractionInput
                key={`${selectedPart.id}-posX`}
                value={selectedPart.position.x}
                onChange={onPositionXChange}
              />
              <span>,</span>
              <FractionInput
                key={`${selectedPart.id}-posY`}
                value={selectedPart.position.y}
                onChange={onPositionYChange}
              />
              <span>,</span>
              <FractionInput
                key={`${selectedPart.id}-posZ`}
                value={selectedPart.position.z}
                onChange={onPositionZChange}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Accordion type="single" collapsible className="property-group">
        <AccordionItem value="rotation" className="mt-0 rounded-[var(--radius-sm)] border border-border">
          <div className="flex items-center">
            <AccordionTrigger>Rotation (X, Y, Z)</AccordionTrigger>
            <HelpTooltip
              text="Quick rotate with X/Y/Z keys (90°). Use these inputs for precise angles."
              docsSection="shortcuts"
              inline
            />
          </div>
          <AccordionContent className="px-[14px] pb-[14px] flex flex-col gap-2.5">
            <div className="flex items-center gap-1">
              <Input
                type="number"
                step={snapEnabled ? snapIncrement : 0.1}
                value={selectedPart.rotation.x}
                className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                onChange={(e) => onRotationXChange(Number(e.target.value))}
                aria-label="Rotation X"
              />
              <span>,</span>
              <Input
                type="number"
                step={snapEnabled ? snapIncrement : 0.1}
                value={selectedPart.rotation.y}
                className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                onChange={(e) => onRotationYChange(Number(e.target.value))}
                aria-label="Rotation Y"
              />
              <span>,</span>
              <Input
                type="number"
                step={snapEnabled ? snapIncrement : 0.1}
                value={selectedPart.rotation.z}
                className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                onChange={(e) => onRotationZChange(Number(e.target.value))}
                aria-label="Rotation Z"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                className="h-7 rounded-[var(--radius-sm)] border border-border px-2 text-[11px] text-text hover:bg-surface-muted"
                onClick={onResetRotation}
              >
                Reset
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 text-[11px] text-text-muted">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={snapEnabled} onChange={(e) => onSnapEnabledChange(e.target.checked)} />
                Snap angles
              </label>
              <div className="flex items-center gap-1.5">
                <span>Step</span>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  step={1}
                  value={snapIncrement}
                  className="h-7 w-16 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  onChange={(e) => onSnapIncrementChange(Number(e.target.value))}
                  disabled={!snapEnabled}
                  aria-label="Rotation snap increment"
                />
                <span>°</span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
