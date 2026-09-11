# Privacy-Safe Product Analytics Design

## Purpose

Carvd Studio needs enough acquisition, activation, retention, and purchase data to decide where product and marketing effort should go. Analytics must not weaken the desktop application's offline-first behavior or collect customer project content.

## Decisions

- Use PostHog Cloud as the product analytics system of record.
- Keep Vercel Web Analytics and Speed Insights for website traffic and performance while sending business funnel events to PostHog.
- Do not build a Carvd analytics ingestion API in this phase.
- Route every desktop event through a Carvd-owned main-process analytics service and durable queue.
- Treat desktop consent as `unknown`, `granted`, or `denied`. The default is `unknown`; no event is stored or transmitted until consent is `granted`.
- Ask once after first-run onboarding and expose a permanent control in App Settings.
- Use manual events only. Disable desktop autocapture and session replay.
- Never make startup, editing, saving, exporting, licensing, or shutdown depend on analytics availability.

## Privacy Boundary

Permitted desktop properties are limited to application version, operating system, CPU architecture, license mode, event source, success state, coarse count buckets, coarse duration buckets, and an anonymous random installation ID.

The following data is prohibited:

- project names, filenames, paths, notes, or serialized project content;
- part, stock, material, supplier, template, or assembly names;
- exact project or part dimensions;
- screenshots, session recordings, clipboard contents, or free-form text;
- email addresses, license keys, order IDs, usernames, or device names;
- IP addresses or precise location added by Carvd event properties.

The event catalog is a runtime allowlist in the Electron main process. Renderer input is untrusted and is sanitized before it can enter the queue.

## Desktop Architecture

The renderer calls a typed `analytics.capture(name, properties)` facade. The facade invokes one preload method without awaiting delivery. The main process validates the event, checks consent, adds immutable application properties, and persists it in a dedicated `electron-store` queue.

The queue has these fixed bounds:

- maximum 5,000 events;
- maximum age 30 days;
- flush batch size 50;
- regular flush interval 60 seconds;
- retry base delay 30 seconds with exponential backoff;
- retry ceiling 6 hours;
- stable event UUID for PostHog deduplication.

When consent is revoked, pending events and the anonymous installation ID are deleted immediately. Re-enabling analytics creates a new anonymous identity.

Network checks are advisory. A false positive from Electron's connectivity API must only produce a caught transport failure and a scheduled retry. Application flows never await or surface analytics errors.

## Website Architecture

Use `posthog-js` with pageview capture, session recording disabled, and autocapture disabled. Explicit events cover download intent and checkout intent. Existing Vercel Analytics remains enabled.

UTM/referrer data is captured by PostHog on the website. Download events include only platform and stable CTA location. Checkout events include only product and CTA location.

## Purchase Architecture

A Vercel serverless webhook verifies Lemon Squeezy's HMAC signature and emits `purchase_completed` to PostHog. It sends no email address, license key, customer ID, or raw order ID. A deterministic one-way event UUID prevents duplicate webhook delivery from double-counting purchases.

Until Carvd accounts exist, website, desktop, and purchase activity are analyzed as aggregate funnel stages. Cross-device identity stitching is explicitly out of scope.

## Event Catalog

Website events:

- `download_clicked`: `platform`, `location`;
- `checkout_started`: `product`, `location`;
- `purchase_completed`: `product`, `currency`, `value_cents`, `test_mode`.

Desktop events:

- `app_opened`: no event-specific properties;
- `analytics_consent_changed`: `choice`, `surface` (emitted only for a grant; denial is not transmitted);
- `onboarding_completed`: `source`;
- `project_created`: `source`, `units`;
- `project_saved`: `save_kind`, `part_count_bucket`;
- `cut_list_generated`: `part_count_bucket`, `stock_count_bucket`, `success`;
- `export_completed`: `export_type`, `success`;
- `checkout_opened`: `surface`, `license_mode`;
- `license_activated`: `license_mode`.

Count buckets are `0`, `1-5`, `6-20`, `21-50`, and `51+`. No exact counts leave the app.

## Environments and Secrets

- Desktop public ingestion configuration: `MAIN_VITE_POSTHOG_KEY`, `MAIN_VITE_POSTHOG_HOST`.
- Website public ingestion configuration: `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`.
- Webhook-only secrets: `LEMON_SQUEEZY_WEBHOOK_SECRET`, `POSTHOG_PROJECT_KEY`, `POSTHOG_HOST`, `ANALYTICS_ID_SALT`.
- No PostHog personal API key is bundled in either client.
- Development and production use separate PostHog projects.

## Reliability Requirements

- Analytics capture returns before disk or network work completes.
- All queue writes are caught and logged locally without user-facing errors.
- Missing analytics configuration turns the service into a no-op.
- Revocation works offline and clears queued data before returning success.
- An unreachable PostHog host cannot change functional test results.
- Webhook signature failure returns HTTP 401 and emits no event.

## Reporting

PostHog contains three saved dashboards:

1. Acquisition: website pageviews, download conversion by platform/location, and checkout conversion.
2. Activation: first open through project creation, save, cut-list generation, and license activation.
3. Retention: weekly active installations and 1-, 7-, and 30-day return behavior, segmented by version and platform.

## Rollout

1. Ship infrastructure with PostHog production configuration absent; verify no functional regressions.
2. Enable a development PostHog project and validate the event catalog with synthetic projects only.
3. Enable production configuration for internal installs and inspect events for prohibited properties.
4. Release the consent experience to users.
5. Wait for at least 20 attributable downloads or 30 days before making acquisition decisions from the data.

## Explicit Non-Goals

- Session replay in Electron;
- remote feature flags for core functionality;
- project-content analytics;
- user accounts or cross-device identity;
- a first-party analytics warehouse or dashboard;
- replacing Vercel performance analytics;
- changing Carvd licensing or pricing.
