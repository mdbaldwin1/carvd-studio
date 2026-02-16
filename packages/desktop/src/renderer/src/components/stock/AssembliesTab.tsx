import { Copy, Download, Plus, Search, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { isBuiltInAssembly } from '../../templates/builtInAssemblies';
import { Assembly } from '../../types';
import { formatMeasurementWithUnit } from '../../utils/fractions';
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
  const showToast = useProjectStore((s) => s.showToast);

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
      <div className="stock-library-list-panel">
        <div className="stock-library-list-header">
          <span>{assemblies.length} available</span>
          <div className="stock-library-header-actions">
            {canCreateAssemblies && (
              <button
                className="btn btn-icon-xs btn-ghost btn-secondary"
                onClick={handleImportAssembly}
                title="Import assembly from file"
                aria-label="Import assembly"
              >
                <Upload size={14} />
              </button>
            )}
            {onCreateNewAssembly && canCreateAssemblies && (
              <button
                className="btn btn-icon-xs btn-ghost btn-secondary"
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
              </button>
            )}
          </div>
        </div>
        {assemblies.length > 0 && (
          <div className="modal-search">
            <Search size={14} className="modal-search-icon" />
            <input
              type="text"
              placeholder="Search assemblies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="modal-search-clear" onClick={() => setSearchTerm('')} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>
        )}
        {assemblies.length === 0 ? (
          <div className="placeholder-text">
            {!canCreateAssemblies ? (
              <>
                <p>Assemblies require a license</p>
                <p className="hint">
                  Upgrade to create and use assemblies.{' '}
                  <a
                    href="#"
                    className="learn-more-link"
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
                <p className="hint">
                  {onCreateNewAssembly ? (
                    <>
                      Click "+" above or save a selection as an assembly from the canvas.{' '}
                      <a
                        href="#"
                        className="learn-more-link"
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
                        className="learn-more-link"
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
          <div className="placeholder-text">
            <p>No assemblies match "{searchTerm}"</p>
          </div>
        ) : (
          <ul className="stock-library-list">
            {filteredAssemblies.map((assembly) => (
              <li
                key={assembly.id}
                className={`stock-library-item ${selectedAssemblyId === assembly.id ? 'selected' : ''} ${isBuiltInAssembly(assembly.id) ? 'built-in' : ''}`}
                onClick={() => handleSelectAssembly(assembly)}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/carvd-assembly', assembly.id);
                  e.dataTransfer.setData('application/carvd-assembly-source', 'library');
                  e.dataTransfer.effectAllowed = 'copy';
                }}
              >
                {assembly.thumbnailData?.data ? (
                  <img src={assembly.thumbnailData.data} alt={assembly.name} className="assembly-thumbnail" />
                ) : (
                  <span className="assembly-icon">📦</span>
                )}
                <div className="stock-info">
                  <span className="stock-name">
                    {assembly.name}
                    {isBuiltInAssembly(assembly.id) && <span className="built-in-badge">Built-in</span>}
                  </span>
                  <span className="stock-dims">
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
      <div className="stock-library-detail-panel">
        {!selectedAssembly ? (
          <div className="stock-library-empty">
            <p>Select an assembly to view details</p>
            <p className="hint">or click "+" to create a new assembly</p>
            <a
              href="#"
              className="learn-more-link text-xs"
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
            <div className="stock-detail-header">
              <h3>
                {isEditingAssembly ? 'Edit Assembly' : selectedAssembly.name}
                {!isEditingAssembly && isBuiltInAssembly(selectedAssembly.id) && (
                  <span className="built-in-badge">Built-in</span>
                )}
              </h3>
              {!isEditingAssembly && (
                <div className="stock-detail-actions">
                  {!isBuiltInAssembly(selectedAssembly.id) && canCreateAssemblies && (
                    <>
                      <button className="btn btn-xs btn-ghost btn-secondary" onClick={handleStartEditAssembly}>
                        Edit
                      </button>
                      {onEditAssemblyIn3D && (
                        <button
                          className="btn btn-xs btn-ghost btn-secondary"
                          onClick={async () => {
                            const success = await onEditAssemblyIn3D(selectedAssembly);
                            if (success) {
                              onClose();
                            }
                          }}
                        >
                          Edit in 3D
                        </button>
                      )}
                    </>
                  )}
                  {onDuplicateAssembly && canCreateAssemblies && (
                    <button
                      className="btn btn-xs btn-ghost btn-secondary"
                      onClick={async () => {
                        await onDuplicateAssembly(selectedAssembly);
                      }}
                      title="Create a copy of this assembly"
                    >
                      <Copy size={12} />
                      Duplicate
                    </button>
                  )}
                  {!isBuiltInAssembly(selectedAssembly.id) && canCreateAssemblies && (
                    <button
                      className="btn btn-xs btn-ghost btn-secondary"
                      onClick={handleExportAssembly}
                      title="Export assembly to file"
                    >
                      <Download size={12} />
                      Export
                    </button>
                  )}
                  {!isBuiltInAssembly(selectedAssembly.id) && (
                    <button className="btn btn-xs btn-outlined btn-danger" onClick={handleDeleteAssembly}>
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>

            {isEditingAssembly ? (
              <div className="stock-edit-form">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={assemblyFormData.name}
                    onChange={(e) => setAssemblyFormData({ ...assemblyFormData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={assemblyFormData.description}
                    onChange={(e) => setAssemblyFormData({ ...assemblyFormData, description: e.target.value })}
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>

                {onEditAssemblyIn3D && !isBuiltInAssembly(selectedAssembly.id) && canCreateAssemblies && (
                  <div className="form-group">
                    <button
                      className="btn btn-sm btn-outlined btn-secondary edit-3d-btn"
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
                    </button>
                  </div>
                )}

                <div className="form-actions">
                  <button className="btn btn-sm btn-outlined btn-secondary" onClick={handleCancelEditAssembly}>
                    Cancel
                  </button>
                  <button className="btn btn-sm btn-filled btn-primary" onClick={handleSaveAssembly}>
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="stock-detail-view">
                {selectedAssembly.description && (
                  <div className="detail-row">
                    <span className="detail-label">Description</span>
                    <span className="detail-value">{selectedAssembly.description}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Parts</span>
                  <span className="detail-value">{selectedAssembly.parts.length}</span>
                </div>
                {selectedAssembly.groups.length > 0 && (
                  <div className="detail-row">
                    <span className="detail-label">Groups</span>
                    <span className="detail-value">{selectedAssembly.groups.length}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Created</span>
                  <span className="detail-value">{new Date(selectedAssembly.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Modified</span>
                  <span className="detail-value">{new Date(selectedAssembly.modifiedAt).toLocaleDateString()}</span>
                </div>

                <div className="assembly-parts-list">
                  <span className="detail-label">Parts in this assembly:</span>
                  <ul className="assembly-parts">
                    {selectedAssembly.parts.map((part, index) => (
                      <li key={index} className="assembly-part-item">
                        <span className="assembly-part-name">{part.name}</span>
                        <span className="assembly-part-dims">
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
