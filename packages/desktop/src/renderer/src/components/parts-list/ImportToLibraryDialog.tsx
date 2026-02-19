/**
 * Dialog for importing project stocks/assemblies to the app library
 * Shown when opening a project that contains items not in the user's library
 */

import { useState, useEffect } from 'react';
import { Stock, Assembly } from '../../types';
import { formatMeasurementWithUnit } from '../../utils/fractions';
import { useProjectStore } from '../../store/projectStore';
import { Button } from '@renderer/components/ui/button';
import { Checkbox } from '@renderer/components/ui/checkbox';

interface ImportToLibraryDialogProps {
  isOpen: boolean;
  missingStocks: Stock[];
  missingAssemblies: Assembly[];
  onImport: (selectedStocks: Stock[], selectedAssemblies: Assembly[]) => void;
  onSkip: () => void;
}

export function ImportToLibraryDialog({
  isOpen,
  missingStocks,
  missingAssemblies,
  onImport,
  onSkip
}: ImportToLibraryDialogProps) {
  const units = useProjectStore((s) => s.units);

  // Track which items are selected for import (all selected by default)
  const [selectedStockIds, setSelectedStockIds] = useState<Set<string>>(() => new Set(missingStocks.map((s) => s.id)));
  const [selectedAssemblyIds, setSelectedAssemblyIds] = useState<Set<string>>(
    () => new Set(missingAssemblies.map((a) => a.id))
  );

  // Reset selections when items change
  useEffect(() => {
    setSelectedStockIds(new Set(missingStocks.map((s) => s.id)));
    setSelectedAssemblyIds(new Set(missingAssemblies.map((a) => a.id)));
  }, [missingStocks, missingAssemblies]);

  if (!isOpen) return null;

  const totalItems = missingStocks.length + missingAssemblies.length;
  const selectedCount = selectedStockIds.size + selectedAssemblyIds.size;

  const toggleStock = (id: string) => {
    setSelectedStockIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAssembly = (id: string) => {
    setSelectedAssemblyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedStockIds(new Set(missingStocks.map((s) => s.id)));
    setSelectedAssemblyIds(new Set(missingAssemblies.map((a) => a.id)));
  };

  const selectNone = () => {
    setSelectedStockIds(new Set());
    setSelectedAssemblyIds(new Set());
  };

  const handleImport = () => {
    const selectedStocks = missingStocks.filter((s) => selectedStockIds.has(s.id));
    const selectedAssemblies = missingAssemblies.filter((a) => selectedAssemblyIds.has(a.id));
    onImport(selectedStocks, selectedAssemblies);
  };

  const hasStocks = missingStocks.length > 0;

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-[1100]">
      <div className="bg-surface border border-border rounded-lg shadow-[0_8px_32px_var(--color-overlay)] max-w-120 w-[90vw] max-h-[85vh] flex flex-col animate-modal-fade-in">
        <div className="flex justify-between items-center py-4 px-5 border-b border-border">
          <h2 className="text-base font-semibold text-text m-0">Import to Library</h2>
        </div>

        <div className="p-5 overflow-y-auto">
          <p className="mb-4 text-text-secondary leading-relaxed">
            This project contains {totalItems} item{totalItems !== 1 ? 's' : ''} not in your library. Would you like to
            add them for use in future projects?
          </p>

          <div className="flex gap-2 mb-3">
            <Button size="sm" variant="ghost" onClick={selectAll} disabled={selectedCount === totalItems}>
              Select All
            </Button>
            <Button size="sm" variant="ghost" onClick={selectNone} disabled={selectedCount === 0}>
              Select None
            </Button>
          </div>

          <div className="max-h-75 overflow-y-auto border border-border rounded-sm bg-bg-secondary">
            {/* Stock items */}
            {hasStocks && (
              <div className="p-2">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2 px-1">
                  Stocks ({missingStocks.length})
                </h3>
                {missingStocks.map((stock) => (
                  <label
                    key={stock.id}
                    className="flex items-center gap-2 p-2 rounded-sm cursor-pointer transition-colors duration-150 hover:bg-bg-hover"
                  >
                    <Checkbox
                      className="w-4 h-4 shrink-0"
                      checked={selectedStockIds.has(stock.id)}
                      onChange={() => toggleStock(stock.id)}
                    />
                    <span
                      className="w-4 h-4 rounded-sm shrink-0 border border-border"
                      style={{ backgroundColor: stock.color }}
                    />
                    <span className="flex-1 font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                      {stock.name}
                    </span>
                    <span className="text-xs text-text-tertiary shrink-0">
                      {formatMeasurementWithUnit(stock.length, units)} × {formatMeasurementWithUnit(stock.width, units)}{' '}
                      × {formatMeasurementWithUnit(stock.thickness, units)}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Assembly items */}
            {missingAssemblies.length > 0 && (
              <div className={`p-2 ${hasStocks ? 'border-t border-border' : ''}`}>
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2 px-1">
                  Assemblies ({missingAssemblies.length})
                </h3>
                {missingAssemblies.map((assembly) => (
                  <label
                    key={assembly.id}
                    className="flex items-center gap-2 p-2 rounded-sm cursor-pointer transition-colors duration-150 hover:bg-bg-hover"
                  >
                    <Checkbox
                      className="w-4 h-4 shrink-0"
                      checked={selectedAssemblyIds.has(assembly.id)}
                      onChange={() => toggleAssembly(assembly.id)}
                    />
                    <span className="shrink-0 text-base">📦</span>
                    <span className="flex-1 font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                      {assembly.name}
                    </span>
                    <span className="text-xs text-text-tertiary shrink-0">
                      {assembly.parts.length} part{assembly.parts.length !== 1 ? 's' : ''}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 py-4 px-5 border-t border-border">
          <Button size="sm" variant="ghost" onClick={onSkip}>
            Skip
          </Button>
          <Button size="sm" onClick={handleImport} disabled={selectedCount === 0}>
            Import {selectedCount > 0 ? `(${selectedCount})` : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}
