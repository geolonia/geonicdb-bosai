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
 * SSRF: localhost / プライベート IP / リンクローカル / 内部 DNS 名は拒否（拒否リスト方式）。
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
  assertPublicPushEndpointHost(parsed.hostname);
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

/** URL.hostname は IPv6 を括弧なしで返す。 */
const INTERNAL_DNS_SUFFIXES = [
  ".local",
  ".localhost",
  ".internal",
  ".intranet",
  ".corp",
  ".home",
  ".lan",
] as const;

/**
 * Push Service 向けホストの拒否リスト検証（SSRF 緩和）。
 * 公開ホスト名は許可し、localhost・RFC1918・リンクローカル・内部 DNS を拒否する。
 */
export function assertPublicPushEndpointHost(hostname: string): void {
  // FQDN 末尾ドット（localhost.）を除去してから拒否リスト照合
  const host = hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.+$/, "");
  if (!host) {
    throw new ValidationError("endpoint host is not allowed");
  }
  if (host === "localhost" || host === "0.0.0.0") {
    throw new ValidationError("endpoint host is not allowed");
  }
  for (const suffix of INTERNAL_DNS_SUFFIXES) {
    if (host.endsWith(suffix)) {
      throw new ValidationError("endpoint host is not allowed");
    }
  }

  if (isIpv4Literal(host)) {
    if (isBlockedIpv4(host)) {
      throw new ValidationError("endpoint host is not allowed");
    }
    return;
  }

  if (host.includes(":")) {
    if (isBlockedIpv6(host)) {
      throw new ValidationError("endpoint host is not allowed");
    }
  }
}

function isIpv4Literal(host: string): boolean {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host);
}

function isBlockedIpv4(host: string): boolean {
  const parts = host.split(".").map((p) => Number(p));
  if (
    parts.length !== 4 ||
    parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
  ) {
    return true;
  }
  const [a, b] = parts;
  // loopback 127.0.0.0/8
  if (a === 127) return true;
  // RFC1918
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  // link-local 169.254.0.0/16
  if (a === 169 && b === 254) return true;
  // unspecified
  if (a === 0) return true;
  return false;
}

function isBlockedIpv6(host: string): boolean {
  // 圧縮表記を含む簡易判定（完全パーサは不要な範囲で拒否寄り）
  const normalized = host.toLowerCase();
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fe80:")) return true; // link-local
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // ULA
  // IPv4-mapped ::ffff:a.b.c.d
  const mapped = normalized.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped && isBlockedIpv4(mapped[1])) return true;
  return false;
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
