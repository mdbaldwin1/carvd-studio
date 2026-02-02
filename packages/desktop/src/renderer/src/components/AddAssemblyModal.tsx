import React, { useState, useEffect } from 'react';
import { Assembly } from '../types';
import { useBackdropClose } from '../hooks/useBackdropClose';
import { useProjectStore } from '../store/projectStore';
import { formatMeasurementWithUnit } from '../utils/fractions';

interface AddAssemblyModalProps {
  isOpen: boolean;
  onClose: () => void;
  assemblyLibrary: Assembly[];
  onAddToProject: (assembly: Assembly) => void;
}

export function AddAssemblyModal({
  isOpen,
  onClose,
  assemblyLibrary,
  onAddToProject
}: AddAssemblyModalProps) {
  const units = useProjectStore((s) => s.units);
  const assemblies = useProjectStore((s) => s.assemblies);

  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  // Filter out assemblies already in project
  const availableAssemblies = assemblyLibrary.filter(
    (c) => !assemblies.some((pc) => pc.id === c.id)
  );

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAssemblyId(null);
      setEditedName('');
      setEditedDescription('');
    }
  }, [isOpen]);

  // Update form when selecting an assembly
  useEffect(() => {
    if (selectedAssemblyId) {
      const assembly = assemblyLibrary.find((c) => c.id === selectedAssemblyId);
      if (assembly) {
        setEditedName(assembly.name);
        setEditedDescription(assembly.description || '');
      }
    }
  }, [selectedAssemblyId, assemblyLibrary]);

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

  const handleAdd = () => {
    if (!selectedAssemblyId) return;

    const original = assemblyLibrary.find((c) => c.id === selectedAssemblyId);
    if (!original) return;

    // Create a copy with potentially edited metadata
    const assemblyToAdd: Assembly = {
      ...original,
      name: editedName || original.name,
      description: editedDescription || original.description,
      modifiedAt: new Date().toISOString()
    };

    onAddToProject(assemblyToAdd);
    onClose();
  };

  if (!isOpen) return null;

  const selectedAssembly = selectedAssemblyId
    ? assemblyLibrary.find((c) => c.id === selectedAssemblyId)
    : null;

  return (
    <div className="modal-backdrop" onMouseDown={handleMouseDown} onClick={handleClick}>
      <div className="modal add-assembly-modal">
        <div className="modal-header">
          <h2>Add Assembly to Project</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="add-assembly-content">
          {/* Library list sidebar */}
          <div className="add-assembly-list-panel">
            <div className="add-assembly-list-header">
              <span>{availableAssemblies.length} available</span>
            </div>
            {availableAssemblies.length === 0 ? (
              <div className="placeholder-text">
                <p>No assemblies available</p>
                <p className="hint">
                  {assemblyLibrary.length === 0
                    ? 'Save a selection as an assembly from the canvas'
                    : 'All library assemblies are already in this project'}
                </p>
              </div>
            ) : (
              <ul className="add-assembly-list">
                {availableAssemblies.map((assembly) => (
                  <li
                    key={assembly.id}
                    className={`add-assembly-item ${selectedAssemblyId === assembly.id ? 'selected' : ''}`}
                    onClick={() => setSelectedAssemblyId(assembly.id)}
                  >
                    <span className="assembly-icon">📦</span>
                    <div className="assembly-info">
                      <span className="assembly-name">{assembly.name}</span>
                      <span className="assembly-dims">
                        {assembly.parts.length} part{assembly.parts.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Detail/edit panel */}
          <div className="add-assembly-detail-panel">
            {!selectedAssembly ? (
              <div className="add-assembly-empty">
                <p>Select an assembly from the library</p>
                <p className="hint">You can customize its name and description for this project</p>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder={selectedAssembly.name}
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    placeholder="Optional description for this project"
                    rows={3}
                  />
                </div>

                {/* Parts preview */}
                <div className="assembly-preview">
                  <label className="detail-label">Parts ({selectedAssembly.parts.length})</label>
                  <ul className="assembly-parts-preview">
                    {selectedAssembly.parts.slice(0, 5).map((part, index) => (
                      <li key={index} className="assembly-part-preview-item">
                        <span className="part-name">{part.name}</span>
                        <span className="part-dims">
                          {formatMeasurementWithUnit(part.length, units)} ×{' '}
                          {formatMeasurementWithUnit(part.width, units)} ×{' '}
                          {formatMeasurementWithUnit(part.thickness, units)}
                        </span>
                      </li>
                    ))}
                    {selectedAssembly.parts.length > 5 && (
                      <li className="assembly-part-preview-more">
                        +{selectedAssembly.parts.length - 5} more parts
                      </li>
                    )}
                  </ul>
                </div>

                {/* Hint */}
                <div className="add-assembly-hint">
                  <p className="hint">
                    Want to create a new assembly? Save a selection as an assembly from the canvas context menu.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-sm btn-outlined btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-sm btn-filled btn-primary"
            onClick={handleAdd}
            disabled={!selectedAssemblyId}
          >
            Add to Project
          </button>
        </div>
      </div>
    </div>
  );
}
