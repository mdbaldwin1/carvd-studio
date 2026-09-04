# Analytics release checklist

Run this checklist in Development first. Production project/dashboard/configuration changes are operator steps pending explicit authorization. Never paste secrets or raw customer payloads into tickets, screenshots, or logs.

## Code and configuration

- [ ] Diff the desktop schema, website captures, and webhook against [EVENT-CATALOG.md](./EVENT-CATALOG.md); names, values, and capture timing match.
- [ ] Run desktop unit, main, typecheck, lint, build, and focused analytics E2E checks.
- [ ] Run website unit, typecheck, build, and focused analytics E2E checks; document known repository lint blockers rather than bypassing them.
- [ ] Run `npm run verify:production-analytics-boundary --workspace=@carvd/desktop`; packaged main/preload output contains no E2E controls.
- [ ] Confirm Dev and Prod keys/hosts are separated and no values are committed.
- [ ] Confirm website autocapture, session recording, and automatic pageviews remain off.
- [ ] Confirm missing website configuration renders/navigates normally and emits no request.
- [ ] Confirm a desktop build missing either `MAIN_VITE_POSTHOG_KEY` or `MAIN_VITE_POSTHOG_HOST` keeps all core workflows working and emits no request.
- [ ] Confirm missing webhook configuration returns `503` without forwarding an event.

## Raw payload verification

In the Dev project, intentionally perform each trigger once. For every row in the catalog:

- [ ] Find the event by exact name and verification-time window.
- [ ] Open its raw JSON, not only an aggregate chart.
- [ ] Compare its custom property keys and enum/value types exactly with the catalog.
- [ ] Check prohibited examples are absent. Inspect PostHog-added `$` properties separately.
- [ ] Confirm the event occurs once at the documented successful/failed boundary and not on canceled or rejected operations.

Explicitly exercise: a settings grant (the only `analytics_consent_changed` source); verify onboarding grant and all denials emit no consent-change event; both onboarding-completion sources; start-screen/menu/template creation; initial/manual/auto/save-as; successful and failed cut list; every export type success/failure; every checkout surface/license mode; successful activation; Part Cuts opened from Properties and the context menu; successful Part Cuts saves across representative operation-count buckets; representative page routes; every download platform at every location; every website checkout location; and a Lemon Squeezy test-mode purchase. For each desktop event verify trusted `$os` and `app_version` exist and cannot be spoofed from renderer properties.

## Desktop privacy and resilience

- [ ] Fresh packaged-profile behavior: tutorial resolves before the consent prompt; unknown consent emits nothing.
- [ ] Deny: create, save, generate, and export still work; no identity, queued event, or request is created.
- [ ] Grant: only subsequent allowed events appear; consent event contains only `choice=granted` and its surface.
- [ ] Offline: editing, save, cut list, and export succeed; allowed events queue locally without blocking UI.
- [ ] Restart online: queued UUIDs deliver exactly once with the same installation identity.
- [ ] In a packaged build, revoke while offline: queued events and installation identity are synchronously deleted; relaunch remains denied and core workflows remain available.
- [ ] Malicious/unknown property injection is stripped or rejects the event; raw delivered JSON contains no injected key.
- [ ] Custom Cuts events contain only the cataloged source/count bucket and never include part names, IDs, cut types, labels, dimensions, targets, or parameters.
- [ ] Packaged app exposes no analytics test-control IPC or preload methods.

## Website behavior

- [ ] Route navigation sends one explicit `$pageview` with `$current_url`; no automatic duplicate is present.
- [ ] Inspect a Dev `$pageview` raw payload and confirm PostHog's default `$referrer` and the explicit `$current_url` are present before using referrer/landing-path dashboard breakdowns.
- [ ] Download and checkout events match exact platform/product/location values.
- [ ] Aborted or timed-out PostHog requests do not delay or prevent navigation, download, checkout, or rendering.
- [ ] No-config build produces no PostHog calls.
- [ ] URL query strings in `$current_url` contain no secrets or personal data.

## Webhook security, retry, and dedupe

- [ ] Valid `order_created` signed over the exact raw bytes returns `204` after PostHog success.
- [ ] Missing/invalid signature returns `401`; malformed/invalid schema returns `400`; non-POST returns `405`; unrelated signed event returns `204` with no capture.
- [ ] PostHog outage/non-2xx returns `502`, allowing Lemon Squeezy retry; missing config returns `503`.
- [ ] Replay the identical signed test payload: emitted `uuid` and `distinct_id` are unchanged and PostHog represents one idempotent purchase, not doubled revenue.
- [ ] Change the test order ID: UUIDs change, while no raw order ID appears in PostHog.
- [ ] `test_mode=true` is present and excluded from live purchase/revenue insights.
- [ ] Live webhook subscription is limited to `order_created`; endpoint and secret match the intended Vercel environment.

## Dashboards and interpretation

- [ ] Acquisition, Activation, and Retention cards match [POSTHOG-SETUP.md](./POSTHOG-SETUP.md), including the ordered 14-day funnels.
- [ ] Purchase totals filter `test_mode=false`; revenue is separated by currency.
- [ ] Desktop funnels are labeled “consenting installations.”
- [ ] Website, desktop, and purchase identities are not joined or presented as one-user conversion.
- [ ] Internal/test traffic filtering is visible and documented.
- [ ] Low-volume percentages show underlying counts and are not treated as statistically stable.

## Enablement, monitoring, and rollback

- [ ] Obtain authorization before creating/changing live projects, dashboards, Vercel variables, or Lemon Squeezy webhooks.
- [ ] Record operator, time, environment, release, and configuration names (never values).
- [ ] Enable Production after Dev verification; watch delivery errors, unexpected names/properties, and volume for the first 24 hours.

Kill switches and rollback:

1. Website browser analytics: remove either `VITE_POSTHOG_KEY` or `VITE_POSTHOG_HOST` from the affected Vercel environment and redeploy the last reviewed commit.
2. Purchase analytics: disable the Lemon Squeezy webhook subscription or remove server PostHog configuration; expect `503` while disabled. Prefer provider pause when avoiding repeated retries.
3. Desktop analytics: remove either `MAIN_VITE_POSTHOG_KEY` or `MAIN_VITE_POSTHOG_HOST`, produce a reviewed signed release, and ship it through the normal update path; analytics failure in already-installed versions must not block core work. Do not use E2E flags in production.
4. If data violates the allowlist, stop the affected source first, preserve a minimal incident timeline, determine affected events/time range, perform privacy/security review, request PostHog deletion if required, fix and re-run this entire checklist before re-enabling.
