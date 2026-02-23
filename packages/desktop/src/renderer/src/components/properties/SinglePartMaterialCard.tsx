import { ColorPicker } from '@renderer/components/common/ColorPicker';
import { HelpTooltip } from '@renderer/components/common/HelpTooltip';
import { Label } from '@renderer/components/ui/label';
import { Select } from '@renderer/components/ui/select';
import { Part, Stock } from '@renderer/types';
import { formatMeasurementWithUnit } from '@renderer/utils/fractions';

interface SinglePartMaterialCardProps {
  selectedPart: Part;
  stocks: Stock[];
  units: 'imperial' | 'metric';
  warnings: string[];
  isColorConstrained: boolean;
  isGrainConstrained: boolean;
  assignedStock: Stock | null;
  onStockChange: (stockId: string | null) => void;
  onOpenCreateStock: () => void;
  onColorChange: (color: string) => void;
  onGrainChange: (value: string) => void;
}

export function SinglePartMaterialCard({
  selectedPart,
  stocks,
  units,
  warnings,
  isColorConstrained,
  isGrainConstrained,
  assignedStock,
  onStockChange,
  onOpenCreateStock,
  onColorChange,
  onGrainChange
}: SinglePartMaterialCardProps) {
  return (
    <div className="properties-card">
      <div className="property-group">
        <div className="flex items-center gap-1">
          <Label className="m-0">Stock</Label>
          <HelpTooltip
            text="Assign a stock material to this part. Color and grain direction are inherited from the assigned stock."
            docsSection="stock"
          />
        </div>
        <Select
          value={selectedPart.stockId || ''}
          onChange={(e) => {
            const value = e.target.value;
            if (value === '___create___') {
              onOpenCreateStock();
              return;
            }
            onStockChange(value || null);
          }}
        >
          <option value="">No stock assigned</option>
          {stocks.map((stock) => (
            <option key={stock.id} value={stock.id}>
              {stock.name} ({formatMeasurementWithUnit(stock.thickness, units)})
            </option>
          ))}
          <option value="___create___">+ Add New Stock...</option>
        </Select>
        {warnings.length > 0 && (
          <div className="mt-2 mb-2 p-2 bg-warning-bg border border-warning rounded">
            {warnings.map((warning, index) => (
              <p key={index} className="text-[11px] text-warning m-0 py-0.5 leading-snug before:content-['⚠\_']">
                {warning}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="property-group">
        <div className="flex items-center gap-1">
          <Label className="m-0">Color</Label>
          {isColorConstrained && (
            <HelpTooltip
              text={`Color is locked to the assigned stock (${assignedStock?.name}). Disable "Constrain Color" in Project Settings to customize.`}
              docsSection="project-settings"
            />
          )}
        </div>
        {isColorConstrained ? (
          <input type="color" value={selectedPart.color} disabled />
        ) : (
          <ColorPicker value={selectedPart.color} onChange={onColorChange} />
        )}
      </div>

      <div className="property-group">
        <div className="flex items-center gap-1">
          <Label className="m-0">Grain Direction</Label>
          <HelpTooltip
            text={
              isGrainConstrained
                ? `Locked by stock grain constraint (${assignedStock?.name}). Disable "Constrain Grain" in Project Settings to customize.`
                : 'Controls whether the part can be rotated during cut list optimization to maximize material usage.'
            }
            docsSection={isGrainConstrained ? 'project-settings' : 'cut-lists'}
          />
        </div>
        <Select
          value={selectedPart.grainSensitive ? selectedPart.grainDirection : 'none'}
          onChange={(e) => onGrainChange(e.target.value)}
          disabled={isGrainConstrained}
        >
          <option value="length">Along Length ({formatMeasurementWithUnit(selectedPart.length, units)})</option>
          <option value="width">Along Width ({formatMeasurementWithUnit(selectedPart.width, units)})</option>
          <option value="none">N/A (can rotate)</option>
        </Select>
      </div>
    </div>
  );
}
