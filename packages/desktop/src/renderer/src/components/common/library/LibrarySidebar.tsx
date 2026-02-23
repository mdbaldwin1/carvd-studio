import { Search, X } from 'lucide-react';
import { ReactNode } from 'react';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { cn } from '@renderer/lib/utils';

interface LibrarySidebarProps {
  count: number;
  countLabel?: string;
  headerActions?: ReactNode;
  hasItems: boolean;
  showNoResults: boolean;
  emptyState: ReactNode;
  noResultsState: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
  };
}

export function LibrarySidebar({
  count,
  countLabel,
  headerActions,
  hasItems,
  showNoResults,
  emptyState,
  noResultsState,
  children,
  footer,
  className,
  search
}: LibrarySidebarProps) {
  return (
    <div className={cn('w-60 border-r border-border flex flex-col overflow-hidden', className)}>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex justify-between items-center py-3 px-4 border-b border-border text-xs text-text-muted">
          <span>{countLabel ?? `${count} available`}</span>
          {headerActions && (
            <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' }}>
              {headerActions}
            </div>
          )}
        </div>

        {hasItems && search && (
          <div className="px-3 py-3">
            <div className="flex items-center gap-2 rounded border border-border bg-bg px-3 py-2">
              <Search size={14} className="shrink-0 text-text-muted" />
              <Input
                className="h-7 border-0 bg-transparent px-0 py-0 text-[13px] shadow-none focus-visible:outline-none"
                type="text"
                placeholder={search.placeholder}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
              />
              {search.value && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="h-5 w-5 shrink-0 p-0 text-text-muted hover:text-text"
                  onClick={() => search.onChange('')}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </Button>
              )}
            </div>
          </div>
        )}

        {!hasItems ? emptyState : showNoResults ? noResultsState : children}
      </div>

      {footer}
    </div>
  );
}
