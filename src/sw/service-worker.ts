/**
 * Service Worker エントリ（イベント配線・Cache I/O）。
 * 正本の純粋関数は `@/lib/web-push-sw-logic`。`scripts/generate-sw.mjs` が logic を
 * インライン連結して `public/sw.js` を生成する（#42）。`public/sw.js` は手編集しない。
 *
 * fetch イベントは実装しない（オフラインキャッシュ禁止）。
 */

/// <reference lib="webworker" />

import {
  WEB_PUSH_RESET_UNREAD_MESSAGE,
  WEB_PUSH_UNREAD_COUNT_CACHE_PATH,
  bumpUnreadCountState,
  clearAppBadgeSafely as clearAppBadgeSafelyWithNav,
  createSerialQueue,
  extractEntityTypeFromPushPayload,
  normalizePushLang,
  parseUnreadCount,
  pushMessageFor,
  resetUnreadBadgeState,
  setAppBadgeSafely as setAppBadgeSafelyWithNav,
  type PushCopy,
  type WebPushSiteLanguage,
} from "@/lib/web-push-sw-logic";

declare const self: ServiceWorkerGlobalScope;

const META_CACHE = "bosai-webpush-meta";
const DEFAULT_LANG: WebPushSiteLanguage = "ja";
const UNREAD_COUNT_PATH = WEB_PUSH_UNREAD_COUNT_CACHE_PATH;
const RESET_UNREAD_MESSAGE = WEB_PUSH_RESET_UNREAD_MESSAGE;

function normalizeLang(lang: string | undefined): WebPushSiteLanguage {
  return normalizePushLang(lang);
}

function extractEntityType(payload: unknown): string | null {
  return extractEntityTypeFromPushPayload(payload);
}

function messageFor(
  entityType: string | null,
  lang: WebPushSiteLanguage,
): PushCopy {
  return pushMessageFor(entityType, lang);
}

/** SW 向け 1 引数ラッパ（正本は setAppBadgeSafelyWithNav）。 */
async function setAppBadgeSafely(count: number): Promise<void> {
  await setAppBadgeSafelyWithNav(self.navigator, count);
}

async function clearAppBadgeSafely(): Promise<void> {
  await clearAppBadgeSafelyWithNav(self.navigator);
}

async function readStoredLang(): Promise<WebPushSiteLanguage> {
  try {
    const cache = await caches.open(META_CACHE);
    const res = await cache.match("/lang");
    if (!res) return DEFAULT_LANG;
    return normalizeLang(await res.text());
  } catch {
    return DEFAULT_LANG;
  }
}

async function readUnreadCount(): Promise<number> {
  try {
    const cache = await caches.open(META_CACHE);
    const res = await cache.match(UNREAD_COUNT_PATH);
    if (!res) return 0;
    return parseUnreadCount(await res.text());
  } catch {
    return 0;
  }
}

async function writeUnreadCount(count: number): Promise<void> {
  try {
    const cache = await caches.open(META_CACHE);
    await cache.put(UNREAD_COUNT_PATH, new Response(String(count)));
  } catch {
    // Cache 失敗はバッジ更新・消去を阻害しない
  }
}

/** 並行 push / reset の未読 RMW を直列化する */
const runUnreadExclusive = createSerialQueue();

async function resetUnreadBadge(): Promise<void> {
  await runUnreadExclusive(async () => {
    // write が throw しても clear に到達する（writeUnreadCount 内でも握りつぶすが二重化）
    await resetUnreadBadgeState({
      writeUnreadCount,
      clearBadge: clearAppBadgeSafely,
    });
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;
  const message = data as { type?: unknown; lang?: unknown };
  if (message.type === "SET_LANG" && typeof message.lang === "string") {
    const lang = message.lang;
    event.waitUntil(
      (async () => {
        const cache = await caches.open(META_CACHE);
        await cache.put("/lang", new Response(normalizeLang(lang)));
      })(),
    );
    return;
  }
  if (message.type === RESET_UNREAD_MESSAGE) {
    event.waitUntil(resetUnreadBadge());
  }
});

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let payload: unknown = null;
      try {
        payload = event.data ? event.data.json() : null;
      } catch {
        payload = null;
      }
      const entityType = extractEntityType(payload);
      const lang = await readStoredLang();
      const msg = messageFor(entityType, lang);
      await self.registration.showNotification(msg.title, {
        body: msg.body,
        data: { url: "./" },
      });
      await runUnreadExclusive(async () => {
        await bumpUnreadCountState({
          readUnreadCount,
          writeUnreadCount,
          setBadge: setAppBadgeSafely,
        });
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target =
    (event.notification.data && event.notification.data.url) || "./";
  event.waitUntil(
    (async () => {
      await resetUnreadBadge();
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of all) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(target);
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(target);
      }
    })(),
  );
});
