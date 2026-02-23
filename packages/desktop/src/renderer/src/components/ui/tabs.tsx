import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@renderer/lib/utils';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';

const Tabs = TabsPrimitive.Root;

const TabsList = forwardRef<ElementRef<typeof TabsPrimitive.List>, ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
  function TabsList({ className, ...props }, ref) {
    return (
      <TabsPrimitive.List
        ref={ref}
        className={cn(
          'inline-flex h-9 w-fit self-start items-center justify-start rounded-md bg-bg p-1 text-bg-foreground',
          className
        )}
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
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium',
        'ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        'data-[state=active]:bg-info-bg data-[state=active]:text-info-text data-[state=active]:shadow-sm',
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
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        'min-h-0 flex-1 data-[state=inactive]:hidden data-[state=active]:flex data-[state=active]:flex-col',
        className
      )}
      {...props}
    />
  );
});

export { Tabs, TabsContent, TabsList, TabsTrigger };
