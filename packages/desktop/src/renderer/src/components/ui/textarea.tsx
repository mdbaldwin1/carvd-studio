import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@renderer/lib/utils';

const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full bg-bg border border-border text-text',
        'px-3.5 py-2.5 text-sm font-[inherit] resize-y',
        'rounded-[var(--radius-md)] min-h-[72px]',
        'focus:outline-none focus:border-accent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'placeholder:text-text-muted',
        className
      )}
      {...props}
    />
  );
});

export { Textarea };
