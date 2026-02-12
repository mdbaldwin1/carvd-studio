import React, { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '../store/projectStore';
import { Assembly } from '../types';
import { HelpTooltip } from './HelpTooltip';

interface SaveAssemblyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (assembly: Assembly, addToLibrary: boolean) => void;
}

export function SaveAssemblyModal({ isOpen, onClose, onSave }: SaveAssemblyModalProps) {
  const createAssemblyFromSelection = useProjectStore((s) => s.createAssemblyFromSelection);
  const selectedPartIds = useProjectStore((s) => s.selectedPartIds);
  const selectedGroupIds = useProjectStore((s) => s.selectedGroupIds);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [addToLibrary, setAddToLibrary] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      // Generate a default name based on selection
      const partCount = selectedPartIds.length;
      const groupCount = selectedGroupIds.length;
      let defaultName = 'New Assembly';
      if (groupCount > 0 && partCount === 0) {
        defaultName = `Assembly (${groupCount} group${groupCount > 1 ? 's' : ''})`;
      } else if (partCount > 0) {
        defaultName = `Assembly (${partCount} part${partCount > 1 ? 's' : ''})`;
      }
      setName(defaultName);
      setDescription('');
      setAddToLibrary(true);
      setError(null);
    }
  }, [isOpen, selectedPartIds.length, selectedGroupIds.length]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!name.trim()) {
        setError('Please enter a name');
        return;
      }

      const assembly = createAssemblyFromSelection(name.trim(), description.trim() || undefined);

      if (!assembly) {
        setError('No parts selected to save');
        return;
      }

      onSave(assembly, addToLibrary);
      onClose();
    },
    [name, description, addToLibrary, createAssemblyFromSelection, onSave, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  const hasSelection = selectedPartIds.length > 0 || selectedGroupIds.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose} onKeyDown={handleKeyDown}>
      <div
        className="modal save-assembly-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-assembly-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="save-assembly-modal-title">Save as Assembly</h2>
          <button className="btn btn-icon-sm btn-ghost btn-secondary" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p className="modal-description">
              Save the current selection as a reusable assembly. You can place copies of this assembly on the canvas
              later.
            </p>

            {!hasSelection && <div className="modal-warning">No parts or groups selected.</div>}

            <div className="property-group">
              <label>Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="e.g., Drawer Assembly, Face Frame"
                autoFocus
              />
            </div>

            <div className="property-group">
              <label>Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='e.g., Standard drawer with 1/2" bottom, pocket screw joinery'
                rows={3}
              />
            </div>

            <div className="property-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={addToLibrary} onChange={(e) => setAddToLibrary(e.target.checked)} />
                Also add to my Assembly Library
                <HelpTooltip
                  text="If checked, this assembly will be available in all projects via the Stock/Assembly Library."
                  docsSection="assemblies"
                  inline
                />
              </label>
            </div>

            {error && <div className="modal-error">{error}</div>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-sm btn-ghost btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-sm btn-filled btn-primary" disabled={!hasSelection}>
              Save Assembly
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
