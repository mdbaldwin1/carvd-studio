import { FractionInput } from '@renderer/components/common/FractionInput';
import { HelpTooltip } from '@renderer/components/common/HelpTooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@renderer/components/ui/accordion';
import { Checkbox } from '@renderer/components/ui/checkbox';
import { Label } from '@renderer/components/ui/label';
import { Part, Stock } from '@renderer/types';

interface SinglePartAdvancedCardProps {
  selectedPart: Part;
  assignedStock: Stock | null;
  overlappingParts: string[];
  onIgnoreOverlapChange: (checked: boolean) => void;
  onGlueUpPanelChange: (checked: boolean) => void;
  onExtraLengthChange: (value: number) => void;
  onExtraWidthChange: (value: number) => void;
}

export function SinglePartAdvancedCard({
  selectedPart,
  assignedStock,
  overlappingParts,
  onIgnoreOverlapChange,
  onGlueUpPanelChange,
  onExtraLengthChange,
  onExtraWidthChange
}: SinglePartAdvancedCardProps) {
  return (
    <Accordion type="single" collapsible className="properties-card p-0 overflow-hidden" defaultValue={undefined}>
      <AccordionItem value="advanced" className="mt-0 border-0 rounded-none">
        <AccordionTrigger>Advanced</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-3 px-[14px] pb-[14px]">
          <div className="property-group mb-0">
            {overlappingParts.length > 0 && !selectedPart.ignoreOverlap && (
              <div className="mt-2 mb-2 p-2 bg-warning-bg border border-warning rounded">
                <p className="text-[11px] text-warning m-0 py-0.5 leading-snug before:content-['⚠\_']">
                  Overlaps with: {overlappingParts.join(', ')}
                </p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Checkbox
                id="allow-overlap-checkbox"
                checked={selectedPart.ignoreOverlap || false}
                onChange={(e) => onIgnoreOverlapChange(e.target.checked)}
              />
              <Label htmlFor="allow-overlap-checkbox" className="m-0 cursor-pointer">
                Allow Overlap
              </Label>
              <HelpTooltip
                text="If checked, this part can overlap with other parts without showing warnings. Useful for intentional overlaps like notched shelves."
                docsSection="parts"
                inline
              />
            </div>
          </div>

          {assignedStock && (
            <div className="property-group mb-0">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="glue-up-panel-checkbox"
                  checked={selectedPart.glueUpPanel || false}
                  onChange={(e) => onGlueUpPanelChange(e.target.checked)}
                />
                <Label htmlFor="glue-up-panel-checkbox" className="m-0 cursor-pointer">
                  Glue-Up Panel
                </Label>
                <HelpTooltip
                  text="Wide panel made by edge-gluing multiple narrower boards. The cut list will calculate how many boards are needed."
                  docsSection="cut-lists"
                  inline
                />
              </div>
              {selectedPart.glueUpPanel && (
                <p className="text-[11px] text-text-muted mt-1">
                  Requires {Math.ceil((selectedPart.width + (selectedPart.extraWidth || 0)) / assignedStock.width)}{' '}
                  board
                  {Math.ceil((selectedPart.width + (selectedPart.extraWidth || 0)) / assignedStock.width) !== 1
                    ? 's'
                    : ''}{' '}
                  of {assignedStock.name}
                </p>
              )}
            </div>
          )}

          <div className="property-group mb-0">
            <div className="flex items-center gap-1 mb-2">
              <Label className="m-0">Joinery Adjustments</Label>
              {(selectedPart.extraLength || selectedPart.extraWidth) && (
                <span className="text-[9px] text-accent">●</span>
              )}
              <HelpTooltip
                text="Add extra material for joinery (tenons, dado insertions, etc.). These values affect the cut list dimensions but not the 3D visualization."
                docsSection="joinery"
                inline
              />
            </div>
            <div className="flex flex-col gap-[10px]">
              <div className="flex items-center gap-[10px]">
                <Label className="w-[88px] shrink-0 text-[13px] text-text-muted">Extra Length</Label>
                <FractionInput
                  key={`${selectedPart.id}-extraLength`}
                  value={selectedPart.extraLength || 0}
                  onChange={onExtraLengthChange}
                  min={0}
                />
              </div>
              <div className="flex items-center gap-[10px]">
                <Label className="w-[88px] shrink-0 text-[13px] text-text-muted">Extra Width</Label>
                <FractionInput
                  key={`${selectedPart.id}-extraWidth`}
                  value={selectedPart.extraWidth || 0}
                  onChange={onExtraWidthChange}
                  min={0}
                />
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
