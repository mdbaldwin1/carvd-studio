import { Button } from '@renderer/components/ui/button';
import { Checkbox } from '@renderer/components/ui/checkbox';
import { CustomShoppingItem } from '../../types';

interface CustomShoppingListItemProps {
  item: CustomShoppingItem;
  checked: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CustomShoppingListItem({ item, checked, onToggle, onEdit, onDelete }: CustomShoppingListItemProps) {
  const lineTotal = item.quantity * item.unitPrice;

  return (
    <div
      className={`group flex items-start gap-3 py-3 px-4 bg-surface border border-border rounded transition-colors duration-150 ${checked ? 'opacity-50 bg-bg-alt' : ''}`}
    >
      <label className="flex items-center pt-0.5 shrink-0 cursor-pointer">
        <Checkbox checked={checked} onChange={onToggle} />
      </label>

      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-medium text-text mb-0.5 ${checked ? 'line-through' : ''}`}>{item.name}</div>
        {item.description && <div className="text-[11px] text-text-muted mt-0.5 italic">{item.description}</div>}
        {item.category && (
          <div className="inline-block text-[10px] bg-bg py-0.5 px-1.5 rounded text-text-muted mt-0.5">
            {item.category}
          </div>
        )}
        <div className="text-[12px] text-text-secondary">Qty: {item.quantity}</div>
      </div>

      <div className="text-right shrink-0">
        <div className="text-[11px] text-text-muted mb-0.5">${item.unitPrice.toFixed(2)}/ea</div>
        <div data-testid={`custom-item-total-${item.id}`} className="line-total text-[13px] font-semibold text-text">
          ${lineTotal.toFixed(2)}
        </div>
      </div>

      <div className="flex gap-1 shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <Button variant="ghost" size="xs" onClick={onEdit} title="Edit">
          ✎
        </Button>
        <Button variant="destructiveGhost" size="xs" onClick={onDelete} title="Delete">
          ×
        </Button>
      </div>
    </div>
  );
}
