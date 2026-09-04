# Analytics event catalog

This is the operational allowlist. “Prohibited” examples apply to every event: project/part/stock names, dimensions, paths, notes, email, license keys, order IDs, arbitrary URLs/query strings, and free-form text must never be added. PostHog may attach its own `$` metadata to browser events; audit that separately.

Identity semantics:

- Desktop: random installation UUID, created only after opt-in and deleted on revocation.
- Website: anonymous PostHog browser identity stored in local storage when configured.
- Purchase: salted deterministic UUID derived from order ID; raw order ID is never delivered.
- These identities are not joined.

## Desktop events

Desktop owner: Electron main analytics service; renderer capture sites own trigger accuracy. Events are accepted only after explicit consent and sanitized against the exact schema below. At delivery, main adds trusted common context `$os=macOS|Windows|Linux|Other` and `app_version=<app.getVersion()>` to every event. These fields are not accepted from the renderer or stored queue and event properties cannot override them.

| Event                       | Trigger                                                              | Exact custom properties / values                                                                     | Dashboard consumers                              | Verification query                                                                |
| --------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `app_opened`                | Analytics initializes after Electron ready                           | none                                                                                                 | Activation funnel; retention return              | `event=app_opened`, unique persons and raw event                                  |
| `analytics_consent_changed` | A persisted grant from Privacy settings                              | `choice=granted`; `surface=settings` (`onboarding` is schema-reserved but intentionally not emitted) | Consent rollout health only                      | `event=analytics_consent_changed`; denial and onboarding choice must emit nothing |
| `onboarding_completed`      | First-run tutorial or tutorial template completes                    | `source=first_run\|template`                                                                         | Activation funnel                                | `event=onboarding_completed`, breakdown `source`                                  |
| `project_created`           | Successful blank/menu/template project creation                      | `source=start_screen\|menu\|template`; `units=imperial\|metric`                                      | Activation and retention cohorts                 | `event=project_created`, breakdown `source`, secondary `units`                    |
| `project_saved`             | Successful initial/manual/auto/save-as write                         | `save_kind=initial\|manual\|auto\|save_as`; `part_count_bucket=0\|1-5\|6-20\|21-50\|51+`             | Activation; save retention                       | `event=project_saved`, breakdown both properties                                  |
| `cut_list_generated`        | Optimizer attempt reaches success or handled failure                 | `part_count_bucket` and `stock_count_bucket` use count buckets; `success=true\|false`                | Activation; optimizer success; outcome retention | `event=cut_list_generated`, filter/breakdown `success`                            |
| `export_completed`          | Project report, diagram PDF, shopping PDF/CSV finishes or fails      | `export_type=project_pdf\|cut_diagrams_pdf\|shopping_pdf\|shopping_csv`; `success=true\|false`       | Activation; export success; outcome retention    | `event=export_completed`, breakdown `export_type`, then `success`                 |
| `checkout_opened`           | External checkout successfully opens from a desktop purchase surface | `surface=trial\|settings\|pricing_prompt`; `license_mode=trial\|free`                                | License intent                                   | `event=checkout_opened`, breakdown both properties                                |
| `license_activated`         | License activation returns success                                   | `license_mode=licensed`                                                                              | Activation completion                            | `event=license_activated`, unique persons                                         |
| `part_cuts_opened`          | Part Cuts workspace opens from a supported part action               | `source=properties\|context_menu`; `operation_count_bucket=0\|1-5\|6-20\|21-50\|51+`                 | Custom Cuts discovery and adoption               | `event=part_cuts_opened`, breakdown `source`, then operation bucket               |
| `part_cuts_saved`           | Valid Part Cuts draft successfully saves to its source part          | `operation_count_bucket=0\|1-5\|6-20\|21-50\|51+`                                                    | Custom Cuts completion and depth of use          | `event=part_cuts_saved`, unique persons and operation bucket                      |

Desktop-specific prohibited examples: renderer-supplied `$os`/`app_version`, project UUID, part IDs/names, cut types/labels/dimensions/parameters, counts outside buckets, raw error messages, optimizer inputs, material/library contents, machine/user name, full OS paths, license response, or activation email.

## Website events

Website owner: marketing React application. Emission is a no-op unless both public PostHog variables are configured. Autocapture, session recording, and automatic pageviews are disabled.

| Event              | Trigger                                            | Exact custom properties / values                                                                                      | Dashboard consumers                     | Verification query                                                            |
| ------------------ | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------- |
| `$pageview`        | React location pathname or search changes          | `$current_url=<browser href>`                                                                                         | Acquisition reach/funnel                | `event=$pageview`; inspect path, and audit query strings before using raw URL |
| `download_clicked` | Installer link click before normal navigation      | `platform=macos-arm64\|macos-x64\|windows\|linux`; `location=home-hero-card\|download-hero-card\|download-cta-footer` | Installer intent and acquisition funnel | `event=download_clicked`, breakdown `platform`, `location`                    |
| `checkout_started` | Configured Lemon Squeezy checkout is about to open | `product=desktop_license`; `location=pricing-card\|home-cta\|pricing-cta\|features-cta\|docs-cta`                     | Checkout intent and acquisition funnel  | `event=checkout_started`, filter product, breakdown location                  |

Website-specific prohibited examples: link text, referrer query parameters copied into custom properties, checkout URL, IP-derived custom fields, form values, or DOM/autocapture payloads. `$current_url` is the sole cataloged URL field; treat query strings as potentially sensitive and keep application URLs free of secrets.

## Purchase event

Owner: Vercel Node webhook at `api/webhooks/lemonsqueezy`, triggered only by a signature-verified, strictly validated Lemon Squeezy `order_created` payload. Nonmatching webhook event types return `204` without analytics. Delivery failure returns `502` so the provider can retry. Event UUID and person UUID are deterministic per order and salt, making retries idempotent in PostHog.

| Event                | Exact custom properties / values                                                                                                               | Dashboard consumers                               | Verification query                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `purchase_completed` | `product=desktop_license`; `currency=<trimmed provider currency>`; `value_cents=<nonnegative integer provider total>`; `test_mode=true\|false` | Verified purchases and currency-separated revenue | `event=purchase_completed`, filter `test_mode=false`, breakdown `currency`; sum `value_cents` within one currency |

Purchase-specific prohibited examples: raw order/customer ID, buyer name/email/address, license key, full webhook body, signature, tax line items, or payment metadata.

## Change control

Any new event, property, value, identity link, PostHog feature, or dashboard dependency requires all of the following in the same release: schema allowlist update, tests for accepted/rejected payloads, privacy-copy review, this catalog update, release-checklist update, and operator review of Dev raw payloads before Production enablement.
