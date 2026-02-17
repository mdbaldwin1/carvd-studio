import { Plus, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBackdropClose } from '../../hooks/useBackdropClose';
import { useProjectStore } from '../../store/projectStore';
import { useLicenseStore } from '../../store/licenseStore';
import { Assembly } from '../../types';
import { formatMeasurementWithUnit } from '../../utils/fractions';
import { getFeatureLimits } from '../../utils/featureLimits';

interface AddAssemblyModalProps {
  isOpen: boolean;
  onClose: () => void;
  assemblyLibrary: Assembly[];
  onAddToProject: (assembly: Assembly) => void;
  onCreateNew?: () => void;
}

export function AddAssemblyModal({
  isOpen,
  onClose,
  assemblyLibrary,
  onAddToProject,
  onCreateNew
}: AddAssemblyModalProps) {
  const units = useProjectStore((s) => s.units);
  const assemblies = useProjectStore((s) => s.assemblies);
  const licenseMode = useLicenseStore((s) => s.licenseMode);
  const limits = getFeatureLimits(licenseMode);
  const canCreateAssemblies = limits.canUseAssemblies;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [displayedAssemblyId, setDisplayedAssemblyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter out assemblies already in project
  const availableAssemblies = useMemo(
    () => assemblyLibrary.filter((c) => !assemblies.some((pc) => pc.id === c.id)),
    [assemblyLibrary, assemblies]
  );

  // Filter by search term
  const filteredAssemblies = useMemo(
    () =>
      searchTerm
        ? availableAssemblies.filter((a) => a.name.toLowerCase().includes(searchTerm.toLowerCase()))
        : availableAssemblies,
    [availableAssemblies, searchTerm]
  );

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setDisplayedAssemblyId(null);
      setSearchTerm('');
    }
  }, [isOpen]);

  // Get the currently displayed assembly
  const displayedAssembly = displayedAssemblyId ? assemblyLibrary.find((a) => a.id === displayedAssemblyId) : null;

  const handleItemClick = useCallback(
    (assembly: Assembly) => {
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(assembly.id)) {
          // Clicking a selected item deselects it
          newSet.delete(assembly.id);
          // If we're deselecting the displayed item, clear the display or show another selected item
          if (displayedAssemblyId === assembly.id) {
            const remaining = Array.from(newSet);
            setDisplayedAssemblyId(remaining.length > 0 ? remaining[remaining.length - 1] : null);
          }
        } else {
          // Select the item and display it
          newSet.add(assembly.id);
          setDisplayedAssemblyId(assembly.id);
        }
        return newSet;
      });
    },
    [displayedAssemblyId]
  );

  const handleSelectAll = useCallback(() => {
    const filteredIds = filteredAssemblies.map((a) => a.id);
    const allFilteredSelected = filteredIds.every((id) => selectedIds.has(id));
    if (allFilteredSelected) {
      // Deselect all filtered items
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        filteredIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
      setDisplayedAssemblyId(null);
    } else {
      // Select all filtered items
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        filteredIds.forEach((id) => newSet.add(id));
        return newSet;
      });
      // Display the last item in the filtered list
      if (filteredAssemblies.length > 0) {
        setDisplayedAssemblyId(filteredAssemblies[filteredAssemblies.length - 1].id);
      }
    }
  }, [filteredAssemblies, selectedIds]);

  const { handleMouseDown, handleClick } = useBackdropClose(onClose);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleAdd = useCallback(() => {
    // Add all selected assemblies to the project
    for (const assemblyId of selectedIds) {
      const assembly = assemblyLibrary.find((a) => a.id === assemblyId);
      if (assembly) {
        const assemblyToAdd: Assembly = {
          ...assembly,
          modifiedAt: new Date().toISOString()
        };
        onAddToProject(assemblyToAdd);
      }
    }
    onClose();
  }, [selectedIds, assemblyLibrary, onAddToProject, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-overlay flex items-center justify-center z-[1100]"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div
        className="bg-surface border border-border rounded-lg shadow-[0_8px_32px_var(--color-overlay)] max-w-[90vw] max-h-[80vh] flex flex-col animate-modal-fade-in w-[700px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-assembly-modal-title"
      >
        <div className="flex justify-between items-center py-4 px-5 border-b border-border">
          <h2 id="add-assembly-modal-title" className="text-base font-semibold text-text m-0">
            Add Assembly to Project
          </h2>
          <button
            className="bg-transparent border-none text-text-muted text-2xl cursor-pointer p-0 leading-none transition-colors duration-150 hover:text-text"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-[300px]">
          {/* Library list sidebar */}
          <div className="w-60 shrink-0 border-r border-border flex flex-col overflow-hidden">
            <div className="flex justify-between items-center py-3 px-4 border-b border-border text-xs text-text-muted">
              <span>{availableAssemblies.length} available</span>
              <div className="flex gap-1 items-center">
                {availableAssemblies.length > 0 && (
                  <button className="btn btn-xs btn-ghost btn-secondary" onClick={handleSelectAll}>
                    {filteredAssemblies.every((a) => selectedIds.has(a.id)) && filteredAssemblies.length > 0
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                )}
                {onCreateNew && canCreateAssemblies && (
                  <button
                    className="btn btn-icon-xs btn-ghost btn-secondary"
                    onClick={() => {
                      onClose();
                      onCreateNew();
                    }}
                    title="Create new assembly"
                    aria-label="Create new assembly"
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>
            </div>
            {availableAssemblies.length > 0 && (
              <div className="flex items-center gap-2 py-2 px-3 bg-bg border border-border rounded mb-2">
                <Search size={14} className="text-text-muted shrink-0" />
                <input
                  className="flex-1 border-none bg-transparent text-text text-[13px] outline-none placeholder:text-text-muted"
                  type="text"
                  placeholder="Search assemblies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    className="flex items-center justify-center w-5 h-5 border-none bg-none text-text-muted cursor-pointer p-0 rounded-sm shrink-0 hover:text-text hover:bg-bg-hover"
                    onClick={() => setSearchTerm('')}
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}
            {availableAssemblies.length === 0 ? (
              <div className="text-text-muted text-xs italic p-4 text-center">
                <p>No assemblies available</p>
                <p className="text-[11px] text-text-muted mt-1">
                  {assemblyLibrary.length === 0
                    ? onCreateNew
                      ? 'Click "+" above or save a selection as an assembly from the canvas'
                      : 'Save a selection as an assembly from the canvas'
                    : 'All library assemblies are already in this project'}
                </p>
              </div>
            ) : filteredAssemblies.length === 0 ? (
              <div className="text-text-muted text-xs italic p-4 text-center">
                <p>No assemblies match "{searchTerm}"</p>
              </div>
            ) : (
              <ul className="list-none m-0 p-2 overflow-y-auto flex-1">
                {filteredAssemblies.map((assembly) => (
                  <li
                    key={assembly.id}
                    className={`flex items-center gap-2 py-2.5 px-3 rounded-md cursor-pointer transition-[background] duration-150 hover:bg-surface-hover ${selectedIds.has(assembly.id) ? 'bg-selected' : ''} ${displayedAssemblyId === assembly.id ? 'outline-2 outline-solid outline-primary -outline-offset-2' : ''}`}
                    onClick={() => handleItemClick(assembly)}
                  >
                    {assembly.thumbnailData ? (
                      <img
                        src={`data:image/png;base64,${assembly.thumbnailData.data}`}
                        alt={assembly.name}
                        className="w-10 h-[30px] object-cover rounded shrink-0 bg-bg-tertiary"
                      />
                    ) : (
                      <span className="text-base shrink-0">{assembly.thumbnail || '📦'}</span>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="text-[13px] text-text whitespace-nowrap overflow-hidden text-ellipsis">
                        {assembly.name}
                      </span>
                      <span className="text-[11px] text-text-muted">
                        {assembly.parts.length} part{assembly.parts.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {selectedIds.size > 0 && (
              <div className="py-2 px-3 border-t border-border text-xs text-text-muted shrink-0">
                <span>{selectedIds.size} selected</span>
              </div>
            )}
          </div>

          {/* Detail/edit panel */}
          <div className="flex-1 flex flex-col p-5 overflow-y-auto">
            {!displayedAssembly ? (
              <div className="flex-1 flex flex-col items-center justify-center text-text-muted gap-2">
                <p className="mb-2">Select an assembly from the library to view details</p>
                <p className="text-[11px] text-text-muted mt-1">or click "+" to create one</p>
                <a
                  href="#"
                  className="text-accent no-underline text-xs hover:underline hover:text-accent-hover transition-colors duration-150"
                  onClick={(e) => {
                    e.preventDefault();
                    window.electronAPI.openExternal('https://carvd-studio.com/docs#assemblies');
                  }}
                >
                  Learn more about assemblies
                </a>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  {displayedAssembly.thumbnailData ? (
                    <img
                      src={`data:image/png;base64,${displayedAssembly.thumbnailData.data}`}
                      alt={displayedAssembly.name}
                      className="w-[120px] h-[90px] object-cover rounded-md shrink-0 bg-bg-tertiary"
                    />
                  ) : (
                    <span className="text-2xl">{displayedAssembly.thumbnail || '📦'}</span>
                  )}
                  <h3 className="m-0 text-lg text-text">{displayedAssembly.name}</h3>
                </div>

                {displayedAssembly.description && (
                  <div className="mb-4 p-3 bg-bg rounded-md">
                    <p className="m-0 text-[13px] text-text-muted leading-relaxed">{displayedAssembly.description}</p>
                  </div>
                )}

                {/* Parts preview */}
                <div className="mt-5 pt-4 border-t border-border">
                  <label className="block mb-3 text-xs text-text-muted">Parts ({displayedAssembly.parts.length})</label>
                  <ul className="list-none m-0 p-0 max-h-[150px] overflow-y-auto">
                    {displayedAssembly.parts.slice(0, 5).map((part, index) => (
                      <li key={index} className="flex justify-between items-center py-1.5 px-2.5 bg-bg rounded mb-1">
                        <span className="text-xs text-text">{part.name}</span>
                        <span className="text-[11px] text-text-muted">
                          {formatMeasurementWithUnit(part.length, units)} ×{' '}
                          {formatMeasurementWithUnit(part.width, units)} ×{' '}
                          {formatMeasurementWithUnit(part.thickness, units)}
                        </span>
                      </li>
                    ))}
                    {displayedAssembly.parts.length > 5 && (
                      <li className="py-1.5 px-2.5 text-[11px] text-text-muted italic">
                        +{displayedAssembly.parts.length - 5} more parts
                      </li>
                    )}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 py-4 px-5 border-t border-border">
          <button className="btn btn-sm btn-outlined btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-sm btn-filled btn-primary" onClick={handleAdd} disabled={selectedIds.size === 0}>
            Add to Project{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
