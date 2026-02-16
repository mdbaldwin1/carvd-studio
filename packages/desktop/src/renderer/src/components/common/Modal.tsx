import { useEffect, useId } from 'react';
import { useBackdropClose } from '../../hooks/useBackdropClose';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  className?: string;
  role?: 'dialog' | 'alertdialog';
  children: React.ReactNode;
  footer?: React.ReactNode;
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  className,
  role = 'dialog',
  children,
  footer,
  showCloseButton = true,
  closeOnEscape = true,
  closeOnBackdrop = true
}: ModalProps) {
  const titleId = useId();
  const { handleMouseDown, handleClick } = useBackdropClose(onClose);

  useEffect(() => {
    if (!closeOnEscape) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, closeOnEscape]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={closeOnBackdrop ? handleMouseDown : undefined}
      onClick={closeOnBackdrop ? handleClick : undefined}
    >
      <div className={`modal ${className || ''}`} role={role} aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          {showCloseButton && (
            <button className="modal-close" onClick={onClose} aria-label="Close">
              &times;
            </button>
          )}
        </div>
        {children}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
