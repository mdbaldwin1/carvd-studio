/**
 * Banner shown when editing an assembly in the 3D workspace.
 * Displays the assembly name and provides save/cancel actions.
 */

import { Save, X } from 'lucide-react';
import './AssemblyEditingBanner.css';

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
    <div className="assembly-editing-banner">
      <div className="banner-content">
        <span className="banner-icon">📦</span>
        <span className="banner-text">
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
      <div className="banner-actions">
        <button className="btn btn-sm btn-ghost btn-secondary" onClick={onCancel} title="Cancel editing">
          <X size={16} />
          Cancel
        </button>
        <button className="btn btn-sm btn-filled btn-primary" onClick={onSave} title="Save changes to library">
          <Save size={16} />
          Save to Library
        </button>
      </div>
    </div>
  );
}
