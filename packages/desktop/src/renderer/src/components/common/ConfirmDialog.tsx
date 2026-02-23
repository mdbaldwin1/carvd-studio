import { useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel
} from '@renderer/components/ui/alert-dialog';
import { buttonVariants } from '@renderer/components/ui/button';
import { cn } from '@renderer/lib/utils';

/** Props for the {@link ConfirmDialog} component. */
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation dialog for destructive or significant actions.
 *
 * Built on shadcn AlertDialog (Radix). Supports Enter to confirm
 * and Escape to cancel. Set `variant="danger"` for destructive actions.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  // Handle Enter key to confirm
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm]);

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="w-[400px]">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="px-5 py-4">
          {variant === 'danger' && <div className="text-4xl mb-3">⚠️</div>}
          <AlertDialogDescription className="m-0">{message}</AlertDialogDescription>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            autoFocus
            className={cn(
              variant === 'danger'
                ? buttonVariants({ variant: 'destructive', size: 'sm' })
                : buttonVariants({ size: 'sm' })
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
