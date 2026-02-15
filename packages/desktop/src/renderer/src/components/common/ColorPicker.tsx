import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { STOCK_COLORS } from '../../constants';
import { useCustomColors } from '../../hooks/useCustomColors';

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
    <div className="color-picker-container">
      <div className="color-picker-row">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <div className="color-presets">
          {STOCK_COLORS.map((color) => (
            <button
              key={color}
              className={`color-preset ${value.toLowerCase() === color.toLowerCase() ? 'selected' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onChange(color)}
              title={color}
            />
          ))}
        </div>
      </div>

      {showCustomColors && (customColors.length > 0 || canAddCurrentColor) && (
        <div className="custom-colors-section">
          <div className="custom-colors-header">
            <span className="custom-colors-label">Custom Colors</span>
            {canAddCurrentColor && (
              <button
                className="btn btn-xs btn-ghost btn-secondary add-custom-color-btn"
                onClick={() => setShowAddConfirm(true)}
                title="Save current color"
              >
                <Plus size={12} />
                Save Color
              </button>
            )}
          </div>

          {showAddConfirm && (
            <div className="add-color-confirm">
              <span className="color-preview-swatch" style={{ backgroundColor: value }} />
              <span>Save this color?</span>
              <button className="btn btn-xs btn-filled btn-primary" onClick={handleAddCurrentColor}>
                Save
              </button>
              <button className="btn btn-xs btn-ghost btn-secondary" onClick={() => setShowAddConfirm(false)}>
                Cancel
              </button>
            </div>
          )}

          {customColors.length > 0 && (
            <div className="color-presets custom-color-presets">
              {customColors.map((color) => (
                <div key={color} className="custom-color-wrapper">
                  <button
                    className={`color-preset ${value.toLowerCase() === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => onChange(color)}
                    title={color}
                  />
                  <button
                    className="remove-custom-color"
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
