import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export interface DropdownButtonProps {
  label: string;
  items: DropdownItem[];
  className?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

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
    <div className={`dropdown-button-container ${className}`} ref={containerRef}>
      <button
        className={`btn btn-sm btn-filled btn-secondary dropdown-button-trigger ${isOpen ? 'active' : ''}`}
        onClick={handleToggle}
        disabled={disabled}
        type="button"
      >
        {icon && <span className="dropdown-button-icon">{icon}</span>}
        <span>{label}</span>
        <ChevronDown size={14} className={`dropdown-chevron ${isOpen ? 'rotated' : ''}`} />
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          {items.map((item, index) => (
            <button
              key={index}
              className={`dropdown-menu-item ${item.disabled ? 'disabled' : ''}`}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
              type="button"
            >
              {item.icon && <span className="dropdown-item-icon">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
