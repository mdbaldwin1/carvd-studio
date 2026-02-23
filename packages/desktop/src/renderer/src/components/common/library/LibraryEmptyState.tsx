import { ComponentProps } from 'react';
import { DocsLink } from './DocsLink';

interface LibraryEmptyStateProps {
  title: string;
  subtitle?: string;
  linkLabel?: string;
  onLinkClick?: ComponentProps<'a'>['onClick'];
  docsSection?: 'stock' | 'assemblies';
}

export function LibraryEmptyState({ title, subtitle, linkLabel, onLinkClick, docsSection }: LibraryEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-text-muted gap-2">
      <p className="mb-2">{title}</p>
      {subtitle && <p className="text-[11px] text-text-muted mt-1">{subtitle}</p>}
      {linkLabel && docsSection && <DocsLink section={docsSection}>{linkLabel}</DocsLink>}
      {linkLabel && !docsSection && onLinkClick && (
        <a
          href="#"
          className="text-accent no-underline text-xs hover:underline hover:text-accent-hover transition-colors duration-150"
          onClick={onLinkClick}
        >
          {linkLabel}
        </a>
      )}
    </div>
  );
}
