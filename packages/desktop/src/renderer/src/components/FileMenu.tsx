/**
 * File menu dropdown for the app header
 */

import { ChevronDown, File, FolderOpen, Save, FilePlus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { openProjectFromPath } from '../utils/fileOperations';
import { useProjectStore } from '../store/projectStore';
import './FileMenu.css';

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
  const showToast = useProjectStore((s) => s.showToast);

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

  return (
    <div className="file-menu" ref={menuRef}>
      <button
        className="file-menu-trigger btn btn-ghost btn-secondary"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <File size={16} />
        <span>File</span>
        <ChevronDown size={14} className={`chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="file-menu-dropdown">
          <button className="file-menu-item" onClick={() => handleMenuAction(onNew)}>
            <FilePlus size={16} />
            <span>New Project</span>
            <span className="shortcut">{modKey}N</span>
          </button>

          <button className="file-menu-item" onClick={() => handleMenuAction(onOpen)}>
            <FolderOpen size={16} />
            <span>Open...</span>
            <span className="shortcut">{modKey}O</span>
          </button>

          <div
            className="file-menu-item file-menu-submenu-trigger"
            onMouseEnter={() => setShowRecent(true)}
            onMouseLeave={() => setShowRecent(false)}
          >
            <FolderOpen size={16} />
            <span>Open Recent</span>
            <ChevronDown size={14} className="submenu-chevron" />

            {showRecent && (
              <div className="file-menu-submenu">
                {recentProjects.length === 0 ? (
                  <div className="file-menu-item disabled">
                    <span>No recent projects</span>
                  </div>
                ) : (
                  recentProjects.map((path) => (
                    <button key={path} className="file-menu-item" onClick={() => handleOpenRecent(path)} title={path}>
                      <span className="recent-name">{getFileName(path)}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="file-menu-divider" />

          <button className="file-menu-item" onClick={() => handleMenuAction(onSave)}>
            <Save size={16} />
            <span>Save</span>
            <span className="shortcut">{modKey}S</span>
          </button>

          <button className="file-menu-item" onClick={() => handleMenuAction(onSaveAs)}>
            <Save size={16} />
            <span>Save As...</span>
            <span className="shortcut">{modKey}⇧S</span>
          </button>
        </div>
      )}
    </div>
  );
}
