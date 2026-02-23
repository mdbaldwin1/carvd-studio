import { EditStockModal } from '@renderer/components/stock/EditStockModal';
import { Button } from '@renderer/components/ui/button';
import { Label } from '@renderer/components/ui/label';
import { Select } from '@renderer/components/ui/select';
import { Part, Stock } from '@renderer/types';
import { formatMeasurementWithUnit } from '@renderer/utils/fractions';

interface MultiSelectionPropertiesProps {
  selectedPartIds: string[];
  selectedGroupIds: string[];
  parts: Part[];
  stocks: Stock[];
  units: 'imperial' | 'metric';
  isCreateStockModalOpen: boolean;
  onOpenCreateStockModal: () => void;
  onCloseCreateStockModal: () => void;
  onAssignStockToSelectedParts: (stockId: string | null) => void;
  onDuplicateSelectedParts: () => void;
  onRequestDeleteParts: (partIds: string[]) => void;
  onCreateStockAndAssign: (_id: string, updates: Partial<Stock>) => void;
}

export function MultiSelectionProperties({
  selectedPartIds,
  selectedGroupIds,
  parts,
  stocks,
  units,
  isCreateStockModalOpen,
  onOpenCreateStockModal,
  onCloseCreateStockModal,
  onAssignStockToSelectedParts,
  onDuplicateSelectedParts,
  onRequestDeleteParts,
  onCreateStockAndAssign
}: MultiSelectionPropertiesProps) {
  const selectedParts = parts.filter((p) => selectedPartIds.includes(p.id));
  const stockIds = selectedParts.map((p) => p.stockId);
  const allSameStock = stockIds.every((id) => id === stockIds[0]);
  const commonStockId = allSameStock ? stockIds[0] : null;

  if (selectedPartIds.length === 0) {
    return (
      <aside className="properties-panel">
        <h2>Properties</h2>
        <div className="properties-card">
          <p className="text-sm mb-3 text-text">
            {selectedPartIds.length} part{selectedPartIds.length !== 1 ? 's' : ''}, {selectedGroupIds.length} group
            {selectedGroupIds.length !== 1 ? 's' : ''} selected
          </p>
          <p className="text-[11px] text-text-muted mt-1">
            Press G to group selection
            <br />
            Press Delete to remove all
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="properties-panel">
      <h2>Properties</h2>
      <div className="properties-card">
        <p className="text-sm mb-3 text-text">{selectedPartIds.length} parts selected</p>

        <div className="property-group">
          <Label>Assign Stock to All</Label>
          <Select
            value={allSameStock ? commonStockId || '' : ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '___create___') {
                onOpenCreateStockModal();
              } else {
                onAssignStockToSelectedParts(value || null);
              }
            }}
          >
            <option value="">{allSameStock ? 'No stock assigned' : '(Mixed)'}</option>
            {stocks.map((stock) => (
              <option key={stock.id} value={stock.id}>
                {stock.name} ({formatMeasurementWithUnit(stock.thickness, units)})
              </option>
            ))}
            <option value="___create___">+ Add New Stock...</option>
          </Select>
        </div>

        <div className="property-group flex gap-1.5">
          <Button variant="secondary" size="sm" onClick={onDuplicateSelectedParts}>
            Duplicate All
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onRequestDeleteParts(selectedPartIds)}>
            Delete All
          </Button>
        </div>
      </div>

      <EditStockModal
        isOpen={isCreateStockModalOpen}
        onClose={onCloseCreateStockModal}
        stock={null}
        onUpdateStock={onCreateStockAndAssign}
        createMode={true}
        defaultDimensions={
          selectedParts[0]
            ? {
                length: selectedParts[0].length,
                width: selectedParts[0].width,
                thickness: selectedParts[0].thickness
              }
            : undefined
        }
      />
    </aside>
  );
}
