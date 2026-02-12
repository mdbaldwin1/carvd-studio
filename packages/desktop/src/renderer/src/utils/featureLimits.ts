/**
 * Feature limits for trial and free mode
 *
 * Defines what features are available in each license mode.
 * - trial: Full access during 14-day trial
 * - licensed: Full access with valid license
 * - free: Limited access after trial expires without license
 */

export interface FeatureLimits {
  /** Max parts per project (null = unlimited) */
  maxParts: number | null;
  /** Max stock library items (null = unlimited) */
  maxStockItems: number | null;
  /** Can export to PDF */
  canExportPDF: boolean;
  /** Can use cut list optimizer */
  canUseOptimizer: boolean;
  /** Can create/use groups */
  canUseGroups: boolean;
  /** Can create/use assemblies */
  canUseAssemblies: boolean;
  /** Can save custom templates */
  canUseCustomTemplates: boolean;
  /** Can use grain direction on parts */
  canUseGrainDirection: boolean;
}

/** Limits for free mode (after trial expires, no license) */
export const FREE_LIMITS: FeatureLimits = {
  maxParts: 10,
  maxStockItems: 5,
  canExportPDF: false,
  canUseOptimizer: false,
  canUseGroups: false,
  canUseAssemblies: false,
  canUseCustomTemplates: false,
  canUseGrainDirection: false
};

/** No limits for trial or licensed users */
export const FULL_LIMITS: FeatureLimits = {
  maxParts: null,
  maxStockItems: null,
  canExportPDF: true,
  canUseOptimizer: true,
  canUseGroups: true,
  canUseAssemblies: true,
  canUseCustomTemplates: true,
  canUseGrainDirection: true
};

export type LicenseMode = 'trial' | 'licensed' | 'free';

/**
 * Get feature limits based on license mode
 */
export function getFeatureLimits(mode: LicenseMode): FeatureLimits {
  if (mode === 'free') {
    return FREE_LIMITS;
  }
  return FULL_LIMITS;
}

/**
 * Check if a specific action is allowed
 */
export function canPerformAction(
  mode: LicenseMode,
  action: keyof Omit<FeatureLimits, 'maxParts' | 'maxStockItems'>
): boolean {
  const limits = getFeatureLimits(mode);
  return limits[action];
}

/**
 * Check if user can add another part
 * Note: In "grace mode", users can open projects with more parts than the limit,
 * but they can't add new parts if they're at or above the limit.
 */
export function canAddPart(mode: LicenseMode, currentPartCount: number): boolean {
  const limits = getFeatureLimits(mode);
  if (limits.maxParts === null) return true;
  return currentPartCount < limits.maxParts;
}

/**
 * Check if user can add another stock item to library
 */
export function canAddStock(mode: LicenseMode, currentStockCount: number): boolean {
  const limits = getFeatureLimits(mode);
  if (limits.maxStockItems === null) return true;
  return currentStockCount < limits.maxStockItems;
}

/**
 * Get a user-friendly message for why an action is blocked
 */
export function getBlockedMessage(action: string): string {
  const messages: Record<string, string> = {
    addPart: 'Part limit reached (10). Upgrade to add more parts.',
    addStock: 'Stock limit reached (5). Upgrade to add more stock.',
    exportPDF: 'PDF export requires a license.',
    useOptimizer: 'Cut list optimizer requires a license.',
    useGroups: 'Groups require a license.',
    useAssemblies: 'Assemblies require a license.',
    useTemplates: 'Custom templates require a license.',
    useGrain: 'Grain direction requires a license.'
  };
  return messages[action] || 'This feature requires a license.';
}

/**
 * Get remaining count before hitting limit
 */
export function getRemainingParts(mode: LicenseMode, currentPartCount: number): number | null {
  const limits = getFeatureLimits(mode);
  if (limits.maxParts === null) return null;
  return Math.max(0, limits.maxParts - currentPartCount);
}

/**
 * Get remaining stock items before hitting limit
 */
export function getRemainingStock(mode: LicenseMode, currentStockCount: number): number | null {
  const limits = getFeatureLimits(mode);
  if (limits.maxStockItems === null) return null;
  return Math.max(0, limits.maxStockItems - currentStockCount);
}
