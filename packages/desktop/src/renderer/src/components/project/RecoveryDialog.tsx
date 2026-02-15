/**
 * Dialog prompting user to restore from an auto-recovery file
 */

import './RecoveryDialog.css';

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
    <div className="modal-overlay">
      <div className="modal recovery-dialog">
        <div className="modal-header">
          <h2>Recover Unsaved Work</h2>
        </div>

        <div className="modal-body">
          <p className="recovery-message">
            A recovery file was found from a previous session that may not have been saved properly.
          </p>

          <div className="recovery-details">
            <div className="recovery-detail">
              <span className="label">Project:</span>
              <span className="value">{recoveryInfo.projectName}</span>
            </div>
            <div className="recovery-detail">
              <span className="label">Last Modified:</span>
              <span className="value">{formatDate(recoveryInfo.modifiedAt)}</span>
            </div>
          </div>

          <p className="recovery-question">Would you like to restore this work?</p>
        </div>

        <div className="modal-footer recovery-actions">
          <button className="btn btn-secondary" onClick={onDiscard}>
            Discard
          </button>
          <button className="btn btn-primary" onClick={onRestore} autoFocus>
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}
