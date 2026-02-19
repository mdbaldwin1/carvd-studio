/**
 * Dialog prompting user to restore from an auto-recovery file
 */

import { Button } from '@renderer/components/ui/button';

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
    <div className="modal-overlay fixed inset-0 bg-overlay flex items-center justify-center z-[1001]">
      <div className="modal bg-surface border border-border rounded-lg shadow-[0_8px_32px_var(--color-overlay)] max-w-[450px] max-h-[85vh] flex flex-col animate-modal-fade-in">
        <div className="flex justify-between items-center py-4 px-5 border-b border-border">
          <h2 className="m-0 text-base font-semibold text-text">Recover Unsaved Work</h2>
        </div>

        <div className="p-5 overflow-y-auto">
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

        <div className="py-3 px-5 border-t border-border flex gap-2 justify-end">
          <Button size="sm" variant="secondary" className="min-w-[90px]" onClick={onDiscard}>
            Discard
          </Button>
          <Button size="sm" className="min-w-[90px]" onClick={onRestore} autoFocus>
            Restore
          </Button>
        </div>
      </div>
    </div>
  );
}
