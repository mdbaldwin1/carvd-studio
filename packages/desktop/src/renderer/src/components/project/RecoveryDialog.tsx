/**
 * Dialog prompting user to restore from an auto-recovery file
 */

interface RecoveryInfo {
  projectName: string;
  modifiedAt: string;
  fileName: string;
}

interface RecoveryDialogProps {
  isOpen: boolean;
  recoveryInfo: RecoveryInfo | null;
  onRestore: () => void;
  onDiscard: () => void;
}

export function RecoveryDialog({ isOpen, recoveryInfo, onRestore, onDiscard }: RecoveryDialogProps) {
  if (!isOpen || !recoveryInfo) return null;

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  return (
    <div className="modal-overlay z-[1001]">
      <div className="modal max-w-[450px]">
        <div className="modal-header">
          <h2>Recover Unsaved Work</h2>
        </div>

        <div className="modal-body">
          <p className="m-0 mb-4 text-sm text-text leading-relaxed">
            A recovery file was found from a previous session that may not have been saved properly.
          </p>

          <div className="bg-surface-hover rounded-md px-4 py-3 mb-4">
            <div className="flex gap-2 mb-2">
              <span className="text-[13px] text-text-muted min-w-[100px]">Project:</span>
              <span className="text-[13px] text-text font-medium">{recoveryInfo.projectName}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[13px] text-text-muted min-w-[100px]">Last Modified:</span>
              <span className="text-[13px] text-text font-medium">{formatDate(recoveryInfo.modifiedAt)}</span>
            </div>
          </div>

          <p className="m-0 text-sm text-text">Would you like to restore this work?</p>
        </div>

        <div className="modal-footer flex gap-2 justify-end">
          <button className="btn btn-secondary min-w-[90px]" onClick={onDiscard}>
            Discard
          </button>
          <button className="btn btn-primary min-w-[90px]" onClick={onRestore} autoFocus>
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}
