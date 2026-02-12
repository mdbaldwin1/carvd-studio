import { describe, it, expect } from 'vitest';
import {
  FREE_LIMITS,
  FULL_LIMITS,
  getFeatureLimits,
  canPerformAction,
  canAddPart,
  canAddStock,
  getBlockedMessage,
  getRemainingParts,
  getRemainingStock
} from './featureLimits';

describe('featureLimits', () => {
  describe('FREE_LIMITS', () => {
    it('has max 10 parts', () => {
      expect(FREE_LIMITS.maxParts).toBe(10);
    });

    it('has max 5 stock items', () => {
      expect(FREE_LIMITS.maxStockItems).toBe(5);
    });

    it('disables PDF export', () => {
      expect(FREE_LIMITS.canExportPDF).toBe(false);
    });

    it('disables optimizer', () => {
      expect(FREE_LIMITS.canUseOptimizer).toBe(false);
    });

    it('disables groups', () => {
      expect(FREE_LIMITS.canUseGroups).toBe(false);
    });

    it('disables assemblies', () => {
      expect(FREE_LIMITS.canUseAssemblies).toBe(false);
    });

    it('disables custom templates', () => {
      expect(FREE_LIMITS.canUseCustomTemplates).toBe(false);
    });

    it('disables grain direction', () => {
      expect(FREE_LIMITS.canUseGrainDirection).toBe(false);
    });
  });

  describe('FULL_LIMITS', () => {
    it('has unlimited parts', () => {
      expect(FULL_LIMITS.maxParts).toBeNull();
    });

    it('has unlimited stock items', () => {
      expect(FULL_LIMITS.maxStockItems).toBeNull();
    });

    it('enables all features', () => {
      expect(FULL_LIMITS.canExportPDF).toBe(true);
      expect(FULL_LIMITS.canUseOptimizer).toBe(true);
      expect(FULL_LIMITS.canUseGroups).toBe(true);
      expect(FULL_LIMITS.canUseAssemblies).toBe(true);
      expect(FULL_LIMITS.canUseCustomTemplates).toBe(true);
      expect(FULL_LIMITS.canUseGrainDirection).toBe(true);
    });
  });

  describe('getFeatureLimits', () => {
    it('returns FULL_LIMITS for trial mode', () => {
      const limits = getFeatureLimits('trial');
      expect(limits).toEqual(FULL_LIMITS);
    });

    it('returns FULL_LIMITS for licensed mode', () => {
      const limits = getFeatureLimits('licensed');
      expect(limits).toEqual(FULL_LIMITS);
    });

    it('returns FREE_LIMITS for free mode', () => {
      const limits = getFeatureLimits('free');
      expect(limits).toEqual(FREE_LIMITS);
    });
  });

  describe('canPerformAction', () => {
    it('allows all actions in trial mode', () => {
      expect(canPerformAction('trial', 'canExportPDF')).toBe(true);
      expect(canPerformAction('trial', 'canUseOptimizer')).toBe(true);
      expect(canPerformAction('trial', 'canUseGroups')).toBe(true);
      expect(canPerformAction('trial', 'canUseAssemblies')).toBe(true);
    });

    it('allows all actions in licensed mode', () => {
      expect(canPerformAction('licensed', 'canExportPDF')).toBe(true);
      expect(canPerformAction('licensed', 'canUseOptimizer')).toBe(true);
      expect(canPerformAction('licensed', 'canUseGroups')).toBe(true);
      expect(canPerformAction('licensed', 'canUseAssemblies')).toBe(true);
    });

    it('blocks premium actions in free mode', () => {
      expect(canPerformAction('free', 'canExportPDF')).toBe(false);
      expect(canPerformAction('free', 'canUseOptimizer')).toBe(false);
      expect(canPerformAction('free', 'canUseGroups')).toBe(false);
      expect(canPerformAction('free', 'canUseAssemblies')).toBe(false);
    });
  });

  describe('canAddPart', () => {
    it('always allows adding parts in trial mode', () => {
      expect(canAddPart('trial', 0)).toBe(true);
      expect(canAddPart('trial', 100)).toBe(true);
      expect(canAddPart('trial', 1000)).toBe(true);
    });

    it('always allows adding parts in licensed mode', () => {
      expect(canAddPart('licensed', 0)).toBe(true);
      expect(canAddPart('licensed', 100)).toBe(true);
      expect(canAddPart('licensed', 1000)).toBe(true);
    });

    it('allows adding parts in free mode when under limit', () => {
      expect(canAddPart('free', 0)).toBe(true);
      expect(canAddPart('free', 5)).toBe(true);
      expect(canAddPart('free', 9)).toBe(true);
    });

    it('blocks adding parts in free mode at limit', () => {
      expect(canAddPart('free', 10)).toBe(false);
    });

    it('blocks adding parts in free mode over limit (grace mode)', () => {
      expect(canAddPart('free', 50)).toBe(false);
      expect(canAddPart('free', 100)).toBe(false);
    });
  });

  describe('canAddStock', () => {
    it('always allows adding stock in trial mode', () => {
      expect(canAddStock('trial', 0)).toBe(true);
      expect(canAddStock('trial', 100)).toBe(true);
    });

    it('always allows adding stock in licensed mode', () => {
      expect(canAddStock('licensed', 0)).toBe(true);
      expect(canAddStock('licensed', 100)).toBe(true);
    });

    it('allows adding stock in free mode when under limit', () => {
      expect(canAddStock('free', 0)).toBe(true);
      expect(canAddStock('free', 4)).toBe(true);
    });

    it('blocks adding stock in free mode at limit', () => {
      expect(canAddStock('free', 5)).toBe(false);
    });

    it('blocks adding stock in free mode over limit', () => {
      expect(canAddStock('free', 10)).toBe(false);
    });
  });

  describe('getBlockedMessage', () => {
    it('returns correct message for addPart', () => {
      expect(getBlockedMessage('addPart')).toContain('Part limit');
    });

    it('returns correct message for addStock', () => {
      expect(getBlockedMessage('addStock')).toContain('Stock limit');
    });

    it('returns correct message for exportPDF', () => {
      expect(getBlockedMessage('exportPDF')).toContain('PDF export');
    });

    it('returns correct message for useOptimizer', () => {
      expect(getBlockedMessage('useOptimizer')).toContain('optimizer');
    });

    it('returns correct message for useGroups', () => {
      expect(getBlockedMessage('useGroups')).toContain('Groups');
    });

    it('returns correct message for useAssemblies', () => {
      expect(getBlockedMessage('useAssemblies')).toContain('Assemblies');
    });

    it('returns generic message for unknown action', () => {
      expect(getBlockedMessage('unknownAction')).toContain('requires a license');
    });
  });

  describe('getRemainingParts', () => {
    it('returns null for trial mode (unlimited)', () => {
      expect(getRemainingParts('trial', 5)).toBeNull();
    });

    it('returns null for licensed mode (unlimited)', () => {
      expect(getRemainingParts('licensed', 100)).toBeNull();
    });

    it('returns remaining count for free mode', () => {
      expect(getRemainingParts('free', 0)).toBe(10);
      expect(getRemainingParts('free', 5)).toBe(5);
      expect(getRemainingParts('free', 9)).toBe(1);
      expect(getRemainingParts('free', 10)).toBe(0);
    });

    it('returns 0 when over limit (not negative)', () => {
      expect(getRemainingParts('free', 50)).toBe(0);
      expect(getRemainingParts('free', 100)).toBe(0);
    });
  });

  describe('getRemainingStock', () => {
    it('returns null for trial mode (unlimited)', () => {
      expect(getRemainingStock('trial', 5)).toBeNull();
    });

    it('returns null for licensed mode (unlimited)', () => {
      expect(getRemainingStock('licensed', 100)).toBeNull();
    });

    it('returns remaining count for free mode', () => {
      expect(getRemainingStock('free', 0)).toBe(5);
      expect(getRemainingStock('free', 3)).toBe(2);
      expect(getRemainingStock('free', 4)).toBe(1);
      expect(getRemainingStock('free', 5)).toBe(0);
    });

    it('returns 0 when over limit (not negative)', () => {
      expect(getRemainingStock('free', 10)).toBe(0);
    });
  });
});
