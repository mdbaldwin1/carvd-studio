const WEBSITE_BASE_URL = 'https://carvd-studio.com';

// Build-time override for production/staging checkout variants.
const ENV_CHECKOUT_URL = import.meta.env.VITE_LEMON_SQUEEZY_CHECKOUT_URL?.trim();
const DEFAULT_CHECKOUT_URL = 'https://carvd-studio.lemonsqueezy.com/checkout/buy/7b51b5d6-c350-481b-845f-fd1f1bc5fae3';

export const EXTERNAL_LINKS = {
  website: WEBSITE_BASE_URL,
  docs: `${WEBSITE_BASE_URL}/docs`,
  pricing: `${WEBSITE_BASE_URL}/pricing`,
  support: `${WEBSITE_BASE_URL}/support`,
  privacy: `${WEBSITE_BASE_URL}/privacy`,
  terms: `${WEBSITE_BASE_URL}/terms`,
  checkout: ENV_CHECKOUT_URL || DEFAULT_CHECKOUT_URL
} as const;
