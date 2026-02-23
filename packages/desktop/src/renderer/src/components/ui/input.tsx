import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@renderer/lib/utils';

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full bg-bg border border-border text-text',
        'px-3.5 py-2.5 text-sm font-[inherit]',
        'rounded-[var(--radius-md)]',
        'focus:outline-none focus:border-accent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'placeholder:text-text-muted',
        className
      )}
      {...props}
    />
  );
});

export { Input };
