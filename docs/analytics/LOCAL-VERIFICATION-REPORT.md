# Local analytics verification report

- Started: `2026-09-01T21:40:19Z`
- Verified commit: `10c5108891489629edd2133ba972019291e0b997`
- Scope: local repository only; no PostHog, Vercel, Lemon Squeezy, deployment, PR, push, or release mutation
- Worktree before verification: clean

## Command results

| Check                                                                                                              | Result                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---- |
| `npm run lint --workspace=@carvd/desktop`                                                                          | PASS, exit 0                                                                                                                                                                           |
| `npm run typecheck --workspace=@carvd/desktop`                                                                     | PASS, exit 0                                                                                                                                                                           |
| `npm test --workspace=@carvd/desktop`                                                                              | FAIL, exit 1. Renderer: 150 files/3,090 tests passed. Main: 9 files/213 tests passed. Build passed. Electron E2E: 23 passed, 75 failed, 2 did not run (100 total). See blockers below. |
| `MAIN_VITE_POSTHOG_KEY= MAIN_VITE_POSTHOG_HOST= npm run verify:production-analytics-boundary` (desktop package)    | PASS, exit 0; blank-config production build passed and main/preload output excluded E2E controls                                                                                       |
| Flagged desktop build plus `npx playwright test tests/e2e/analytics.spec.ts --config=playwright.config.ts`         | PASS, exit 0; 3/3 focused analytics E2E passed                                                                                                                                         |
| `npm run lint --workspace=@carvd/website`                                                                          | FAIL, exit 2; ESLint 9.39.4 cannot find `eslint.config.js                                                                                                                              | mjs | cjs` |
| `npm run typecheck --workspace=@carvd/website`                                                                     | PASS, exit 0                                                                                                                                                                           |
| `npm test --workspace=@carvd/website`                                                                              | PASS, exit 0; 20 files/343 tests passed                                                                                                                                                |
| `VITE_POSTHOG_KEY= VITE_POSTHOG_HOST= POSTHOG_PROJECT_KEY= POSTHOG_HOST= npm run build --workspace=@carvd/website` | PASS, exit 0; blank analytics configuration build succeeded                                                                                                                            |
| `npx playwright test e2e/analytics.spec.ts --config=playwright.config.ts` (website package)                        | PASS, exit 0; 4 passed, 6 intentional non-Chromium project skips                                                                                                                       |
| Desktop and website `npm run format:check`                                                                         | PASS, exit 0 for both                                                                                                                                                                  |
| `git diff --check`                                                                                                 | PASS, exit 0                                                                                                                                                                           |

The standalone desktop production build is part of the passing boundary command. The standalone website build is the blank-config build above.

## Blockers and assessment

### Desktop aggregate E2E command

The aggregate `npm test` script builds without `MAIN_VITE_ANALYTICS_E2E=1` and `PRELOAD_VITE_ANALYTICS_E2E=1`. Consequently, the first analytics E2E fails because `analyticsTestGetState` is correctly absent from the production preload. The same run shows the unresolved first-run consent dialog over legacy E2E workflows; most failures report a Radix overlay intercepting pointer events, with downstream canvas/action assertions failing. This produced 75 failures, 23 passes, and 2 unrun tests.

This is test-harness orchestration rather than evidence of an analytics payload failure: the same analytics spec passes 3/3 after an explicitly flagged E2E build. Merely adding flags to the aggregate script would fix the missing-control failure but would not resolve the consent overlay across legacy tests. A proper follow-up should give non-consent E2E profiles an explicit persisted consent state while preserving the dedicated fresh-profile consent sequencing test. No broad harness change was made during final verification.

### Website lint baseline

Website lint exits 2 before reading source because ESLint 9 requires a flat configuration file and the package has none. This is the previously documented repository baseline. Adding an unrelated lint migration during final analytics verification would expand scope and could silently change lint semantics, so no configuration was added.

## Fresh static payload audit

I re-ran source searches for `analytics.capture`, `captureAnalytics`, `websiteAnalytics.capture`, the purchase event, and the PostHog client delivery call, then compared every non-test capture site with [EVENT-CATALOG.md](./EVENT-CATALOG.md).

Findings:

- Desktop capture sites use only the nine cataloged event names and enum/boolean/count-bucket properties. The shared sanitizer is the final renderer-input allowlist.
- `analytics_consent_changed` is emitted only for a persisted settings grant; onboarding and denial do not capture it.
- Trusted `$os` and `app_version` are added in main transport after event properties, are not accepted from renderer input, and cannot be overridden.
- Website custom payloads remain `$pageview.$current_url`, `download_clicked.{platform,location}`, and `checkout_started.{product,location}`.
- Purchase delivery contains only `product`, `currency`, `value_cents`, and `test_mode`; raw order ID is used only as salted deterministic UUID input and is not included in delivered properties.
- No capture payload includes project/part/stock names, dimensions, notes, file paths, email, license keys, raw order IDs, or free-form UI text.
- No-config paths are covered by unit tests in the passing full suites. Fresh blank desktop and website builds also succeeded; desktop produced no transport without both compile-time values, and website initialization remains a no-op without both public values.

## Local checks complete

- [x] Desktop lint, typecheck, renderer/main units, build, production-boundary scan
- [x] Focused desktop consent/offline/restart/revocation analytics E2E
- [x] Website typecheck, full units, blank-config build, focused analytics E2E
- [x] Blank analytics configuration builds
- [x] Static source-to-catalog and sensitive-property audit
- [x] Formatting and diff checks
- [x] Initial and final git status inspection
- [ ] Aggregate desktop E2E green (blocked by test-harness consent state/build-mode issues above)
- [ ] Website lint green (blocked by missing ESLint 9 flat config)

## External operator work still pending

Nothing below was attempted locally:

- [ ] Create/verify separate authorized Development and Production PostHog projects
- [ ] Configure ingestion keys/hosts in authorized Vercel and signed desktop build environments
- [ ] Verify PostHog project privacy settings, saved allowlist audit, and raw Dev payloads
- [ ] Create Acquisition, Activation, and Retention dashboards
- [ ] Configure and test authorized Lemon Squeezy test/live webhook subscriptions and secrets
- [ ] Run packaged signed-build consent/revocation checks on supported operating systems
- [ ] Approve deployment, push/PR, release, or production enablement

## Remediation verification

Completed locally after the initial report on `2026-09-01`:

- The desktop aggregate test now invokes the flagged `test:e2e` build path after unit suites.
- New legacy E2E profiles preseed `analyticsConsent=denied` in Electron Store's real `preferences.json` before launch. The helper accepts an explicit unknown/granted/denied state and preserves an existing profile when no state is requested. Consent analytics tests explicitly request `unknown`, so the tutorial/prompt assertions still exercise the real UI rather than dismissing it in setup.
- A mixed focused run of analytics and legacy happy-path specs passed 8/8.
- Fresh `npm test --workspace=@carvd/desktop` passed: renderer 3,090/3,090, main 213/213, and Electron E2E 100/100; exit 0.
- A subsequent normal `npm run verify:production-analytics-boundary --workspace=@carvd/desktop` passed; exit 0, confirming the flagged aggregate test did not weaken production output.
- Added a package-local ESLint 9 flat config using the same TypeScript, React, Hooks, and Prettier rule families as desktop plus explicit browser globals. It does not disable rules wholesale. Required lint packages are declared in the website workspace.
- Fresh website gates all passed with exit 0: lint, typecheck, 343/343 unit tests, and production build.

The two initial local blockers are resolved. External operator work above remains pending and untouched.
