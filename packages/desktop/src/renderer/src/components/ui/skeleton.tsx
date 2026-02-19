import type { HTMLAttributes } from 'react';
import { cn } from '@renderer/lib/utils';

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-bg-secondary', className)} {...props} />;
}

export { Skeleton };
