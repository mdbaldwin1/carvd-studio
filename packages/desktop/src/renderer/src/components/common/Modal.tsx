import { useEffect, useId } from 'react';
import { useBackdropClose } from '../../hooks/useBackdropClose';

/** Props for the {@link Modal} component. */
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

/**
 * Base modal dialog with backdrop, title bar, and close button.
 *
 * All application modals should use this as their foundation.
 * Supports Escape-to-close and click-outside-to-close by default.
 * Renders with `aria-modal="true"` and `aria-labelledby` for accessibility.
 */
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
      className="fixed inset-0 bg-overlay flex items-center justify-center z-[1100]"
      onMouseDown={closeOnBackdrop ? handleMouseDown : undefined}
      onClick={closeOnBackdrop ? handleClick : undefined}
    >
      <div
        className={`bg-surface border border-border rounded-lg shadow-[0_8px_32px_var(--color-overlay)] max-w-[90vw] max-h-[85vh] flex flex-col animate-modal-fade-in ${className || ''}`}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex justify-between items-center py-4 px-5 border-b border-border">
          <h2 id={titleId} className="text-base font-semibold text-text m-0">
            {title}
          </h2>
          {showCloseButton && (
            <button
              className="bg-transparent border-none text-text-muted text-2xl cursor-pointer p-0 leading-none transition-colors duration-150 hover:text-text"
              onClick={onClose}
              aria-label="Close"
            >
              &times;
            </button>
          )}
        </div>
        {children}
        {footer && <div className="flex justify-end gap-2 py-4 px-5 border-t border-border">{footer}</div>}
      </div>
    </div>
  );
}
