/**
 * Lemon Squeezy API Client for License Operations
 *
 * Handles license validation and activation using Lemon Squeezy's API.
 * Docs: https://docs.lemonsqueezy.com/api/licenses
 */

import { app } from 'electron';
import log from 'electron-log';

const LEMONSQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1';

// Network timeout for API calls (15 seconds)
const API_TIMEOUT_MS = 15000;

/**
 * Create a fetch request with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = API_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface LemonSqueezyLicenseValidationResponse {
  valid: boolean;
  error?: string;
  license_key?: {
    id: number;
    status: string;
    key: string;
    activation_limit: number;
    activation_usage: number;
    created_at: string;
    expires_at: string | null;
  };
  instance?: {
    id: string;
    name: string;
    created_at: string;
  };
  meta?: {
    store_id: number;
    order_id: number;
    order_item_id: number;
    product_id: number;
    product_name: string;
    variant_id: number;
    variant_name: string;
    customer_id: number;
    customer_name: string;
    customer_email: string;
  };
}

export interface LemonSqueezyActivationResponse {
  activated: boolean;
  error?: string;
  license_key?: {
    id: number;
    status: string;
    key: string;
    activation_limit: number;
    activation_usage: number;
  };
  instance?: {
    id: string;
    name: string;
  };
}

/**
 * Generate a unique instance identifier for this installation
 * Uses machine ID + app version for uniqueness
 */
export function getInstanceId(): string {
  // In production, you might want to use a more persistent ID
  // For now, we'll use a combination of machine info
  const machineId = app.getPath('userData'); // Unique per user+app
  const version = app.getVersion();

  // Create a simple hash of the machine ID
  const hash = Buffer.from(machineId).toString('base64').substring(0, 16);
  return `carvd-${hash}-${version}`;
}

/**
 * Get instance name for display in Lemon Squeezy dashboard
 */
export function getInstanceName(): string {
  const platform = process.platform;
  const hostname = require('os').hostname();
  return `${hostname} (${platform})`;
}

/**
 * Validate a license key with Lemon Squeezy
 * This checks if the license is valid but doesn't activate it
 *
 * @param licenseKey The license key to validate
 * @returns Validation response from Lemon Squeezy
 */
export async function validateLicense(licenseKey: string): Promise<LemonSqueezyLicenseValidationResponse> {
  try {
    log.info('[LemonSqueezy] Validating license key...');

    const response = await fetchWithTimeout(`${LEMONSQUEEZY_API_URL}/licenses/validate`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        license_key: licenseKey,
        instance_id: getInstanceId()
      })
    });

    const data = await response.json();

    if (!response.ok) {
      log.error('[LemonSqueezy] Validation failed:', data);
      return {
        valid: false,
        error: data.error || 'License validation failed'
      };
    }

    log.info('[LemonSqueezy] License validated successfully:', {
      status: data.license_key?.status,
      activations: `${data.license_key?.activation_usage}/${data.license_key?.activation_limit}`
    });

    return {
      valid: data.valid,
      license_key: data.license_key,
      instance: data.instance,
      meta: data.meta
    };
  } catch (error) {
    log.error('[LemonSqueezy] Validation error:', error);
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    return {
      valid: false,
      error: isTimeout
        ? 'Request timed out. Please check your internet connection.'
        : error instanceof Error
          ? error.message
          : 'Network error during validation'
    };
  }
}

/**
 * Activate a license key for this instance
 * This creates an activation record in Lemon Squeezy
 *
 * @param licenseKey The license key to activate
 * @returns Activation response from Lemon Squeezy
 */
export async function activateLicense(licenseKey: string): Promise<LemonSqueezyActivationResponse> {
  try {
    log.info('[LemonSqueezy] Activating license key...');

    const response = await fetchWithTimeout(`${LEMONSQUEEZY_API_URL}/licenses/activate`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        license_key: licenseKey,
        instance_name: getInstanceName()
      })
    });

    const data = await response.json();

    if (!response.ok) {
      log.error('[LemonSqueezy] Activation failed:', data);
      return {
        activated: false,
        error: data.error || 'License activation failed'
      };
    }

    log.info('[LemonSqueezy] License activated successfully');

    return {
      activated: data.activated,
      license_key: data.license_key,
      instance: data.instance
    };
  } catch (error) {
    log.error('[LemonSqueezy] Activation error:', error);
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    return {
      activated: false,
      error: isTimeout
        ? 'Request timed out. Please check your internet connection.'
        : error instanceof Error
          ? error.message
          : 'Network error during activation'
    };
  }
}

/**
 * Deactivate this instance's activation
 * This frees up an activation slot
 *
 * @param licenseKey The license key to deactivate
 * @returns Success or error
 */
export async function deactivateLicense(licenseKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    log.info('[LemonSqueezy] Deactivating license key...');

    const response = await fetchWithTimeout(`${LEMONSQUEEZY_API_URL}/licenses/deactivate`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        license_key: licenseKey,
        instance_id: getInstanceId()
      })
    });

    const data = await response.json();

    if (!response.ok) {
      log.error('[LemonSqueezy] Deactivation failed:', data);
      return {
        success: false,
        error: data.error || 'License deactivation failed'
      };
    }

    log.info('[LemonSqueezy] License deactivated successfully');

    return { success: true };
  } catch (error) {
    log.error('[LemonSqueezy] Deactivation error:', error);
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    return {
      success: false,
      error: isTimeout
        ? 'Request timed out. Please check your internet connection.'
        : error instanceof Error
          ? error.message
          : 'Network error during deactivation'
    };
  }
}
