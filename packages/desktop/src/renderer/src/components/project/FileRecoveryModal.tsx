import { AlertTriangle, CheckCircle, XCircle, FileWarning } from 'lucide-react';
import { FileRepairResult, getFileSummary } from '../../utils/fileFormat';
import { Button } from '@renderer/components/ui/button';

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
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-[1100]">
      <div className="bg-surface border border-border rounded-lg shadow-[0_8px_32px_var(--color-overlay)] w-[90%] max-w-[500px] max-h-[85vh] flex flex-col animate-modal-fade-in">
        <div className="flex items-center gap-3 py-4 px-5 border-b border-border">
          <FileWarning size={24} className="text-warning" />
          <h2 className="text-base font-semibold text-text m-0">File Recovery Required</h2>
        </div>

        <div className="p-5 overflow-y-auto">
          <p className="text-[14px] font-semibold text-text mb-4">
            <strong>{fileName}</strong>
          </p>

          {/* Initial state - show errors and offer repair */}
          {!hasRepairResult && (
            <>
              <div className="mb-5">
                <h3 className="text-[15px] font-semibold text-text m-0 mb-2">Issues Found</h3>
                <p className="text-[13px] text-text-secondary leading-relaxed mb-3">
                  This file contains data integrity issues that prevent it from being opened normally.
                </p>
                <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
                  {errors.map((error, index) => (
                    <li key={index} className="flex items-start gap-2 text-[13px] py-1 text-danger">
                      <XCircle size={14} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3 p-3 bg-warning-bg border border-warning rounded text-[13px] text-warning mt-4">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p className="m-0 leading-relaxed">
                  Attempting recovery may result in some data loss (e.g., broken group structures). Your original file
                  will not be modified until you save the recovered project.
                </p>
              </div>
            </>
          )}

          {/* Repair in progress */}
          {isRepairing && (
            <div className="mb-5">
              <p>Attempting to repair file...</p>
            </div>
          )}

          {/* Repair result - success */}
          {hasRepairResult && repairSuccessful && (
            <>
              <div className="mb-5">
                <h3 className="text-[15px] font-semibold text-success m-0 mb-2 flex items-center gap-2">
                  <CheckCircle size={18} />
                  Recovery Successful
                </h3>
                <p className="text-[13px] text-text-secondary leading-relaxed mb-3">
                  The file has been repaired. Please review the changes below before accepting.
                </p>
              </div>

              {repairResult.repairActions.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-[14px] font-semibold text-text m-0 mb-2">Repairs Made</h4>
                  <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
                    {repairResult.repairActions.map((action, index) => (
                      <li key={index} className="flex items-start gap-2 text-[13px] py-1 text-success">
                        <CheckCircle size={14} className="shrink-0 mt-0.5" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {repairResult.warnings.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-[14px] font-semibold text-text m-0 mb-2">Warnings</h4>
                  <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
                    {repairResult.warnings.map((warning, index) => (
                      <li key={index} className="flex items-start gap-2 text-[13px] py-1 text-warning">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary && (
                <div className="mt-4 p-4 bg-bg border border-border rounded">
                  <h4 className="text-[14px] font-semibold text-text m-0 mb-3">Recovered Data</h4>
                  <div className="flex gap-6 justify-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[18px] font-semibold text-text">{summary.parts}</span>
                      <span className="text-[12px] text-text-muted">Parts</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[18px] font-semibold text-text">{summary.stocks}</span>
                      <span className="text-[12px] text-text-muted">Stocks</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[18px] font-semibold text-text">{summary.groups}</span>
                      <span className="text-[12px] text-text-muted">Groups</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Repair result - failure */}
          {hasRepairResult && !repairSuccessful && (
            <div className="mb-5">
              <h3 className="text-[15px] font-semibold text-danger m-0 mb-2 flex items-center gap-2">
                <XCircle size={18} />
                Recovery Failed
              </h3>
              <p className="text-[13px] text-text-secondary leading-relaxed mb-3">
                The file could not be automatically repaired. The following issues remain:
              </p>
              <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
                {repairResult.remainingErrors.map((error, index) => (
                  <li key={index} className="flex items-start gap-2 text-[13px] py-1 text-danger">
                    <XCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 py-4 px-5 border-t border-border">
          {/* Initial state buttons */}
          {!hasRepairResult && !isRepairing && (
            <>
              <Button size="sm" variant="secondary" onClick={onReject}>
                Cancel
              </Button>
              <Button size="sm" onClick={onAttemptRepair}>
                Attempt Recovery
              </Button>
            </>
          )}

          {/* Repair successful buttons */}
          {hasRepairResult && repairSuccessful && (
            <>
              <Button size="sm" variant="secondary" onClick={onReject}>
                Reject & Cancel
              </Button>
              <Button size="sm" onClick={onAcceptRepair}>
                Accept & Open
              </Button>
            </>
          )}

          {/* Repair failed buttons */}
          {hasRepairResult && !repairSuccessful && (
            <Button size="sm" variant="secondary" onClick={onReject}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
