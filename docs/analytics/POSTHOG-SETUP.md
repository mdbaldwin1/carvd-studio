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

Set values through local untracked environment files or Vercel environment settings; never commit values. Every PostHog key below is a project ingestion key only. Do not place a personal API key in the app, desktop bundle, webhook, or these variables.

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

PostHog Data Management catalogs observed events/properties; it is not a deny-by-default ingestion allowlist for this implementation. Use **Data Management → Events** and **Properties** to inspect newly observed definitions, archive misleading definitions only after investigation, and save this HogQL audit as the compensating control (adjust the interval as needed):

```sql
SELECT
    event,
    arraySort(groupUniqArray(arrayJoin(JSONExtractKeys(properties)))) AS observed_property_keys
FROM events
WHERE timestamp >= now() - INTERVAL 7 DAY
GROUP BY event
ORDER BY event
```

Compare results with the catalog. Website rows will include PostHog default `$` properties in addition to Carvd's custom properties; desktop rows must include trusted `$os` and `app_version`. Create a saved insight named `Analytics allowlist audit — 7 days`, run it after every release, and record the reviewer/date. Also filter `event NOT LIKE '$%'` in a second saved view to identify unexpected custom event names; explicitly include `$pageview` in the manual review.

## Dashboard construction (operator pending)

Use unique persons unless a card explicitly says event totals. Desktop persons are anonymous installation UUIDs; website persons are PostHog browser identities; purchases use salted deterministic order identities. These are intentionally not joined, so cross-surface funnels measure directional conversion, not the same person end to end.

### Acquisition dashboard

Create these insights with a rolling 30-day date range and daily interval:

1. **Landing reach:** unique persons performing `$pageview`; breakdown first by PostHog default `$referrer`, then landing path derived from the cataloged `$current_url`. Verify both fields in a Dev raw payload before building the card. `$referrer` is PostHog browser context, not a Carvd custom property. Never group raw URLs containing query strings.
2. **Installer intent:** unique persons performing `download_clicked`; breakdown `platform`, then `location`.
3. **Checkout intent:** unique persons performing `checkout_started`; breakdown `location`; filter `product=desktop_license`.
4. **Verified purchases:** count of `purchase_completed`; filter `test_mode=false`; sum `value_cents / 100` grouped by `currency`. Never add different currencies together.
5. **Relevant landing → download funnel:** `$pageview` filtered to download-relevant landing paths (`/`, `/download`, `/features`) → `download_clicked`, ordered, 14-day conversion window; break down the terminal step by `platform` and `location`.
6. **Download → checkout funnel:** `download_clicked` → `checkout_started`, ordered, 14-day conversion window; filter checkout to `product=desktop_license` and break down by checkout `location`.
7. **Checkout → verified purchase ratio:** count of `purchase_completed` with `test_mode=false` / count of `checkout_started`, same date window. Label this a directional aggregate ratio, not a person funnel, because purchase and website identities are intentionally separate.

Display conversion formulas alongside cards:

- relevant-landing conversion = unique funnel conversions / unique persons entering the filtered `$pageview` step;
- checkout/download = unique persons completing `checkout_started` / unique persons entering `download_clicked`;
- purchase/checkout = verified non-test purchase event count / checkout-start event count. Show both numerator and denominator.

### Activation dashboard

Use desktop events only, rolling 30 days:

1. Ordered funnel with a 14-day window: `app_opened` → `onboarding_completed` → `project_created` → `project_saved` → `cut_list_generated` where `success=true` → `license_activated`.
2. Project creation mix: unique persons and event totals for `project_created`, breakdown by `source` and `units`.
3. Save activation: unique persons performing `project_saved`, breakdown by `save_kind` and `part_count_bucket`.
4. Optimizer success: event totals for `cut_list_generated`, formula success events / all cut-list events; breakdown by part and stock buckets.
5. **Separate insight, not a required funnel step — Export success:** event totals for `export_completed`, formula success events / all export events; breakdown by `export_type`.
6. License intent and activation: unique persons for `checkout_opened` and `license_activated`, separately; breakdown checkout by `surface` and `license_mode`.
7. Duplicate the funnel with breakdowns by trusted `$os`, `app_version`, and first-seen week (cohort installations by the week of their first `app_opened`). Do not use PostHog browser OS for desktop reporting.

Funnel caveat: optional consent means these rates describe consenting installations, not every installation. Do not label them total-user conversion.

### Retention dashboard

1. Weekly retention: cohort on first `project_created`, return event `app_opened`, unique desktop installation identities, show weeks 0–8.
2. Product retention: cohort on first `project_saved`, return on another `project_saved`, weekly.
3. Outcome retention: cohort on first successful `cut_list_generated`, return on successful `cut_list_generated` or `export_completed`, weekly.
4. Create explicit 1-day, 7-day, and 30-day return cards for each cohort/return pair: returning unique installation IDs / eligible cohort installation IDs. Exclude cohorts not old enough for the interval.
5. Add `$os` and `app_version` filters and breakdowns to every retention card. Version comparisons describe the version at event time, not a permanent person attribute.
6. Usage frequency: per-person weekly count distributions for `app_opened`, `project_saved`, and successful exports. Prefer medians/percentiles over averages for small samples.

Do not combine website cookie identities, desktop installation identities, or purchase order identities in retention calculations. Identity resets on desktop consent revocation and browser storage clearing create new anonymous persons.

## Verification queries

For every release, use PostHog's event explorer with environment/project and release-time filters:

```text
event = <catalog event>
timestamp >= <release verification start>
```

Show the raw JSON for one intentionally generated event, compare only custom properties with the catalog, then delete/exclude test traffic according to the established internal-traffic policy. For purchase verification add `test_mode = true`; never place a real order merely to test analytics.
