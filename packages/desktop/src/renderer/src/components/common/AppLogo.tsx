import { useEffect, useState } from 'react';
import { cn } from '@renderer/lib/utils';

type ThemeMode = 'light' | 'dark';

interface AppLogoProps {
  className?: string;
  alt?: string;
}

function getCurrentTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function AppLogo({ className, alt = 'Carvd Studio logo' }: AppLogoProps) {
  const [theme, setTheme] = useState<ThemeMode>(getCurrentTheme);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setTheme(getCurrentTheme());
    syncTheme();

    const observer = new window.MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    return () => observer.disconnect();
  }, []);

  const src = theme === 'light' ? './branding/Carvd-Icon.svg' : './branding/Carvd-Icon-WHT.svg';

  return <img src={src} alt={alt} className={cn('select-none object-contain', className)} draggable={false} />;
}
