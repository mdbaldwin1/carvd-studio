import { ReactNode } from 'react';
import { cn } from '@renderer/lib/utils';

interface LibraryDetailRowProps {
  label: string;
  value: ReactNode;
  bordered?: boolean;
}

export function LibraryDetailRow({ label, value, bordered = true }: LibraryDetailRowProps) {
  return (
    <div className={cn('flex justify-between items-start gap-4 py-3', bordered && 'border-b border-border')}>
      <span className="text-xs text-text-muted shrink-0">{label}</span>
      <span className="text-[13px] text-text text-right break-words">{value}</span>
    </div>
  );
}
