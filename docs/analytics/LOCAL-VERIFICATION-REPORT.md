# Local analytics verification report

- Final verification timestamp: `2026-09-01T22:04:54Z`
- Verified base commit: `f60b22c8a66a461fd8e988590911580186d929a9`
- Scope: local repository only
- External mutations: none; no PostHog/Vercel/Lemon Squeezy changes, deployment, push, PR, or release

## Final local snapshot

| Gate                                                                  | Final result                                                                      |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Desktop lint                                                          | PASS, exit 0                                                                      |
| Desktop typecheck                                                     | PASS, exit 0                                                                      |
| Desktop aggregate `npm test` (two consecutive fresh runs)             | PASS, exit 0 both times: renderer 3,090/3,090; main 213/213; Electron E2E 100/100 |
| Desktop normal production build and analytics-boundary scan after E2E | PASS, exit 0; no E2E control strings in main/preload output                       |
| Focused desktop analytics plus legacy happy-path E2E                  | PASS, exit 0: 8/8                                                                 |
| Website strict lint (`--max-warnings 0`)                              | PASS, exit 0                                                                      |
| Website typecheck                                                     | PASS, exit 0                                                                      |
| Website full unit test                                                | PASS, exit 0: 343/343                                                             |
| Website production build                                              | PASS, exit 0                                                                      |
| Focused website analytics E2E                                         | PASS, exit 0: 4 passed, 6 intentional non-Chromium project skips                  |
| Desktop and website format checks                                     | PASS, exit 0                                                                      |
| `git diff --check`                                                    | PASS, exit 0                                                                      |

The final desktop aggregate uses an explicitly flagged E2E build. A subsequent separate normal production build verifies that test controls remain absent from production artifacts.

## Remediations applied

- Desktop aggregate tests invoke the flagged `test:e2e` path after renderer/main units.
- New legacy Electron E2E profiles persist `analyticsConsent=denied` to Electron Store's actual `preferences.json` before process launch. The launch helper accepts explicit `unknown`, `granted`, or `denied`; an existing profile is preserved when no state is supplied.
- Dedicated analytics consent scenarios explicitly request `unknown`, retaining real tutorial/prompt sequencing and assertions. No post-launch dialog dismissal or assertion weakening is used.
- Failed Electron launches close/kill and wait for a partially started process, then make a best-effort removal of only a newly created profile without allowing cleanup failure to replace the original launch error. Teardown tolerates an unusable partial `ElectronApplication` wrapper.
- Local Electron concurrency is capped at four workers (CI remains one) with zero retries, preventing startup starvation without masking failures.
- Website has a package-local ESLint 9 flat config using the repository's TypeScript, React, Hooks, and Prettier rule families. The lint command enforces zero warnings; required lint dependencies are declared in the website workspace.

## Initial failed run (historical)

Before remediation, the first fresh aggregate desktop run exited 1 after units/build passed: Electron E2E reported 23 passed, 75 failed, and 2 unrun. The production build correctly omitted the analytics test bridge, and unknown-consent UI overlaid legacy tests. A later independent run also exposed one startup-starvation failure at eight workers and unsafe teardown of a partial launch. These are historical diagnostics, not the final gate state above.

The initial website lint exited 2 because ESLint 9 had no flat configuration. That historical blocker is resolved; strict website lint is now green.

## Fresh static payload audit

All non-test `analytics.capture`, `captureAnalytics`, `websiteAnalytics.capture`, purchase payload, and PostHog delivery sites were compared with [EVENT-CATALOG.md](./EVENT-CATALOG.md):

- Desktop uses only nine cataloged events and allowlisted enum/boolean/count-bucket properties.
- `analytics_consent_changed` is emitted only after a persisted settings grant; onboarding and denial remain capture-free.
- Trusted `$os` and `app_version` are appended by main after event properties and cannot be supplied or overridden by renderer/queue input.
- Website custom payloads are limited to `$pageview.$current_url`, `download_clicked.{platform,location}`, and `checkout_started.{product,location}`.
- Purchase properties are limited to `product`, `currency`, `value_cents`, and `test_mode`; raw order ID is only salted deterministic UUID input and is not delivered.
- No payload includes project/part/stock names, dimensions, notes, file paths, email, license keys, raw order IDs, or free-form UI text.
- Blank desktop/website analytics configuration builds and unit no-op paths pass.

## External operator work pending

- [ ] Create/verify separate authorized Development and Production PostHog projects.
- [ ] Configure ingestion keys/hosts in authorized Vercel and signed desktop build environments.
- [ ] Verify project privacy settings, saved allowlist audit, and raw Development payloads.
- [ ] Create Acquisition, Activation, and Retention dashboards.
- [ ] Configure/test authorized Lemon Squeezy test/live webhooks and secrets.
- [ ] Run packaged signed-build consent/revocation checks on supported operating systems.
- [ ] Approve any deployment, push/PR, release, or production enablement.
