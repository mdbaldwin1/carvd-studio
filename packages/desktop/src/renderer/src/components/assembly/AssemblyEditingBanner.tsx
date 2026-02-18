/**
 * Banner shown when editing an assembly in the 3D workspace.
 * Displays the assembly name and provides save/cancel actions.
 */

import { Save, X } from 'lucide-react';

interface AssemblyEditingBannerProps {
  assemblyName: string;
  isCreatingNew?: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function AssemblyEditingBanner({
  assemblyName,
  isCreatingNew = false,
  onSave,
  onCancel
}: AssemblyEditingBannerProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-accent text-accent-foreground text-sm gap-4">
      <div className="flex items-center gap-2">
        <span className="text-base">📦</span>
        <span>
          {isCreatingNew ? (
            <>
              Creating new assembly: <strong>{assemblyName}</strong>
            </>
          ) : (
            <>
              Editing assembly: <strong>{assemblyName}</strong>
            </>
          )}
        </span>
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
