import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { HelpCircle } from 'lucide-react';

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
 * A help icon that shows a tooltip with helper text and a link to documentation.
 * Click the icon to toggle the tooltip.
 */
export function HelpTooltip({ text, docsSection, linkText = 'Learn more in docs', inline = false }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Calculate tooltip position when opened
  useLayoutEffect(() => {
    if (!isOpen || !buttonRef.current) {
      setPosition(null);
      return;
    }

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const tooltipWidth = 280; // max-width from CSS
    const tooltipHeight = 100; // estimated height
    const padding = 8;

    // Default: position below the button, centered
    let top = buttonRect.bottom + 6;
    let left = buttonRect.left + buttonRect.width / 2 - tooltipWidth / 2;

    // Adjust if tooltip would go off the right edge
    if (left + tooltipWidth > window.innerWidth - padding) {
      left = window.innerWidth - tooltipWidth - padding;
    }

    // Adjust if tooltip would go off the left edge
    if (left < padding) {
      left = padding;
    }

    // If tooltip would go off the bottom, position above the button instead
    if (top + tooltipHeight > window.innerHeight - padding) {
      top = buttonRect.top - tooltipHeight - 6;
    }

    setPosition({ top, left });
  }, [isOpen]);

  // Close tooltip when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close tooltip on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleDocsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = docsSection ? `${DOCS_BASE_URL}#${docsSection}` : DOCS_BASE_URL;
    window.electronAPI?.openExternal?.(url);
    setIsOpen(false);
  };

  return (
    <span className={`help-tooltip-wrapper ${inline ? 'help-tooltip-inline' : ''}`}>
      <button
        ref={buttonRef}
        type="button"
        className="help-tooltip-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Show help"
        aria-expanded={isOpen}
      >
        <HelpCircle size={14} />
      </button>
      {isOpen && position && (
        <div
          ref={tooltipRef}
          className="help-tooltip-popover"
          role="tooltip"
          style={{ top: position.top, left: position.left }}
        >
          <p className="help-tooltip-text">{text}</p>
          {docsSection && (
            <a href="#" className="help-tooltip-link" onClick={handleDocsClick}>
              {linkText} &rarr;
            </a>
          )}
        </div>
      )}
    </span>
  );
}
