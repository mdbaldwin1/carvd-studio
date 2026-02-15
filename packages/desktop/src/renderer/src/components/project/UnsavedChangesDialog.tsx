/**
 * Dialog prompting user to save unsaved changes before a destructive action
 */

import { useProjectStore } from '../../store/projectStore';
import './UnsavedChangesDialog.css';

export type UnsavedChangesAction = 'new' | 'open' | 'close' | 'home' | 'custom';

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  action: UnsavedChangesAction;
  customMessage?: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function UnsavedChangesDialog({
  isOpen,
  action,
  customMessage,
  onSave,
  onDiscard,
  onCancel
}: UnsavedChangesDialogProps) {
  const projectName = useProjectStore((s) => s.projectName);

  if (!isOpen) return null;

  const getMessage = () => {
    if (customMessage) return customMessage;

    switch (action) {
      case 'new':
        return `Do you want to save changes to "${projectName}" before creating a new project?`;
      case 'open':
        return `Do you want to save changes to "${projectName}" before opening another project?`;
      case 'close':
        return `Do you want to save changes to "${projectName}" before closing?`;
      case 'home':
        return `Do you want to save changes to "${projectName}" before returning to the start screen?`;
      default:
        return `Do you want to save changes to "${projectName}"?`;
    }
  };

  const getDiscardLabel = () => {
    switch (action) {
      case 'new':
      case 'open':
      case 'close':
      case 'home':
        return "Don't Save";
      default:
        return 'Discard';
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal unsaved-changes-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Unsaved Changes</h2>
        </div>

        <div className="modal-body">
          <p className="unsaved-changes-message">{getMessage()}</p>
          <p className="unsaved-changes-warning">Your changes will be lost if you don't save them.</p>
        </div>

        <div className="modal-footer unsaved-changes-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onDiscard}>
            {getDiscardLabel()}
          </button>
          <button className="btn btn-primary" onClick={onSave} autoFocus>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
