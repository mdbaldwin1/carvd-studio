import { useEffect, useState } from 'react';
import { cn } from '@renderer/lib/utils';

type ThemeMode = 'light' | 'dark';

interface AppHorizontalLogoProps {
  className?: string;
  alt?: string;
}

function getCurrentTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function AppHorizontalLogo({ className, alt = 'Carvd Studio' }: AppHorizontalLogoProps) {
  const [theme, setTheme] = useState<ThemeMode>(getCurrentTheme);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setTheme(getCurrentTheme());
    syncTheme();

    const observer = new window.MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    return () => observer.disconnect();
  }, []);

  const src = theme === 'light' ? './branding/CarvdStudio-Horizontal.svg' : './branding/CarvdStudio-Horizontal-WHT.svg';

  return (
    <img src={src} alt={alt} className={cn('select-none object-contain object-left', className)} draggable={false} />
  );
}
