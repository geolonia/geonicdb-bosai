/**
 * Push 受信専用 Service Worker（#35 / #41 / #45）。
 * fetch イベントは実装しない（オフラインキャッシュ禁止）。
 *
 * 通知文言は Cache `bosai-webpush-meta` の `/lang` から言語を読み、埋め込み辞書で表示する。
 * バッジは Badging API（setAppBadge(count) / clearAppBadge）。件数は `/unread-count` に保持。
 * 文言・バッジの正本は `src/lib/web-push-sw-logic.ts`（変更時は両方更新）。
 */

const META_CACHE = "bosai-webpush-meta";
const DEFAULT_LANG = "ja";
const UNREAD_COUNT_PATH = "/unread-count";
const RESET_UNREAD_MESSAGE = "RESET_UNREAD_COUNT";

const MESSAGES = {
  ja: {
    "bosai-EmergencyBanner": {
      title: "緊急情報",
      body: "緊急バナーが更新されました。サイトで確認してください。",
    },
    "bosai-AlertLevel": {
      title: "警戒レベル",
      body: "警戒レベルが更新されました。サイトで確認してください。",
    },
    "bosai-Notice": {
      title: "お知らせ",
      body: "新しいお知らせがあります。サイトで確認してください。",
    },
    default: {
      title: "防災情報",
      body: "防災情報が更新されました。サイトで確認してください。",
    },
  },
  en: {
    "bosai-EmergencyBanner": {
      title: "Emergency alert",
      body: "The emergency banner was updated. Open the site for details.",
    },
    "bosai-AlertLevel": {
      title: "Alert level",
      body: "The alert level was updated. Open the site for details.",
    },
    "bosai-Notice": {
      title: "Notice",
      body: "There is a new notice. Open the site for details.",
    },
    default: {
      title: "Disaster information",
      body: "Disaster information was updated. Open the site for details.",
    },
  },
  "zh-CN": {
    "bosai-EmergencyBanner": {
      title: "紧急信息",
      body: "紧急横幅已更新。请打开网站查看。",
    },
    "bosai-AlertLevel": {
      title: "警戒级别",
      body: "警戒级别已更新。请打开网站查看。",
    },
    "bosai-Notice": {
      title: "通知",
      body: "有新通知。请打开网站查看。",
    },
    default: {
      title: "防灾信息",
      body: "防灾信息已更新。请打开网站查看。",
    },
  },
  vi: {
    "bosai-EmergencyBanner": {
      title: "Thông tin khẩn cấp",
      body: "Biểu ngữ khẩn cấp đã cập nhật. Hãy mở trang để xem.",
    },
    "bosai-AlertLevel": {
      title: "Mức cảnh báo",
      body: "Mức cảnh báo đã cập nhật. Hãy mở trang để xem.",
    },
    "bosai-Notice": {
      title: "Thông báo",
      body: "Có thông báo mới. Hãy mở trang để xem.",
    },
    default: {
      title: "Thông tin phòng chống thiên tai",
      body: "Thông tin đã cập nhật. Hãy mở trang để xem.",
    },
  },
  ko: {
    "bosai-EmergencyBanner": {
      title: "긴급 정보",
      body: "긴급 배너가 업데이트되었습니다. 사이트에서 확인하세요.",
    },
    "bosai-AlertLevel": {
      title: "경계 수준",
      body: "경계 수준이 업데이트되었습니다. 사이트에서 확인하세요.",
    },
    "bosai-Notice": {
      title: "알림",
      body: "새 알림이 있습니다. 사이트에서 확인하세요.",
    },
    default: {
      title: "방재 정보",
      body: "방재 정보가 업데이트되었습니다. 사이트에서 확인하세요.",
    },
  },
};

function normalizeLang(lang) {
  if (!lang) return DEFAULT_LANG;
  if (Object.prototype.hasOwnProperty.call(MESSAGES, lang)) return lang;
  if (lang.startsWith("zh")) return "zh-CN";
  if (lang.startsWith("en")) return "en";
  if (lang.startsWith("vi")) return "vi";
  if (lang.startsWith("ko")) return "ko";
  if (lang.startsWith("ja")) return "ja";
  return DEFAULT_LANG;
}

function extractEntityType(payload) {
  if (!payload || typeof payload !== "object") return null;
  const data = payload.data;
  if (Array.isArray(data) && data[0] && typeof data[0] === "object") {
    const type = data[0].type;
    if (typeof type === "string" && type.length > 0) return type;
  }
  return null;
}

function messageFor(entityType, lang) {
  const pack = MESSAGES[lang] || MESSAGES[DEFAULT_LANG];
  return pack[entityType] || pack.default;
}

function parseUnreadCount(raw) {
  if (raw == null || raw === "") return 0;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function incrementUnreadCount(current) {
  const base =
    Number.isFinite(current) && current > 0 ? Math.floor(current) : 0;
  return base + 1;
}

async function setAppBadgeSafely(count) {
  const nav = self.navigator;
  if (!nav || typeof nav.setAppBadge !== "function") return;
  const n = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  try {
    // iOS WebKit は数値引数が必要（引数なしは描画されない — #45）
    if (n < 1) {
      if (typeof nav.clearAppBadge === "function") {
        await nav.clearAppBadge();
      } else {
        await nav.setAppBadge(0);
      }
      return;
    }
    await nav.setAppBadge(n);
  } catch {
    // Badging API 失敗は通知配信を阻害しない
  }
}

async function clearAppBadgeSafely() {
  const nav = self.navigator;
  if (!nav || typeof nav.clearAppBadge !== "function") return;
  try {
    await nav.clearAppBadge();
  } catch {
    // クリア失敗は無視
  }
}

async function readStoredLang() {
  try {
    const cache = await caches.open(META_CACHE);
    const res = await cache.match("/lang");
    if (!res) return DEFAULT_LANG;
    return normalizeLang(await res.text());
  } catch {
    return DEFAULT_LANG;
  }
}

async function readUnreadCount() {
  try {
    const cache = await caches.open(META_CACHE);
    const res = await cache.match(UNREAD_COUNT_PATH);
    if (!res) return 0;
    return parseUnreadCount(await res.text());
  } catch {
    return 0;
  }
}

async function writeUnreadCount(count) {
  const cache = await caches.open(META_CACHE);
  await cache.put(UNREAD_COUNT_PATH, new Response(String(count)));
}

async function resetUnreadBadge() {
  await writeUnreadCount(0);
  await clearAppBadgeSafely();
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
  if (data.type === "SET_LANG" && typeof data.lang === "string") {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(META_CACHE);
        await cache.put("/lang", new Response(normalizeLang(data.lang)));
      })(),
    );
    return;
  }
  if (data.type === RESET_UNREAD_MESSAGE) {
    event.waitUntil(resetUnreadBadge());
  }
});

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let payload = null;
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
      const count = incrementUnreadCount(await readUnreadCount());
      await writeUnreadCount(count);
      await setAppBadgeSafely(count);
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
