/**
 * Dialog shown when exiting assembly editing mode with unsaved changes.
 * Offers options to save, discard, or cancel.
 */

interface AssemblyEditingExitDialogProps {
  isOpen: boolean;
  assemblyName: string;
  isCreatingNew?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function AssemblyEditingExitDialog({
  isOpen,
  assemblyName,
  isCreatingNew = false,
  onSave,
  onDiscard,
  onCancel
}: AssemblyEditingExitDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal max-w-[420px] w-[90vw]">
        <div className="modal-header">
          <h2>{isCreatingNew ? 'Save Assembly?' : 'Save Changes?'}</h2>
        </div>

        <div className="modal-body">
          <p className="m-0 mb-3 leading-relaxed">
            {isCreatingNew ? (
              <>
                You have unsaved changes to your new assembly <strong>{assemblyName}</strong>.
              </>
            ) : (
              <>
                You have unsaved changes to <strong>{assemblyName}</strong>.
              </>
            )}
          </p>
          <p className="m-0 leading-relaxed text-text-secondary">
            Do you want to save {isCreatingNew ? 'this assembly' : 'your changes'} to the library?
          </p>
        </div>

        <div className="modal-footer flex gap-2 justify-end">
          <button className="btn btn-sm btn-ghost btn-secondary mr-auto" onClick={onCancel}>
            Keep Editing
          </button>
          <button className="btn btn-sm btn-outlined btn-danger" onClick={onDiscard}>
            {isCreatingNew ? 'Discard' : 'Discard Changes'}
          </button>
          <button className="btn btn-sm btn-filled btn-primary" onClick={onSave} autoFocus>
            Save to Library
          </button>
        </div>
      </div>
    </div>
  );
}
