import { useEffect } from 'react';
import { Modal } from './Modal';

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
      className="confirm-dialog"
      role="alertdialog"
      footer={
        <>
          <button className="btn btn-sm btn-outlined btn-secondary" onClick={onCancel} title="Press Escape to cancel">
            {cancelLabel}
          </button>
          <button
            className={`btn btn-sm btn-filled ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            autoFocus
            title="Press Enter to confirm"
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="confirm-dialog-content">
        {variant === 'danger' && <div className="confirm-dialog-icon">⚠️</div>}
        <p>{message}</p>
      </div>
    </Modal>
  );
}
