import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';

import { cn } from '@renderer/lib/utils';

type ProgressProps = React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string;
};

const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  ({ className, value = 0, indicatorClassName, ...props }, ref) => (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn('relative w-full overflow-hidden rounded-full bg-bg', className)}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn('h-full transition-[width] duration-300 ease-out bg-primary', indicatorClassName)}
        data-slot="progress-indicator"
        style={{ width: `${value}%` }}
      />
    </ProgressPrimitive.Root>
  )
);
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
