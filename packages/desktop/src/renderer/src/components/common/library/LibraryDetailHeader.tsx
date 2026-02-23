import { ReactNode } from 'react';
import { cn } from '@renderer/lib/utils';

interface LibraryDetailHeaderProps {
  title: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function LibraryDetailHeader({ title, actions, className }: LibraryDetailHeaderProps) {
  return (
    <div className={cn('flex justify-between items-center py-4 px-5 border-b border-border', className)}>
      <h3 className="text-base font-semibold m-0 flex items-center gap-2">{title}</h3>
      {actions}
    </div>
  );
}
