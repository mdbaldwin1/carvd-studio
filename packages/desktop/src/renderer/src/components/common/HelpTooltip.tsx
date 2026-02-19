import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@renderer/components/ui/popover';

interface HelpTooltipProps {
  /** The helper text to display in the tooltip */
  text: string;
  /** The documentation section anchor (e.g., "parts", "joinery", "settings") */
  docsSection?: string;
  /** Optional custom link text (defaults to "Learn more in docs") */
  linkText?: string;
  /** Optional inline styling - if true, displays inline with surrounding text */
  inline?: boolean;
}

const DOCS_BASE_URL = 'https://carvd-studio.com/docs';

/**
 * A help icon that shows a popover with helper text and an optional link to documentation.
 * Click the icon to toggle the popover.
 *
 * Uses shadcn Popover (Radix) for accessible positioning, focus management, and dismiss behavior.
 */
export function HelpTooltip({ text, docsSection, linkText = 'Learn more in docs', inline = false }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);

  const handleDocsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = docsSection ? `${DOCS_BASE_URL}#${docsSection}` : DOCS_BASE_URL;
    window.electronAPI?.openExternal?.(url);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <span className={cn('relative inline-flex items-center align-middle', inline && 'ml-1')}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'bg-transparent border-none cursor-pointer text-text-muted',
              'inline-flex items-center justify-center p-0.5',
              'rounded-[var(--radius-sm)] opacity-50',
              'transition-all duration-150 ease-in-out',
              'hover:text-text hover:bg-surface-hover hover:opacity-100',
              'focus:outline-none focus:shadow-[0_0_0_2px_var(--color-accent-muted)]'
            )}
            aria-label="Show help"
          >
            <HelpCircle size={14} />
          </button>
        </PopoverTrigger>
      </span>
      <PopoverContent
        className="min-w-[220px] max-w-[300px] px-3.5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
        role="tooltip"
        sideOffset={6}
      >
        <p className="text-text leading-relaxed m-0 text-[13px]">{text}</p>
        {docsSection && (
          <a
            href="#"
            className="block mt-2 text-primary text-xs no-underline transition-colors duration-150 hover:text-primary-hover hover:underline"
            onClick={handleDocsClick}
          >
            {linkText} &rarr;
          </a>
        )}
      </PopoverContent>
    </Popover>
  );
}
