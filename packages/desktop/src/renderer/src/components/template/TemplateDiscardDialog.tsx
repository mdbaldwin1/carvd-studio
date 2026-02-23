import { Button } from '@renderer/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription
} from '@renderer/components/ui/alert-dialog';

interface TemplateDiscardDialogProps {
  isOpen: boolean;
  templateName: string;
  isCreatingNew?: boolean;
  onDiscard: () => void;
  onCancel: () => void;
}

export function TemplateDiscardDialog({
  isOpen,
  templateName,
  isCreatingNew = false,
  onDiscard,
  onCancel
}: TemplateDiscardDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-w-[30rem] w-[90vw]">
        <AlertDialogHeader>
          <AlertDialogTitle>Discard Changes?</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="px-5 py-4">
          <AlertDialogDescription asChild>
            <p>
              {isCreatingNew ? (
                <>Are you sure you want to discard this new template? Your changes will be lost.</>
              ) : (
                <>
                  Are you sure you want to discard changes to <strong>{templateName}</strong>? Your changes will be
                  lost.
                </>
              )}
            </p>
          </AlertDialogDescription>
        </div>

        <AlertDialogFooter>
          <Button variant="ghost" size="sm" className="mr-auto" onClick={onCancel}>
            Keep Editing
          </Button>
          <Button variant="destructive" size="sm" onClick={onDiscard}>
            Discard Changes
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
