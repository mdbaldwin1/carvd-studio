import { AlertTriangle, CheckCircle, XCircle, FileWarning } from 'lucide-react';
import { FileRepairResult, getFileSummary, CarvdFile } from '../../utils/fileFormat';

interface FileRecoveryModalProps {
  isOpen: boolean;
  fileName: string;
  errors: string[];
  repairResult: FileRepairResult | null;
  onAttemptRepair: () => void;
  onAcceptRepair: () => void;
  onReject: () => void;
  isRepairing: boolean;
}

export function FileRecoveryModal({
  isOpen,
  fileName,
  errors,
  repairResult,
  onAttemptRepair,
  onAcceptRepair,
  onReject,
  isRepairing
}: FileRecoveryModalProps) {
  if (!isOpen) return null;

  const hasRepairResult = repairResult !== null;
  const repairSuccessful = repairResult?.success ?? false;

  // Get summary of repaired data
  const summary = repairResult?.repairedData ? getFileSummary(repairResult.repairedData) : null;

  return (
    <div className="modal-overlay">
      <div className="modal file-recovery-modal">
        <div className="modal-header">
          <FileWarning size={24} className="modal-icon warning" />
          <h2>File Recovery Required</h2>
        </div>

        <div className="modal-body">
          <p className="file-name">
            <strong>{fileName}</strong>
          </p>

          {/* Initial state - show errors and offer repair */}
          {!hasRepairResult && (
            <>
              <div className="recovery-section">
                <h3>Issues Found</h3>
                <p className="recovery-description">
                  This file contains data integrity issues that prevent it from being opened normally.
                </p>
                <ul className="error-list">
                  {errors.map((error, index) => (
                    <li key={index} className="error-item">
                      <XCircle size={14} />
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="recovery-warning">
                <AlertTriangle size={16} />
                <p>
                  Attempting recovery may result in some data loss (e.g., broken group structures). Your original file
                  will not be modified until you save the recovered project.
                </p>
              </div>
            </>
          )}

          {/* Repair in progress */}
          {isRepairing && (
            <div className="recovery-section">
              <p>Attempting to repair file...</p>
            </div>
          )}

          {/* Repair result - success */}
          {hasRepairResult && repairSuccessful && (
            <>
              <div className="recovery-section success">
                <h3>
                  <CheckCircle size={18} />
                  Recovery Successful
                </h3>
                <p className="recovery-description">
                  The file has been repaired. Please review the changes below before accepting.
                </p>
              </div>

              {repairResult.repairActions.length > 0 && (
                <div className="recovery-section">
                  <h4>Repairs Made</h4>
                  <ul className="action-list">
                    {repairResult.repairActions.map((action, index) => (
                      <li key={index} className="action-item">
                        <CheckCircle size={14} />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {repairResult.warnings.length > 0 && (
                <div className="recovery-section">
                  <h4>Warnings</h4>
                  <ul className="warning-list">
                    {repairResult.warnings.map((warning, index) => (
                      <li key={index} className="warning-item">
                        <AlertTriangle size={14} />
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary && (
                <div className="recovery-summary">
                  <h4>Recovered Data</h4>
                  <div className="summary-stats">
                    <div className="stat">
                      <span className="stat-value">{summary.parts}</span>
                      <span className="stat-label">Parts</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{summary.stocks}</span>
                      <span className="stat-label">Stocks</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{summary.groups}</span>
                      <span className="stat-label">Groups</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Repair result - failure */}
          {hasRepairResult && !repairSuccessful && (
            <div className="recovery-section failure">
              <h3>
                <XCircle size={18} />
                Recovery Failed
              </h3>
              <p className="recovery-description">
                The file could not be automatically repaired. The following issues remain:
              </p>
              <ul className="error-list">
                {repairResult.remainingErrors.map((error, index) => (
                  <li key={index} className="error-item">
                    <XCircle size={14} />
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {/* Initial state buttons */}
          {!hasRepairResult && !isRepairing && (
            <>
              <button className="btn btn-secondary" onClick={onReject}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={onAttemptRepair}>
                Attempt Recovery
              </button>
            </>
          )}

          {/* Repair successful buttons */}
          {hasRepairResult && repairSuccessful && (
            <>
              <button className="btn btn-secondary" onClick={onReject}>
                Reject & Cancel
              </button>
              <button className="btn btn-primary" onClick={onAcceptRepair}>
                Accept & Open
              </button>
            </>
          )}

          {/* Repair failed buttons */}
          {hasRepairResult && !repairSuccessful && (
            <button className="btn btn-secondary" onClick={onReject}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
