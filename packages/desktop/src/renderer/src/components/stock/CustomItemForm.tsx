import { useState } from 'react';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { CustomShoppingItem } from '../../types';

interface CustomItemFormProps {
  initialData?: CustomShoppingItem;
  onSave: (data: Omit<CustomShoppingItem, 'id'>) => void;
  onCancel: () => void;
}

export function CustomItemForm({ initialData, onSave, onCancel }: CustomItemFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [quantity, setQuantity] = useState(initialData?.quantity || 1);
  const [unitPrice, setUnitPrice] = useState(initialData?.unitPrice || 0);
  const [category, setCategory] = useState(initialData?.category || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      quantity,
      unitPrice,
      category: category.trim() || undefined
    });
  };

  const lineTotal = quantity * unitPrice;

  return (
    <form
      aria-label="Custom shopping item form"
      className="custom-item-form flex flex-col gap-2 p-3 bg-surface border border-border rounded"
      onSubmit={handleSubmit}
    >
      <div>
        <Input
          type="text"
          className="px-2 py-1.5 text-[13px]"
          placeholder="Item name (e.g., Wood screws #8 x 1-1/4)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />
      </div>
      <div>
        <Input
          type="text"
          className="px-2 py-1.5 text-[13px]"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex gap-2 items-end">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[11px] text-text-muted font-medium">Qty</label>
          <Input
            type="number"
            className="w-20 px-2 py-1.5 text-[13px]"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
            min={1}
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[11px] text-text-muted font-medium">Unit Price</label>
          <Input
            type="number"
            className="w-20 px-2 py-1.5 text-[13px]"
            value={unitPrice}
            onChange={(e) => setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
            min={0}
            step={0.01}
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[11px] text-text-muted font-medium">Category</label>
          <Input
            type="text"
            className="w-20 px-2 py-1.5 text-[13px]"
            placeholder="e.g., Hardware"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1 min-w-[70px]">
          <label className="text-[11px] text-text-muted font-medium">Total</label>
          <span className="text-[14px] font-semibold text-text">${lineTotal.toFixed(2)}</span>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="xs" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="xs" disabled={!name.trim()}>
          {initialData ? 'Save' : 'Add'}
        </Button>
      </div>
    </form>
  );
}
