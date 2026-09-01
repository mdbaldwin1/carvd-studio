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

function deterministicUuid(value: string): string {
  const bytes = createHash("sha256").update(value).digest();
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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
  data: {
    id: string | number;
    attributes: { currency: string; total: number };
  };
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
    (typeof value.data?.id === "string"
      ? value.data.id.trim().length > 0
      : typeof value.data?.id === "number" && Number.isFinite(value.data.id)) &&
    typeof value.data.attributes?.currency === "string" &&
    value.data.attributes.currency.trim().length > 0 &&
    typeof value.data.attributes?.total === "number" &&
    Number.isFinite(value.data.attributes.total) &&
    Number.isInteger(value.data.attributes.total) &&
    value.data.attributes.total >= 0 &&
    (value.meta.test_mode === undefined ||
      typeof value.meta.test_mode === "boolean")
  );
}

/** Lemon Squeezy must subscribe only to order_created for this endpoint. */
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  }

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

  const meta = (payload as { meta?: unknown })?.meta;
  if (
    !meta ||
    typeof meta !== "object" ||
    typeof (meta as { event_name?: unknown }).event_name !== "string"
  ) {
    return new Response(null, { status: 400 });
  }
  const eventName = (meta as { event_name: string }).event_name;
  if (eventName !== "order_created") return new Response(null, { status: 204 });
  if (!isOrderCreated(payload)) return new Response(null, { status: 400 });

  const event = {
    event: "purchase_completed",
    uuid: deterministicUuid(
      `lemonsqueezy:order_created:${payload.data.id}:${config.analyticsIdSalt}`,
    ),
    distinct_id: deterministicUuid(
      `purchase:${payload.data.id}:${config.analyticsIdSalt}`,
    ),
    properties: {
      product: "desktop_license",
      currency: payload.data.attributes.currency.trim(),
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
