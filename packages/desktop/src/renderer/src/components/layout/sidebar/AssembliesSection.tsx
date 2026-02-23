import { Button } from '@renderer/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@renderer/components/ui/collapsible';
import { SidebarGroup, SidebarGroupLabel } from '@renderer/components/ui/sidebar';
import { Assembly } from '@renderer/types';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';

interface AssembliesSectionProps {
  isCollapsed: boolean;
  onOpenChange: (open: boolean) => void;
  searchOpen: boolean;
  searchTerm: string;
  onToggleSearch: () => void;
  onSearchChange: (value: string) => void;
  isEditingAssembly: boolean;
  canUseAssemblies: boolean;
  assemblies: Assembly[];
  onShowLicenseModal?: () => void;
  onOpenAddAssembly: () => void;
  onDeleteAssembly: (id: string) => void;
}

export function AssembliesSection({
  isCollapsed,
  onOpenChange,
  searchOpen,
  searchTerm,
  onToggleSearch,
  onSearchChange,
  isEditingAssembly,
  canUseAssemblies,
  assemblies,
  onShowLicenseModal,
  onOpenAddAssembly,
  onDeleteAssembly
}: AssembliesSectionProps) {
  return (
    <Collapsible asChild open={!isCollapsed} onOpenChange={onOpenChange}>
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <div
            className="flex cursor-pointer items-center gap-1.5 rounded-none p-4 pr-2.5 transition-[background-color,margin] duration-150 hover:bg-bg-hover"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <span className="inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-[3px] border-none bg-transparent p-0 text-text-muted transition-colors duration-150">
              {isCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
            </span>
            <SidebarGroupLabel>{isEditingAssembly ? 'Assembly Library' : 'Assemblies'}</SidebarGroupLabel>
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
              disabled={assemblies.length === 0}
            >
              <Search size={12} />
            </Button>
            {canUseAssemblies &&
              (isEditingAssembly ? (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  title="Finish editing current assembly first"
                >
                  +
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAddAssembly();
                  }}
                  title="Add Assembly from Library"
                >
                  +
                </Button>
              ))}
          </div>
        </CollapsibleTrigger>
        {searchOpen && (
          <div className="flex items-center px-2 py-2">
            <div className="sticky top-0 z-[1] flex flex-1 items-center gap-1.5 rounded-md border border-border bg-bg px-2 py-1 transition-colors focus-within:border-accent">
              <Search size={12} className="text-text-muted" />
              <input
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] text-text placeholder:text-text-muted focus:outline-none focus-visible:outline-none"
                type="text"
                placeholder="Search assemblies..."
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
            {!canUseAssemblies ? (
              <p className="text-text-muted text-xs italic px-4">
                Assemblies require a license.{' '}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onShowLicenseModal?.();
                  }}
                >
                  Upgrade
                </a>
              </p>
            ) : assemblies.length === 0 ? (
              <p className="text-text-muted text-xs italic px-4">
                {isEditingAssembly
                  ? 'No assemblies in library yet.'
                  : 'No assemblies yet. Click + to add from library.'}
              </p>
            ) : (
              <ul className="assembly-list list-none my-0 flex-1 overflow-y-auto min-h-0">
                {assemblies
                  .filter((assembly) => !searchTerm || assembly.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((assembly) => (
                    <li
                      key={assembly.id}
                      className="flex items-center gap-2 py-2 px-3 cursor-grab transition-colors duration-100 select-none hover:bg-surface-hover active:cursor-grabbing"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/carvd-assembly', assembly.id);
                        e.dataTransfer.setData(
                          'application/carvd-assembly-source',
                          isEditingAssembly ? 'library' : 'project'
                        );
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      title={`Drag onto canvas to place\n${assembly.parts.length} part${assembly.parts.length !== 1 ? 's' : ''}${assembly.description ? `\n${assembly.description}` : ''}`}
                    >
                      {assembly.thumbnailData ? (
                        <img
                          src={`data:image/png;base64,${assembly.thumbnailData.data}`}
                          alt=""
                          className="w-8 h-6 object-cover rounded-sm shrink-0 bg-bg-tertiary"
                        />
                      ) : (
                        <span className="text-sm shrink-0">{assembly.thumbnail || '📦'}</span>
                      )}
                      <span className="flex-1 text-xs truncate">{assembly.name}</span>
                      <span className="text-[10px] bg-border text-text py-px px-1.5 rounded-full min-w-4 text-center">
                        {assembly.parts.length}
                      </span>
                      <Button
                        variant="destructiveGhost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteAssembly(assembly.id);
                        }}
                        title={isEditingAssembly ? 'Delete from library' : 'Remove from project'}
                      >
                        ×
                      </Button>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
