import { Button } from '@renderer/components/ui/button';
import { useAppSettings } from '@renderer/hooks/useAppSettings';
import { LightingMode } from '@renderer/types';
import { Sun } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface BrightnessPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BrightnessPopup({ isOpen, onClose }: BrightnessPopupProps) {
  const { settings, updateSettings } = useAppSettings();
  const brightness = settings.brightnessMultiplier ?? 1.0;
  const lightingMode = settings.lightingMode ?? 'default';
  const popupRef = useRef<HTMLDivElement>(null);

  const presets: { key: LightingMode; label: string }[] = [
    { key: 'default', label: 'Default' },
    { key: 'bright', label: 'Bright' },
    { key: 'studio', label: 'Studio' },
    { key: 'dramatic', label: 'Dramatic' }
  ];

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-surface border border-border rounded-lg p-3 min-w-[200px] z-[100] shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
      ref={popupRef}
    >
      <div className="flex items-center gap-2.5">
        <Sun size={14} className="text-text-muted shrink-0" />
        <input
          type="range"
          min={0.25}
          max={2.0}
          step={0.05}
          value={brightness}
          onChange={(e) => updateSettings({ brightnessMultiplier: parseFloat(e.target.value) })}
          className="flex-1 h-1 appearance-none bg-border rounded-sm cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <span className="text-xs text-text-muted min-w-10 text-right">{Math.round(brightness * 100)}%</span>
      </div>
      <div className="h-px bg-border my-2.5" />
      <div className="flex gap-1.5">
        {presets.map((p) => (
          <Button
            key={p.key}
            size="xs"
            variant={lightingMode === p.key ? 'default' : 'outline'}
            className="flex-1 h-7 px-2 text-[11px]"
            onClick={() => updateSettings({ lightingMode: p.key })}
          >
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
