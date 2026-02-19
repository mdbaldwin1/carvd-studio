import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@renderer/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = forwardRef<ElementRef<typeof TabsPrimitive.List>, ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
  function TabsList({ className, ...props }, ref) {
    return (
      <TabsPrimitive.List
        ref={ref}
        className={cn('flex border-b border-border bg-bg px-6 gap-0', className)}
        {...props}
      />
    );
  }
);

const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(function TabsTrigger({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'py-2.5 px-4 bg-transparent border-none text-[13px] cursor-pointer',
        'transition-colors duration-150 border-b-2',
        'text-text-muted hover:text-text',
        'data-[state=active]:border-accent data-[state=active]:text-text',
        'data-[state=inactive]:border-transparent',
        className
      )}
      {...props}
    />
  );
});

const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...props }, ref) {
  return <TabsPrimitive.Content ref={ref} className={cn('flex-1 flex flex-col min-h-0', className)} {...props} />;
});

export { Tabs, TabsList, TabsTrigger, TabsContent };
