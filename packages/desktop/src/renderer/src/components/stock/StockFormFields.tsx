import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Select } from '@renderer/components/ui/select';
import { Stock } from '../../types';
import { ColorPicker } from '../common/ColorPicker';
import { FractionInput } from '../common/FractionInput';

type StockFormData = Omit<Stock, 'id'>;

interface StockFormFieldsProps {
  formData: StockFormData;
  onChange: (next: StockFormData) => void;
}

export function StockFormFields({ formData, onChange }: StockFormFieldsProps) {
  return (
    <>
      <div className="flex flex-col mb-4 gap-2.5">
        <Label>Name</Label>
        <Input type="text" value={formData.name} onChange={(e) => onChange({ ...formData, name: e.target.value })} />
      </div>

      <div className="flex flex-col mb-4 gap-2.5">
        <Label>Dimensions (L × W × T)</Label>
        <div className="flex items-center gap-1">
          <FractionInput value={formData.length} onChange={(length) => onChange({ ...formData, length })} min={1} />
          <span>×</span>
          <FractionInput value={formData.width} onChange={(width) => onChange({ ...formData, width })} min={1} />
          <span>×</span>
          <FractionInput
            value={formData.thickness}
            onChange={(thickness) => onChange({ ...formData, thickness })}
            min={0.25}
          />
        </div>
      </div>

      <div className="flex flex-col mb-4 gap-2.5">
        <Label>Grain Direction</Label>
        <Select
          value={formData.grainDirection}
          onChange={(e) =>
            onChange({
              ...formData,
              grainDirection: e.target.value as 'length' | 'width' | 'none'
            })
          }
        >
          <option value="length">Along Length</option>
          <option value="width">Along Width</option>
          <option value="none">No Grain (MDF, etc.)</option>
        </Select>
      </div>

      <div className="flex gap-4">
        <div className="flex flex-col mb-4 gap-2.5 flex-1">
          <Label>Pricing Unit</Label>
          <Select
            value={formData.pricingUnit}
            onChange={(e) =>
              onChange({
                ...formData,
                pricingUnit: e.target.value as 'board_foot' | 'per_item'
              })
            }
          >
            <option value="per_item">Per Sheet/Board</option>
            <option value="board_foot">Per Board Foot</option>
          </Select>
        </div>

        <div className="flex flex-col mb-4 gap-2.5 flex-1">
          <Label>Price ($)</Label>
          <Input
            type="number"
            value={formData.pricePerUnit}
            onChange={(e) => onChange({ ...formData, pricePerUnit: parseFloat(e.target.value) || 0 })}
            min={0}
            step={0.01}
          />
        </div>
      </div>

      <div className="flex flex-col mb-4 gap-2.5">
        <Label>Display Color</Label>
        <ColorPicker value={formData.color} onChange={(color) => onChange({ ...formData, color })} />
      </div>
    </>
  );
}
