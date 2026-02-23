import { Button } from '@renderer/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@renderer/components/ui/collapsible';
import { SidebarGroup, SidebarGroupLabel } from '@renderer/components/ui/sidebar';
import { HierarchicalPartsList } from '@renderer/components/parts-list/HierarchicalPartsList';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';

interface PartsSectionProps {
  isCollapsed: boolean;
  onOpenChange: (open: boolean) => void;
  searchOpen: boolean;
  searchTerm: string;
  onToggleSearch: () => void;
  onSearchChange: (value: string) => void;
  partsCount: number;
  onAddPart: () => void;
  onPartClick: (partId: string, e: React.MouseEvent) => void;
  onDuplicate: (partId: string) => void;
  onDelete: (partId: string) => void;
}

export function PartsSection({
  isCollapsed,
  onOpenChange,
  searchOpen,
  searchTerm,
  onToggleSearch,
  onSearchChange,
  partsCount,
  onAddPart,
  onPartClick,
  onDuplicate,
  onDelete
}: PartsSectionProps) {
  return (
    <Collapsible asChild open={!isCollapsed} onOpenChange={onOpenChange}>
      <SidebarGroup className={isCollapsed ? 'flex-none' : 'flex-1'}>
        <CollapsibleTrigger asChild>
          <div
            className="flex cursor-pointer items-center gap-1.5 rounded-none p-4 pr-2.5 transition-[background-color,margin] duration-150 hover:bg-bg-hover"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <span className="inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-[3px] border-none bg-transparent p-0 text-text-muted transition-colors duration-150">
              {isCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
            </span>
            <SidebarGroupLabel>Parts</SidebarGroupLabel>
            <Button
              variant="ghost"
              size="icon"
              active={searchOpen}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSearch();
              }}
              title="Search"
              disabled={partsCount === 0}
            >
              <Search size={12} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onAddPart();
              }}
              title="Add Part"
            >
              +
            </Button>
          </div>
        </CollapsibleTrigger>
        {searchOpen && (
          <div className="flex items-center px-2 py-2">
            <div className="sticky top-0 z-[1] flex flex-1 items-center gap-1.5 rounded-md border border-border bg-bg px-2 py-1 transition-colors focus-within:border-accent">
              <Search size={12} className="text-text-muted" />
              <input
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] text-text placeholder:text-text-muted focus:outline-none focus-visible:outline-none"
                type="text"
                placeholder="Search parts..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
              {searchTerm && (
                <button
                  className="flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-[3px] border-none bg-transparent p-0 text-text-muted hover:bg-bg-hover hover:text-text"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSearchChange('');
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )}
        <CollapsibleContent
          forceMount
          className="min-h-0 flex-1 overflow-hidden data-[state=open]:flex data-[state=open]:flex-col"
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <HierarchicalPartsList
              onPartClick={onPartClick}
              searchFilter={searchTerm}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          </div>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
