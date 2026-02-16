/**
 * Dialog for importing project stocks/assemblies to the app library
 * Shown when opening a project that contains items not in the user's library
 */

import { useState, useEffect } from 'react';
import { Stock, Assembly } from '../../types';
import { formatMeasurementWithUnit } from '../../utils/fractions';
import { useProjectStore } from '../../store/projectStore';

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
    <div className="modal-overlay">
      <div className="modal max-w-120 w-[90vw]">
        <div className="modal-header">
          <h2>Import to Library</h2>
        </div>

        <div className="modal-body">
          <p className="mb-4 text-text-secondary leading-relaxed">
            This project contains {totalItems} item{totalItems !== 1 ? 's' : ''} not in your library. Would you like to
            add them for use in future projects?
          </p>

          <div className="flex gap-2 mb-3">
            <button
              className="btn btn-sm btn-ghost btn-secondary"
              onClick={selectAll}
              disabled={selectedCount === totalItems}
            >
              Select All
            </button>
            <button className="btn btn-sm btn-ghost btn-secondary" onClick={selectNone} disabled={selectedCount === 0}>
              Select None
            </button>
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
                    <input
                      type="checkbox"
                      checked={selectedStockIds.has(stock.id)}
                      onChange={() => toggleStock(stock.id)}
                      className="shrink-0"
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
                    <input
                      type="checkbox"
                      checked={selectedAssemblyIds.has(assembly.id)}
                      onChange={() => toggleAssembly(assembly.id)}
                      className="shrink-0"
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

        <div className="modal-footer">
          <button className="btn btn-sm btn-ghost btn-secondary" onClick={onSkip}>
            Skip
          </button>
          <button className="btn btn-sm btn-filled btn-primary" onClick={handleImport} disabled={selectedCount === 0}>
            Import {selectedCount > 0 ? `(${selectedCount})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
