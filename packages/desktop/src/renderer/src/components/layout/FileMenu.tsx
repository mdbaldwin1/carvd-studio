/**
 * File menu dropdown for the app header
 */

import { ChevronDown, File, FolderOpen, Save, FilePlus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { openProjectFromPath } from '../../utils/fileOperations';
import { useUIStore } from '../../store/uiStore';

interface FileMenuProps {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  recentProjects: string[];
  onRefreshRecent: () => void;
}

export function FileMenu({ onNew, onOpen, onSave, onSaveAs, recentProjects, onRefreshRecent }: FileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const showToast = useUIStore((s) => s.showToast);

  const isMac = window.navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl+';

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowRecent(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleOpenRecent = async (filePath: string) => {
    setIsOpen(false);
    setShowRecent(false);
    const result = await openProjectFromPath(filePath);
    if (result.success) {
      showToast('Project opened');
      onRefreshRecent();
    } else if (result.error) {
      showToast(`Error: ${result.error}`);
    }
  };

  const handleMenuAction = (action: () => void) => {
    setIsOpen(false);
    setShowRecent(false);
    action();
  };

  // Extract filename from path
  const getFileName = (filePath: string) => {
    const parts = filePath.split(/[/\\]/);
    return parts[parts.length - 1]?.replace(/\.carvd$/i, '') || filePath;
  };

  const menuItemClass =
    'flex items-center gap-2.5 w-full py-2 px-3 bg-transparent border-none rounded text-text text-[13px] cursor-pointer text-left hover:bg-surface-hover';

  const dropdownClass =
    'absolute top-full left-0 mt-1 min-w-50 bg-surface border border-border rounded-md shadow-[0_4px_16px_rgba(0,0,0,0.2)] z-1000 p-1';

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="btn btn-ghost btn-secondary flex items-center gap-1.5 py-1.5 px-2.5 text-[13px] font-medium"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <File size={16} />
        <span>File</span>
        <ChevronDown size={14} className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={dropdownClass}>
          <button className={menuItemClass} onClick={() => handleMenuAction(onNew)}>
            <FilePlus size={16} />
            <span className="flex-1">New Project</span>
            <span className="ml-auto text-xs text-text-muted">{modKey}N</span>
          </button>

          <button className={menuItemClass} onClick={() => handleMenuAction(onOpen)}>
            <FolderOpen size={16} />
            <span className="flex-1">Open...</span>
            <span className="ml-auto text-xs text-text-muted">{modKey}O</span>
          </button>

          <div
            className={`${menuItemClass} relative`}
            onMouseEnter={() => setShowRecent(true)}
            onMouseLeave={() => setShowRecent(false)}
          >
            <FolderOpen size={16} />
            <span className="flex-1">Open Recent</span>
            <ChevronDown size={14} className="ml-auto -rotate-90" />

            {showRecent && (
              <div className={`${dropdownClass} left-full -top-1 max-w-75 z-1001`}>
                {recentProjects.length === 0 ? (
                  <div className={`${menuItemClass} opacity-50 cursor-default`}>
                    <span>No recent projects</span>
                  </div>
                ) : (
                  recentProjects.map((path) => (
                    <button key={path} className={menuItemClass} onClick={() => handleOpenRecent(path)} title={path}>
                      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                        {getFileName(path)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="h-px bg-border my-1" />

          <button className={menuItemClass} onClick={() => handleMenuAction(onSave)}>
            <Save size={16} />
            <span className="flex-1">Save</span>
            <span className="ml-auto text-xs text-text-muted">{modKey}S</span>
          </button>

          <button className={menuItemClass} onClick={() => handleMenuAction(onSaveAs)}>
            <Save size={16} />
            <span className="flex-1">Save As...</span>
            <span className="ml-auto text-xs text-text-muted">{modKey}⇧S</span>
          </button>
        </div>
      )}
    </div>
  );
}
