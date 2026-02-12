import React, { useEffect } from 'react';
import { useBackdropClose } from '../hooks/useBackdropClose';

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
  const { handleMouseDown, handleClick } = useBackdropClose(onCancel);

  // Handle keyboard shortcuts (Escape to cancel, Enter to confirm)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onMouseDown={handleMouseDown} onClick={handleClick}>
      <div className="modal confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <div className="modal-header">
          <h2 id="confirm-dialog-title">{title}</h2>
          <button className="modal-close" onClick={onCancel} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="confirm-dialog-content">
          {variant === 'danger' && <div className="confirm-dialog-icon">⚠️</div>}
          <p>{message}</p>
        </div>

        <div className="modal-footer">
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
        </div>
      </div>
    </div>
  );
}
