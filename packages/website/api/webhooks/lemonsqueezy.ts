import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const config = { runtime: "nodejs" };

interface WebhookConfig {
  webhookSecret: string;
  posthogProjectKey: string;
  posthogHost: string;
  analyticsIdSalt: string;
}

function getConfig(): WebhookConfig | null {
  const webhookSecret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET?.trim();
  const posthogProjectKey = process.env.POSTHOG_PROJECT_KEY?.trim();
  const posthogHost = process.env.POSTHOG_HOST?.trim();
  const analyticsIdSalt = process.env.ANALYTICS_ID_SALT?.trim();

  if (!webhookSecret || !posthogProjectKey || !posthogHost || !analyticsIdSalt)
    return null;
  return { webhookSecret, posthogProjectKey, posthogHost, analyticsIdSalt };
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hasValidSignature(
  rawBody: string,
  suppliedSignature: string | null,
  secret: string,
): boolean {
  if (!suppliedSignature) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const supplied = Buffer.from(suppliedSignature, "utf8");
  const computed = Buffer.from(expected, "utf8");
  return (
    supplied.length === computed.length && timingSafeEqual(supplied, computed)
  );
}

function isOrderCreated(payload: unknown): payload is {
  meta: { event_name: "order_created"; test_mode?: unknown };
  data: { id: string; attributes: { currency: string; total: number } };
} {
  if (!payload || typeof payload !== "object") return false;
  const value = payload as {
    meta?: { event_name?: unknown; test_mode?: unknown };
    data?: {
      id?: unknown;
      attributes?: { currency?: unknown; total?: unknown };
    };
  };
  return (
    value.meta?.event_name === "order_created" &&
    typeof value.data?.id === "string" &&
    typeof value.data.attributes?.currency === "string" &&
    typeof value.data.attributes?.total === "number"
  );
}

/** Lemon Squeezy must subscribe only to order_created for this endpoint. */
export default async function handler(request: Request): Promise<Response> {
  const config = getConfig();
  if (!config) return new Response(null, { status: 503 });

  const rawBody = await request.text();
  if (
    !hasValidSignature(
      rawBody,
      request.headers.get("X-Signature"),
      config.webhookSecret,
    )
  ) {
    return new Response(null, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(null, { status: 400 });
  }

  const eventName = (payload as { meta?: { event_name?: unknown } })?.meta
    ?.event_name;
  if (eventName !== "order_created") return new Response(null, { status: 204 });
  if (!isOrderCreated(payload)) return new Response(null, { status: 400 });

  const event = {
    event: "purchase_completed",
    uuid: sha256(
      `lemonsqueezy:order_created:${payload.data.id}:${config.analyticsIdSalt}`,
    ),
    distinct_id: sha256(
      `purchase:${payload.data.id}:${config.analyticsIdSalt}`,
    ),
    properties: {
      product: "desktop_license",
      currency: payload.data.attributes.currency,
      value_cents: payload.data.attributes.total,
      test_mode: Boolean(payload.meta.test_mode),
    },
  };

  try {
    const response = await fetch(
      `${config.posthogHost.replace(/\/$/, "")}/capture/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: config.posthogProjectKey, ...event }),
      },
    );
    if (!response.ok) return new Response(null, { status: 502 });
  } catch {
    return new Response(null, { status: 502 });
  }

  return new Response(null, { status: 204 });
}
