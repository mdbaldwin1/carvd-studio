import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import type { Line3, Triangle } from 'three';

// Module augmentation: needs module scope, hence the trailing export.

// Electron's custom drag region property, set through inline styles on the
// frameless window's title bar.
declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag';
  }
}

// Vitest 4 resolves `expect(...)` through `Matchers` in @vitest/expect, while
// @testing-library/jest-dom still augments the older `Assertion` in `vitest`.
// Registering the matchers against the interface vitest actually reads is what
// makes toBeInTheDocument and friends type-check.
declare module '@vitest/expect' {
  // An augmentation like this is necessarily body-less.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Matchers<T = unknown> extends TestingLibraryMatchers<unknown, T> {}
}

// three-mesh-bvh's shipped types stop at two parameters, but the runtime takes
// a third `suppressLog` flag that silences its coplanar-triangle warning.
declare module 'three-mesh-bvh' {
  interface ExtendedTriangle {
    intersectsTriangle(other: Triangle, target?: Line3, suppressLog?: boolean): boolean;
  }
}

export {};
