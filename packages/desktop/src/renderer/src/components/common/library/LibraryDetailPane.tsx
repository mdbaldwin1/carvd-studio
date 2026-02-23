import { ReactNode } from 'react';
import { cn } from '@renderer/lib/utils';

interface LibraryDetailPaneProps {
  children: ReactNode;
  className?: string;
}

export function LibraryDetailPane({ children, className }: LibraryDetailPaneProps) {
  return <div className={cn('flex-1 min-w-0 flex flex-col overflow-y-auto', className)}>{children}</div>;
}
