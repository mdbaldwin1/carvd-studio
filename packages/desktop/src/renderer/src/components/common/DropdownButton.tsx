import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu';

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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="secondary"
          size="sm"
          className={`inline-flex items-center gap-1.5 ${className}`}
          disabled={disabled}
          type="button"
        >
          {icon && <span className="flex items-center">{icon}</span>}
          <span>{label}</span>
          <ChevronDown size={14} className="transition-transform duration-150" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {items.map((item, index) => (
          <DropdownMenuItem key={index} onSelect={item.onClick} disabled={item.disabled}>
            {item.icon && <span className="flex items-center text-text-muted">{item.icon}</span>}
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
