import { Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useLicenseStore } from '../../store/licenseStore';
import { Assembly } from '../../types';
import { getFeatureLimits } from '../../utils/featureLimits';
import { Button } from '@renderer/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog';
import { AssemblyDetails } from './AssemblyDetails';
import { AssemblyListItem } from '../stock/AssemblyListItem';
import { LibraryDetailHeader } from '../common/library/LibraryDetailHeader';
import { LibraryDetailPane } from '../common/library/LibraryDetailPane';
import { LibraryEmptyState } from '../common/library/LibraryEmptyState';
import { LibrarySidebar } from '../common/library/LibrarySidebar';

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

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[820px] max-w-[92vw] max-h-[86vh]" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Add Assembly to Project</DialogTitle>
          <DialogClose onClose={onClose} />
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden min-h-[300px]">
          <LibrarySidebar
            count={availableAssemblies.length}
            hasItems={availableAssemblies.length > 0}
            showNoResults={filteredAssemblies.length === 0}
            className="shrink-0"
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: 'Search assemblies...'
            }}
            headerActions={
              <div className="flex gap-1 items-center">
                {availableAssemblies.length > 0 && (
                  <Button variant="ghost" size="xs" onClick={handleSelectAll}>
                    {filteredAssemblies.every((a) => selectedIds.has(a.id)) && filteredAssemblies.length > 0
                      ? 'Deselect All'
                      : 'Select All'}
                  </Button>
                )}
                {onCreateNew && canCreateAssemblies && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      onClose();
                      onCreateNew();
                    }}
                    title="Create new assembly"
                    aria-label="Create new assembly"
                  >
                    <Plus size={14} />
                  </Button>
                )}
              </div>
            }
            emptyState={
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
            }
            noResultsState={
              <div className="text-text-muted text-xs italic p-4 text-center">
                <p>No assemblies match "{searchTerm}"</p>
              </div>
            }
            footer={
              selectedIds.size > 0 ? (
                <div className="py-2 px-3 border-t border-border text-xs text-text-muted shrink-0">
                  <span>{selectedIds.size} selected</span>
                </div>
              ) : undefined
            }
          >
            <ul className="list-none m-0 p-2 overflow-y-auto flex-1">
              {filteredAssemblies.map((assembly) => (
                <AssemblyListItem
                  key={assembly.id}
                  assembly={assembly}
                  selected={selectedIds.has(assembly.id)}
                  highlighted={displayedAssemblyId === assembly.id}
                  onClick={() => handleItemClick(assembly)}
                />
              ))}
            </ul>
          </LibrarySidebar>

          {/* Detail/edit panel */}
          <LibraryDetailPane className="p-5">
            {!displayedAssembly ? (
              <LibraryEmptyState
                title="Select an assembly from the library to view details"
                subtitle='or click "+" to create one'
                linkLabel="Learn more about assemblies"
                docsSection="assemblies"
              />
            ) : (
              <>
                <LibraryDetailHeader
                  title={
                    <div className="flex items-center gap-3">
                      {displayedAssembly.thumbnailData ? (
                        <img
                          src={`data:image/png;base64,${displayedAssembly.thumbnailData.data}`}
                          alt=""
                          aria-hidden="true"
                          className="w-[120px] h-[90px] object-cover rounded-md shrink-0 bg-bg-tertiary"
                        />
                      ) : (
                        <span aria-hidden="true" className="text-2xl">
                          {displayedAssembly.thumbnail || '📦'}
                        </span>
                      )}
                      <span className="text-lg text-text">{displayedAssembly.name}</span>
                    </div>
                  }
                  className="mb-4 px-0 pt-0"
                />
                <Card className="border-border bg-bg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Assembly Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AssemblyDetails
                      assembly={displayedAssembly}
                      units={units}
                      showDescriptionCard
                      maxVisibleParts={5}
                      partsTitle={`Parts (${displayedAssembly.parts.length})`}
                      partsMaxHeightClassName="max-h-[150px]"
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </LibraryDetailPane>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleAdd} disabled={selectedIds.size === 0}>
            Add to Project{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
