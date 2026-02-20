import * as React from 'react';
import { cn } from '@renderer/lib/utils';

interface SidebarProviderProps extends React.ComponentProps<'div'> {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const SidebarProvider = React.forwardRef<HTMLDivElement, SidebarProviderProps>(function SidebarProvider(
  { defaultOpen = true, open: openProp, onOpenChange, className, children, ...props },
  ref
) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = openProp ?? internalOpen;

  React.useEffect(() => {
    if (openProp === undefined) return;
    setInternalOpen(openProp);
  }, [openProp]);

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      onOpenChange?.(nextOpen);
      if (openProp === undefined) {
        setInternalOpen(nextOpen);
      }
    },
    [onOpenChange, openProp]
  );

  return (
    <div
      ref={ref}
      data-sidebar-wrapper=""
      data-state={open ? 'expanded' : 'collapsed'}
      className={cn('flex w-full min-h-0', className)}
      {...props}
    >
      <SidebarContext.Provider value={{ open, setOpen }}>{children}</SidebarContext.Provider>
    </div>
  );
});

interface SidebarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider.');
  }
  return context;
}

const Sidebar = React.forwardRef<HTMLElement, React.ComponentProps<'aside'>>(function Sidebar(
  { className, ...props },
  ref
) {
  return <aside ref={ref} data-sidebar="" className={cn('sidebar', className)} {...props} />;
});

const SidebarContent = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(function SidebarContent(
  { className, ...props },
  ref
) {
  return <div ref={ref} data-sidebar-content="" className={cn('flex flex-1 min-h-0 flex-col', className)} {...props} />;
});

const SidebarGroup = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(function SidebarGroup(
  { className, ...props },
  ref
) {
  return <div ref={ref} data-sidebar-group="" className={cn('sidebar-section', className)} {...props} />;
});

const SidebarGroupLabel = React.forwardRef<HTMLHeadingElement, React.ComponentProps<'h2'>>(function SidebarGroupLabel(
  { className, ...props },
  ref
) {
  return <h2 ref={ref} data-sidebar-group-label="" className={cn(className)} {...props} />;
});

const SidebarFooter = React.forwardRef<HTMLElement, React.ComponentProps<'section'>>(function SidebarFooter(
  { className, ...props },
  ref
) {
  return <section ref={ref} data-sidebar-footer="" className={cn('sidebar-section sidebar-section-bottom', className)} {...props} />;
});

export { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarProvider, useSidebar };
