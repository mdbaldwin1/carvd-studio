import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import { cn } from '@renderer/lib/utils';

const Card = forwardRef<ElementRef<'div'>, ComponentPropsWithoutRef<'div'>>(function Card(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn('rounded-lg border border-border bg-bg', className)} {...props} />;
});

const CardHeader = forwardRef<ElementRef<'div'>, ComponentPropsWithoutRef<'div'>>(function CardHeader(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn('flex flex-col gap-1.5 p-4 pb-3', className)} {...props} />;
});

const CardTitle = forwardRef<ElementRef<'h3'>, ComponentPropsWithoutRef<'h3'>>(function CardTitle(
  { className, ...props },
  ref
) {
  return <h3 ref={ref} className={cn('m-0 text-sm font-semibold text-text', className)} {...props} />;
});

const CardDescription = forwardRef<ElementRef<'p'>, ComponentPropsWithoutRef<'p'>>(function CardDescription(
  { className, ...props },
  ref
) {
  return <p ref={ref} className={cn('m-0 text-xs text-text-muted', className)} {...props} />;
});

const CardContent = forwardRef<ElementRef<'div'>, ComponentPropsWithoutRef<'div'>>(function CardContent(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn('p-4 pt-0', className)} {...props} />;
});

const CardFooter = forwardRef<ElementRef<'div'>, ComponentPropsWithoutRef<'div'>>(function CardFooter(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn('flex items-center p-4 pt-0', className)} {...props} />;
});

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
