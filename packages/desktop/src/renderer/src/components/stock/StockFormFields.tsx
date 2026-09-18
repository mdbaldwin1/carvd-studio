import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Select } from '@renderer/components/ui/select';
import { Stock } from '../../types';
import {
  INSERT_KIND_LABELS,
  INSERT_KINDS,
  resolveStockForm,
  type InsertKind,
  type StockForm
} from '../../../../shared/stock';
import { getInsertCatalog, type InsertCatalogEntry } from '../../../../shared/insertCatalog';
import { ColorPicker } from '../common/ColorPicker';
import { FractionInput } from '../common/FractionInput';

type StockFormData = Omit<Stock, 'id'>;

interface StockFormFieldsProps {
  formData: StockFormData;
  onChange: (next: StockFormData) => void;
}

/** The catalogue's own id belongs to the catalogue, not to the user's stock. */
function stripCatalogId(entry: InsertCatalogEntry): StockFormData {
  const material = { ...entry } as Partial<InsertCatalogEntry>;
  delete material.id;
  return material as StockFormData;
}

export function StockFormFields({ formData, onChange }: StockFormFieldsProps) {
  const form = resolveStockForm(formData);
  const isRod = form === 'rod';
  const isInsert = form === 'insert';
  const insertKind: InsertKind = formData.insertKind ?? 'dowel_pin';
  const catalog = getInsertCatalog(insertKind);
  // A catalogue entry is identified by its size, not by id: the user may have
  // edited the price or colour of a seeded entry, and it is still a #20.
  // Matched within a tolerance far finer than any two sizes differ by, since
  // metric sizes converted to inches rarely land on the same bit twice.
  const sameSize = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  const catalogId = catalog.find(
    (entry) =>
      sameSize(entry.length, formData.length) &&
      sameSize(entry.width, formData.width) &&
      sameSize(entry.thickness, formData.thickness)
  )?.id;

  const chooseCatalogEntry = (id: string) => {
    const entry = catalog.find((candidate) => candidate.id === id);
    if (!entry) return;
    // Take the whole manufactured size, not just its dimensions -- a biscuit's
    // grain and its box quantity are part of what it is.
    onChange({ ...formData, ...stripCatalogId(entry) });
  };

  const chooseInsertKind = (kind: InsertKind) => {
    const first = getInsertCatalog(kind)[0];
    if (!first) {
      onChange({ ...formData, form: 'insert', insertKind: kind });
      return;
    }
    onChange({ ...formData, ...stripCatalogId(first), name: formData.name || first.name });
  };

  // Round stock is square in section, so one diameter writes both dimensions.
  const setDiameter = (diameter: number) => onChange({ ...formData, width: diameter, thickness: diameter });

  const changeForm = (next: StockForm) => {
    if (next === 'insert') {
      chooseInsertKind(formData.insertKind ?? 'dowel_pin');
      return;
    }
    if (next !== 'rod') {
      onChange({ ...formData, form: next });
      return;
    }
    // Coming from a board, the old width and thickness describe a rectangle.
    // Seed a plausible dowel instead of carrying a 6" "diameter" across.
    const diameter = formData.width === formData.thickness ? formData.width : 0.375;
    onChange({ ...formData, form: next, width: diameter, thickness: diameter, grainDirection: 'length' });
  };

  return (
    <>
      <div className="flex flex-col mb-4 gap-2.5">
        <Label>Name</Label>
        <Input type="text" value={formData.name} onChange={(e) => onChange({ ...formData, name: e.target.value })} />
      </div>

      <div className="flex flex-col mb-4 gap-2.5">
        <Label htmlFor="stock-form">Stock Type</Label>
        <Select id="stock-form" value={form} onChange={(e) => changeForm(e.target.value as StockForm)}>
          <option value="sheet">Sheet (plywood, MDF)</option>
          <option value="board">Board (dimensional lumber)</option>
          <option value="rod">Dowel (round, cut to length)</option>
          <option value="insert">Insert (biscuit, domino, dowel pin)</option>
        </Select>
      </div>

      {isInsert && (
        <div className="flex gap-4">
          <div className="flex flex-col mb-4 gap-2.5 flex-1">
            <Label htmlFor="insert-kind">Insert Type</Label>
            <Select
              id="insert-kind"
              value={insertKind}
              onChange={(e) => chooseInsertKind(e.target.value as InsertKind)}
            >
              {INSERT_KINDS.filter((kind) => getInsertCatalog(kind).length > 0).map((kind) => (
                <option key={kind} value={kind}>
                  {INSERT_KIND_LABELS[kind]}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col mb-4 gap-2.5 flex-1">
            <Label htmlFor="insert-size">Size</Label>
            <Select id="insert-size" value={catalogId ?? ''} onChange={(e) => chooseCatalogEntry(e.target.value)}>
              {catalogId === undefined && <option value="">Custom size</option>}
              {catalog.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}

      {isInsert ? (
        <div className="flex flex-col mb-4 gap-2.5">
          <Label>Size</Label>
          {/* A #20 biscuit is a #20 biscuit. Pick a different one to change it. */}
          <p className="text-[12px] text-text-muted">
            {formData.length.toFixed(3)}″ × {formData.width.toFixed(3)}″ × {formData.thickness.toFixed(3)}″ · sold{' '}
            {formData.packSize && formData.packSize > 1 ? `${formData.packSize} to the box` : 'singly'}
          </p>
        </div>
      ) : isRod ? (
        <div className="flex gap-4">
          <div className="flex flex-col mb-4 gap-2.5 flex-1">
            <Label>Diameter</Label>
            <FractionInput ariaLabel="Diameter" value={formData.width} onChange={setDiameter} min={0.0625} />
          </div>
          <div className="flex flex-col mb-4 gap-2.5 flex-1">
            <Label>Length</Label>
            <FractionInput
              ariaLabel="Length"
              value={formData.length}
              onChange={(length) => onChange({ ...formData, length })}
              min={1}
            />
          </div>
        </div>
      ) : (
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
      )}

      <div className={isRod || isInsert ? 'hidden' : 'flex flex-col mb-4 gap-2.5'}>
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
            <option value="per_item">{isInsert ? 'Per Box' : isRod ? 'Per Rod' : 'Per Sheet/Board'}</option>
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
