import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { BackgroundContextMenu } from './BackgroundContextMenu';
import { GuideContextMenu } from './GuideContextMenu';
import { PartContextMenu } from './PartContextMenu';

export function ContextMenu() {
  const contextMenu = useProjectStore((s) => s.contextMenu);
  const closeContextMenu = useProjectStore((s) => s.closeContextMenu);

  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState<{ x: number; y: number } | null>(null);

  // Adjust menu position to stay within viewport bounds
  useLayoutEffect(() => {
    if (!contextMenu || !menuRef.current) {
      setAdjustedPosition(null);
      return;
    }

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const padding = 8; // Minimum distance from viewport edge

    let newX = contextMenu.x;
    let newY = contextMenu.y;

    // Check right edge
    if (newX + rect.width > window.innerWidth - padding) {
      newX = window.innerWidth - rect.width - padding;
    }
    // Check bottom edge
    if (newY + rect.height > window.innerHeight - padding) {
      newY = window.innerHeight - rect.height - padding;
    }
    // Check left edge
    if (newX < padding) {
      newX = padding;
    }
    // Check top edge
    if (newY < padding) {
      newY = padding;
    }

    // Only update if position changed
    if (newX !== contextMenu.x || newY !== contextMenu.y) {
      setAdjustedPosition({ x: newX, y: newY });
    } else {
      setAdjustedPosition(null);
    }
  }, [contextMenu]);

  // Get the effective position (adjusted or original)
  const menuX = adjustedPosition?.x ?? contextMenu?.x ?? 0;
  const menuY = adjustedPosition?.y ?? contextMenu?.y ?? 0;

  // Close on click outside
  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeContextMenu();
      }
    };

    // Use setTimeout to avoid closing immediately from the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu, closeContextMenu]);

  if (!contextMenu) return null;

  if (contextMenu.type === 'background') {
    return (
      <BackgroundContextMenu
        menuRef={menuRef}
        x={menuX}
        y={menuY}
        onClose={closeContextMenu}
        worldPosition={contextMenu.worldPosition}
      />
    );
  }

  if (contextMenu.type === 'guide' && contextMenu.guideId) {
    return (
      <GuideContextMenu
        menuRef={menuRef}
        x={menuX}
        y={menuY}
        onClose={closeContextMenu}
        guideId={contextMenu.guideId}
      />
    );
  }

  // Part/group context menu
  return <PartContextMenu menuRef={menuRef} x={menuX} y={menuY} onClose={closeContextMenu} />;
}
