/**
 * Dialog shown when exiting assembly editing mode with unsaved changes.
 * Offers options to save, discard, or cancel.
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
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-w-[420px] w-[90vw]">
        <AlertDialogHeader>
          <AlertDialogTitle>{isCreatingNew ? 'Save Assembly?' : 'Save Changes?'}</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="px-5 py-4">
          <AlertDialogDescription asChild>
            <div>
              <p className="m-0 mb-3 leading-relaxed text-sm text-text-muted">
                {isCreatingNew ? (
                  <>
                    You have unsaved changes to your new assembly <strong className="text-text">{assemblyName}</strong>.
                  </>
                ) : (
                  <>
                    You have unsaved changes to <strong className="text-text">{assemblyName}</strong>.
                  </>
                )}
              </p>
              <p className="m-0 leading-relaxed text-sm text-text-secondary">
                Do you want to save {isCreatingNew ? 'this assembly' : 'your changes'} to the library?
              </p>
            </div>
          </AlertDialogDescription>
        </div>

        <AlertDialogFooter>
          <Button variant="ghost" size="sm" className="mr-auto" onClick={onCancel}>
            Keep Editing
          </Button>
          <Button variant="destructiveOutline" size="sm" onClick={onDiscard}>
            {isCreatingNew ? 'Discard' : 'Discard Changes'}
          </Button>
          <Button size="sm" onClick={onSave} autoFocus>
            Save to Library
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
