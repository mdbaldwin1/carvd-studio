/**
 * File menu dropdown for the app header
 */

import { ChevronDown, File, FolderOpen, Save, FilePlus } from 'lucide-react';
import { openProjectFromPath } from '../../utils/fileOperations';
import { useUIStore } from '../../store/uiStore';
import { Button } from '@renderer/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu';

interface FileMenuProps {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  recentProjects: string[];
  onRefreshRecent: () => void;
}

export function FileMenu({ onNew, onOpen, onSave, onSaveAs, recentProjects, onRefreshRecent }: FileMenuProps) {
  const showToast = useUIStore((s) => s.showToast);

  const isMac = window.navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '\u2318' : 'Ctrl+';

  const handleOpenRecent = async (filePath: string) => {
    const result = await openProjectFromPath(filePath);
    if (result.success) {
      showToast('Project opened');
      onRefreshRecent();
    } else if (result.error) {
      showToast(`Error: ${result.error}`);
    }
  };

  // Extract filename from path
  const getFileName = (filePath: string) => {
    const parts = filePath.split(/[/\\]/);
    return parts[parts.length - 1]?.replace(/\.carvd$/i, '') || filePath;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="py-1.5 px-2.5 text-[13px] font-medium">
          <File size={16} />
          <span>File</span>
          <ChevronDown size={14} className="transition-transform duration-150" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-[12.5rem]">
        <DropdownMenuItem onSelect={onNew}>
          <FilePlus size={16} />
          <span className="flex-1">New Project</span>
          <DropdownMenuShortcut>{modKey}N</DropdownMenuShortcut>
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={onOpen}>
          <FolderOpen size={16} />
          <span className="flex-1">Open...</span>
          <DropdownMenuShortcut>{modKey}O</DropdownMenuShortcut>
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FolderOpen size={16} />
            <span className="flex-1">Open Recent</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-w-[18.75rem]">
            {recentProjects.length === 0 ? (
              <DropdownMenuItem disabled>
                <span>No recent projects</span>
              </DropdownMenuItem>
            ) : (
              recentProjects.map((path) => (
                <DropdownMenuItem key={path} onSelect={() => handleOpenRecent(path)} title={path}>
                  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{getFileName(path)}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={onSave}>
          <Save size={16} />
          <span className="flex-1">Save</span>
          <DropdownMenuShortcut>{modKey}S</DropdownMenuShortcut>
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={onSaveAs}>
          <Save size={16} />
          <span className="flex-1">Save As...</span>
          <DropdownMenuShortcut>
            {modKey}
            {'\u21E7'}S
          </DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
