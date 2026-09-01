import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "./lemonsqueezy";

const secret = "webhook-secret";
const rawOrder = JSON.stringify({
  meta: { event_name: "order_created", test_mode: true },
  data: {
    id: "order-123",
    attributes: {
      currency: "USD",
      total: 5999,
      user_email: "private@example.com",
      first_name: "Private",
      license_key: "secret-license",
    },
    relationships: { customer: { data: { id: "customer-456" } } },
  },
});

function signedRequest(body = rawOrder, signature = sign(body)): Request {
  return new Request("https://carvd-studio.com/api/webhooks/lemonsqueezy", {
    method: "POST",
    headers: { "X-Signature": signature },
    body,
  });
}

function sign(body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

describe("Lemon Squeezy webhook", () => {
  beforeEach(() => {
    vi.stubEnv("LEMON_SQUEEZY_WEBHOOK_SECRET", secret);
    vi.stubEnv("POSTHOG_PROJECT_KEY", "posthog-project-key");
    vi.stubEnv("POSTHOG_HOST", "https://us.i.posthog.com");
    vi.stubEnv("ANALYTICS_ID_SALT", "analytics-salt");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("rejects missing and invalid signatures without delivery", async () => {
    const missing = await handler(
      new Request("https://carvd-studio.com/api/webhooks/lemonsqueezy", {
        method: "POST",
        body: rawOrder,
      }),
    );
    const invalid = await handler(signedRequest(rawOrder, "invalid"));

    expect(missing.status).toBe(401);
    expect(invalid.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("acknowledges unsupported verified events without delivery", async () => {
    const unsupported = JSON.stringify({
      meta: { event_name: "subscription_created" },
      data: { id: "sub-1" },
    });

    const response = await handler(signedRequest(unsupported));

    expect(response.status).toBe(204);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("delivers one whitelist-only deterministic purchase event", async () => {
    const response = await handler(signedRequest());

    expect(response.status).toBe(204);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [, request] = vi.mocked(fetch).mock.calls[0];
    const event = JSON.parse((request as RequestInit).body as string);
    expect(event).toMatchObject({
      event: "purchase_completed",
      distinct_id: expect.any(String),
      uuid: expect.any(String),
      properties: {
        product: "desktop_license",
        currency: "USD",
        value_cents: 5999,
        test_mode: true,
      },
    });
    expect(Object.keys(event.properties).sort()).toEqual([
      "currency",
      "product",
      "test_mode",
      "value_cents",
    ]);
    expect(JSON.stringify(event)).not.toMatch(
      /private@example|secret-license|customer-456|order-123|Private/,
    );
  });

  it("uses the same event UUID for duplicate valid deliveries", async () => {
    await handler(signedRequest());
    await handler(signedRequest());

    const first = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string,
    );
    const second = JSON.parse(
      (vi.mocked(fetch).mock.calls[1][1] as RequestInit).body as string,
    );
    expect(first.uuid).toBe(second.uuid);
    expect(first.distinct_id).toBe(second.distinct_id);
  });

  it("returns 503 without delivery when required server configuration is missing", async () => {
    vi.stubEnv("ANALYTICS_ID_SALT", "");

    const response = await handler(signedRequest());

    expect(response.status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns 502 when PostHog delivery fails so Lemon Squeezy can retry", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));

    const response = await handler(signedRequest());

    expect(response.status).toBe(502);
  });
});
