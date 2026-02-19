import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type TdHTMLAttributes,
  type ThHTMLAttributes
} from 'react';
import { cn } from '@renderer/lib/utils';

const Table = forwardRef<ElementRef<'table'>, ComponentPropsWithoutRef<'table'>>(function Table(
  { className, ...props },
  ref
) {
  return <table ref={ref} className={cn('w-full border-collapse text-[13px]', className)} {...props} />;
});

const TableHeader = forwardRef<ElementRef<'thead'>, ComponentPropsWithoutRef<'thead'>>(function TableHeader(
  { className, ...props },
  ref
) {
  return <thead ref={ref} className={cn(className)} {...props} />;
});

const TableBody = forwardRef<ElementRef<'tbody'>, ComponentPropsWithoutRef<'tbody'>>(function TableBody(
  { className, ...props },
  ref
) {
  return <tbody ref={ref} className={cn(className)} {...props} />;
});

const TableRow = forwardRef<ElementRef<'tr'>, ComponentPropsWithoutRef<'tr'>>(function TableRow(
  { className, ...props },
  ref
) {
  return <tr ref={ref} className={cn(className)} {...props} />;
});

const TableHead = forwardRef<ElementRef<'th'>, ThHTMLAttributes<ElementRef<'th'>>>(function TableHead(
  { className, ...props },
  ref
) {
  return (
    <th
      ref={ref}
      className={cn(
        'border-b border-border bg-bg px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted',
        className
      )}
      {...props}
    />
  );
});

const TableCell = forwardRef<ElementRef<'td'>, TdHTMLAttributes<ElementRef<'td'>>>(function TableCell(
  { className, ...props },
  ref
) {
  return <td ref={ref} className={cn('border-b border-border px-3 py-2 text-left', className)} {...props} />;
});

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
