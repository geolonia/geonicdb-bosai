import type { SiteLanguage } from "@/config/site-language";
import {
  assertSubscriptionId,
  buildNgsiLdWebPushSubscription,
  extractSubscriptionId,
  parsePushSubscription,
} from "@/lib/build-webpush-subscription";
import {
  getGeonicdbWebPushClient,
  resolveGeonicdbPublicConfig,
  type PublicEnvLike,
} from "@/lib/geonicdb-public-client";

const STORAGE_KEY = "bosai-webpush-subscription";

export type StoredWebPushState = {
  subscriptionId: string;
  endpoint: string;
  enabledAt: string;
};

export type PublicWebPushEnv = PublicEnvLike;

/** @internal テスト注入用。SDK の requestRaw 面だけ。 */
export type WebPushGeonicdbClient = {
  requestRaw(method: string, path: string, body?: unknown): Promise<Response>;
};

/** VAPID 公開鍵取得（認証不要）。 */
export async function fetchVapidPublicKey(
  env: PublicWebPushEnv = {
    NEXT_PUBLIC_GEONICDB_URL: process.env.NEXT_PUBLIC_GEONICDB_URL,
  },
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const { baseUrl } = resolveGeonicdbPublicConfig({
    NEXT_PUBLIC_GEONICDB_URL: env.NEXT_PUBLIC_GEONICDB_URL,
    NEXT_PUBLIC_GEONICDB_TENANT: env.NEXT_PUBLIC_GEONICDB_TENANT,
  });
  const response = await fetchFn(`${baseUrl}/.well-known/webpush-vapid-key`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`VAPID key fetch failed: ${response.status}`);
  }
  const json = (await response.json()) as { publicKey?: unknown };
  if (typeof json.publicKey !== "string" || !json.publicKey.trim()) {
    throw new Error("VAPID publicKey missing");
  }
  return json.publicKey.trim();
}

/**
 * Web Push 購読が有効か（サブスクリプション操作用 API キーの有無）。
 * 未設定時はオプトイン UI を出さない。
 */
export function isWebPushConfigured(
  env: PublicWebPushEnv = {
    NEXT_PUBLIC_GEONICDB_URL: process.env.NEXT_PUBLIC_GEONICDB_URL,
    NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY:
      process.env.NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY,
  },
): boolean {
  try {
    const config = resolveGeonicdbPublicConfig(env);
    return Boolean(config.webpushApiKey);
  } catch {
    return false;
  }
}

/** applicationServerKey 用に base64url → Uint8Array */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function readStoredWebPushState(
  storage: Pick<Storage, "getItem"> = localStorage,
): StoredWebPushState | null {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredWebPushState>;
    if (
      typeof parsed.subscriptionId !== "string" ||
      typeof parsed.endpoint !== "string" ||
      typeof parsed.enabledAt !== "string"
    ) {
      return null;
    }
    return {
      subscriptionId: parsed.subscriptionId,
      endpoint: parsed.endpoint,
      enabledAt: parsed.enabledAt,
    };
  } catch {
    return null;
  }
}

export function writeStoredWebPushState(
  state: StoredWebPushState,
  storage: Pick<Storage, "setItem"> = localStorage,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearStoredWebPushState(
  storage: Pick<Storage, "removeItem"> = localStorage,
): void {
  storage.removeItem(STORAGE_KEY);
}

/**
 * GeonicDB へ NGSI-LD webpush サブスクリプションを直接作成する。
 * 認証・DPoP は SDK（getGeonicdbWebPushClient）に委譲する。
 */
export async function registerWebPushSubscription(
  pushSubscriptionJson: {
    endpoint: string;
    keys?: { p256dh?: string; auth?: string };
  },
  options: {
    env?: PublicWebPushEnv;
    client?: WebPushGeonicdbClient;
    siteOrigin?: string;
  } = {},
): Promise<string> {
  const parsed = parsePushSubscription({
    endpoint: pushSubscriptionJson.endpoint,
    keys: pushSubscriptionJson.keys,
  });
  const siteOrigin =
    options.siteOrigin ??
    (typeof globalThis.location?.origin === "string"
      ? globalThis.location.origin
      : undefined);
  const body = buildNgsiLdWebPushSubscription(parsed, { siteOrigin });

  const client =
    options.client ??
    getGeonicdbWebPushClient(options.env) ??
    (() => {
      throw new Error("NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY is not set");
    })();

  const response = await client.requestRaw(
    "POST",
    "/ngsi-ld/v1/subscriptions",
    body,
  );
  const responseText = await response.text();
  let responseJson: unknown = null;
  if (responseText) {
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = null;
    }
  }
  if (response.status !== 201 && response.status !== 200) {
    throw new Error(`Web Push register failed: ${response.status}`);
  }
  const location =
    response.headers.get("Location") ?? response.headers.get("location");
  const subscriptionId = extractSubscriptionId(location, responseJson);
  if (!subscriptionId) {
    throw new Error("subscriptionId missing in register response");
  }
  return assertSubscriptionId(subscriptionId);
}

/** GeonicDB 上のサブスクリプションを DELETE する。 */
export async function unregisterWebPushSubscription(
  subscriptionId: string,
  options: {
    env?: PublicWebPushEnv;
    client?: WebPushGeonicdbClient;
  } = {},
): Promise<void> {
  const id = assertSubscriptionId(subscriptionId);
  const client =
    options.client ??
    getGeonicdbWebPushClient(options.env) ??
    (() => {
      throw new Error("NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY is not set");
    })();

  const response = await client.requestRaw(
    "DELETE",
    `/ngsi-ld/v1/subscriptions/${encodeURIComponent(id)}`,
  );
  if (!response.ok && response.status !== 204) {
    throw new Error(`Web Push unregister failed: ${response.status}`);
  }
}

export async function syncServiceWorkerLang(
  registration: ServiceWorkerRegistration,
  lang: SiteLanguage,
): Promise<void> {
  const worker =
    registration.active ?? registration.waiting ?? registration.installing;
  if (!worker) return;
  worker.postMessage({ type: "SET_LANG", lang });
}

/**
 * localStorage だけでなく permission + PushSubscription の実在を確認する。
 * 不整合なら保存値を捨てて null（再登録 UI へ）。
 */
export async function resolveActiveWebPushState(
  storage: Pick<Storage, "getItem" | "removeItem"> = localStorage,
): Promise<StoredWebPushState | null> {
  const stored = readStoredWebPushState(storage);
  if (!stored) return null;
  if (typeof window === "undefined" || !("Notification" in window)) {
    clearStoredWebPushState(storage);
    return null;
  }
  if (Notification.permission !== "granted") {
    clearStoredWebPushState(storage);
    return null;
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    clearStoredWebPushState(storage);
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription || subscription.endpoint !== stored.endpoint) {
      clearStoredWebPushState(storage);
      return null;
    }
    return stored;
  } catch {
    clearStoredWebPushState(storage);
    return null;
  }
}

/**
 * 通知許可 → SW 登録 → pushManager.subscribe → GeonicDB へ直接登録。
 * 同一 endpoint の既存購読 + 保存済み subscriptionId がある場合は再 POST しない。
 */
export async function enableWebPushNotifications(options: {
  lang: SiteLanguage;
  env?: PublicWebPushEnv;
  fetchFn?: typeof fetch;
  client?: WebPushGeonicdbClient;
}): Promise<StoredWebPushState> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    throw new Error("Notifications are not supported");
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push messaging is not supported");
  }

  if (!isWebPushConfigured(options.env)) {
    throw new Error("NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY is not set");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission denied");
  }

  const basePath = (
    options.env?.NEXT_PUBLIC_BASE_PATH ??
    process.env.NEXT_PUBLIC_BASE_PATH ??
    ""
  )
    .trim()
    .replace(/\/+$/, "");
  const swPath = `${basePath}/sw.js` || "/sw.js";
  const scope = basePath ? `${basePath}/` : "/";

  const registration = await navigator.serviceWorker.register(swPath, {
    scope,
  });
  await navigator.serviceWorker.ready;
  await syncServiceWorkerLang(registration, options.lang);

  const existingSub = await registration.pushManager.getSubscription();
  const stored = readStoredWebPushState();
  if (
    existingSub &&
    stored &&
    existingSub.endpoint === stored.endpoint &&
    stored.subscriptionId
  ) {
    return stored;
  }

  // 既存 PushSubscription がある場合は VAPID 取得をスキップ（localStorage 再同期のみ）
  let subscription = existingSub;
  if (!subscription) {
    const vapidKey = await fetchVapidPublicKey(options.env, options.fetchFn);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    });
  }
  const json = subscription.toJSON();
  const endpoint = json.endpoint ?? subscription.endpoint;
  const subscriptionId = await registerWebPushSubscription(
    {
      endpoint,
      keys: json.keys,
    },
    { env: options.env, client: options.client },
  );

  const state: StoredWebPushState = {
    subscriptionId,
    endpoint,
    enabledAt: new Date().toISOString(),
  };
  writeStoredWebPushState(state);
  return state;
}

/** GeonicDB DELETE 成功後に PushSubscription.unsubscribe。localStorage は DELETE 成功後に必ず消す。 */
export async function disableWebPushNotifications(options: {
  env?: PublicWebPushEnv;
  client?: WebPushGeonicdbClient;
}): Promise<void> {
  if (!isWebPushConfigured(options.env)) {
    throw new Error("NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY is not set");
  }
  const stored = readStoredWebPushState();
  if (!stored) return;

  await unregisterWebPushSubscription(stored.subscriptionId, {
    env: options.env,
    client: options.client,
  });

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
    }
  } finally {
    // GeonicDB 側は既に消えている。unsubscribe が失敗しても残すと再登録不能になる。
    clearStoredWebPushState();
  }
}
