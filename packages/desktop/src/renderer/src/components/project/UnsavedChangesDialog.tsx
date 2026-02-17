/**
 * Dialog prompting user to save unsaved changes before a destructive action
 */

import { useProjectStore } from '../../store/projectStore';

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
      <div className="modal max-w-[420px]" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Unsaved Changes</h2>
        </div>

        <div className="modal-body">
          <p className="mb-2 text-sm text-text leading-relaxed">{getMessage()}</p>
          <p className="m-0 text-[13px] text-text-muted">Your changes will be lost if you don&apos;t save them.</p>
        </div>

        <div className="modal-footer flex gap-2 justify-end">
          <button className="btn btn-secondary min-w-22.5" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn min-w-22.5 bg-transparent border border-border text-danger hover:bg-danger hover:border-danger hover:text-white"
            onClick={onDiscard}
          >
            {getDiscardLabel()}
          </button>
          <button className="btn btn-primary min-w-22.5" onClick={onSave} autoFocus>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
