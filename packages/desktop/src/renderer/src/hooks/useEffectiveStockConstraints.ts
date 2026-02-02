import { useProjectStore } from '../store/projectStore';
import { StockConstraintSettings } from '../types';

/**
 * Hook that returns the stock constraint settings for the current project.
 * Each project has its own settings (initialized from app defaults when created).
 */
export function useEffectiveStockConstraints(): StockConstraintSettings {
  return useProjectStore((s) => s.stockConstraints);
}
