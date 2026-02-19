import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@renderer/components/ui/dialog';

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
 *
 * Built on top of the Dialog primitives from `ui/dialog.tsx`.
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
  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeOnEscape ? handleOpenChange : () => {}}>
      <DialogContent
        className={className}
        onClose={closeOnBackdrop ? onClose : () => {}}
        role={role}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {showCloseButton && <DialogClose onClose={onClose} />}
        </DialogHeader>
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
