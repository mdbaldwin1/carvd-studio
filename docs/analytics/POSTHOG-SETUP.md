# PostHog setup runbook

Status: operator steps pending authorization. No PostHog, Vercel, Lemon Squeezy, or DNS resource was created while writing this runbook.

## Projects and regions

Create two isolated PostHog projects in the region selected for the business account:

| Environment | Suggested project   | Data sources                                                                     |
| ----------- | ------------------- | -------------------------------------------------------------------------------- |
| Development | `Carvd Development` | local/test website, development desktop builds, Lemon Squeezy test-mode webhooks |
| Production  | `Carvd Production`  | production website, released desktop builds, live Lemon Squeezy webhooks         |

Do not mix environments. Choose one PostHog region deliberately and use its matching ingestion host everywhere (for example, the host shown by that project's installation page). Do not guess or combine a US key with an EU host.

## Configuration placement

Set values through local untracked environment files or Vercel environment settings; never commit values.

| Runtime                    | Names                                             | Scope                                                                                                        |
| -------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Website browser            | `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`           | public project key and ingestion host; Preview/Development point to Dev, Production to Prod                  |
| Desktop main bundle        | `MAIN_VITE_POSTHOG_KEY`, `MAIN_VITE_POSTHOG_HOST` | compile-time public project key and ingestion host; development builds point to Dev, signed releases to Prod |
| Purchase webhook           | `POSTHOG_PROJECT_KEY`, `POSTHOG_HOST`             | server-side project key and host, scoped by Vercel environment                                               |
| Purchase identity          | `ANALYTICS_ID_SALT`                               | secret, long random value; different in Dev and Prod; never rotate without accepting an identity break       |
| Lemon Squeezy verification | `LEMON_SQUEEZY_WEBHOOK_SECRET`                    | secret from the matching test/live webhook                                                                   |

Missing website or desktop key/host is a supported no-op. Because desktop values are compiled into the main bundle, changing them requires a new build/release. Missing webhook configuration returns `503`; do not route live webhooks until all four server variables exist.

## Privacy-safe project settings

After creating each project:

1. Confirm autocapture is off. The website also sets `autocapture: false`.
2. Confirm session recording is off. The website also sets `disable_session_recording: true`.
3. Do not enable automatic pageviews; Carvd emits explicit `$pageview` events.
4. Do not enable form, element, console, exception, or dead-click capture without a new privacy review.
5. Restrict project access to operators who need aggregate product analytics.
6. Set a retention period consistent with the published privacy policy and business need.
7. Exclude known internal/test traffic from production views using a documented cohort or project filter; do not delete evidence ad hoc.

## Allowlist audit

Use [EVENT-CATALOG.md](./EVENT-CATALOG.md) as the allowlist. In PostHog's event/property views, check weekly during rollout and monthly afterward:

- only cataloged custom event names exist;
- each custom event contains only its cataloged custom properties (PostHog-generated `$` properties are platform metadata and must be reviewed separately);
- no project names, part/stock names, dimensions, file paths, notes, email, license key, order ID, webhook body, URL query secrets, or free-form UI text appears;
- `purchase_completed.test_mode=true` is excluded from revenue reporting;
- Dev events never appear in Prod and vice versa.

If an unexpected property appears, disable ingestion using the kill switch in the release checklist, preserve a minimal audit record, remove the capture at source, and assess deletion requirements before restoring.

## Dashboard construction (operator pending)

Use unique persons unless a card explicitly says event totals. Desktop persons are anonymous installation UUIDs; website persons are PostHog browser identities; purchases use salted deterministic order identities. These are intentionally not joined, so cross-surface funnels measure directional conversion, not the same person end to end.

### Acquisition dashboard

Create these insights with a rolling 30-day date range and daily interval:

1. **Website reach:** unique persons performing `$pageview`; breakdown by `$pathname` if PostHog derives it, otherwise use the path portion of `$current_url`. Never group raw URLs containing query strings.
2. **Installer intent:** unique persons performing `download_clicked`; breakdown `platform`, then `location`.
3. **Checkout intent:** unique persons performing `checkout_started`; breakdown `location`; filter `product=desktop_license`.
4. **Verified purchases:** count of `purchase_completed`; filter `test_mode=false`; sum `value_cents / 100` grouped by `currency`. Never add different currencies together.
5. **Website funnel:** `$pageview` → `download_clicked` → `checkout_started`, ordered, 14-day conversion window. This is browser-only and does not include desktop activation or purchase identity.

Display conversion formulas alongside cards:

- download rate = unique downloaders / unique page viewers;
- checkout-start rate = unique checkout starters / unique page viewers;
- verified purchase count is reported separately because purchase identities cannot be joined to browser identities.

### Activation dashboard

Use desktop events only, rolling 30 days:

1. Ordered funnel with a 14-day window: `app_opened` → `onboarding_completed` → `project_created` → `project_saved` → `cut_list_generated` where `success=true` → `export_completed` where `success=true`.
2. Project creation mix: unique persons and event totals for `project_created`, breakdown by `source` and `units`.
3. Save activation: unique persons performing `project_saved`, breakdown by `save_kind` and `part_count_bucket`.
4. Optimizer success: event totals for `cut_list_generated`, formula success events / all cut-list events; breakdown by part and stock buckets.
5. Export success: event totals for `export_completed`, formula success events / all export events; breakdown by `export_type`.
6. License intent and activation: unique persons for `checkout_opened` and `license_activated`, separately; breakdown checkout by `surface` and `license_mode`.

Funnel caveat: optional consent means these rates describe consenting installations, not every installation. Do not label them total-user conversion.

### Retention dashboard

1. Weekly retention: cohort on first `project_created`, return event `app_opened`, unique desktop installation identities, show weeks 0–8.
2. Product retention: cohort on first successful `project_saved`, return on another `project_saved`, weekly.
3. Outcome retention: cohort on first successful `cut_list_generated`, return on successful `cut_list_generated` or `export_completed`, weekly.
4. Usage frequency: per-person weekly count distributions for `app_opened`, `project_saved`, and successful exports. Prefer medians/percentiles over averages for small samples.

Do not combine website cookie identities, desktop installation identities, or purchase order identities in retention calculations. Identity resets on desktop consent revocation and browser storage clearing create new anonymous persons.

## Verification queries

For every release, use PostHog's event explorer with environment/project and release-time filters:

```text
event = <catalog event>
timestamp >= <release verification start>
```

Show the raw JSON for one intentionally generated event, compare only custom properties with the catalog, then delete/exclude test traffic according to the established internal-traffic policy. For purchase verification add `test_mode = true`; never place a real order merely to test analytics.
