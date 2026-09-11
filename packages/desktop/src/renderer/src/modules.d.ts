// Declarations for packages that ship no types of their own. This file must
// stay in script scope (no imports or exports) for these to register.

// troika-three-text: only the two entry points the app calls are declared.
declare module 'troika-three-text' {
  export function configureTextBuilder(options: Record<string, unknown>): void;
  export function preloadFont(
    options: { font?: string; characters?: string | string[]; sdfGlyphSize?: number },
    callback: () => void
  ): void;
}
