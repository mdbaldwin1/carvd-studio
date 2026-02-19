import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { STOCK_COLORS } from '../../constants';
import { useCustomColors } from '../../hooks/useCustomColors';
import { Button } from '@renderer/components/ui/button';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  showCustomColors?: boolean;
}

/**
 * Color picker component with preset colors and optional custom color palette.
 * Includes ability to add/remove custom colors (max 16).
 */
export function ColorPicker({ value, onChange, showCustomColors = true }: ColorPickerProps) {
  const { customColors, addColor, removeColor, hasColor } = useCustomColors();
  const [showAddConfirm, setShowAddConfirm] = useState(false);

  const handleAddCurrentColor = async () => {
    if (!hasColor(value)) {
      await addColor(value);
    }
    setShowAddConfirm(false);
  };

  const handleRemoveColor = async (color: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await removeColor(color);
  };

  // Check if current color is custom (not in presets)
  const isCurrentColorCustom =
    !STOCK_COLORS.includes(value.toLowerCase()) &&
    !STOCK_COLORS.includes(value.toUpperCase()) &&
    !STOCK_COLORS.includes(value);
  const canAddCurrentColor = isCurrentColorCustom && !hasColor(value);

  return (
    <div className="flex flex-col gap-3">
      <div className="color-picker-row">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="hover:border-text-muted focus:outline-none focus:border-accent"
        />
        <div className="flex gap-1 flex-wrap">
          {STOCK_COLORS.map((color) => (
            <button
              key={color}
              className={`w-6 h-6 border-2 rounded cursor-pointer transition-all duration-100 hover:scale-110 ${
                value.toLowerCase() === color.toLowerCase() ? 'border-text' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => onChange(color)}
              title={color}
            />
          ))}
        </div>
      </div>

      {showCustomColors && (customColors.length > 0 || canAddCurrentColor) && (
        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-text-muted uppercase tracking-wider">Custom Colors</span>
            {canAddCurrentColor && (
              <Button
                size="xs"
                variant="ghost"
                className="text-[11px]"
                onClick={() => setShowAddConfirm(true)}
                title="Save current color"
              >
                <Plus size={12} />
                Save Color
              </Button>
            )}
          </div>

          {showAddConfirm && (
            <div className="flex items-center gap-2 p-2 bg-bg rounded text-xs">
              <span className="w-5 h-5 rounded border border-border shrink-0" style={{ backgroundColor: value }} />
              <span>Save this color?</span>
              <Button size="xs" onClick={handleAddCurrentColor}>
                Save
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setShowAddConfirm(false)}>
                Cancel
              </Button>
            </div>
          )}

          {customColors.length > 0 && (
            <div className="flex gap-1 flex-wrap relative">
              {customColors.map((color) => (
                <div key={color} className="relative inline-block group">
                  <button
                    className={`w-5 h-5 border-2 rounded cursor-pointer transition-all duration-100 hover:scale-110 ${
                      value.toLowerCase() === color ? 'border-text' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => onChange(color)}
                    title={color}
                  />
                  <button
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 p-0 border-none rounded-full bg-danger text-white cursor-pointer hidden group-hover:flex items-center justify-center text-[8px]"
                    onClick={(e) => handleRemoveColor(color, e)}
                    title="Remove color"
                    aria-label={`Remove color ${color}`}
                  >
                    <X size={8} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
