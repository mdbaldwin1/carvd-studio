import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Stock } from '../../types';
import { FractionInput } from '../common/FractionInput';
import { ColorPicker } from '../common/ColorPicker';
import { Modal } from '../common/Modal';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Select } from '@renderer/components/ui/select';
import { STOCK_COLORS } from '../../constants';

interface EditStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: Stock | null;
  onUpdateStock: (id: string, updates: Partial<Stock>) => void;
  createMode?: boolean;
  defaultDimensions?: { length?: number; width?: number; thickness?: number };
}

const defaultFormData: Omit<Stock, 'id'> = {
  name: 'New Stock',
  length: 96,
  width: 48,
  thickness: 0.75,
  grainDirection: 'length',
  pricingUnit: 'per_item',
  pricePerUnit: 50,
  color: STOCK_COLORS[0]
};

export function EditStockModal({
  isOpen,
  onClose,
  stock,
  onUpdateStock,
  createMode = false,
  defaultDimensions
}: EditStockModalProps) {
  const [formData, setFormData] = useState<Omit<Stock, 'id'>>(defaultFormData);

  // Update form when stock changes or when opening in create mode
  useEffect(() => {
    if (stock) {
      setFormData({
        name: stock.name,
        length: stock.length,
        width: stock.width,
        thickness: stock.thickness,
        grainDirection: stock.grainDirection,
        pricingUnit: stock.pricingUnit,
        pricePerUnit: stock.pricePerUnit,
        color: stock.color
      });
    } else if (createMode && isOpen) {
      // Reset to defaults for create mode, using provided dimensions if available
      setFormData({
        ...defaultFormData,
        length: defaultDimensions?.length ?? defaultFormData.length,
        width: defaultDimensions?.width ?? defaultFormData.width,
        thickness: defaultDimensions?.thickness ?? defaultFormData.thickness,
        color: STOCK_COLORS[Math.floor(Math.random() * STOCK_COLORS.length)]
      });
    }
  }, [stock, createMode, isOpen, defaultDimensions]);

  const handleSubmit = useCallback(() => {
    if (createMode) {
      // Create new stock
      const newId = uuidv4();
      onUpdateStock(newId, formData);
      onClose();
    } else if (stock) {
      onUpdateStock(stock.id, formData);
      onClose();
    }
  }, [stock, formData, onUpdateStock, onClose, createMode]);

  if (!stock && !createMode) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={createMode ? 'Create New Stock' : 'Edit Stock'}
      className="w-[450px]"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit}>
            {createMode ? 'Create Stock' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <div className="p-5 overflow-y-auto">
        <div className="flex flex-col mb-4 gap-2.5">
          <Label>Name</Label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="flex flex-col mb-4 gap-2.5">
          <Label>Dimensions (L × W × T)</Label>
          <div className="flex items-center gap-1">
            <FractionInput
              value={formData.length}
              onChange={(length) => setFormData({ ...formData, length })}
              min={1}
            />
            <span>×</span>
            <FractionInput value={formData.width} onChange={(width) => setFormData({ ...formData, width })} min={1} />
            <span>×</span>
            <FractionInput
              value={formData.thickness}
              onChange={(thickness) => setFormData({ ...formData, thickness })}
              min={0.25}
            />
          </div>
        </div>

        <div className="flex flex-col mb-4 gap-2.5">
          <Label>Grain Direction</Label>
          <Select
            value={formData.grainDirection}
            onChange={(e) =>
              setFormData({
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
                setFormData({
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
              onChange={(e) => setFormData({ ...formData, pricePerUnit: parseFloat(e.target.value) || 0 })}
              min={0}
              step={0.01}
            />
          </div>
        </div>

        <div className="flex flex-col mb-4 gap-2.5">
          <Label>Display Color</Label>
          <ColorPicker value={formData.color} onChange={(color) => setFormData({ ...formData, color })} />
        </div>
      </div>
    </Modal>
  );
}
