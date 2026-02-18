import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getInstanceId,
  getInstanceName,
  validateLicense,
  activateLicense,
  deactivateLicense
} from './lemonsqueezy-api';

// Access the mocked electron app
const mockApp = vi.mocked(await import('electron')).app;

describe('lemonsqueezy-api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    mockApp.getPath.mockReturnValue('/mock/user/data');
    mockApp.getVersion.mockReturnValue('1.0.0');
  });

  describe('getInstanceId', () => {
    it('returns a string starting with "carvd-"', () => {
      const id = getInstanceId();
      expect(id).toMatch(/^carvd-.+/);
    });

    it('includes version in the ID', () => {
      const id = getInstanceId();
      expect(id).toContain('1.0.0');
    });

    it('changes when userData path changes', () => {
      const id1 = getInstanceId();
      mockApp.getPath.mockReturnValue('/different/path');
      const id2 = getInstanceId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('getInstanceName', () => {
    it('returns hostname and platform', () => {
      const name = getInstanceName();
      expect(name).toMatch(/.+\(.+\)/);
      expect(name).toContain(process.platform);
    });
  });

  describe('validateLicense', () => {
    it('calls the API with correct parameters', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          valid: true,
          license_key: { id: 1, status: 'active', key: 'KEY', activation_limit: 5, activation_usage: 1 },
          instance: { id: 'i1', name: 'Test' },
          meta: {
            store_id: 1,
            order_id: 1,
            order_item_id: 1,
            product_id: 1,
            product_name: 'Carvd',
            variant_id: 1,
            variant_name: 'Carvd',
            customer_id: 1,
            customer_name: 'Test',
            customer_email: 'test@test.com'
          }
        })
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as unknown as Response);

      const result = await validateLicense('MY-KEY');

      expect(result.valid).toBe(true);
      expect(result.license_key).toBeDefined();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/licenses/validate'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('MY-KEY')
        })
      );
    });

    it('handles API error response', async () => {
      const mockResponse = {
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'Invalid key' })
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as unknown as Response);

      const result = await validateLicense('BAD-KEY');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid key');
    });

    it('handles network error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network failure'));

      const result = await validateLicense('KEY');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Network failure');
    });

    it('handles timeout (AbortError)', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortError);

      const result = await validateLicense('KEY');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('timed out');
    });
  });

  describe('activateLicense', () => {
    it('calls activation endpoint', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          activated: true,
          license_key: { id: 1, status: 'active', key: 'KEY', activation_limit: 5, activation_usage: 1 },
          instance: { id: 'i1', name: 'Test' }
        })
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as unknown as Response);

      const result = await activateLicense('KEY');

      expect(result.activated).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/licenses/activate'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('handles activation failure', async () => {
      const mockResponse = {
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'Limit reached' })
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as unknown as Response);

      const result = await activateLicense('KEY');

      expect(result.activated).toBe(false);
      expect(result.error).toBe('Limit reached');
    });

    it('handles network error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Offline'));

      const result = await activateLicense('KEY');

      expect(result.activated).toBe(false);
      expect(result.error).toContain('Offline');
    });
  });

  describe('deactivateLicense', () => {
    it('calls deactivation endpoint', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ deactivated: true })
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as unknown as Response);

      const result = await deactivateLicense('KEY');

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/licenses/deactivate'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('handles deactivation failure', async () => {
      const mockResponse = {
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'Already deactivated' })
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as unknown as Response);

      const result = await deactivateLicense('KEY');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Already deactivated');
    });

    it('handles timeout', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortError);

      const result = await deactivateLicense('KEY');

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });
  });
});
