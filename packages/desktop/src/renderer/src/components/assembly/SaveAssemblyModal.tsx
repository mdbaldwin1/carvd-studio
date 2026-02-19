import React, { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useSelectionStore } from '../../store/selectionStore';
import { Assembly } from '../../types';
import { Button } from '@renderer/components/ui/button';
import { Checkbox } from '@renderer/components/ui/checkbox';
import { HelpTooltip } from '../common/HelpTooltip';

interface SaveAssemblyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (assembly: Assembly, addToLibrary: boolean) => void;
}

export function SaveAssemblyModal({ isOpen, onClose, onSave }: SaveAssemblyModalProps) {
  const createAssemblyFromSelection = useProjectStore((s) => s.createAssemblyFromSelection);
  const selectedPartIds = useSelectionStore((s) => s.selectedPartIds);
  const selectedGroupIds = useSelectionStore((s) => s.selectedGroupIds);

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
    <div
      className="fixed inset-0 bg-overlay flex items-center justify-center z-[1100]"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-surface border border-border rounded-lg shadow-[0_8px_32px_var(--color-overlay)] max-w-[90vw] max-h-[85vh] flex flex-col animate-modal-fade-in w-[450px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-assembly-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center py-4 px-5 border-b border-border">
          <h2 id="save-assembly-modal-title" className="text-base font-semibold text-text m-0">
            Save as Assembly
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            ×
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 overflow-y-auto">
            <p className="text-[13px] text-text-muted mb-4 leading-relaxed">
              Save the current selection as a reusable assembly. You can place copies of this assembly on the canvas
              later.
            </p>

            {!hasSelection && (
              <div className="bg-warning-bg border border-warning text-warning py-2.5 px-3 rounded text-[13px] mb-4">
                No parts or groups selected.
              </div>
            )}

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
                className="w-full min-h-[60px] bg-bg border border-border text-text p-2 rounded text-[13px] font-[inherit] resize-y leading-snug focus:outline-none focus:border-accent placeholder:text-text-muted"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='e.g., Standard drawer with 1/2" bottom, pocket screw joinery'
                rows={3}
              />
            </div>

            <div className="property-group">
              <label className="flex items-center gap-2.5 cursor-pointer text-sm">
                <Checkbox
                  className="w-4 h-4"
                  checked={addToLibrary}
                  onChange={(e) => setAddToLibrary(e.target.checked)}
                />
                Also add to my Assembly Library
                <HelpTooltip
                  text="If checked, this assembly will be available in all projects via the Stock/Assembly Library."
                  docsSection="assemblies"
                  inline
                />
              </label>
            </div>

            {error && (
              <div className="bg-[rgba(196,84,84,0.15)] border border-[rgba(196,84,84,0.4)] text-danger py-2.5 px-3 rounded text-[13px] mt-3">
                {error}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 py-4 px-5 border-t border-border">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!hasSelection}>
              Save Assembly
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
