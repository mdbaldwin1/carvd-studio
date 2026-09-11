# Privacy-Safe Product Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add consent-based, offline-safe PostHog analytics across Carvd's website, Electron application, and Lemon Squeezy purchase flow so acquisition, activation, retention, and paid conversion can be measured in one system.

**Architecture:** Desktop events pass from a typed renderer facade through IPC to a validating main-process service backed by a bounded `electron-store` queue; PostHog delivery is asynchronous and never participates in product control flow. The website sends explicit funnel events with `posthog-js`, while a signature-verified serverless webhook records completed purchases. Vercel Analytics remains responsible for aggregate website traffic and performance.

**Tech Stack:** Electron 41, TypeScript, React 19, Zustand, `electron-store`, `posthog-node@5.51.6`, `posthog-js@1.424.0`, Vercel Functions, Vitest, Testing Library, Playwright, PostHog Cloud.

**Spec:** `docs/superpowers/specs/2026-09-01-privacy-safe-product-analytics-design.md`

## Global Constraints

- Desktop analytics consent is `unknown`, `granted`, or `denied`; no event is stored or transmitted unless it is `granted`.
- Desktop autocapture and session replay remain disabled.
- Analytics must never block or change startup, editing, saving, exporting, licensing, or shutdown.
- The queue is capped at 5,000 events, retains at most 30 days, flushes 50 events every 60 seconds, retries from 30 seconds up to 6 hours, and uses stable event UUIDs.
- Project content, names, paths, notes, exact dimensions, exact counts, email addresses, license keys, order/customer IDs, usernames, and device names are prohibited.
- Missing configuration and network failures produce no user-facing errors.
- Development and production use separate PostHog projects.
- The public PostHog project token may be bundled; a PostHog personal API key must never be bundled.
- Update `CHANGELOG.md` under `[Unreleased]` because analytics consent and privacy copy are user-visible.
- Run all scoped desktop and website checks required by `AGENTS.md` before completion.

---

## Phase 1 — Contracts and Offline Infrastructure

### Task 1: Lock the event contract and install SDKs

**Files:**

- Create: `packages/desktop/src/shared/analytics.ts`
- Create: `packages/desktop/src/shared/analytics.test.ts`
- Modify: `packages/desktop/package.json`
- Modify: `packages/website/package.json`
- Modify: `package-lock.json`

**Interfaces:**

- Produces: `AnalyticsConsent`, `DesktopAnalyticsEventName`, `DesktopAnalyticsEventMap`, `DesktopAnalyticsEvent`, `bucketCount`, and `sanitizeDesktopAnalyticsEvent`.
- Consumes: no earlier task interfaces.

- [ ] **Step 1: Add failing shared-contract tests**

Create tests that assert count bucket boundaries and runtime rejection of prohibited or unknown properties:

```ts
import { describe, expect, it } from "vitest";
import { bucketCount, sanitizeDesktopAnalyticsEvent } from "./analytics";

describe("bucketCount", () => {
  it.each([
    [0, "0"],
    [1, "1-5"],
    [5, "1-5"],
    [6, "6-20"],
    [20, "6-20"],
    [21, "21-50"],
    [50, "21-50"],
    [51, "51+"],
  ])("maps %i to %s", (value, expected) =>
    expect(bucketCount(value)).toBe(expected),
  );
});

describe("sanitizeDesktopAnalyticsEvent", () => {
  it("accepts catalog properties", () => {
    expect(
      sanitizeDesktopAnalyticsEvent({
        name: "project_created",
        properties: { source: "start_screen", units: "imperial" },
      }),
    ).toEqual({
      name: "project_created",
      properties: { source: "start_screen", units: "imperial" },
    });
  });

  it.each([
    "projectName",
    "filePath",
    "notes",
    "email",
    "licenseKey",
    "partCount",
  ])("removes prohibited property %s", (property) => {
    expect(
      sanitizeDesktopAnalyticsEvent({
        name: "project_created",
        properties: {
          source: "start_screen",
          units: "imperial",
          [property]: "secret",
        },
      }),
    ).toEqual({
      name: "project_created",
      properties: { source: "start_screen", units: "imperial" },
    });
  });

  it("rejects unknown event names", () => {
    expect(
      sanitizeDesktopAnalyticsEvent({
        name: "renderer_clicked",
        properties: {},
      }),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run the contract test and verify it fails**

Run: `npm run test:unit --workspace=@carvd/desktop -- src/shared/analytics.test.ts`

Expected: FAIL because `./analytics` does not exist.

- [ ] **Step 3: Implement the event map and sanitizer**

Define these exact types:

```ts
export type AnalyticsConsent = "unknown" | "granted" | "denied";
export type CountBucket = "0" | "1-5" | "6-20" | "21-50" | "51+";

export interface DesktopAnalyticsEventMap {
  app_opened: Record<string, never>;
  analytics_consent_changed: {
    choice: "granted";
    surface: "onboarding" | "settings";
  };
  onboarding_completed: { source: "first_run" | "template" };
  project_created: {
    source: "start_screen" | "menu" | "template";
    units: "imperial" | "metric";
  };
  project_saved: {
    save_kind: "initial" | "manual" | "auto" | "save_as";
    part_count_bucket: CountBucket;
  };
  cut_list_generated: {
    part_count_bucket: CountBucket;
    stock_count_bucket: CountBucket;
    success: boolean;
  };
  export_completed: {
    export_type:
      | "project_pdf"
      | "cut_diagrams_pdf"
      | "shopping_pdf"
      | "shopping_csv";
    success: boolean;
  };
  checkout_opened: {
    surface: "trial" | "settings" | "pricing_prompt";
    license_mode: "trial" | "free";
  };
  license_activated: { license_mode: "licensed" };
}

export type DesktopAnalyticsEventName = keyof DesktopAnalyticsEventMap;
export type DesktopAnalyticsEvent<
  N extends DesktopAnalyticsEventName = DesktopAnalyticsEventName,
> = {
  name: N;
  properties: DesktopAnalyticsEventMap[N];
};
```

Implement a per-event property allowlist and enum/boolean validation. `sanitizeDesktopAnalyticsEvent(input: unknown)` returns a catalog event containing only permitted properties or `null` for an invalid name/missing required value. Do not retain unknown keys.

- [ ] **Step 4: Install exact SDK versions**

Run:

```bash
npm install posthog-node@5.51.6 --workspace=@carvd/desktop
npm install posthog-js@1.424.0 --workspace=@carvd/website
```

Expected: desktop and website manifests plus `package-lock.json` contain the pinned direct dependencies.

- [ ] **Step 5: Run contract and package checks**

Run:

```bash
npm run test:unit --workspace=@carvd/desktop -- src/shared/analytics.test.ts
npm run typecheck --workspace=@carvd/desktop
npm run analyze --workspace=@carvd/desktop
```

Expected: tests and typecheck PASS; the analyzer report is retained for comparison with the final build so the PostHog SDK's packaged cost is explicit.

- [ ] **Step 6: Commit the contract**

```bash
git add packages/desktop/src/shared/analytics.ts packages/desktop/src/shared/analytics.test.ts packages/desktop/package.json packages/website/package.json package-lock.json
git commit -m "feat: define privacy-safe analytics contract"
```

### Task 2: Implement the durable bounded queue

**Files:**

- Create: `packages/desktop/src/main/analytics/analyticsQueue.ts`
- Create: `packages/desktop/src/main/analytics/analyticsQueue.test.ts`

**Interfaces:**

- Consumes: `DesktopAnalyticsEvent` from `packages/desktop/src/shared/analytics.ts`.
- Produces: `QueuedAnalyticsEvent`, `AnalyticsQueueStore`, and `createAnalyticsQueue(storage, clock)`.

- [ ] **Step 1: Write failing queue tests**

Cover enqueue order, the 5,000-event cap, 30-day pruning, 50-event ready batches, acknowledgement by UUID, exponential retry, the 6-hour retry ceiling, and complete clearing. Use an in-memory `AnalyticsQueueStore` fake rather than touching the real preference file.

Required assertions include:

```ts
expect(queue.enqueue(event).eventId).toMatch(/^[0-9a-f-]{36}$/);
expect(queue.peekReady(50)).toHaveLength(50);
expect(queue.size()).toBe(5000);
expect(queue.peekReady(50)[0].attemptCount).toBe(0);
expect(queue.markFailed([eventId], now).nextAttemptAt).toBe(now + 30_000);
expect(queue.delayForAttempt(20)).toBe(6 * 60 * 60 * 1000);
```

- [ ] **Step 2: Run the queue test and verify it fails**

Run: `npm run test:main --workspace=@carvd/desktop -- analytics/analyticsQueue.test.ts`

Expected: FAIL because `analyticsQueue.ts` does not exist.

- [ ] **Step 3: Implement storage-independent queue logic**

Use the exact queued shape:

```ts
export interface QueuedAnalyticsEvent {
  eventId: string;
  distinctId: string;
  name: DesktopAnalyticsEventName;
  properties: Record<string, string | number | boolean>;
  occurredAt: string;
  attemptCount: number;
  nextAttemptAt: number;
}

export interface AnalyticsQueueStore {
  read(): QueuedAnalyticsEvent[];
  write(events: QueuedAnalyticsEvent[]): void;
}
```

Inject `clock: () => number` and UUID creation so tests do not depend on wall time or random output. Queue writes must be atomic from the queue object's perspective: derive a complete next array, then call `storage.write(next)` once.

- [ ] **Step 4: Run queue tests**

Run: `npm run test:main --workspace=@carvd/desktop -- analytics/analyticsQueue.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the queue**

```bash
git add packages/desktop/src/main/analytics/analyticsQueue.ts packages/desktop/src/main/analytics/analyticsQueue.test.ts
git commit -m "feat: add bounded offline analytics queue"
```

### Task 3: Add consent persistence and PostHog transport

**Files:**

- Create: `packages/desktop/src/main/analytics/analyticsStorage.ts`
- Create: `packages/desktop/src/main/analytics/posthogTransport.ts`
- Create: `packages/desktop/src/main/analytics/analyticsService.ts`
- Create: `packages/desktop/src/main/analytics/analyticsService.test.ts`
- Modify: `packages/desktop/src/main/store.ts`
- Modify: `packages/desktop/src/main/store.test.ts`
- Modify: `packages/desktop/.env.example`

**Interfaces:**

- Consumes: queue and shared event contracts from Tasks 1–2.
- Produces: singleton lifecycle functions `initializeAnalytics`, `captureAnalytics`, `flushAnalytics`, `shutdownAnalytics`, `getAnalyticsConsent`, and `setAnalyticsConsent`.

- [ ] **Step 1: Add failing consent persistence tests**

Extend the preference store tests to prove the default is `unknown`, all three values round-trip, and revocation deletes both `analyticsInstallationId` and queued events.

- [ ] **Step 2: Add failing service tests with a fake transport**

Cover these exact cases:

```ts
it("does not enqueue while consent is unknown");
it("does not enqueue while consent is denied");
it("creates an anonymous installation ID only after grant");
it("sanitizes renderer input before enqueue");
it("acknowledges a batch only after transport success");
it("retains and backs off a batch after transport failure");
it("clears queue and identity immediately on revoke");
it("is a no-op when PostHog configuration is absent");
it("never throws from captureAnalytics");
```

- [ ] **Step 3: Run service tests and verify they fail**

Run: `npm run test:main --workspace=@carvd/desktop -- analytics/analyticsService.test.ts store.test.ts`

Expected: FAIL on missing service and preference fields.

- [ ] **Step 4: Add preference fields**

Add to `AppPreferences` and defaults:

```ts
analyticsConsent: 'unknown',
analyticsInstallationId: null,
analyticsQueue: []
```

Expose narrowly scoped store functions rather than allowing the service to read unrelated preferences. Queue storage must use the adapter from `analyticsStorage.ts`.

- [ ] **Step 5: Implement PostHog transport**

Define:

```ts
export interface AnalyticsTransport {
  send(events: QueuedAnalyticsEvent[]): Promise<void>;
  shutdown(): Promise<void>;
}
```

Create `PostHog` only when both `MAIN_VITE_POSTHOG_KEY` and `MAIN_VITE_POSTHOG_HOST` are present. For each queued event, call `capture` with its stable UUID, ISO timestamp, anonymous `distinctId`, and sanitized properties, then await `flush()`. Never include a personal PostHog API key.

- [ ] **Step 6: Implement service scheduling and failure containment**

`initializeAnalytics()` prunes the queue and starts one 60-second interval. `captureAnalytics()` must catch sanitizer/storage failures and return `void`. `flushAnalytics()` uses a mutex so concurrent interval/manual flushes share one in-flight promise. A failed send calls `markFailed`; it never clears events. `shutdownAnalytics()` clears the interval, requests one best-effort flush, and limits waiting to 1,000 ms before leaving the durable queue for the next launch.

- [ ] **Step 7: Document desktop public environment variables**

Add:

```dotenv
MAIN_VITE_POSTHOG_KEY=
MAIN_VITE_POSTHOG_HOST=https://us.i.posthog.com
```

State in comments that blank values disable delivery and that development must use a separate PostHog project.

- [ ] **Step 8: Run main-process tests**

Run:

```bash
npm run test:main --workspace=@carvd/desktop -- analytics store.test.ts
npm run typecheck --workspace=@carvd/desktop
```

Expected: PASS.

- [ ] **Step 9: Commit the service**

```bash
git add packages/desktop/src/main/analytics packages/desktop/src/main/store.ts packages/desktop/src/main/store.test.ts packages/desktop/.env.example
git commit -m "feat: add consent-gated analytics delivery"
```

## Phase 2 — Desktop Consent and Event Instrumentation

### Task 4: Expose a narrow analytics IPC bridge

**Files:**

- Modify: `packages/desktop/src/main/index.ts`
- Modify: `packages/desktop/src/main/index.test.ts`
- Modify: `packages/desktop/src/preload/index.ts`
- Modify: `packages/desktop/src/preload/index.test.ts`
- Create: `packages/desktop/src/renderer/src/utils/analytics.ts`
- Create: `packages/desktop/src/renderer/src/utils/analytics.test.ts`

**Interfaces:**

- Consumes: service lifecycle functions and shared event types.
- Produces renderer API methods `captureAnalytics`, `getAnalyticsConsent`, and `setAnalyticsConsent`, plus typed renderer facade `analytics.capture`.

- [ ] **Step 1: Write failing IPC and facade tests**

Assert that the preload exposes only:

```ts
captureAnalytics: (event: DesktopAnalyticsEvent) => void;
getAnalyticsConsent: () => Promise<AnalyticsConsent>;
setAnalyticsConsent: (
  consent: AnalyticsConsent,
  surface: 'onboarding' | 'settings'
) => Promise<{ success: boolean }>;
```

Assert `analytics.capture()` catches a throwing preload mock and returns immediately without producing a rejected promise.

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `npm run test:unit --workspace=@carvd/desktop -- preload analytics`

Expected: FAIL on absent methods.

- [ ] **Step 3: Implement main lifecycle and IPC handlers**

Initialize after Electron `ready`, capture `app_opened` only through the service, and call `shutdownAnalytics` from the existing quit lifecycle. Register handlers using channel names:

```text
analytics:capture
analytics:get-consent
analytics:set-consent
```

The capture handler returns immediately after calling the non-throwing service method. The consent setter validates the enum in the main process.

- [ ] **Step 4: Implement the renderer facade**

Export a single frozen object:

```ts
export const analytics = Object.freeze({
  capture<N extends DesktopAnalyticsEventName>(
    name: N,
    properties: DesktopAnalyticsEventMap[N],
  ): void {
    try {
      window.electronAPI.captureAnalytics({ name, properties });
    } catch {
      // Analytics cannot affect product control flow.
    }
  },
});
```

- [ ] **Step 5: Run focused tests and typecheck**

Run:

```bash
npm run test:unit --workspace=@carvd/desktop -- preload analytics
npm run typecheck --workspace=@carvd/desktop
```

Expected: PASS.

- [ ] **Step 6: Commit IPC wiring**

```bash
git add packages/desktop/src/main/index.ts packages/desktop/src/main/index.test.ts packages/desktop/src/preload/index.ts packages/desktop/src/preload/index.test.ts packages/desktop/src/renderer/src/utils/analytics.ts packages/desktop/src/renderer/src/utils/analytics.test.ts
git commit -m "feat: expose safe desktop analytics bridge"
```

### Task 5: Add first-run consent and permanent privacy controls

**Files:**

- Create: `packages/desktop/src/renderer/src/components/analytics/AnalyticsConsentDialog.tsx`
- Create: `packages/desktop/src/renderer/src/components/analytics/AnalyticsConsentDialog.test.tsx`
- Create: `packages/desktop/src/renderer/src/components/settings/PrivacySection.tsx`
- Create: `packages/desktop/src/renderer/src/components/settings/PrivacySection.test.tsx`
- Modify: `packages/desktop/src/renderer/src/components/settings/AppSettingsModal.tsx`
- Modify: `packages/desktop/src/renderer/src/components/settings/AppSettingsModal.test.tsx`
- Modify: `packages/desktop/src/renderer/src/App.tsx`
- Modify: `packages/desktop/src/renderer/src/App.test.tsx`

**Interfaces:**

- Consumes: consent preload methods and `analytics.capture`.
- Produces: one-time consent resolution and a Settings → Data & License privacy control.

- [ ] **Step 1: Write failing consent-dialog tests**

Use semantic queries and assert the dialog contains this exact copy:

```text
Help improve Carvd Studio
Share anonymous feature-usage and reliability data. Project names, dimensions, files, notes, and designs are never collected. Analytics is optional and Carvd always works offline.
```

Assert two explicit actions: `Share anonymous usage data` and `Don't share`. Grant calls `setAnalyticsConsent('granted', 'onboarding')`; denial calls `setAnalyticsConsent('denied', 'onboarding')`. Closing by Escape or backdrop must not silently choose.

- [ ] **Step 2: Write failing settings tests**

Assert the current choice loads when the Data & License tab becomes visible. Toggling off calls `setAnalyticsConsent('denied', 'settings')`; toggling on calls `setAnalyticsConsent('granted', 'settings')`. Include a `What Carvd collects` disclosure listing the allowed categories and prohibited project data.

- [ ] **Step 3: Run UI tests and verify they fail**

Run: `npm run test:unit --workspace=@carvd/desktop -- AnalyticsConsentDialog PrivacySection AppSettingsModal App.test.tsx`

Expected: FAIL on missing components.

- [ ] **Step 4: Implement first-run sequencing**

In `App.tsx`, load consent after license status. Show the consent dialog only when consent is `unknown` and the first-run welcome tutorial has completed or been skipped. Never overlay it on the tutorial. Once the IPC setter resolves, close the dialog even if delivery is disabled; consent persistence is the only required operation.

- [ ] **Step 5: Implement settings controls**

Place `PrivacySection` below `DataManagementSection`. A denied/unknown choice displays the switch off. Granting emits `analytics_consent_changed` with `{ choice: 'granted', surface: 'settings' }`; denial cannot emit a remote denial event because revocation clears the queue before any transmission.

- [ ] **Step 6: Run UI tests and accessibility checks**

Run:

```bash
npm run test:unit --workspace=@carvd/desktop -- AnalyticsConsentDialog PrivacySection AppSettingsModal App.test.tsx
npm run lint --workspace=@carvd/desktop
npm run typecheck --workspace=@carvd/desktop
```

Expected: PASS with dialog buttons and switch reachable by role/name.

- [ ] **Step 7: Commit consent UI**

```bash
git add packages/desktop/src/renderer/src/components/analytics packages/desktop/src/renderer/src/components/settings/PrivacySection.tsx packages/desktop/src/renderer/src/components/settings/PrivacySection.test.tsx packages/desktop/src/renderer/src/components/settings/AppSettingsModal.tsx packages/desktop/src/renderer/src/components/settings/AppSettingsModal.test.tsx packages/desktop/src/renderer/src/App.tsx packages/desktop/src/renderer/src/App.test.tsx
git commit -m "feat: add analytics privacy controls"
```

### Task 6: Instrument desktop activation milestones

**Files:**

- Modify: `packages/desktop/src/renderer/src/App.tsx`
- Modify: `packages/desktop/src/renderer/src/App.test.tsx`
- Modify: `packages/desktop/src/renderer/src/utils/fileOperations.ts`
- Modify: `packages/desktop/src/renderer/src/utils/fileOperations.test.ts`
- Modify: `packages/desktop/src/renderer/src/store/projectStore.ts`
- Modify: `packages/desktop/src/renderer/src/store/projectStore.actions.test.ts`
- Modify: `packages/desktop/src/renderer/src/hooks/useAutoSave.ts`
- Modify: `packages/desktop/src/renderer/src/hooks/useAutoSave.test.ts`
- Modify: `packages/desktop/src/renderer/src/components/stock/CutListModal.tsx`
- Modify: `packages/desktop/src/renderer/src/components/stock/CutListModal.test.tsx`
- Modify: `packages/desktop/src/renderer/src/components/stock/CutListDiagramsTab.tsx`
- Modify: `packages/desktop/src/renderer/src/components/stock/CutListDiagramsTab.test.tsx`
- Modify: `packages/desktop/src/renderer/src/components/stock/ShoppingListTab.tsx`
- Modify: `packages/desktop/src/renderer/src/components/stock/ShoppingListTab.test.tsx`
- Modify: `packages/desktop/src/renderer/src/hooks/useLicenseStatus.ts`
- Modify: `packages/desktop/src/renderer/src/hooks/useLicenseStatus.test.ts`

**Interfaces:**

- Consumes: `analytics.capture` and `bucketCount`.
- Produces: the complete desktop activation and monetization event stream.

- [ ] **Step 1: Add failing event-location tests**

Mock only the analytics facade. For each outcome, assert exactly one event after success and the specified failure event after a handled failure. Never assert implementation details such as CSS classes.

Required mappings:

```text
first-run tutorial complete -> onboarding_completed { source: 'first_run' }
template tutorial complete -> onboarding_completed { source: 'template' }
new-project confirmation -> project_created { source, units }
initial file save -> project_saved { save_kind: 'initial', part_count_bucket }
manual save -> project_saved { save_kind: 'manual', part_count_bucket }
save as -> project_saved { save_kind: 'save_as', part_count_bucket }
successful auto-save -> project_saved { save_kind: 'auto', part_count_bucket }
cut-list result -> cut_list_generated { bucketed counts, success }
each export attempt completion -> export_completed { export_type, success }
checkout link opened -> checkout_opened { surface, license_mode }
successful license activation -> license_activated { license_mode: 'licensed' }
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `npm run test:unit --workspace=@carvd/desktop -- App fileOperations projectStore.actions useAutoSave CutListModal CutListDiagramsTab ShoppingListTab useLicenseStatus`

Expected: FAIL because capture calls are absent.

- [ ] **Step 3: Instrument success boundaries only**

Place capture calls immediately after the existing authoritative success signal: a completed save result, generated cut list, returned export path, opened checkout call, or valid activation response. Do not capture an intent before a fallible operation and then also capture success, because that would double-count the outcome event.

- [ ] **Step 4: Preserve coarse properties**

Convert part and stock counts with `bucketCount` before calling the facade. Do not pass project/store objects to analytics helpers. Avoid spread operators from domain objects.

- [ ] **Step 5: Run focused tests and desktop unit suite**

Run:

```bash
npm run test:unit --workspace=@carvd/desktop -- App fileOperations projectStore.actions useAutoSave CutListModal CutListDiagramsTab ShoppingListTab useLicenseStatus
npm run test:unit --workspace=@carvd/desktop
```

Expected: PASS; existing functional assertions remain unchanged.

- [ ] **Step 6: Commit desktop instrumentation**

```bash
git add packages/desktop/src/renderer/src
git commit -m "feat: measure desktop activation milestones"
```

## Phase 3 — Website Acquisition and Purchases

### Task 7: Add PostHog website initialization and explicit funnel events

**Files:**

- Create: `packages/website/src/analytics/analytics.ts`
- Create: `packages/website/src/analytics/analytics.test.ts`
- Create: `packages/website/src/analytics/PostHogPageviews.tsx`
- Create: `packages/website/src/analytics/PostHogPageviews.test.tsx`
- Modify: `packages/website/src/App.tsx`
- Modify: `packages/website/src/main.tsx`
- Modify: `packages/website/src/utils/downloads.ts`
- Modify: `packages/website/src/utils/downloads.test.ts`
- Modify: `packages/website/src/components/BuyButton.tsx`
- Modify: `packages/website/src/components/BuyButton.test.tsx`
- Modify: `packages/website/.env.example`

**Interfaces:**

- Produces: `websiteAnalytics.capture`, route pageviews, `download_clicked`, and `checkout_started`.
- Consumes: existing download and checkout helpers.

- [ ] **Step 1: Write failing initialization tests**

Assert configuration uses:

```ts
posthog.init(key, {
  api_host: host,
  autocapture: false,
  disable_session_recording: true,
  capture_pageview: false,
  persistence: "localStorage",
});
```

When either environment value is blank, `websiteAnalytics.capture` and pageview capture are no-ops.

- [ ] **Step 2: Write failing funnel tests**

Assert download links capture `{ platform, location }` immediately before normal navigation. Assert `BuyButton` captures `{ product: 'desktop_license', location }` before opening Lemon Squeezy. Analytics mock failures must not cancel either navigation.

- [ ] **Step 3: Run website tests and verify they fail**

Run: `npm run test:run --workspace=@carvd/website -- analytics downloads BuyButton`

Expected: FAIL on missing analytics module.

- [ ] **Step 4: Implement route pageviews**

Initialize once in `main.tsx`. Render `PostHogPageviews` under `BrowserRouter`; observe `useLocation()` and call `posthog.capture('$pageview', { $current_url: window.location.href })` on pathname/search changes. Keep the existing `<Analytics />` and `<SpeedInsights />` components unchanged.

- [ ] **Step 5: Implement explicit events without changing link destinations**

Extend download helper APIs with stable locations already present in source (`home-hero-card`, `download-hero-card`, `download-cta-footer`). Extend `BuyButton` with a `location` prop defaulting to `pricing-card`, and give other call sites explicit stable values.

- [ ] **Step 6: Document public website variables**

```dotenv
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

- [ ] **Step 7: Run website checks**

Run:

```bash
npm run test:run --workspace=@carvd/website
npm run lint --workspace=@carvd/website
npm run typecheck --workspace=@carvd/website
```

Expected: PASS.

- [ ] **Step 8: Commit website analytics**

```bash
git add packages/website/src packages/website/.env.example
git commit -m "feat: measure website acquisition funnel"
```

### Task 8: Record completed purchases from verified Lemon Squeezy webhooks

**Files:**

- Create: `packages/website/api/webhooks/lemonsqueezy.ts`
- Create: `packages/website/api/webhooks/lemonsqueezy.test.ts`
- Modify: `packages/website/vercel.json`
- Modify: `packages/website/.env.example`

**Interfaces:**

- Produces: authoritative `purchase_completed` PostHog events.
- Consumes: Lemon Squeezy `order_created` webhook requests.

- [ ] **Step 1: Write failing webhook tests**

Build signed fixtures with Node `createHmac('sha256', secret).update(rawBody).digest('hex')`. Assert:

```text
missing/invalid X-Signature -> 401, zero PostHog calls
unsupported event -> 204, zero PostHog calls
valid order_created -> 204, one purchase_completed call
duplicate valid delivery -> same deterministic event UUID
test order -> test_mode true
payload sent to PostHog contains no email, license key, order ID, customer ID, or user name
missing server configuration -> 503, no unhandled exception
```

- [ ] **Step 2: Run webhook test and verify it fails**

Run: `npm run test:run --workspace=@carvd/website -- lemonsqueezy.test.ts`

Expected: FAIL because the handler does not exist.

- [ ] **Step 3: Implement raw-body signature verification**

Read `await request.text()` exactly once. Compare supplied and computed signatures using `timingSafeEqual` after checking equal byte length. Never verify a parsed/re-serialized payload.

- [ ] **Step 4: Implement privacy-preserving PostHog delivery**

For `meta.event_name === 'order_created'`, derive:

```ts
const eventUuid = sha256(
  `lemonsqueezy:order_created:${data.id}:${ANALYTICS_ID_SALT}`,
);
const distinctId = sha256(`purchase:${data.id}:${ANALYTICS_ID_SALT}`);
```

Send only:

```ts
{
  event: 'purchase_completed',
  uuid: eventUuid,
  distinct_id: distinctId,
  properties: {
    product: 'desktop_license',
    currency: attributes.currency,
    value_cents: attributes.total,
    test_mode: Boolean(meta.test_mode)
  }
}
```

Use the public project ingestion key server-side. Do not log the webhook body.

- [ ] **Step 5: Document webhook variables and route**

Add blank values for:

```dotenv
LEMON_SQUEEZY_WEBHOOK_SECRET=
POSTHOG_PROJECT_KEY=
POSTHOG_HOST=https://us.i.posthog.com
ANALYTICS_ID_SALT=
```

Configure the function route at `/api/webhooks/lemonsqueezy`. Document in comments that Lemon Squeezy must subscribe only to `order_created` for this endpoint.

- [ ] **Step 6: Run webhook and website suites**

Run:

```bash
npm run test:run --workspace=@carvd/website -- lemonsqueezy.test.ts
npm run typecheck --workspace=@carvd/website
npm run build --workspace=@carvd/website
```

Expected: PASS.

- [ ] **Step 7: Commit purchase tracking**

```bash
git add packages/website/api/webhooks packages/website/vercel.json packages/website/.env.example
git commit -m "feat: track verified license purchases"
```

## Phase 4 — Privacy, Validation, and Release

### Task 9: Align public privacy promises and documentation

**Files:**

- Modify: `packages/website/src/pages/PrivacyPolicyPage.tsx`
- Modify: `packages/website/tests/pages/PrivacyPolicyPage.test.tsx`
- Modify: `packages/website/src/pages/HomePage.tsx`
- Modify: `packages/website/tests/pages/HomePage.test.tsx`
- Modify: `packages/website/src/pages/support/FAQSection.tsx`
- Modify: `packages/website/tests/pages/SupportPage.test.tsx`
- Modify: `packages/desktop/README.md`
- Modify: `packages/website/README.md`
- Modify: `CHANGELOG.md`

**Interfaces:**

- Consumes: implemented consent behavior and exact event catalog.
- Produces: accurate user-facing disclosure and operator configuration instructions.

- [ ] **Step 1: Add failing privacy-copy tests**

Assert the privacy page states:

```text
Project files and designs remain local unless you explicitly export or share them.
Carvd Studio offers optional anonymous product analytics.
Analytics never includes project names, filenames, paths, notes, dimensions, design content, email addresses, or license keys.
You can change this choice at any time in App Settings → Data & License.
When disabled, queued analytics and the anonymous installation identifier are deleted.
```

Remove assertions claiming that no usage analytics or analytics service exists.

- [ ] **Step 2: Replace absolute homepage privacy claims**

Replace `Complete privacy guaranteed` and `No data mining` language with the narrower, accurate promise: project files remain local and optional anonymous analytics never contains design content.

- [ ] **Step 3: Document configuration and incident procedure**

The READMEs must list environment variables, local no-op behavior, development/production project separation, event catalog ownership, consent defaults, and this kill switch: remove `MAIN_VITE_POSTHOG_KEY` from the next desktop build and clear `VITE_POSTHOG_KEY` from Vercel to stop new delivery.

- [ ] **Step 4: Add changelog entries**

Under `[Unreleased]`, describe optional anonymous analytics, offline-safe delivery, the permanent privacy toggle, and updated privacy disclosure. Do not claim that analytics is enabled until production configuration is actually set.

- [ ] **Step 5: Run copy and accessibility tests**

Run:

```bash
npm run test:run --workspace=@carvd/website -- PrivacyPolicyPage HomePage SupportPage
npm run test:run --workspace=@carvd/website
```

Expected: PASS.

- [ ] **Step 6: Commit privacy documentation**

```bash
git add packages/website/src/pages packages/website/tests packages/desktop/README.md packages/website/README.md CHANGELOG.md
git commit -m "docs: disclose optional anonymous analytics"
```

### Task 10: Add end-to-end offline and consent regression coverage

**Files:**

- Create: `packages/desktop/e2e/analytics.spec.ts`
- Modify: `packages/desktop/e2e/helpers/electron.ts`
- Create: `packages/website/e2e/analytics.spec.ts`

**Interfaces:**

- Consumes: complete desktop and website implementation.
- Produces: executable proof that analytics cannot block the product.

- [ ] **Step 1: Add desktop E2E test controls**

In test builds only, expose a main-process transport fake that records sanitized events and can be switched to `success`, `offline`, or `timeout`. Do not expose this control in packaged production builds.

- [ ] **Step 2: Write desktop E2E scenarios**

Cover:

```text
unknown consent -> dialog appears after tutorial, no event recorded
denied consent -> create/save/cut-list/export still work, no event recorded
granted + offline transport -> create/save/cut-list/export still work, events remain queued
restart + successful transport -> queued events flush once with stable UUIDs
revoke while offline -> queue and anonymous identity are immediately empty
malicious renderer property -> property absent from recorded payload
```

- [ ] **Step 3: Write website E2E scenarios**

Intercept the PostHog endpoint and assert route pageviews, platform/location download properties, checkout properties, and normal navigation when the analytics request is aborted.

- [ ] **Step 4: Run E2E files**

Run:

```bash
npm run test:e2e --workspace=@carvd/desktop -- analytics.spec.ts
npm run test:e2e --workspace=@carvd/website -- analytics.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit E2E coverage**

```bash
git add packages/desktop/e2e packages/website/e2e
git commit -m "test: cover offline analytics and consent flows"
```

### Task 11: Configure PostHog and build decision dashboards

**Files:**

- Create: `docs/analytics/POSTHOG-SETUP.md`
- Create: `docs/analytics/EVENT-CATALOG.md`
- Create: `docs/analytics/RELEASE-CHECKLIST.md`

**Interfaces:**

- Consumes: all event names/properties from implementation.
- Produces: repeatable external configuration and analysis procedures.

- [ ] **Step 1: Create separate PostHog projects**

Create `Carvd Development` and `Carvd Production` in the chosen US or EU region. Record project names, region, ingestion host, and where each key is configured; never write key values into tracked documentation.

- [ ] **Step 2: Configure the production event allowlist**

In PostHog, mark the documented catalog as the supported set. Disable session recording and avoid enabling autocapture. Verify no person property contains email, license key, file path, project name, or free-form text.

- [ ] **Step 3: Build Acquisition dashboard**

Create saved insights:

```text
website pageviews by referrer and landing path
download_clicked / relevant landing pageview
download_clicked breakdown by platform and location
checkout_started / download_clicked
purchase_completed / checkout_started
```

- [ ] **Step 4: Build Activation dashboard**

Create a unique-installation funnel:

```text
app_opened -> onboarding_completed -> project_created -> project_saved -> cut_list_generated -> license_activated
```

Use a 14-day conversion window and break down by `$os`, application version, and first-seen week.

- [ ] **Step 5: Build Retention dashboard**

Use `app_opened` as the returning event and `project_created` or `cut_list_generated` as the initial action. Save weekly retention plus 1-, 7-, and 30-day return views. Add version and operating-system filters.

- [ ] **Step 6: Write event catalog and release checklist**

For every event, document owner, trigger, allowed properties, prohibited examples, dashboard consumers, and a verification query. The release checklist must require inspecting at least one real payload for each event and confirming consent revocation from a packaged build.

- [ ] **Step 7: Commit analytics operations documentation**

```bash
git add docs/analytics
git commit -m "docs: add analytics dashboards and release runbook"
```

### Task 12: Execute staged rollout and complete verification

**Files:**

- Modify only if verification finds a defect: files owned by Tasks 1–11.

**Interfaces:**

- Consumes: complete feature and operations documentation.
- Produces: verified development, internal production, and general-release readiness.

- [ ] **Step 1: Run the no-configuration dark launch**

Build with every PostHog variable blank. Complete onboarding, create and save a project, generate a cut list, export PDF/CSV, activate a development license, disconnect networking, restart, and quit. Expected: every product flow works; no analytics request is made; no user-facing analytics error appears.

- [ ] **Step 2: Run all repository quality gates**

Run:

```bash
npm run lint --workspace=@carvd/desktop
npm run typecheck --workspace=@carvd/desktop
npm test --workspace=@carvd/desktop
npm run lint --workspace=@carvd/website
npm run typecheck --workspace=@carvd/website
npm test --workspace=@carvd/website
```

Expected: all commands exit 0.

- [ ] **Step 3: Verify development ingestion**

Configure only development PostHog values. Grant consent, execute one instance of every catalog event using synthetic projects, wait for flush, and verify event names, stable UUIDs, timestamps, anonymous identity, allowed properties, and absence of prohibited values.

- [ ] **Step 4: Verify purchase webhook in Lemon Squeezy test mode**

Configure the test webhook URL and secrets, send a signed test `order_created`, and verify exactly one `purchase_completed` event with `test_mode: true`. Replay the webhook and confirm the PostHog count remains one because the UUID is stable.

- [ ] **Step 5: Enable an internal production cohort**

Build production configuration for maintainer/tester installs only. Run for seven days. Review local logs for retry churn, queue size, rejected event names, and shutdown delay. Inspect PostHog daily for prohibited properties.

- [ ] **Step 6: Release consent UI broadly**

Release through the normal feature-branch-to-`develop` PR workflow. Do not run paid acquisition until either 20 attributable downloads or 30 days of reliable data exist. Record the release date as a PostHog annotation.

- [ ] **Step 7: Apply the first decision gate**

After the waiting threshold, report:

```text
visitor -> download rate
download -> first-open rate (aggregate until identity stitching exists)
first-open -> project-created rate
project-created -> cut-list-generated rate
activated -> license-activated rate
7- and 30-day retained-use rate
```

Do not infer causal marketing performance from fewer than 20 attributable downloads. Use the results to select the next product/onboarding experiment before increasing ad spend.

---

## Implementation Order and Checkpoints

- Checkpoint A after Task 3: review privacy boundary, queue semantics, dependency bundle impact, and no-configuration behavior.
- Checkpoint B after Task 6: manually inspect every desktop capture call and verify no domain object or free-form string crosses the facade.
- Checkpoint C after Task 8: verify website attribution and signed purchase ingestion in development.
- Checkpoint D after Task 10: require offline and consent E2E suites to pass before any production key is configured.
- Checkpoint E after Task 12: review the first 20-download/30-day report before authorizing paid acquisition.

## Rollback Strategy

1. Remove `MAIN_VITE_POSTHOG_KEY` from the next desktop build to disable desktop delivery; queued events remain local until consent is revoked or a later configured build flushes them.
2. Clear `VITE_POSTHOG_KEY` in Vercel to disable website product events while leaving Vercel pageviews and Speed Insights active.
3. Disable the Lemon Squeezy webhook endpoint to stop purchase events.
4. If a prohibited property is observed, disable all three ingestion paths immediately, delete affected events/person properties in PostHog, patch the main-process sanitizer, add a regression fixture, and only then re-enable delivery.
5. Do not remove the consent setting during rollback; users must retain the ability to revoke and clear locally queued data.
