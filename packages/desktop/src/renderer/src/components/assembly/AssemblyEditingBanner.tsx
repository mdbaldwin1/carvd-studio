/**
 * Banner shown when editing an assembly in the 3D workspace.
 * Displays the assembly name (with inline editing) and provides save/cancel actions.
 */

import { Check, Pencil, Save, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface AssemblyEditingBannerProps {
  assemblyName: string;
  isCreatingNew?: boolean;
  onSave: () => void;
  onCancel: () => void;
  onRename?: (name: string) => void;
}

export function AssemblyEditingBanner({
  assemblyName,
  isCreatingNew = false,
  onSave,
  onCancel,
  onRename
}: AssemblyEditingBannerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(assemblyName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEditing = () => {
    setEditValue(assemblyName);
    setIsEditing(true);
  };

  const handleConfirm = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== assemblyName) {
      onRename?.(trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(assemblyName);
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-accent text-accent-foreground text-sm gap-4">
      <div className="flex items-center gap-2">
        <span className="text-base">📦</span>
        <span>{isCreatingNew ? 'Creating new assembly:' : 'Editing assembly:'}</span>
        {isEditing ? (
          <span className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleConfirm}
              className="bg-black/20 border border-black/30 rounded px-2 py-0.5 text-sm text-accent-foreground font-semibold outline-none focus:border-accent-foreground/50 w-48"
            />
            <button
              className="p-0.5 rounded hover:bg-black/10 cursor-pointer bg-transparent border-none text-accent-foreground"
              onClick={handleConfirm}
              title="Confirm name"
            >
              <Check size={14} />
            </button>
          </span>
        ) : (
          <button
            className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-accent-foreground font-semibold text-sm p-0 hover:opacity-80"
            onClick={handleStartEditing}
            title="Click to rename"
          >
            <strong>{assemblyName}</strong>
            <Pencil size={12} className="opacity-60" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          className="btn btn-sm btn-ghost btn-secondary text-accent-foreground border-black/20 hover:bg-black/10 hover:border-black/30"
          onClick={onCancel}
          title="Cancel editing"
        >
          <X size={16} />
          Cancel
        </button>
        <button
          className="btn btn-sm btn-filled btn-primary !bg-bg-dark !text-text hover:!bg-border"
          onClick={onSave}
          title="Save changes to library"
        >
          <Save size={16} />
          Save to Library
        </button>
      </div>
    </div>
  );
}
