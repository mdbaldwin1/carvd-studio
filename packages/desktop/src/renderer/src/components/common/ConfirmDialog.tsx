import { useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from '@renderer/components/ui/button';

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
 * Uses {@link Modal} with `role="alertdialog"`. Supports Enter to confirm
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
  // Handle Enter key to confirm (Escape is handled by Modal)
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
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      className="w-[400px]"
      role="alertdialog"
      footer={
        <>
          <Button size="sm" variant="outline" onClick={onCancel} title="Press Escape to cancel">
            {cancelLabel}
          </Button>
          <Button
            size="sm"
            variant={variant === 'danger' ? 'destructive' : 'default'}
            onClick={onConfirm}
            autoFocus
            title="Press Enter to confirm"
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="p-5">
        {variant === 'danger' && <div className="text-4xl mb-3">⚠️</div>}
        <p className="m-0 leading-relaxed">{message}</p>
      </div>
    </Modal>
  );
}
