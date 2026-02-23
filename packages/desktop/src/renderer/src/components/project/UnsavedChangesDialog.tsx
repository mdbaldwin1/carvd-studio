/**
 * Dialog prompting user to save unsaved changes before a destructive action
 */

import { useProjectStore } from '../../store/projectStore';
import { Button } from '@renderer/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription
} from '@renderer/components/ui/alert-dialog';

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
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-w-[420px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="px-5 py-4">
          <AlertDialogDescription className="mb-2">{getMessage()}</AlertDialogDescription>
          <p className="m-0 text-[13px] text-text-muted">Your changes will be lost if you don&apos;t save them.</p>
        </div>

        <AlertDialogFooter>
          <Button size="sm" variant="secondary" className="min-w-[90px]" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" variant="destructiveOutline" className="min-w-[90px]" onClick={onDiscard}>
            {getDiscardLabel()}
          </Button>
          <Button size="sm" className="min-w-[90px]" onClick={onSave} autoFocus>
            Save
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
