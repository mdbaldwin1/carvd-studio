/**
 * Banner shown when editing an assembly in the 3D workspace.
 * Displays the assembly name (with inline editing) and provides save/cancel actions.
 */

import { Check, Pencil, Save, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Alert, AlertTitle } from '@renderer/components/ui/alert';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';

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
    <Alert className="rounded-none border-x-0 border-t-0 border-b-border bg-accent py-2 text-accent-foreground">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <AlertTitle className="flex items-center gap-2 text-accent-foreground">
            <span className="text-base">📦</span>
            <span>{isCreatingNew ? 'Creating new assembly:' : 'Editing assembly:'}</span>
            {isEditing ? (
              <span className="flex items-center gap-1">
                <Input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleConfirm}
                  className="h-7 w-48 border-black/30 bg-black/20 px-2 py-0.5 font-semibold text-accent-foreground focus-visible:outline-accent-foreground"
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-accent-foreground hover:bg-black/10"
                  onClick={handleConfirm}
                  title="Confirm name"
                >
                  <Check size={14} />
                </Button>
              </span>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="h-auto gap-1.5 rounded px-2 py-1 text-sm font-semibold text-accent-foreground hover:bg-black/10 hover:opacity-100"
                onClick={handleStartEditing}
                title="Click to rename"
              >
                <strong>{assemblyName}</strong>
                <Pencil size={12} className="opacity-60" />
              </Button>
            )}
          </AlertTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-accent-foreground hover:bg-black/10"
            onClick={onCancel}
            title="Cancel editing"
          >
            <X size={16} />
            Cancel
          </Button>
          <Button
            size="sm"
            className="!bg-bg-dark !text-text hover:!bg-border"
            onClick={onSave}
            title="Save changes to library"
          >
            <Save size={16} />
            Save to Library
          </Button>
        </div>
      </div>
    </Alert>
  );
}
