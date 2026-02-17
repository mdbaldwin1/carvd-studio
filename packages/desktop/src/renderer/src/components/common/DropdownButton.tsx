import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/** A single item in a {@link DropdownButton} menu. */
export interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

/** Props for the {@link DropdownButton} component. */
export interface DropdownButtonProps {
  label: string;
  items: DropdownItem[];
  className?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

/**
 * Button with a dropdown menu.
 *
 * Closes on click outside, Escape key, or item selection.
 * Items can be individually disabled.
 */
export function DropdownButton({
  label,
  items,
  className = '',
  disabled = false,
  icon
}: DropdownButtonProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const justOpenedRef = useRef(false);

  // Handle click outside to close dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent): void => {
      // Skip if we just opened (prevents immediate close)
      if (justOpenedRef.current) {
        justOpenedRef.current = false;
        return;
      }

      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    // Use setTimeout to avoid catching the opening click
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleToggle = (): void => {
    if (disabled) return;
    justOpenedRef.current = true;
    setIsOpen(!isOpen);
  };

  const handleItemClick = (item: DropdownItem): void => {
    if (item.disabled) return;
    item.onClick();
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <button
        className={`btn btn-sm btn-filled btn-secondary inline-flex items-center gap-1.5 ${isOpen ? 'bg-surface-hover' : ''}`}
        onClick={handleToggle}
        disabled={disabled}
        type="button"
      >
        {icon && <span className="flex items-center">{icon}</span>}
        <span>{label}</span>
        <ChevronDown size={14} className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 min-w-40 bg-surface border border-border rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.15)] z-1000 p-1">
          {items.map((item, index) => (
            <button
              key={index}
              className="flex items-center gap-2 w-full py-2 px-3 border-none bg-transparent text-text text-[13px] text-left cursor-pointer rounded transition-colors duration-100 hover:bg-surface-hover disabled:text-text-muted disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
              type="button"
            >
              {item.icon && <span className="flex items-center text-text-muted">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
