/**
 * Lemon Squeezy checkout URL utilities
 *
 * Business model:
 * - Users download the app for FREE from GitHub releases
 * - 14-day full-featured trial
 * - Purchase a LICENSE KEY (single product, works on Mac & Windows)
 * - License key unlocks full features
 */

const CHECKOUT_URL = import.meta.env.VITE_LEMON_SQUEEZY_CHECKOUT_URL;

export type Platform = 'macos' | 'windows';

/**
 * Detects the user's operating system (for download buttons)
 */
export function detectPlatform(): Platform {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('mac')) {
    return 'macos';
  }
  return 'windows';
}

/**
 * Returns the Lemon Squeezy checkout URL for purchasing a license key.
 * Single product - license works on both Mac and Windows.
 */
export function getCheckoutUrl(): string {
  // Direct checkout URL takes priority
  if (CHECKOUT_URL) {
    return CHECKOUT_URL;
  }
  // Fallback to pricing page if not configured
  return '/pricing';
}

/**
 * Check if Lemon Squeezy is properly configured
 */
export function isLemonSqueezyConfigured(): boolean {
  return Boolean(CHECKOUT_URL);
}
