import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@renderer/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center font-semibold',
    'cursor-pointer border border-transparent bg-transparent text-text',
    'gap-2 font-[inherit] leading-[1.15]',
    'rounded-[var(--radius-sm)] transition-all duration-150 ease-in-out',
    'disabled:opacity-40 disabled:cursor-not-allowed',
    'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2'
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-foreground border-transparent hover:enabled:bg-accent-hover',
        secondary: 'bg-surface border-border text-text hover:enabled:bg-surface-hover',
        outline:
          'bg-transparent border-border text-text hover:enabled:border-text-muted hover:enabled:bg-surface-hover',
        ghost: 'bg-transparent border-transparent text-text hover:enabled:bg-surface-hover',
        destructive:
          'bg-danger text-white border-transparent hover:enabled:bg-danger-hover focus-visible:outline-danger',
        destructiveOutline:
          'bg-transparent border-danger text-danger hover:enabled:bg-danger hover:enabled:text-white focus-visible:outline-danger',
        destructiveGhost:
          'bg-transparent border-transparent text-danger hover:enabled:bg-danger-bg focus-visible:outline-danger',
        link: 'bg-transparent border-transparent text-accent underline-offset-4 hover:enabled:underline'
      },
      size: {
        xs: 'py-1 px-2 text-[12px]',
        sm: 'py-2 px-3 text-[13px]',
        default: 'py-3 px-6 text-[15px]',
        lg: 'py-4 px-7 text-[15px]',
        'icon-xs': 'w-6 h-6 p-0 text-[15px]',
        icon: 'w-7 h-7 p-0 text-[17px] font-bold'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm'
    }
  }
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Whether the button is in an active/pressed/toggle state */
  active?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, active, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        buttonVariants({ variant, size }),
        active && 'bg-accent text-accent-foreground border-accent',
        className
      )}
      {...props}
    />
  );
});

export { Button, buttonVariants };
export type { ButtonProps };
