import { cn } from '@renderer/lib/utils';

interface AppWordmarkProps {
  className?: string;
  alt?: string;
}

export function AppWordmark({ className, alt = 'Carvd Studio' }: AppWordmarkProps) {
  return (
    <img
      src="/branding/CarvdStudio.svg"
      alt={alt}
      className={cn('select-none object-contain object-left', className)}
      draggable={false}
    />
  );
}
