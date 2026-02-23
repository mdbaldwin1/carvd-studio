import { ComponentProps, ReactNode } from 'react';
import { cn } from '@renderer/lib/utils';
import { getDocsUrl } from '../../../utils/docsLinks';

type DocsSection = 'stock' | 'assemblies';

interface DocsLinkProps extends Omit<ComponentProps<'a'>, 'href'> {
  section: DocsSection;
  children: ReactNode;
}

export function DocsLink({ section, children, className, onClick, ...rest }: DocsLinkProps) {
  return (
    <a
      href="#"
      className={cn(
        'text-accent no-underline text-xs hover:underline hover:text-accent-hover transition-colors duration-150',
        className
      )}
      onClick={(e) => {
        e.preventDefault();
        window.electronAPI.openExternal(getDocsUrl(section));
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
