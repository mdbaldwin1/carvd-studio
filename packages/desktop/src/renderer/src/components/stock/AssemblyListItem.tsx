import { ComponentProps, type KeyboardEvent } from 'react';
import { Badge } from '@renderer/components/ui/badge';
import { Assembly } from '../../types';
import { isBuiltInAssembly } from '../../templates/builtInAssemblies';

interface AssemblyListItemProps {
  assembly: Assembly;
  selected: boolean;
  highlighted?: boolean;
  showBuiltInBadge?: boolean;
  showGroupsInMeta?: boolean;
  fallbackIcon?: string;
  draggable?: boolean;
  onDragStart?: ComponentProps<'li'>['onDragStart'];
  onClick: () => void;
}

export function AssemblyListItem({
  assembly,
  selected,
  highlighted = false,
  showBuiltInBadge = false,
  showGroupsInMeta = false,
  fallbackIcon = '📦',
  draggable = false,
  onDragStart,
  onClick
}: AssemblyListItemProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <li
      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-[background] duration-100 hover:bg-surface-hover ${selected ? 'bg-selected' : ''} ${highlighted ? 'outline-2 outline-solid outline-primary -outline-offset-2' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      {assembly.thumbnailData?.data ? (
        <img
          src={`data:image/png;base64,${assembly.thumbnailData.data}`}
          alt={assembly.name}
          className="w-10 h-[30px] object-cover rounded shrink-0 bg-bg-tertiary"
        />
      ) : (
        <span className="text-base shrink-0">{assembly.thumbnail || fallbackIcon}</span>
      )}
      <div className="flex flex-col min-w-0">
        <span className="text-xs whitespace-nowrap overflow-hidden text-ellipsis">
          {assembly.name}
          {showBuiltInBadge && isBuiltInAssembly(assembly.id) && (
            <Badge variant="secondary" className="ml-1.5 rounded py-px px-1 text-[9px] uppercase tracking-wide">
              Built-in
            </Badge>
          )}
        </span>
        <span className="text-[10px] text-text-muted">
          {assembly.parts.length} part{assembly.parts.length !== 1 ? 's' : ''}
          {showGroupsInMeta &&
            assembly.groups.length > 0 &&
            `, ${assembly.groups.length} group${assembly.groups.length !== 1 ? 's' : ''}`}
        </span>
      </div>
    </li>
  );
}
