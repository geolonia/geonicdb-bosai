/**
 * ブラウザ PushSubscription → NGSI-LD webpush サブスクリプション body の整形。
 * GeonicDB #3014: notification.endpoint.protocol=webpush + webpush.keys。
 */
import {
  BOSAI_LIVE_ENTITY_TYPES,
  type BosaiLiveEntityType,
} from "../../../../shared/bosai-live-entity-types";

export { BOSAI_LIVE_ENTITY_TYPES, type BosaiLiveEntityType };

export type PushSubscriptionInput = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type BuildSubscriptionOptions = {
  /** 通知クリック先（サイトトップ）。payload には載せないが description に残す */
  siteOrigin?: string;
};

/**
 * Push Service の endpoint URL と VAPID keys を検証する。
 * near-miss: http:// や "https://" のみ（hostname 無し）は拒否。
 */
export function parsePushSubscription(body: unknown): PushSubscriptionInput {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("body must be a JSON object");
  }
  const record = body as Record<string, unknown>;
  const endpoint = record.endpoint;
  if (typeof endpoint !== "string" || !endpoint.trim()) {
    throw new ValidationError("endpoint is required");
  }
  const trimmedEndpoint = endpoint.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmedEndpoint);
  } catch {
    throw new ValidationError("endpoint must be a valid https:// URL");
  }
  if (parsed.protocol !== "https:" || !parsed.hostname) {
    throw new ValidationError("endpoint must be a valid https:// URL");
  }
  const keys = record.keys;
  if (keys === null || typeof keys !== "object" || Array.isArray(keys)) {
    throw new ValidationError("keys is required");
  }
  const keyRecord = keys as Record<string, unknown>;
  const p256dh = keyRecord.p256dh;
  const auth = keyRecord.auth;
  if (typeof p256dh !== "string" || !p256dh.trim()) {
    throw new ValidationError("keys.p256dh is required");
  }
  if (typeof auth !== "string" || !auth.trim()) {
    throw new ValidationError("keys.auth is required");
  }
  return {
    endpoint: trimmedEndpoint,
    keys: { p256dh: p256dh.trim(), auth: auth.trim() },
  };
}

export class ValidationError extends Error {
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * NGSI-LD Subscription 作成 body。
 * attributes に language のみを指定し、ペイロードを ~4KB 上限内に抑える
 * （SW は type だけ見て短い文言を表示する）。
 */
export function buildNgsiLdWebPushSubscription(
  subscription: PushSubscriptionInput,
  options: BuildSubscriptionOptions = {},
): Record<string, unknown> {
  const site = options.siteOrigin?.replace(/\/+$/, "") ?? "";
  return {
    type: "Subscription",
    description: site
      ? `geonicdb-bosai webpush (${site})`
      : "geonicdb-bosai webpush",
    entities: BOSAI_LIVE_ENTITY_TYPES.map((type) => ({ type })),
    notification: {
      attributes: ["language"],
      endpoint: {
        uri: subscription.endpoint,
        protocol: "webpush",
        webpush: {
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
          urgency: "high",
          ttl: 86_400,
        },
      },
    },
  };
}

/** Location ヘッダまたは JSON からサブスクリプション ID を取り出す */
export function extractSubscriptionId(
  locationHeader: string | null,
  body: unknown,
): string | null {
  if (locationHeader) {
    const match = /\/subscriptions\/([^/?#]+)/.exec(locationHeader);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const id = (body as Record<string, unknown>).id;
    if (typeof id === "string" && id.length > 0) return id;
  }
  return null;
}

const SUBSCRIPTION_ID_PATTERN = /^[A-Za-z0-9_.:@%-]+$/;

export function assertSubscriptionId(id: string): string {
  const trimmed = id.trim();
  if (!trimmed || trimmed.length > 256) {
    throw new ValidationError("subscriptionId is invalid");
  }
  if (!SUBSCRIPTION_ID_PATTERN.test(trimmed)) {
    throw new ValidationError("subscriptionId is invalid");
  }
  // near-miss: path traversal
  if (trimmed.includes("..") || trimmed.includes("/")) {
    throw new ValidationError("subscriptionId is invalid");
  }
  return trimmed;
}
