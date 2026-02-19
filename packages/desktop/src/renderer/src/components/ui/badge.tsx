import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@renderer/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-accent text-accent-foreground',
        secondary: 'border-transparent bg-bg-tertiary text-text-muted',
        destructive: 'border-transparent bg-danger text-white',
        outline: 'border-border text-text-muted'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
export type { BadgeProps };
