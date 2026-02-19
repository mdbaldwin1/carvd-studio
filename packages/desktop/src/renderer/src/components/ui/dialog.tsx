import { forwardRef, useCallback, useEffect, useId, useRef, type HTMLAttributes } from 'react';
import { cn } from '@renderer/lib/utils';

/* ---------------------------------- Root ---------------------------------- */

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

/**
 * Root Dialog wrapper. Controls visibility and provides close behavior.
 * Does not render anything when closed.
 */
function Dialog({ open, onOpenChange, children }: DialogProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;
  return <>{children}</>;
}

/* -------------------------------- Overlay --------------------------------- */

const DialogOverlay = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function DialogOverlay(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn('fixed inset-0 bg-overlay z-[1100]', className)} {...props} />;
});

/* -------------------------------- Content --------------------------------- */

interface DialogContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Called when backdrop is clicked or Escape is pressed. Required. */
  onClose: () => void;
  /** ARIA role. Defaults to 'dialog'. */
  role?: 'dialog' | 'alertdialog';
}

/**
 * Dialog content panel with overlay backdrop.
 *
 * Handles backdrop click-to-close using the mousedown+mouseup pattern
 * (prevents accidental closes when dragging to select text in inputs).
 */
const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(function DialogContent(
  { className, onClose, role = 'dialog', children, ...props },
  ref
) {
  const titleId = useId();
  const mouseDownOnBackdrop = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownOnBackdrop.current = e.target === e.currentTarget;
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && mouseDownOnBackdrop.current) {
        onClose();
      }
      mouseDownOnBackdrop.current = false;
    },
    [onClose]
  );

  return (
    <div
      className="fixed inset-0 bg-overlay flex items-center justify-center z-[1100]"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div
        ref={ref}
        className={cn(
          'bg-surface border border-border rounded-lg',
          'shadow-[0_8px_32px_var(--color-overlay)]',
          'max-w-[90vw] max-h-[85vh] flex flex-col',
          'animate-modal-fade-in',
          className
        )}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        {...props}
      >
        {children}
      </div>
    </div>
  );
});

/* -------------------------------- Header --------------------------------- */

const DialogHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function DialogHeader(
  { className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn('flex justify-between items-center py-4 px-5 border-b border-border', className)}
      {...props}
    />
  );
});

/* --------------------------------- Title --------------------------------- */

const DialogTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(function DialogTitle(
  { className, ...props },
  ref
) {
  return <h2 ref={ref} className={cn('text-base font-semibold text-text m-0', className)} {...props} />;
});

/* ------------------------------ Description ------------------------------ */

const DialogDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  function DialogDescription({ className, ...props }, ref) {
    return <p ref={ref} className={cn('text-sm text-text-muted', className)} {...props} />;
  }
);

/* -------------------------------- Footer --------------------------------- */

const DialogFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function DialogFooter(
  { className, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn('flex justify-end gap-2 py-4 px-5 border-t border-border', className)} {...props} />
  );
});

/* --------------------------------- Close --------------------------------- */

interface DialogCloseProps extends HTMLAttributes<HTMLButtonElement> {
  onClose: () => void;
}

/** Default close button (×) for the dialog header. */
const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(function DialogClose(
  { className, onClose, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        'bg-transparent border-none text-text-muted text-2xl cursor-pointer p-0 leading-none',
        'transition-colors duration-150 hover:text-text',
        className
      )}
      onClick={onClose}
      aria-label="Close"
      {...props}
    >
      &times;
    </button>
  );
});

export {
  Dialog,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
};
