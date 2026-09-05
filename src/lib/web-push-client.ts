import type { SiteLanguage } from "@/config/site-language";
import { resolveGeonicdbPublicConfig } from "@/lib/geonicdb-public-client";

const STORAGE_KEY = "bosai-webpush-subscription";

export type StoredWebPushState = {
  subscriptionId: string;
  endpoint: string;
  enabledAt: string;
};

export type PublicWebPushEnv = Record<string, string | undefined>;

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
 * 登録プロキシ URL。
 * CloudFront 利用時は同一オリジン `/api/webpush` を推奨。
 */
export function resolveWebPushRegisterUrl(
  env: PublicWebPushEnv = {
    NEXT_PUBLIC_WEBPUSH_REGISTER_URL:
      process.env.NEXT_PUBLIC_WEBPUSH_REGISTER_URL,
  },
): string | null {
  const raw = env.NEXT_PUBLIC_WEBPUSH_REGISTER_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
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

export async function registerPushWithProxy(
  pushSubscriptionJson: {
    endpoint: string;
    keys?: { p256dh?: string; auth?: string };
  },
  registerUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const p256dh = pushSubscriptionJson.keys?.p256dh;
  const auth = pushSubscriptionJson.keys?.auth;
  if (!p256dh || !auth) {
    throw new Error("PushSubscription keys missing");
  }
  const response = await fetchFn(registerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      endpoint: pushSubscriptionJson.endpoint,
      keys: { p256dh, auth },
    }),
  });
  if (!response.ok) {
    throw new Error(`Web Push register failed: ${response.status}`);
  }
  const json = (await response.json()) as { subscriptionId?: unknown };
  if (typeof json.subscriptionId !== "string" || !json.subscriptionId) {
    throw new Error("subscriptionId missing in register response");
  }
  return json.subscriptionId;
}

export async function unregisterPushWithProxy(
  subscriptionId: string,
  registerUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const url = new URL(
    registerUrl.includes("://")
      ? registerUrl
      : `${globalThis.location?.origin ?? "http://localhost"}${registerUrl.startsWith("/") ? "" : "/"}${registerUrl}`,
  );
  url.searchParams.set("id", subscriptionId);
  const response = await fetchFn(url.toString(), { method: "DELETE" });
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
 * 通知許可 → SW 登録 → pushManager.subscribe → プロキシ登録。
 * 同一 endpoint の既存購読 + 保存済み subscriptionId がある場合は再 POST しない。
 */
export async function enableWebPushNotifications(options: {
  lang: SiteLanguage;
  env?: PublicWebPushEnv;
  fetchFn?: typeof fetch;
}): Promise<StoredWebPushState> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    throw new Error("Notifications are not supported");
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push messaging is not supported");
  }

  const registerUrl = resolveWebPushRegisterUrl(options.env);
  if (!registerUrl) {
    throw new Error("NEXT_PUBLIC_WEBPUSH_REGISTER_URL is not set");
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
  const subscriptionId = await registerPushWithProxy(
    {
      endpoint,
      keys: json.keys,
    },
    registerUrl,
    options.fetchFn,
  );

  const state: StoredWebPushState = {
    subscriptionId,
    endpoint,
    enabledAt: new Date().toISOString(),
  };
  writeStoredWebPushState(state);
  return state;
}

/** プロキシ DELETE + PushSubscription.unsubscribe。両方成功後に localStorage を消す。 */
export async function disableWebPushNotifications(options: {
  env?: PublicWebPushEnv;
  fetchFn?: typeof fetch;
}): Promise<void> {
  const registerUrl = resolveWebPushRegisterUrl(options.env);
  if (!registerUrl) {
    throw new Error("NEXT_PUBLIC_WEBPUSH_REGISTER_URL is not set");
  }
  const stored = readStoredWebPushState();
  if (!stored) return;

  await unregisterPushWithProxy(
    stored.subscriptionId,
    registerUrl,
    options.fetchFn,
  );

  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
  }

  clearStoredWebPushState();
}
