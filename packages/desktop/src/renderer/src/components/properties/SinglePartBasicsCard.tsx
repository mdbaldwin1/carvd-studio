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
  onPositionZChange
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
    </div>
  );
}
