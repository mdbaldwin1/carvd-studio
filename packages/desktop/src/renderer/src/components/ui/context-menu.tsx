import { forwardRef, type ComponentPropsWithoutRef, type HTMLAttributes } from 'react';
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import { cn } from '@renderer/lib/utils';

/* ----------------------------- Radix wrappers ----------------------------- */

const ContextMenu = ContextMenuPrimitive.Root;
const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
const ContextMenuGroup = ContextMenuPrimitive.Group;
const ContextMenuPortal = ContextMenuPrimitive.Portal;
const ContextMenuSub = ContextMenuPrimitive.Sub;
const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

/* ----------------------------- ContextMenuContent ----------------------------- */

const ContextMenuContent = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>>(
  function ContextMenuContent({ className, ...props }, ref) {
    return (
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content
          ref={ref}
          className={cn(
            'z-[1000] min-w-[160px] overflow-hidden rounded-md border border-border bg-surface py-1',
            'shadow-[0_4px_12px_rgba(0,0,0,0.3)]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            className
          )}
          {...props}
        />
      </ContextMenuPrimitive.Portal>
    );
  }
);

/* ----------------------------- ContextMenuItem ----------------------------- */

const ContextMenuItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(function ContextMenuItem({ className, inset, ...props }, ref) {
  return (
    <ContextMenuPrimitive.Item
      ref={ref}
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm px-3 py-2 text-[13px] text-text outline-none',
        'transition-colors duration-100',
        'focus:bg-surface-hover focus:text-text',
        'data-[disabled]:pointer-events-none data-[disabled]:text-text-muted',
        inset && 'pl-8',
        className
      )}
      {...props}
    />
  );
});

/* ----------------------------- ContextMenuLabel ----------------------------- */

const ContextMenuLabel = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(function ContextMenuLabel({ className, inset, ...props }, ref) {
  return (
    <ContextMenuPrimitive.Label
      ref={ref}
      className={cn('px-3 py-2 text-[11px] text-text-muted', inset && 'pl-8', className)}
      {...props}
    />
  );
});

/* ----------------------------- ContextMenuSeparator ----------------------------- */

const ContextMenuSeparator = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(function ContextMenuSeparator({ className, ...props }, ref) {
  return <ContextMenuPrimitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />;
});

/* ----------------------------- ContextMenuSubTrigger ----------------------------- */

const ContextMenuSubTrigger = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(function ContextMenuSubTrigger({ className, inset, children, ...props }, ref) {
  return (
    <ContextMenuPrimitive.SubTrigger
      ref={ref}
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm px-3 py-2 text-[13px] text-text outline-none',
        'transition-colors duration-100',
        'focus:bg-surface-hover focus:text-text',
        'data-[state=open]:bg-surface-hover',
        inset && 'pl-8',
        className
      )}
      {...props}
    >
      {children}
      <span className="ml-auto text-text-muted">&#9656;</span>
    </ContextMenuPrimitive.SubTrigger>
  );
});

/* ----------------------------- ContextMenuSubContent ----------------------------- */

const ContextMenuSubContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
>(function ContextMenuSubContent({ className, ...props }, ref) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.SubContent
        ref={ref}
        className={cn(
          'z-[1001] min-w-[180px] overflow-hidden rounded-md border border-border bg-surface py-1',
          'shadow-[0_4px_12px_rgba(0,0,0,0.15)]',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          className
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
});

/* ----------------------------- ContextMenuShortcut ----------------------------- */

function ContextMenuShortcut({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('ml-auto text-[11px] tracking-widest text-text-muted', className)} {...props} />;
}

/* ----------------------------- Standalone menu primitives ----------------------------- */
/* These styled primitives work without Radix Root/Trigger,
   for store-driven context menus (e.g., 3D workspace right-click). */

interface MenuPanelProps extends HTMLAttributes<HTMLDivElement> {
  x: number;
  y: number;
}

const MenuPanel = forwardRef<HTMLDivElement, MenuPanelProps>(function MenuPanel(
  { className, x, y, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      role="menu"
      className={cn(
        'context-menu z-[1000] min-w-[160px] overflow-visible rounded-md border border-border bg-surface py-1',
        'shadow-[0_4px_12px_rgba(0,0,0,0.3)]',
        className
      )}
      style={{ position: 'fixed', left: x, top: y }}
      {...props}
    >
      {children}
    </div>
  );
});

interface MenuItemButtonProps extends HTMLAttributes<HTMLButtonElement> {
  disabled?: boolean;
  variant?: 'default' | 'danger';
}

const MenuItemButton = forwardRef<HTMLButtonElement, MenuItemButtonProps>(function MenuItemButton(
  { className, variant = 'default', disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      role="menuitem"
      disabled={disabled}
      className={cn(
        'block w-full cursor-default select-none border-none bg-transparent px-3 py-2 text-left text-[13px] outline-none',
        'transition-colors duration-100',
        variant === 'default' &&
          'text-text enabled:hover:bg-surface-hover disabled:text-text-muted disabled:cursor-not-allowed',
        variant === 'danger' &&
          'text-danger enabled:hover:bg-danger enabled:hover:text-white disabled:text-text-muted disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  );
});

const MenuSeparator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function MenuSeparator(
  { className, ...props },
  ref
) {
  return <div ref={ref} role="separator" className={cn('my-1 h-px bg-border', className)} {...props} />;
});

const MenuLabel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function MenuLabel(
  { className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn('border-b border-border px-3 py-2 text-[11px] text-text-muted mb-1', className)}
      {...props}
    />
  );
});

interface MenuSubProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
}

const MenuSub = forwardRef<HTMLDivElement, MenuSubProps>(function MenuSub(
  { className, label, children, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn('group/submenu relative', className)} {...props}>
      <button
        className={cn(
          'flex w-full cursor-default select-none items-center justify-between border-none bg-transparent px-3 py-2 text-left text-[13px] text-text outline-none',
          'transition-colors duration-100 hover:bg-surface-hover'
        )}
      >
        {label}
        <span className="text-text-muted">&#9656;</span>
      </button>
      <div
        className={cn(
          'hidden group-hover/submenu:block absolute left-[calc(100%-4px)] top-[-4px]',
          'z-[1001] min-w-[180px] overflow-hidden rounded-md border border-border bg-surface py-1',
          'shadow-[0_4px_12px_rgba(0,0,0,0.15)]',
          'before:content-[""] before:absolute before:left-[-10px] before:top-0 before:w-[14px] before:h-full'
        )}
      >
        {children}
      </div>
    </div>
  );
});

export {
  /* Radix-based (for standard right-click triggers) */
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuShortcut,
  ContextMenuRadioGroup,
  /* Standalone (for store-driven menus, e.g. 3D workspace) */
  MenuPanel,
  MenuItemButton,
  MenuSeparator,
  MenuLabel,
  MenuSub
};
