import { Copy, Download, Plus, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { isBuiltInAssembly } from '../../templates/builtInAssemblies';
import { Assembly } from '../../types';
import { showSavedFileToast } from '../../utils/fileToast';
import { Badge } from '@renderer/components/ui/badge';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Textarea } from '@renderer/components/ui/textarea';
import { AssemblyDetails } from '../assembly/AssemblyDetails';
import { HelpTooltip } from '../common/HelpTooltip';
import { DocsLink } from '../common/library/DocsLink';
import { LibraryDetailHeader } from '../common/library/LibraryDetailHeader';
import { LibraryDetailPane } from '../common/library/LibraryDetailPane';
import { LibraryEmptyState } from '../common/library/LibraryEmptyState';
import { LibrarySidebar } from '../common/library/LibrarySidebar';
import { AssemblyListItem } from './AssemblyListItem';

interface AssembliesTabProps {
  assemblies: Assembly[];
  onUpdateAssembly: (id: string, updates: Partial<Assembly>) => void;
  onDeleteAssembly: (id: string) => void;
  onDuplicateAssembly?: (assembly: Assembly) => Promise<void>;
  onEditAssemblyIn3D?: (assembly: Assembly) => Promise<boolean>;
  onCreateNewAssembly?: () => Promise<boolean>;
  canCreateAssemblies: boolean;
  onClose: () => void;
  hideInlineFormActions?: boolean;
  onFormModeChange?: (state: {
    isFormMode: boolean;
    confirmLabel?: 'Save';
    canConfirm?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
  }) => void;
}

export function AssembliesTab({
  assemblies,
  onUpdateAssembly,
  onDeleteAssembly,
  onDuplicateAssembly,
  onEditAssemblyIn3D,
  onCreateNewAssembly,
  canCreateAssemblies,
  onClose,
  hideInlineFormActions = false,
  onFormModeChange
}: AssembliesTabProps) {
  const units = useProjectStore((s) => s.units);
  const showToast = useUIStore((s) => s.showToast);

  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(null);
  const [isEditingAssembly, setIsEditingAssembly] = useState(false);
  const [assemblyFormData, setAssemblyFormData] = useState({ name: '', description: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAssemblies = useMemo(
    () => (searchTerm ? assemblies.filter((a) => a.name.toLowerCase().includes(searchTerm.toLowerCase())) : assemblies),
    [assemblies, searchTerm]
  );
  const selectedAssembly = selectedAssemblyId ? assemblies.find((a) => a.id === selectedAssemblyId) : null;
  const hasUnsavedFormChanges = useMemo(() => {
    if (!isEditingAssembly || !selectedAssembly) return false;
    return (
      assemblyFormData.name !== selectedAssembly.name ||
      assemblyFormData.description !== (selectedAssembly.description || '')
    );
  }, [assemblyFormData.description, assemblyFormData.name, isEditingAssembly, selectedAssembly]);

  const confirmDiscardUnsaved = useCallback(() => {
    if (!hasUnsavedFormChanges) return true;
    return window.confirm('Discard unsaved assembly changes?');
  }, [hasUnsavedFormChanges]);

  // Handle escape key; capture phase ensures edit-cancel takes precedence over dialog-close.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (isEditingAssembly) {
          handleCancelEditAssembly();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleCancelEditAssembly is a useCallback defined below; deps cover the values it reads
  }, [isEditingAssembly, onClose]);

  const handleSelectAssembly = useCallback(
    (assembly: Assembly) => {
      if (assembly.id !== selectedAssemblyId && isEditingAssembly && !confirmDiscardUnsaved()) {
        return;
      }
      setSelectedAssemblyId(assembly.id);
      setIsEditingAssembly(false);
      setAssemblyFormData({ name: assembly.name, description: assembly.description || '' });
    },
    [confirmDiscardUnsaved, isEditingAssembly, selectedAssemblyId]
  );

  const handleStartEditAssembly = useCallback(() => {
    setIsEditingAssembly(true);
  }, []);

  const handleCancelEditAssembly = useCallback(() => {
    setIsEditingAssembly(false);
    if (selectedAssemblyId) {
      const assembly = assemblies.find((a) => a.id === selectedAssemblyId);
      if (assembly) {
        setAssemblyFormData({ name: assembly.name, description: assembly.description || '' });
      }
    }
  }, [selectedAssemblyId, assemblies]);

  const handleSaveAssembly = useCallback(() => {
    if (selectedAssemblyId) {
      onUpdateAssembly(selectedAssemblyId, {
        name: assemblyFormData.name,
        description: assemblyFormData.description || undefined,
        modifiedAt: new Date().toISOString()
      });
      setIsEditingAssembly(false);
    }
  }, [selectedAssemblyId, assemblyFormData, onUpdateAssembly]);

  const canSaveAssembly = useMemo(() => {
    return isEditingAssembly && selectedAssemblyId !== null && assemblyFormData.name.trim().length > 0;
  }, [isEditingAssembly, selectedAssemblyId, assemblyFormData.name]);

  const handleDeleteAssembly = useCallback(() => {
    if (selectedAssemblyId) {
      onDeleteAssembly(selectedAssemblyId);
      setSelectedAssemblyId(null);
    }
  }, [selectedAssemblyId, onDeleteAssembly]);

  const handleExportAssembly = useCallback(async () => {
    if (!selectedAssemblyId) return;
    try {
      const result = await window.electronAPI.exportAssembly(selectedAssemblyId);
      if (result.success && result.filePath) {
        const message = result.stocksIncluded
          ? `Assembly exported with ${result.stocksIncluded} stock${result.stocksIncluded === 1 ? '' : 's'}`
          : 'Assembly exported successfully';
        showSavedFileToast(message, result.filePath);
      } else if (!result.canceled && result.error) {
        showToast(result.error, 'error');
      }
    } catch (error) {
      console.error('Failed to export assembly:', error);
      showToast('Failed to export assembly', 'error');
    }
  }, [selectedAssemblyId, showToast]);

  const handleImportAssembly = useCallback(async () => {
    try {
      const result = await window.electronAPI.importAssembly({ importStocks: true });
      if (result.success && result.assemblyId) {
        const message = result.stocksImported
          ? `Assembly imported with ${result.stocksImported} stock${result.stocksImported === 1 ? '' : 's'}`
          : 'Assembly imported successfully';
        showToast(message, 'success');
      } else if (!result.canceled && result.error) {
        showToast(result.error, 'error');
      }
    } catch (error) {
      console.error('Failed to import assembly:', error);
      showToast('Failed to import assembly', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    if (!onFormModeChange) return;
    if (isEditingAssembly) {
      onFormModeChange({
        isFormMode: true,
        confirmLabel: 'Save',
        canConfirm: canSaveAssembly,
        onConfirm: handleSaveAssembly,
        onCancel: handleCancelEditAssembly
      });
      return;
    }
    onFormModeChange({ isFormMode: false });
  }, [onFormModeChange, isEditingAssembly, canSaveAssembly, handleSaveAssembly, handleCancelEditAssembly]);

  return (
    <>
      <LibrarySidebar
        count={assemblies.length}
        hasItems={assemblies.length > 0}
        showNoResults={filteredAssemblies.length === 0}
        search={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: 'Search assemblies...'
        }}
        headerActions={
          <>
            {canCreateAssemblies && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleImportAssembly}
                title="Import assembly from file"
                aria-label="Import assembly"
              >
                <Upload size={14} />
              </Button>
            )}
            {onCreateNewAssembly && canCreateAssemblies && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={async () => {
                  const success = await onCreateNewAssembly();
                  if (success) {
                    onClose();
                  }
                }}
                title="Create new assembly"
                aria-label="Create new assembly"
              >
                <Plus size={14} />
              </Button>
            )}
          </>
        }
        emptyState={
          <div className="text-text-muted text-xs italic p-4 text-center">
            {!canCreateAssemblies ? (
              <>
                <p>Assemblies require a license</p>
                <p className="text-[11px] text-text-muted mt-1">
                  Upgrade to create and use assemblies.{' '}
                  <DocsLink section="assemblies" className="hover:underline">
                    Learn more
                  </DocsLink>
                </p>
              </>
            ) : (
              <>
                <p>No assemblies in library yet</p>
                <p className="text-[11px] text-text-muted mt-1">
                  {onCreateNewAssembly ? (
                    <>
                      Click "+" above or save a selection as an assembly from the canvas.{' '}
                      <DocsLink section="assemblies" className="hover:underline">
                        Learn more
                      </DocsLink>
                    </>
                  ) : (
                    <>
                      Save a selection as an assembly from the canvas.{' '}
                      <DocsLink section="assemblies" className="hover:underline">
                        Learn more
                      </DocsLink>
                    </>
                  )}
                </p>
              </>
            )}
          </div>
        }
        noResultsState={
          <div className="text-text-muted text-xs italic p-4 text-center">
            <p>No assemblies match "{searchTerm}"</p>
          </div>
        }
      >
        <ul className="list-none m-0 p-2 flex-1 min-h-0 overflow-y-auto">
          {filteredAssemblies.map((assembly) => (
            <AssemblyListItem
              key={assembly.id}
              assembly={assembly}
              selected={selectedAssemblyId === assembly.id}
              showBuiltInBadge
              showGroupsInMeta
              onClick={() => handleSelectAssembly(assembly)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/carvd-assembly', assembly.id);
                e.dataTransfer.setData('application/carvd-assembly-source', 'library');
                e.dataTransfer.effectAllowed = 'copy';
              }}
            />
          ))}
        </ul>
      </LibrarySidebar>

      {/* Assembly detail panel */}
      <LibraryDetailPane>
        {!selectedAssembly ? (
          <LibraryEmptyState
            title="Select an assembly to view details"
            subtitle='or click "+" to create a new assembly'
            linkLabel="Learn more about assemblies"
            docsSection="assemblies"
          />
        ) : (
          <>
            <LibraryDetailHeader
              title={
                <>
                  {isEditingAssembly ? 'Edit Assembly' : selectedAssembly.name}
                  {!isEditingAssembly && isBuiltInAssembly(selectedAssembly.id) && (
                    <Badge variant="secondary" className="rounded py-0.5 px-1.5 text-[10px] uppercase tracking-wide">
                      Built-in
                    </Badge>
                  )}
                </>
              }
              actions={
                !isEditingAssembly ? (
                  <div className="flex gap-2">
                    {!isBuiltInAssembly(selectedAssembly.id) && canCreateAssemblies && (
                      <>
                        <Button variant="ghost" size="xs" onClick={handleStartEditAssembly}>
                          Edit
                        </Button>
                        {onEditAssemblyIn3D && (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={async () => {
                              const success = await onEditAssemblyIn3D(selectedAssembly);
                              if (success) {
                                onClose();
                              }
                            }}
                          >
                            Edit in 3D
                          </Button>
                        )}
                      </>
                    )}
                    {onDuplicateAssembly && canCreateAssemblies && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={async () => {
                          await onDuplicateAssembly(selectedAssembly);
                        }}
                        title="Create a copy of this assembly"
                      >
                        <Copy size={12} />
                        Duplicate
                      </Button>
                    )}
                    {!isBuiltInAssembly(selectedAssembly.id) && canCreateAssemblies && (
                      <Button variant="ghost" size="xs" onClick={handleExportAssembly} title="Export assembly to file">
                        <Download size={12} />
                        Export
                      </Button>
                    )}
                    {!isBuiltInAssembly(selectedAssembly.id) && (
                      <Button variant="destructiveOutline" size="xs" onClick={handleDeleteAssembly}>
                        Delete
                      </Button>
                    )}
                  </div>
                ) : undefined
              }
            />

            {isEditingAssembly ? (
              <div className="flex-1 p-5 overflow-y-auto">
                <div className="flex flex-col mb-4 gap-2.5">
                  <Label>Name</Label>
                  <Input
                    type="text"
                    value={assemblyFormData.name}
                    onChange={(e) => setAssemblyFormData({ ...assemblyFormData, name: e.target.value })}
                  />
                </div>

                <div className="flex flex-col mb-4 gap-2.5">
                  <Label>Description</Label>
                  <Textarea
                    value={assemblyFormData.description}
                    onChange={(e) => setAssemblyFormData({ ...assemblyFormData, description: e.target.value })}
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>

                {onEditAssemblyIn3D && !isBuiltInAssembly(selectedAssembly.id) && canCreateAssemblies && (
                  <div className="flex flex-col mb-4 gap-2.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={async () => {
                        const success = await onEditAssemblyIn3D(selectedAssembly);
                        if (success) {
                          onClose();
                        }
                      }}
                    >
                      Edit Layout in 3D
                      <HelpTooltip
                        text="Opens this assembly in the 3D workspace for editing parts and positions."
                        docsSection="assemblies"
                        inline
                      />
                    </Button>
                  </div>
                )}

                {!hideInlineFormActions && (
                  <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-border">
                    <Button variant="outline" size="sm" onClick={handleCancelEditAssembly}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveAssembly} disabled={!canSaveAssembly}>
                      Save
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 p-5 overflow-y-auto">
                <AssemblyDetails
                  assembly={selectedAssembly}
                  units={units}
                  showMetadataRows
                  partsTitle="Parts in this assembly:"
                  partsMaxHeightClassName="max-h-[200px]"
                />
              </div>
            )}
          </>
        )}
      </LibraryDetailPane>
    </>
  );
}
