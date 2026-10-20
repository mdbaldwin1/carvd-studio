import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Stock } from '../../types';
import { StockFormFields } from './StockFormFields';
import { Button } from '@renderer/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog';
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
      // Retain the stock form, insert kind, and pack information while editing.
      setFormData({ ...stock });
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

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[520px] max-w-[92vw] max-h-[86vh]" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{createMode ? 'Create New Stock' : 'Edit Stock'}</DialogTitle>
          <DialogClose onClose={onClose} />
        </DialogHeader>
        <div className="p-5 overflow-y-auto space-y-4">
          <StockFormFields formData={formData} onChange={setFormData} />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!formData.name.trim()}>
            {createMode ? 'Create Stock' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
