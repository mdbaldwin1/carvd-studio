import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  verifyLicense,
  activateLicenseKey,
  deactivateLicenseKey,
  getStoredLicenseKey,
  getStoredLicenseData,
  needsRevalidation,
  formatLicenseKeyForDisplay
} from './license';
import { validateLicense, activateLicense, deactivateLicense } from './lemonsqueezy-api';

// Mock the lemonsqueezy-api module
vi.mock('./lemonsqueezy-api', () => ({
  validateLicense: vi.fn(),
  activateLicense: vi.fn(),
  deactivateLicense: vi.fn()
}));

// Helper to create a valid LS response
function createValidResponse(overrides = {}) {
  return {
    valid: true,
    license_key: {
      id: 1,
      status: 'active',
      key: 'TEST-LICENSE-KEY-123',
      activation_limit: 5,
      activation_usage: 1,
      created_at: '2026-01-01T00:00:00Z',
      expires_at: null
    },
    instance: {
      id: 'inst-1',
      name: 'Test Machine',
      created_at: '2026-01-01T00:00:00Z'
    },
    meta: {
      store_id: 1,
      order_id: 100,
      order_item_id: 200,
      product_id: 1,
      product_name: 'Carvd Studio',
      variant_id: 1,
      variant_name: 'Carvd Studio',
      customer_id: 1,
      customer_name: 'Test User',
      customer_email: 'test@example.com'
    },
    ...overrides
  };
}

describe('license', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Deactivate any stored license to reset store state between tests.
    // license.ts has its own Store instance, so we need to clear it via the API.
    vi.mocked(deactivateLicense).mockResolvedValue({ success: true });
    await deactivateLicenseKey();
    vi.clearAllMocks();
  });

  describe('formatLicenseKeyForDisplay', () => {
    it('returns short keys unchanged', () => {
      expect(formatLicenseKeyForDisplay('SHORT-KEY')).toBe('SHORT-KEY');
    });

    it('returns 16-char keys unchanged', () => {
      expect(formatLicenseKeyForDisplay('1234567890123456')).toBe('1234567890123456');
    });

    it('truncates long keys with ellipsis', () => {
      const key = 'ABCD1234-EFGH5678-IJKL9012-MNOP3456';
      const formatted = formatLicenseKeyForDisplay(key);
      // First 8 chars + ... + last 8 chars
      expect(formatted).toBe('ABCD1234...MNOP3456');
      expect(formatted.length).toBeLessThan(key.length);
    });
  });

  describe('verifyLicense', () => {
    it('accepts dev test key in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const result = await verifyLicense('DEV-TEST-LICENSE-KEY');

      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.email).toBe('developer@test.local');
      expect(result.data!.status).toBe('active');

      process.env.NODE_ENV = originalEnv;
    });

    it('validates online and caches result', async () => {
      const response = createValidResponse();
      vi.mocked(validateLicense).mockResolvedValue(response);

      const result = await verifyLicense('REAL-KEY', true);

      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.email).toBe('test@example.com');
      expect(result.data!.customerName).toBe('Test User');
      expect(result.data!.status).toBe('active');
      expect(validateLicense).toHaveBeenCalledWith('REAL-KEY', undefined);
    });

    it('uses cached data for recent validation', async () => {
      // First verify to cache
      vi.mocked(validateLicense).mockResolvedValue(createValidResponse());
      await verifyLicense('REAL-KEY', true);

      vi.mocked(validateLicense).mockClear();

      // Second verify should use cache (within 7 days)
      const result = await verifyLicense('REAL-KEY');

      expect(result.valid).toBe(true);
      expect(validateLicense).not.toHaveBeenCalled();
    });

    it('returns error for invalid license', async () => {
      vi.mocked(validateLicense).mockResolvedValue({
        valid: false,
        error: 'Invalid license key'
      });

      const result = await verifyLicense('BAD-KEY', true);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid license key');
    });

    it('returns requiresActivation when instance is missing', async () => {
      const response = createValidResponse({ instance: undefined });
      vi.mocked(validateLicense).mockResolvedValue(response);

      const result = await verifyLicense('UNACTIVATED-KEY', true);

      expect(result.valid).toBe(false);
      expect(result.requiresActivation).toBe(true);
    });

    it('returns error for inactive license', async () => {
      const response = createValidResponse();
      response.license_key!.status = 'inactive';
      vi.mocked(validateLicense).mockResolvedValue(response);

      const result = await verifyLicense('INACTIVE-KEY', true);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('License is inactive');
    });

    it('returns error for expired license', async () => {
      const response = createValidResponse();
      response.license_key!.expires_at = '2020-01-01T00:00:00Z'; // In the past
      vi.mocked(validateLicense).mockResolvedValue(response);

      const result = await verifyLicense('EXPIRED-KEY', true);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('License has expired');
    });

    it('falls back to cache on network error', async () => {
      // First verify to cache
      vi.mocked(validateLicense).mockResolvedValue(createValidResponse());
      await verifyLicense('REAL-KEY', true);

      // Network error on second attempt
      vi.mocked(validateLicense).mockRejectedValue(new Error('Network error'));

      const result = await verifyLicense('REAL-KEY', true);

      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('returns error on network error with no cache', async () => {
      vi.mocked(validateLicense).mockRejectedValue(new Error('Network error'));

      const result = await verifyLicense('UNKNOWN-KEY', true);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('activateLicenseKey', () => {
    it('activates and verifies license', async () => {
      vi.mocked(activateLicense).mockResolvedValue({
        activated: true,
        license_key: { id: 1, status: 'active', key: 'KEY', activation_limit: 5, activation_usage: 1 },
        instance: { id: 'inst', name: 'Test' }
      });
      vi.mocked(validateLicense).mockResolvedValue(createValidResponse());

      const result = await activateLicenseKey('KEY');

      expect(result.valid).toBe(true);
      expect(activateLicense).toHaveBeenCalledWith('KEY');
    });

    it('returns error when activation fails', async () => {
      vi.mocked(activateLicense).mockResolvedValue({
        activated: false,
        error: 'Activation limit reached'
      });

      const result = await activateLicenseKey('KEY');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Activation limit reached');
    });

    it('handles activation network error', async () => {
      vi.mocked(activateLicense).mockRejectedValue(new Error('Timeout'));

      const result = await activateLicenseKey('KEY');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Timeout');
    });

    it('uses dev bypass for dev test key', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const result = await activateLicenseKey('DEV-TEST-LICENSE-KEY');

      expect(result.valid).toBe(true);
      expect(activateLicense).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('deactivateLicenseKey', () => {
    it('deactivates and clears cache', async () => {
      // First store a license
      vi.mocked(validateLicense).mockResolvedValue(createValidResponse());
      await verifyLicense('REAL-KEY', true);

      vi.mocked(deactivateLicense).mockResolvedValue({ success: true });

      const result = await deactivateLicenseKey();

      expect(result.success).toBe(true);
      expect(deactivateLicense).toHaveBeenCalledWith('REAL-KEY', 'inst-1');
      expect(getStoredLicenseKey()).toBeNull();
    });

    it('returns error when no key stored', async () => {
      const result = await deactivateLicenseKey();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No license key found');
    });

    it('clears cache even on API failure', async () => {
      // Store a license
      vi.mocked(validateLicense).mockResolvedValue(createValidResponse());
      await verifyLicense('REAL-KEY', true);

      vi.mocked(deactivateLicense).mockResolvedValue({ success: false, error: 'API error' });

      const result = await deactivateLicenseKey();

      // Should still succeed locally
      expect(result.success).toBe(true);
      expect(getStoredLicenseKey()).toBeNull();
    });

    it('clears cache on network error', async () => {
      vi.mocked(validateLicense).mockResolvedValue(createValidResponse());
      await verifyLicense('REAL-KEY', true);

      vi.mocked(deactivateLicense).mockRejectedValue(new Error('Network error'));

      const result = await deactivateLicenseKey();

      expect(result.success).toBe(true);
      expect(getStoredLicenseKey()).toBeNull();
    });

    it('handles dev key deactivation locally', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Store dev key
      await verifyLicense('DEV-TEST-LICENSE-KEY');

      const result = await deactivateLicenseKey();

      expect(result.success).toBe(true);
      expect(deactivateLicense).not.toHaveBeenCalled(); // No API call for dev key

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('getStoredLicenseKey', () => {
    it('returns null when no key stored', () => {
      expect(getStoredLicenseKey()).toBeNull();
    });

    it('returns stored key after verification', async () => {
      vi.mocked(validateLicense).mockResolvedValue(createValidResponse());
      await verifyLicense('REAL-KEY', true);

      expect(getStoredLicenseKey()).toBe('REAL-KEY');
    });
  });

  describe('getStoredLicenseData', () => {
    it('returns null when no data stored', () => {
      expect(getStoredLicenseData()).toBeNull();
    });

    it('returns stored data after verification', async () => {
      vi.mocked(validateLicense).mockResolvedValue(createValidResponse());
      await verifyLicense('REAL-KEY', true);

      const data = getStoredLicenseData();
      expect(data).toBeDefined();
      expect(data!.email).toBe('test@example.com');
    });
  });

  describe('needsRevalidation', () => {
    it('returns true when no validation timestamp', () => {
      expect(needsRevalidation()).toBe(true);
    });

    it('returns false for recent validation', async () => {
      vi.mocked(validateLicense).mockResolvedValue(createValidResponse());
      await verifyLicense('KEY', true);

      expect(needsRevalidation()).toBe(false);
    });
  });
});
