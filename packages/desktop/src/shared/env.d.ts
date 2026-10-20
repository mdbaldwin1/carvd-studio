// The app's own build-time environment variables. electron-vite declares
// ImportMetaEnv itself; this merges the project's keys into it so
// `import.meta.env.MAIN_VITE_*` is typed rather than an error.
//
// Must stay in script scope (no imports or exports) for the merge to apply.

interface ImportMetaEnv {
  readonly MAIN_VITE_ANALYTICS_E2E?: string;
  readonly MAIN_VITE_POSTHOG_KEY?: string;
  readonly MAIN_VITE_POSTHOG_HOST?: string;
  readonly PRELOAD_VITE_ANALYTICS_E2E?: string;
  readonly VITE_LEMON_SQUEEZY_CHECKOUT_URL?: string;
}
