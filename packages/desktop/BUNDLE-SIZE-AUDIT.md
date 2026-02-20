# Desktop Bundle Size Audit (bead carvd-studio-8.6)

Date: 2026-02-20
Current commit: `3164109` (post 8.5)
Baseline commit: `b459b9a` (post 7.6, pre Epic 8 CSS cleanup)

## Method

1. Built baseline and current with bundle analysis enabled:
   - `npm run analyze --workspace=@carvd/desktop`
2. Compared `packages/desktop/out/renderer/assets` raw and gzip sizes.
3. Verified lazy-loaded modal chunks remain split.
4. Attempted startup verification with e2e launch test.

## Summary

- Total renderer asset size is effectively flat to slightly improved vs baseline.
- CSS shrank materially after Epic 8 cleanup.
- Main entry JS grew slightly, but this was offset by CSS reduction.
- 3D pipeline chunks (`three`, `r3f`) are unchanged, indicating no 3D rendering bundle regression.
- Modal code-splitting remains intact.

## Baseline vs Current (renderer assets)

- Baseline raw: `5,280,530` bytes
- Current raw: `5,278,015` bytes
- Delta raw: `-2,515` bytes
- Baseline gzip: `1,051,224` bytes
- Current gzip: `1,050,941` bytes
- Delta gzip: `-283` bytes

## Notable Chunk Deltas

- `index-*.js` (main renderer entry):
  - Baseline raw/gzip: `1,338,935 / 282,773`
  - Current raw/gzip: `1,343,152 / 283,290`
  - Delta: `+4,217 / +517`
- `index-*.css`:
  - Baseline raw/gzip: `93,179 / 14,264`
  - Current raw/gzip: `86,447 / 13,443`
  - Delta: `-6,732 / -821`
- `three-*.js`:
  - Baseline raw/gzip: `1,649,788 / 297,233`
  - Current raw/gzip: `1,649,788 / 297,233`
  - Delta: `0 / 0`
- `r3f-*.js`:
  - Baseline raw/gzip: `937,942 / 178,921`
  - Current raw/gzip: `937,942 / 178,921`
  - Delta: `0 / 0`

## Code-Splitting Verification

Lazy chunks are still emitted as standalone files (examples):

- `AppSettingsModal-*.js`
- `CutListModalWrapper-*.js`
- `StockLibraryModal-*.js`
- `TemplateBrowserModal-*.js`
- `ImportAppStateModal-*.js`
- `WelcomeTutorial-*.js`

This matches `React.lazy(...)` usage in `packages/desktop/src/renderer/src/App.tsx`.

## Startup Verification

Attempted targeted startup e2e check:

- Command: `npm run test:e2e --workspace=@carvd/desktop -- tests/e2e/happy-path.spec.ts --grep "app launches, creates project, and shows editor"`
- Result: failed locally with `Error: Process failed to launch!`

This matches the existing local Playwright launch issue seen in prior beads, so startup timing could not be measured in this local environment.
