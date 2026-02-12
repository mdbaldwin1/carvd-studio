/**
 * License Key Verification System
 *
 * This module handles license key verification using Lemon Squeezy's API.
 * Supports both online validation and offline mode using cached license data.
 *
 * License Flow:
 * 1. User enters license key
 * 2. Validate with Lemon Squeezy API (online)
 * 3. Activate for this instance
 * 4. Cache license data for offline use
 * 5. App works offline using cached validation
 */

import Store from 'electron-store';
import log from 'electron-log';
import {
  validateLicense,
  activateLicense,
  deactivateLicense,
  type LemonSqueezyLicenseValidationResponse
} from './lemonsqueezy-api';

// Persistent storage for license data
const store = new Store();

const LICENSE_KEY_STORE = 'license_key';
const LICENSE_DATA_STORE = 'license_data';
const LICENSE_VALIDATED_AT_STORE = 'license_validated_at';

export interface LicenseData {
  email: string;
  customerName: string;
  orderId: number;
  productName: string;
  variantName: string;
  status: string;
  activationLimit: number;
  activationUsage: number;
  expiresAt: string | null;
  validatedAt: number;
}

export interface LicenseVerificationResult {
  valid: boolean;
  data?: LicenseData;
  error?: string;
  requiresActivation?: boolean;
}

/**
 * Convert Lemon Squeezy response to our LicenseData format
 */
function convertLemonSqueezyData(response: LemonSqueezyLicenseValidationResponse): LicenseData | null {
  if (!response.valid || !response.license_key || !response.meta) {
    return null;
  }

  return {
    email: response.meta.customer_email,
    customerName: response.meta.customer_name,
    orderId: response.meta.order_id,
    productName: response.meta.product_name,
    variantName: response.meta.variant_name,
    status: response.license_key.status,
    activationLimit: response.license_key.activation_limit,
    activationUsage: response.license_key.activation_usage,
    expiresAt: response.license_key.expires_at,
    validatedAt: Date.now()
  };
}

// Development-only test license key (only works in dev mode)
const DEV_LICENSE_KEY = 'DEV-TEST-LICENSE-KEY';

/**
 * Check if we're in development mode and using the dev test key
 */
function isDevTestKey(licenseKey: string): boolean {
  return process.env.NODE_ENV === 'development' && licenseKey === DEV_LICENSE_KEY;
}

/**
 * Generate mock license data for development testing
 */
function getDevLicenseData(): LicenseData {
  return {
    email: 'developer@test.local',
    customerName: 'Development User',
    orderId: 0,
    productName: 'Carvd Studio',
    variantName: 'Carvd Studio', // Same as product name (no variants)
    status: 'active',
    activationLimit: 999,
    activationUsage: 1,
    expiresAt: null,
    validatedAt: Date.now()
  };
}

/**
 * Verify a license key (online validation)
 * This checks with Lemon Squeezy API to ensure the license is valid
 *
 * @param licenseKey The license key to verify
 * @param skipCache If true, always validate online (default: false)
 * @returns Verification result with license data or error
 */
export async function verifyLicense(licenseKey: string, skipCache = false): Promise<LicenseVerificationResult> {
  try {
    // Development mode bypass
    if (isDevTestKey(licenseKey)) {
      log.info('[License] Using development test license');
      const devData = getDevLicenseData();
      store.set(LICENSE_KEY_STORE, licenseKey);
      store.set(LICENSE_DATA_STORE, devData);
      store.set(LICENSE_VALIDATED_AT_STORE, Date.now());
      return { valid: true, data: devData };
    }
    // Check cached license first (offline mode support)
    if (!skipCache) {
      const cachedKey = store.get(LICENSE_KEY_STORE) as string | undefined;
      const cachedData = store.get(LICENSE_DATA_STORE) as LicenseData | undefined;
      const validatedAt = store.get(LICENSE_VALIDATED_AT_STORE) as number | undefined;

      if (cachedKey === licenseKey && cachedData && validatedAt) {
        const daysSinceValidation = (Date.now() - validatedAt) / (1000 * 60 * 60 * 24);

        // Use cached data if validated within last 7 days
        if (daysSinceValidation < 7) {
          log.info('[License] Using cached license data (offline mode)');
          return {
            valid: true,
            data: cachedData
          };
        }
      }
    }

    // Online validation with Lemon Squeezy
    log.info('[License] Validating license online...');
    const response = await validateLicense(licenseKey);

    if (!response.valid) {
      return {
        valid: false,
        error: response.error || 'License validation failed'
      };
    }

    // Check if license needs activation
    if (!response.instance) {
      log.info('[License] License valid but not activated for this instance');
      const licenseData = convertLemonSqueezyData(response);
      if (licenseData) {
        return {
          valid: false,
          requiresActivation: true,
          data: licenseData,
          error: 'License needs activation for this device'
        };
      }
      return {
        valid: false,
        requiresActivation: true,
        error: 'License needs activation for this device'
      };
    }

    // Check license status
    if (response.license_key?.status !== 'active') {
      return {
        valid: false,
        error: `License is ${response.license_key?.status || 'inactive'}`
      };
    }

    // Check expiration
    if (response.license_key?.expires_at) {
      const expiresAt = new Date(response.license_key.expires_at).getTime();
      if (expiresAt < Date.now()) {
        return {
          valid: false,
          error: 'License has expired'
        };
      }
    }

    // License is valid - cache it
    const licenseData = convertLemonSqueezyData(response);
    if (!licenseData) {
      return {
        valid: false,
        error: 'Failed to parse license data'
      };
    }

    store.set(LICENSE_KEY_STORE, licenseKey);
    store.set(LICENSE_DATA_STORE, licenseData);
    store.set(LICENSE_VALIDATED_AT_STORE, Date.now());

    log.info('[License] License validated and cached successfully');

    return {
      valid: true,
      data: licenseData
    };
  } catch (error) {
    log.error('[License] Verification error:', error);

    // Fall back to cached license if online validation fails
    const cachedKey = store.get(LICENSE_KEY_STORE) as string | undefined;
    const cachedData = store.get(LICENSE_DATA_STORE) as LicenseData | undefined;

    if (cachedKey === licenseKey && cachedData) {
      log.info('[License] Online validation failed, using cached data');
      return {
        valid: true,
        data: cachedData
      };
    }

    return {
      valid: false,
      error: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Activate a license key for this device
 * This creates an activation record in Lemon Squeezy
 *
 * @param licenseKey The license key to activate
 * @returns Verification result after activation
 */
export async function activateLicenseKey(licenseKey: string): Promise<LicenseVerificationResult> {
  try {
    // Development mode bypass
    if (isDevTestKey(licenseKey)) {
      log.info('[License] Activating development test license');
      return verifyLicense(licenseKey);
    }

    log.info('[License] Activating license...');

    const response = await activateLicense(licenseKey);

    if (!response.activated) {
      return {
        valid: false,
        error: response.error || 'License activation failed'
      };
    }

    log.info('[License] License activated successfully');

    // Now verify the license to get full data and cache it
    return await verifyLicense(licenseKey, true);
  } catch (error) {
    log.error('[License] Activation error:', error);
    return {
      valid: false,
      error: `Activation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Deactivate the current license
 * This frees up an activation slot
 */
export async function deactivateLicenseKey(): Promise<{ success: boolean; error?: string }> {
  try {
    const licenseKey = store.get(LICENSE_KEY_STORE) as string | undefined;

    if (!licenseKey) {
      return {
        success: false,
        error: 'No license key found'
      };
    }

    log.info('[License] Deactivating license...');

    // Dev test key: just clear locally, don't call API
    if (isDevTestKey(licenseKey)) {
      log.info('[License] Deactivating development test license (local only)');
      store.delete(LICENSE_KEY_STORE);
      store.delete(LICENSE_DATA_STORE);
      store.delete(LICENSE_VALIDATED_AT_STORE);
      return { success: true };
    }

    const result = await deactivateLicense(licenseKey);

    // Always clear local cache when user explicitly deactivates
    // Even if API fails (e.g., already deactivated server-side, network error),
    // the user's intent is to deactivate locally
    store.delete(LICENSE_KEY_STORE);
    store.delete(LICENSE_DATA_STORE);
    store.delete(LICENSE_VALIDATED_AT_STORE);
    log.info('[License] Local license cache cleared');

    if (!result.success) {
      log.warn('[License] API deactivation failed, but local cache cleared:', result.error);
    }

    return { success: true };
  } catch (error) {
    log.error('[License] Deactivation error:', error);
    // Still clear local cache on error - user wants to deactivate
    store.delete(LICENSE_KEY_STORE);
    store.delete(LICENSE_DATA_STORE);
    store.delete(LICENSE_VALIDATED_AT_STORE);
    log.info('[License] Local license cache cleared despite API error');
    return { success: true };
  }
}

/**
 * Get the currently stored license key (if any)
 */
export function getStoredLicenseKey(): string | null {
  return (store.get(LICENSE_KEY_STORE) as string) || null;
}

/**
 * Get the currently stored license data (if any)
 */
export function getStoredLicenseData(): LicenseData | null {
  return (store.get(LICENSE_DATA_STORE) as LicenseData) || null;
}

/**
 * Check if license needs revalidation (more than 7 days since last check)
 */
export function needsRevalidation(): boolean {
  const validatedAt = store.get(LICENSE_VALIDATED_AT_STORE) as number | undefined;

  if (!validatedAt) {
    return true;
  }

  const daysSinceValidation = (Date.now() - validatedAt) / (1000 * 60 * 60 * 24);
  return daysSinceValidation >= 7;
}

/**
 * Format a license key for display (show first/last chars, hide middle)
 */
export function formatLicenseKeyForDisplay(licenseKey: string): string {
  if (licenseKey.length <= 16) {
    return licenseKey;
  }
  return `${licenseKey.substring(0, 8)}...${licenseKey.substring(licenseKey.length - 8)}`;
}
