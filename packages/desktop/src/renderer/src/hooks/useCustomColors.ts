import { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';

/**
 * Hook for managing user's custom color palette.
 * Colors are stored persistently and synced across the app.
 * Maximum of 16 custom colors are stored.
 */
export function useCustomColors() {
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load custom colors on mount
  useEffect(() => {
    const loadColors = async () => {
      try {
        const colors = await window.electronAPI.getCustomColors();
        setCustomColors(colors);
      } catch (error) {
        logger.error('Failed to load custom colors:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadColors();
  }, []);

  // Add a new custom color
  const addColor = useCallback(async (color: string) => {
    const normalizedColor = color.toLowerCase();
    // Optimistically update UI
    setCustomColors((prev) => {
      if (prev.includes(normalizedColor)) return prev;
      const newColors = [...prev, normalizedColor];
      // Enforce max limit of 16
      if (newColors.length > 16) {
        newColors.shift();
      }
      return newColors;
    });
    // Persist to storage
    await window.electronAPI.addCustomColor(color);
  }, []);

  // Remove a custom color
  const removeColor = useCallback(async (color: string) => {
    const normalizedColor = color.toLowerCase();
    // Optimistically update UI
    setCustomColors((prev) => prev.filter((c) => c !== normalizedColor));
    // Persist to storage
    await window.electronAPI.removeCustomColor(color);
  }, []);

  // Check if a color exists in the custom palette
  const hasColor = useCallback(
    (color: string) => {
      return customColors.includes(color.toLowerCase());
    },
    [customColors]
  );

  return {
    customColors,
    addColor,
    removeColor,
    hasColor,
    isLoading
  };
}
