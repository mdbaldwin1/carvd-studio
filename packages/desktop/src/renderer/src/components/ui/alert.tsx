import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@renderer/lib/utils';

const alertVariants = cva('relative w-full rounded-lg border px-4 py-3 text-text', {
  variants: {
    variant: {
      default: 'border-border bg-surface',
      destructive: 'border-danger/40 bg-danger-bg text-danger'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
});

interface AlertProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert({ className, variant, ...props }, ref) {
  return (
    <div
      ref={ref}
      role="alert"
      data-variant={variant ?? 'default'}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
});

const AlertTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(function AlertTitle(
  { className, ...props },
  ref
) {
  return <h5 ref={ref} className={cn('m-0 text-sm font-semibold leading-none tracking-tight', className)} {...props} />;
});

const AlertDescription = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function AlertDescription(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn('mt-1 text-sm text-text-muted [&_p]:m-0', className)} {...props} />;
});

export { Alert, AlertTitle, AlertDescription, alertVariants };
export type { AlertProps };
