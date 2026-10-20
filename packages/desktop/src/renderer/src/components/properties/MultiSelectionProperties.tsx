import { formatStockMeasurement } from '@renderer/utils/stockMeasurements';
import { InsertSocketDialog } from './InsertSocketDialog';
import { isJoineryInsert } from '@renderer/utils/insertSocket';
import { JointLayoutDialog } from './JointLayoutDialog';
import { useState } from 'react';
import { AssemblyPlacementDialog } from './AssemblyPlacementDialog';
import { EditStockModal } from '@renderer/components/stock/EditStockModal';
import { Button } from '@renderer/components/ui/button';
import { Label } from '@renderer/components/ui/label';
import { Select } from '@renderer/components/ui/select';
import { Part, Stock } from '@renderer/types';
import { useProjectStore } from '@renderer/store/projectStore';
import { useUIStore } from '@renderer/store/uiStore';
import { resolveTenonAndMortiseParts } from '@renderer/utils/fitJoinery';
import { planHousingFit, resolveHousingRoles } from '@renderer/utils/fitHousing';
import { getSavedJointLayout } from '@renderer/utils/jointLayout';

const housingLabels: Record<string, string> = {
  dado: 'Dado',
  stopped_dado: 'Stopped Dado',
  groove: 'Groove',
  stopped_groove: 'Stopped Groove',
  half_lap: 'Half Lap'
};

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
  const [assemblyOpen, setAssemblyOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [socketOpen, setSocketOpen] = useState(false);
  const fitTenonsToMortise = useProjectStore((state) => state.fitTenonsToMortise);
  const fitHousingToPart = useProjectStore((state) => state.fitHousingToPart);
  const showToast = useUIStore((state) => state.showToast);
  const selectedParts = parts.filter((p) => selectedPartIds.includes(p.id));
  const canFitPair = selectedParts.length === 2 && selectedGroupIds.length === 0;
  const inserts = selectedParts.filter((part) => isJoineryInsert(part, stocks));
  const insert = canFitPair && inserts.length === 1 ? inserts[0] : null;
  const receivingBoard = insert ? selectedParts.find((part) => part.id !== insert.id)! : null;
  const sharedLayout = canFitPair && getSavedJointLayout(selectedParts[0], selectedParts[1].id);
  const hasSharedLayout =
    sharedLayout && getSavedJointLayout(selectedParts[1], selectedParts[0].id)?.key === sharedLayout.key;
  const tenonPair =
    canFitPair && !hasSharedLayout ? resolveTenonAndMortiseParts(selectedParts[0], selectedParts[1]) : null;
  const housingPair = canFitPair ? resolveHousingRoles(selectedParts[0], selectedParts[1], stocks) : null;
  const housingPlan = housingPair ? planHousingFit(housingPair.shelfPart, housingPair.housingPart, stocks) : null;
  const stockIds = selectedParts.map((p) => p.stockId);
  const allSameStock = stockIds.every((id) => id === stockIds[0]);
  const commonStockId = allSameStock ? stockIds[0] : null;

  if (selectedPartIds.length === 0) {
    return (
      <aside className="properties-panel">
        <h2>Properties</h2>
        <div className="properties-card">
          <p className="text-sm mb-3 text-text">
            {selectedPartIds.length} parts, {selectedGroupIds.length} group
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
      {canFitPair && (
        <div className="properties-card">
          <Button variant="secondary" onClick={() => setAssemblyOpen(true)}>
            Bring pieces together…
          </Button>
        </div>
      )}
      {canFitPair && !insert && (
        <div className="properties-card">
          <Button variant="secondary" onClick={() => setLayoutOpen(true)}>
            Lay out matching cuts…
          </Button>
        </div>
      )}
      {insert && receivingBoard && (
        <div className="properties-card">
          <Button variant="secondary" onClick={() => setSocketOpen(true)}>
            Cut socket for insert…
          </Button>
        </div>
      )}
      {socketOpen && insert && receivingBoard && (
        <InsertSocketDialog
          board={receivingBoard}
          insert={insert}
          stocks={stocks}
          onClose={() => setSocketOpen(false)}
        />
      )}
      {layoutOpen && canFitPair && (
        <JointLayoutDialog parts={[selectedParts[0], selectedParts[1]]} onClose={() => setLayoutOpen(false)} />
      )}
      {assemblyOpen && canFitPair && (
        <AssemblyPlacementDialog parts={[selectedParts[0], selectedParts[1]]} onClose={() => setAssemblyOpen(false)} />
      )}
      {(tenonPair || housingPlan) && (
        <div className="properties-card">
          <h3 className="mb-2 text-sm font-semibold">Fit the joint</h3>
          {tenonPair && (
            <div className="property-group">
              <p className="mb-2 text-xs text-text-muted">
                Size the tenon on {tenonPair.tenonPart.name} to the mortise in {tenonPair.mortisePart.name}.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => {
                  const fitted = fitTenonsToMortise(tenonPair.tenonPart.id, tenonPair.mortisePart.id);
                  if (fitted > 0)
                    showToast(`Fitted ${fitted} tenon${fitted === 1 ? '' : 's'} to the mortise`, 'success');
                }}
              >
                Fit Tenon to Mortise
              </Button>
            </div>
          )}
          {housingPlan && housingPair && (
            <div className="property-group">
              <p className="mb-2 text-xs text-text-muted">
                Cut {housingPair.housingPart.name} to the actual {housingPlan.usesTongue ? 'tongue ' : ''}thickness of{' '}
                {housingPair.shelfPart.name}.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => {
                  if (fitHousingToPart(housingPair.shelfPart.id, housingPair.housingPart.id))
                    showToast('Cut the housing to fit', 'success');
                }}
              >
                Fit {housingLabels[housingPlan.cutType] ?? 'Housing'} to Mating Part
              </Button>
            </div>
          )}
          <p className="text-[11px] text-text-muted">Then move the pieces together to check the fit.</p>
        </div>
      )}
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
                {stock.name} ({formatStockMeasurement(stock.thickness, stock, units)})
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
