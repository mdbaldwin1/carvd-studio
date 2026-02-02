/**
 * License Key Verification System
 *
 * This module handles offline license key verification using JWT tokens
 * signed with RSA-2048 asymmetric cryptography.
 *
 * License keys are signed JWTs containing:
 * - email: Customer email address
 * - orderId: Lemon Squeezy order ID
 * - product: "carvd-studio"
 * - licenseType: "standard" (expandable for future tiers)
 * - iat: Issued at timestamp
 * - exp: Expiration (null for lifetime licenses)
 */

import jwt from 'jsonwebtoken';
import { LICENSE_PUBLIC_KEY } from './keys';

export interface LicenseData {
  email: string;
  orderId: string;
  product: string;
  licenseType: string;
  iat?: number;
  exp?: number; // Optional - if omitted, license is lifetime
}

export interface LicenseVerificationResult {
  valid: boolean;
  data?: LicenseData;
  error?: string;
}

/**
 * Verify a license key using the public key
 * @param licenseKey The base64-encoded JWT license key
 * @returns Verification result with license data or error message
 */
export function verifyLicense(licenseKey: string): LicenseVerificationResult {
  try {
    // Verify and decode the JWT
    const decoded = jwt.verify(licenseKey, LICENSE_PUBLIC_KEY, {
      algorithms: ['RS256']
    }) as LicenseData;

    // Validate required fields
    if (!decoded.email || !decoded.orderId || !decoded.product) {
      return {
        valid: false,
        error: 'Invalid license key: missing required fields'
      };
    }

    // Verify product matches
    if (decoded.product !== 'carvd-studio') {
      return {
        valid: false,
        error: 'Invalid license key: wrong product'
      };
    }

    // Check expiration if present (omitted exp = lifetime license)
    if (decoded.exp !== undefined && decoded.exp < Date.now() / 1000) {
      return {
        valid: false,
        error: 'License key has expired'
      };
    }

    return {
      valid: true,
      data: decoded
    };
  } catch (error) {
    // JWT verification failed (invalid signature, malformed, etc.)
    if (error instanceof jwt.JsonWebTokenError) {
      return {
        valid: false,
        error: 'Invalid license key: verification failed'
      };
    }

    if (error instanceof jwt.TokenExpiredError) {
      return {
        valid: false,
        error: 'License key has expired'
      };
    }

    return {
      valid: false,
      error: `License verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Format a license key for display (show first/last chars, hide middle)
 * @param licenseKey The full license key
 * @returns Formatted key like "eyJhbG...xMjM0"
 */
export function formatLicenseKeyForDisplay(licenseKey: string): string {
  if (licenseKey.length <= 16) {
    return licenseKey;
  }
  return `${licenseKey.substring(0, 8)}...${licenseKey.substring(licenseKey.length - 8)}`;
}

/**
 * Check if a license needs reactivation (for future use)
 * Currently always returns false since we use lifetime licenses
 */
export function needsReactivation(licenseData: LicenseData): boolean {
  // Future: Check expiration, hardware changes, etc.
  return false;
}
