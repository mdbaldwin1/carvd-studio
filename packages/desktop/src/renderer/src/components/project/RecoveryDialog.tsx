/**
 * Dialog prompting user to restore from an auto-recovery file
 */

import { Button } from '@renderer/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription
} from '@renderer/components/ui/alert-dialog';

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
  if (!recoveryInfo) return null;

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-[450px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Recover Unsaved Work</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="px-5 py-4">
          <AlertDialogDescription className="mb-4">
            A recovery file was found from a previous session that may not have been saved properly.
          </AlertDialogDescription>

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

        <AlertDialogFooter>
          <Button size="sm" variant="secondary" className="min-w-[90px]" onClick={onDiscard}>
            Discard
          </Button>
          <Button size="sm" className="min-w-[90px]" onClick={onRestore} autoFocus>
            Restore
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
