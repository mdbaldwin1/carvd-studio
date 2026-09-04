import { Button } from '@renderer/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@renderer/components/ui/alert-dialog';

interface PartCutsEditingExitDialogProps {
  isOpen: boolean;
  partName: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function PartCutsEditingExitDialog({
  isOpen,
  partName,
  onSave,
  onDiscard,
  onCancel
}: PartCutsEditingExitDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-w-[420px] w-[90vw]">
        <AlertDialogHeader>
          <AlertDialogTitle>Save Part Cuts?</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="px-5 py-4">
          <AlertDialogDescription asChild>
            <div>
              <p className="m-0 mb-3 leading-relaxed text-sm text-text-muted">
                You have unsaved cut edits for <strong className="text-text">{partName}</strong>.
              </p>
              <p className="m-0 leading-relaxed text-sm text-text-secondary">
                Save these operations to the part before leaving cuts mode?
              </p>
            </div>
          </AlertDialogDescription>
        </div>

        <AlertDialogFooter>
          <Button variant="ghost" size="sm" className="mr-auto" onClick={onCancel}>
            Keep Editing
          </Button>
          <Button variant="destructiveOutline" size="sm" onClick={onDiscard}>
            Discard
          </Button>
          <Button size="sm" onClick={onSave} autoFocus>
            Save
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
