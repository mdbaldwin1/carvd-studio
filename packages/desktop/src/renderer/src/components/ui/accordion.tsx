import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronRight } from 'lucide-react';
import { cn } from '@renderer/lib/utils';

const Accordion = AccordionPrimitive.Root;

const AccordionItem = forwardRef<
  ElementRef<typeof AccordionPrimitive.Item>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(function AccordionItem({ className, ...props }, ref) {
  return (
    <AccordionPrimitive.Item ref={ref} className={cn('border border-border rounded-sm mt-2', className)} {...props} />
  );
});

const AccordionTrigger = forwardRef<
  ElementRef<typeof AccordionPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(function AccordionTrigger({ className, children, ...props }, ref) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        ref={ref}
        className={cn(
          'flex flex-1 items-center gap-2 px-3 py-2 text-[13px] text-text-muted font-medium text-left',
          'hover:text-text transition-colors',
          '[&[data-state=open]>svg]:rotate-90',
          className
        )}
        {...props}
      >
        <ChevronRight size={12} className="shrink-0 transition-transform duration-150" />
        {children}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
});

const AccordionContent = forwardRef<
  ElementRef<typeof AccordionPrimitive.Content>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(function AccordionContent({ className, ...props }, ref) {
  return <AccordionPrimitive.Content ref={ref} className={cn('px-3 pb-3', className)} {...props} />;
});

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
