import { Copy, Download, Plus, Search, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { isBuiltInAssembly } from '../../templates/builtInAssemblies';
import { Assembly } from '../../types';
import { formatMeasurementWithUnit } from '../../utils/fractions';
import { Badge } from '@renderer/components/ui/badge';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Textarea } from '@renderer/components/ui/textarea';
import { HelpTooltip } from '../common/HelpTooltip';

interface AssembliesTabProps {
  assemblies: Assembly[];
  onUpdateAssembly: (id: string, updates: Partial<Assembly>) => void;
  onDeleteAssembly: (id: string) => void;
  onDuplicateAssembly?: (assembly: Assembly) => Promise<void>;
  onEditAssemblyIn3D?: (assembly: Assembly) => Promise<boolean>;
  onCreateNewAssembly?: () => Promise<boolean>;
  canCreateAssemblies: boolean;
  onClose: () => void;
}

export function AssembliesTab({
  assemblies,
  onUpdateAssembly,
  onDeleteAssembly,
  onDuplicateAssembly,
  onEditAssemblyIn3D,
  onCreateNewAssembly,
  canCreateAssemblies,
  onClose
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

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditingAssembly) {
          handleCancelEditAssembly();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleCancelEditAssembly is a useCallback defined below; deps cover the values it reads
  }, [isEditingAssembly, onClose]);

  const handleSelectAssembly = useCallback((assembly: Assembly) => {
    setSelectedAssemblyId(assembly.id);
    setIsEditingAssembly(false);
    setAssemblyFormData({ name: assembly.name, description: assembly.description || '' });
  }, []);

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
        showToast(message, 'success');
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

  const selectedAssembly = selectedAssemblyId ? assemblies.find((a) => a.id === selectedAssemblyId) : null;

  return (
    <>
      {/* Assemblies list sidebar */}
      <div className="w-60 border-r border-border flex flex-col">
        <div className="flex justify-between items-center py-3 px-4 border-b border-border text-xs text-text-muted">
          <span>{assemblies.length} available</span>
          <div className="flex items-center gap-1">
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
          </div>
        </div>
        {assemblies.length > 0 && (
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
        {assemblies.length === 0 ? (
          <div className="text-text-muted text-xs italic p-4 text-center">
            {!canCreateAssemblies ? (
              <>
                <p>Assemblies require a license</p>
                <p className="text-[11px] text-text-muted mt-1">
                  Upgrade to create and use assemblies.{' '}
                  <a
                    href="#"
                    className="text-accent no-underline hover:underline hover:text-accent-hover transition-colors duration-150"
                    onClick={(e) => {
                      e.preventDefault();
                      window.electronAPI.openExternal('https://carvd-studio.com/docs#assemblies');
                    }}
                  >
                    Learn more
                  </a>
                </p>
              </>
            ) : (
              <>
                <p>No assemblies in library yet</p>
                <p className="text-[11px] text-text-muted mt-1">
                  {onCreateNewAssembly ? (
                    <>
                      Click "+" above or save a selection as an assembly from the canvas.{' '}
                      <a
                        href="#"
                        className="text-accent no-underline hover:underline hover:text-accent-hover transition-colors duration-150"
                        onClick={(e) => {
                          e.preventDefault();
                          window.electronAPI.openExternal('https://carvd-studio.com/docs#assemblies');
                        }}
                      >
                        Learn more
                      </a>
                    </>
                  ) : (
                    <>
                      Save a selection as an assembly from the canvas.{' '}
                      <a
                        href="#"
                        className="text-accent no-underline hover:underline hover:text-accent-hover transition-colors duration-150"
                        onClick={(e) => {
                          e.preventDefault();
                          window.electronAPI.openExternal('https://carvd-studio.com/docs#assemblies');
                        }}
                      >
                        Learn more
                      </a>
                    </>
                  )}
                </p>
              </>
            )}
          </div>
        ) : filteredAssemblies.length === 0 ? (
          <div className="text-text-muted text-xs italic p-4 text-center">
            <p>No assemblies match "{searchTerm}"</p>
          </div>
        ) : (
          <ul className="list-none m-0 p-2 flex-1 min-h-0 overflow-y-auto">
            {filteredAssemblies.map((assembly) => (
              <li
                key={assembly.id}
                className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-[background] duration-100 hover:bg-surface-hover ${selectedAssemblyId === assembly.id ? 'bg-selected' : ''}`}
                onClick={() => handleSelectAssembly(assembly)}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/carvd-assembly', assembly.id);
                  e.dataTransfer.setData('application/carvd-assembly-source', 'library');
                  e.dataTransfer.effectAllowed = 'copy';
                }}
              >
                {assembly.thumbnailData?.data ? (
                  <img
                    src={`data:image/png;base64,${assembly.thumbnailData.data}`}
                    alt={assembly.name}
                    className="w-10 h-[30px] object-cover rounded shrink-0 bg-bg-tertiary"
                  />
                ) : (
                  <span className="text-base shrink-0">📦</span>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                    {assembly.name}
                    {isBuiltInAssembly(assembly.id) && (
                      <Badge
                        variant="secondary"
                        className="ml-1.5 rounded py-px px-1 text-[9px] uppercase tracking-wide"
                      >
                        Built-in
                      </Badge>
                    )}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {assembly.parts.length} part{assembly.parts.length !== 1 ? 's' : ''}
                    {assembly.groups.length > 0 &&
                      `, ${assembly.groups.length} group${assembly.groups.length !== 1 ? 's' : ''}`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Assembly detail panel */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {!selectedAssembly ? (
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted gap-2">
            <p>Select an assembly to view details</p>
            <p className="text-[11px] text-text-muted mt-1">or click "+" to create a new assembly</p>
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
            <div className="flex justify-between items-center py-4 px-5 border-b border-border">
              <h3 className="text-base font-semibold m-0 flex items-center gap-2">
                {isEditingAssembly ? 'Edit Assembly' : selectedAssembly.name}
                {!isEditingAssembly && isBuiltInAssembly(selectedAssembly.id) && (
                  <Badge variant="secondary" className="rounded py-0.5 px-1.5 text-[10px] uppercase tracking-wide">
                    Built-in
                  </Badge>
                )}
              </h3>
              {!isEditingAssembly && (
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
              )}
            </div>

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

                <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-border">
                  <Button variant="outline" size="sm" onClick={handleCancelEditAssembly}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveAssembly}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 p-5 overflow-y-auto">
                {selectedAssembly.description && (
                  <div className="flex justify-between items-start gap-4 py-3 border-b border-border">
                    <span className="text-xs text-text-muted shrink-0">Description</span>
                    <span className="text-[13px] text-text text-right break-words">{selectedAssembly.description}</span>
                  </div>
                )}
                <div className="flex justify-between items-start gap-4 py-3 border-b border-border">
                  <span className="text-xs text-text-muted shrink-0">Parts</span>
                  <span className="text-[13px] text-text text-right break-words">{selectedAssembly.parts.length}</span>
                </div>
                {selectedAssembly.groups.length > 0 && (
                  <div className="flex justify-between items-start gap-4 py-3 border-b border-border">
                    <span className="text-xs text-text-muted shrink-0">Groups</span>
                    <span className="text-[13px] text-text text-right break-words">
                      {selectedAssembly.groups.length}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-start gap-4 py-3 border-b border-border">
                  <span className="text-xs text-text-muted shrink-0">Created</span>
                  <span className="text-[13px] text-text text-right break-words">
                    {new Date(selectedAssembly.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-4 py-3 border-b border-border">
                  <span className="text-xs text-text-muted shrink-0">Modified</span>
                  <span className="text-[13px] text-text text-right break-words">
                    {new Date(selectedAssembly.modifiedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <span className="text-xs text-text-muted shrink-0 block mb-3">Parts in this assembly:</span>
                  <ul className="list-none m-0 p-0 max-h-[200px] overflow-y-auto">
                    {selectedAssembly.parts.map((part, index) => (
                      <li
                        key={index}
                        className="flex justify-between items-center py-2 px-3 bg-bg rounded mb-1 last:mb-0"
                      >
                        <span className="text-xs text-text">{part.name}</span>
                        <span className="text-[11px] text-text-muted">
                          {formatMeasurementWithUnit(part.length, units)} ×{' '}
                          {formatMeasurementWithUnit(part.width, units)} ×{' '}
                          {formatMeasurementWithUnit(part.thickness, units)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
