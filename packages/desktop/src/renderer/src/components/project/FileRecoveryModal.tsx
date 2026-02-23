import { AlertTriangle, CheckCircle, XCircle, FileWarning } from 'lucide-react';
import { FileRepairResult, getFileSummary } from '../../utils/fileFormat';
import { Button } from '@renderer/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog';

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
  const hasRepairResult = repairResult !== null;
  const repairSuccessful = repairResult?.success ?? false;

  // Get summary of repaired data
  const summary = repairResult?.repairedData ? getFileSummary(repairResult.repairedData) : null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="w-[620px] max-w-[92vw] max-h-[86vh]" onClose={() => {}}>
        <DialogHeader className="items-center justify-start gap-3">
          <FileWarning size={24} className="text-warning" />
          <DialogTitle>File Recovery Required</DialogTitle>
        </DialogHeader>

        <div className="p-5 overflow-y-auto">
          <p className="text-[14px] font-semibold text-text mb-4">
            <strong>{fileName}</strong>
          </p>

          {/* Initial state - show errors and offer repair */}
          {!hasRepairResult && (
            <>
              <Card className="mb-5 border-border bg-bg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Issues Found</CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>

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

        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
