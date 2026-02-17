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
    <div className="modal-overlay fixed inset-0 bg-overlay flex items-center justify-center z-[1100]">
      <div className="modal bg-surface border border-border rounded-lg shadow-[0_8px_32px_var(--color-overlay)] max-w-[420px] w-[90vw] max-h-[85vh] flex flex-col animate-modal-fade-in">
        <div className="flex justify-between items-center py-4 px-5 border-b border-border">
          <h2 className="m-0 text-base font-semibold text-text">
            {isCreatingNew ? 'Save Assembly?' : 'Save Changes?'}
          </h2>
        </div>

        <div className="p-5 overflow-y-auto">
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

        <div className="py-3 px-5 border-t border-border flex gap-2 justify-end">
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
