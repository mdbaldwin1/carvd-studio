import {
  Children,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode
} from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@renderer/lib/utils';

interface DialogProps extends ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {
  open: boolean;
}

function Dialog({ open, onOpenChange, children, ...props }: DialogProps) {
  // Compatibility for existing tests/components that dispatch Escape on window.
  useEffect(() => {
    if (!open || !onOpenChange) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} {...props}>
      {children}
    </DialogPrimitive.Root>
  );
}

const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        'fixed inset-0 z-[1100] bg-overlay',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:pointer-events-none',
        className
      )}
      {...props}
    />
  );
});

interface DialogContentProps extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Optional compatibility prop used to customize outside-click behavior. */
  onClose?: () => void;
}

function hasDialogTitle(children: ReactNode): boolean {
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue;

    if (child.type === DialogTitle || child.type === DialogPrimitive.Title) {
      return true;
    }

    if (hasDialogTitle(child.props?.children)) {
      return true;
    }
  }

  return false;
}

const DialogContent = forwardRef<ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(function DialogContent(
  { className, children, onClose, onInteractOutside, onEscapeKeyDown, role = 'dialog', ...props },
  ref
) {
  const shouldRenderFallbackTitle = !hasDialogTitle(children);
  const mouseDownOnBackdrop = useRef(false);
  const handleBackdropMouseDown = useCallback((event: MouseEvent<HTMLDivElement>) => {
    mouseDownOnBackdrop.current = event.target === event.currentTarget;
  }, []);
  const handleBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget && mouseDownOnBackdrop.current) {
        onClose?.();
      }
      mouseDownOnBackdrop.current = false;
    },
    [onClose]
  );

  return (
    <DialogPortal>
      <DialogOverlay onMouseDown={handleBackdropMouseDown} onClick={handleBackdropClick} />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-1/2 top-1/2 z-[1101] w-full max-w-[90vw] max-h-[85vh] -translate-x-1/2 -translate-y-1/2',
          'flex flex-col rounded-lg border border-border bg-surface',
          'shadow-[0_8px_32px_var(--color-overlay)]',
          className
        )}
        role={role}
        aria-modal="true"
        aria-describedby={props['aria-describedby'] ?? undefined}
        onInteractOutside={(event) => {
          const target = event.target as HTMLElement | null;
          // Allow interacting with nested Radix floating layers (dropdowns, popovers, tooltips)
          // that render in portals outside the dialog content.
          if (target?.closest('[data-radix-popper-content-wrapper]')) {
            event.preventDefault();
            return;
          }
          if (onClose) {
            event.preventDefault();
            onClose();
            return;
          }
          onInteractOutside?.(event);
        }}
        onEscapeKeyDown={(event) => {
          if (onClose) {
            event.preventDefault();
            onClose();
          }
          onEscapeKeyDown?.(event);
        }}
        {...props}
      >
        {shouldRenderFallbackTitle && <DialogPrimitive.Title className="sr-only">Dialog</DialogPrimitive.Title>}
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});

const DialogHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function DialogHeader(
  { className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn('flex items-center justify-between border-b border-border px-5 py-4', className)}
      {...props}
    />
  );
});

const DialogTitle = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function DialogTitle({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Title ref={ref} className={cn('m-0 text-base font-semibold text-text', className)} {...props} />
  );
});

const DialogDescription = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(function DialogDescription({ className, ...props }, ref) {
  return <DialogPrimitive.Description ref={ref} className={cn('text-sm text-text-muted', className)} {...props} />;
});

const DialogFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function DialogFooter(
  { className, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn('flex justify-end gap-2 border-t border-border px-5 py-4', className)} {...props} />
  );
});

interface DialogCloseProps extends ComponentPropsWithoutRef<typeof DialogPrimitive.Close> {
  onClose?: () => void;
}

const DialogClose = forwardRef<ElementRef<typeof DialogPrimitive.Close>, DialogCloseProps>(function DialogClose(
  { className, onClose, children, ...props },
  ref
) {
  return (
    <DialogPrimitive.Close
      ref={ref}
      className={cn(
        'cursor-pointer border-none bg-transparent p-0 text-2xl leading-none text-text-muted',
        'transition-colors duration-150 hover:text-text',
        className
      )}
      onClick={(event) => {
        if (onClose) {
          event.preventDefault();
          onClose();
        }
        props.onClick?.(event);
      }}
      aria-label="Close"
      {...props}
    >
      {children ?? '\u00d7'}
    </DialogPrimitive.Close>
  );
});

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
};
