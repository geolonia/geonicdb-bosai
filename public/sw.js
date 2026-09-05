/**
 * Push 受信専用 Service Worker（#35 / #41 / #45 / #42）。
 * fetch イベントは実装しない（オフラインキャッシュ禁止）。
 *
 * このファイルは生成物です。編集せず `npm run generate:sw` で再生成してください。
 * 正本: src/lib/web-push-sw-logic.ts + src/sw/service-worker.ts
 */

"use strict";
/** `SITE_LANGUAGES` と同値。SW バンドル依存ゼロ化のためのローカル定義（#42）。 */
const WEB_PUSH_SITE_LANGUAGES = [
    "ja",
    "en",
    "zh-CN",
    "vi",
    "ko",
];
const WEB_PUSH_MESSAGES = {
    ja: {
        "bosai-AlertLevel": {
            title: "警戒レベル",
            body: "警戒レベルが更新されました。サイトで確認してください。",
        },
        default: {
            title: "防災情報",
            body: "防災情報が更新されました。サイトで確認してください。",
        },
    },
    en: {
        "bosai-AlertLevel": {
            title: "Alert level",
            body: "The alert level was updated. Open the site for details.",
        },
        default: {
            title: "Disaster information",
            body: "Disaster information was updated. Open the site for details.",
        },
    },
    "zh-CN": {
        "bosai-AlertLevel": {
            title: "警戒级别",
            body: "警戒级别已更新。请打开网站查看。",
        },
        default: {
            title: "防灾信息",
            body: "防灾信息已更新。请打开网站查看。",
        },
    },
    vi: {
        "bosai-AlertLevel": {
            title: "Mức cảnh báo",
            body: "Mức cảnh báo đã cập nhật. Hãy mở trang để xem.",
        },
        default: {
            title: "Thông tin phòng chống thiên tai",
            body: "Thông tin đã cập nhật. Hãy mở trang để xem.",
        },
    },
    ko: {
        "bosai-AlertLevel": {
            title: "경계 수준",
            body: "경계 수준이 업데이트되었습니다. 사이트에서 확인하세요.",
        },
        default: {
            title: "방재 정보",
            body: "방재 정보가 업데이트되었습니다. 사이트에서 확인하세요.",
        },
    },
};
function normalizePushLang(lang) {
    if (!lang)
        return "ja";
    if (WEB_PUSH_SITE_LANGUAGES.includes(lang)) {
        return lang;
    }
    if (lang.startsWith("zh"))
        return "zh-CN";
    if (lang.startsWith("en"))
        return "en";
    if (lang.startsWith("vi"))
        return "vi";
    if (lang.startsWith("ko"))
        return "ko";
    if (lang.startsWith("ja"))
        return "ja";
    return "ja";
}
/** NGSI-LD / NGSIv2 通知 JSON からエンティティ type を取り出す */
function extractEntityTypeFromPushPayload(payload) {
    if (!payload || typeof payload !== "object")
        return null;
    const root = payload;
    const data = root.data;
    if (Array.isArray(data) && data[0] && typeof data[0] === "object") {
        const type = data[0].type;
        if (typeof type === "string" && type.length > 0)
            return type;
    }
    return null;
}
function pushMessageFor(entityType, lang) {
    const pack = WEB_PUSH_MESSAGES[lang];
    if (entityType && pack[entityType])
        return pack[entityType];
    return pack.default;
}
/** Cache `bosai-webpush-meta` 内の未読件数キー。 */
const WEB_PUSH_UNREAD_COUNT_CACHE_PATH = "/unread-count";
/** ページ → SW の未読リセット message.type。 */
const WEB_PUSH_RESET_UNREAD_MESSAGE = "RESET_UNREAD_COUNT";
/**
 * Cache / Response 本文から未読件数を読む。
 * 非整数・負数・空は 0（壊れた値でバッジを誤表示しない）。
 */
function parseUnreadCount(raw) {
    if (raw == null || raw === "")
        return 0;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0)
        return 0;
    return n;
}
/** push 1 件受信時の加算。不正な current は 0 扱い。 */
function incrementUnreadCount(current) {
    const base = Number.isFinite(current) && current > 0 ? Math.floor(current) : 0;
    return base + 1;
}
/** 通知タップ / フォアグラウンド復帰時のリセット値。 */
function resetUnreadCount() {
    return 0;
}
/**
 * 通知受信時にアプリアイコンへ数値バッジを立てる。
 * iOS WebKit は数値引数が必要（引数なしのフラグ形式は描画されない — #45）。
 * 未対応環境・失敗時は握りつぶし（通知自体は落とさない）。
 */
async function setAppBadgeSafelyWithNav(nav, count) {
    if (!nav || typeof nav.setAppBadge !== "function")
        return;
    const n = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
    try {
        // 0 は clear と同等。正の整数のみ数値バッジとして渡す。
        if (n < 1) {
            if (typeof nav.clearAppBadge === "function") {
                await nav.clearAppBadge();
            }
            else {
                await nav.setAppBadge(0);
            }
            return;
        }
        await nav.setAppBadge(n);
    }
    catch (_a) {
        // Badging API 失敗は通知配信を阻害しない
    }
}
/** 通知クリック / フォアグラウンド復帰時にバッジを消す。 */
async function clearAppBadgeSafelyWithNav(nav) {
    if (!nav || typeof nav.clearAppBadge !== "function")
        return;
    try {
        await nav.clearAppBadge();
    }
    catch (_a) {
        // クリア失敗は無視
    }
}
/**
 * 未読件数を 0 に書き戻したうえでバッジを消す。
 * cache.put 等が失敗しても clearBadge には必ず到達する（#45 検収指摘）。
 */
async function resetUnreadBadgeState(deps) {
    try {
        await deps.writeUnreadCount(0);
    }
    catch (_a) {
        // Cache 書き込み失敗はバッジ消去を阻害しない
    }
    await deps.clearBadge();
}
/**
 * Promise 連鎖による直列キュー。
 * 並行 push の read-modify-write が件数を取りこぼさないようにする（#45 CodeRabbit）。
 */
function createSerialQueue() {
    let tail = Promise.resolve();
    return function runExclusive(task) {
        const result = tail.then(task, task);
        tail = result.then(() => undefined, () => undefined);
        return result;
    };
}
/**
 * 未読件数の読み取り→加算→書き込みを 1 トランザクションとして実行する。
 * `yieldBeforeWrite` は競合再現用（本番は渡さない）。
 */
async function bumpUnreadCountState(deps) {
    const count = incrementUnreadCount(await deps.readUnreadCount());
    if (deps.yieldBeforeWrite)
        await deps.yieldBeforeWrite();
    await deps.writeUnreadCount(count);
    await deps.setBadge(count);
    return count;
}
const META_CACHE = "bosai-webpush-meta";
const DEFAULT_LANG = "ja";
const UNREAD_COUNT_PATH = WEB_PUSH_UNREAD_COUNT_CACHE_PATH;
const RESET_UNREAD_MESSAGE = WEB_PUSH_RESET_UNREAD_MESSAGE;
function normalizeLang(lang) {
    return normalizePushLang(lang);
}
function extractEntityType(payload) {
    return extractEntityTypeFromPushPayload(payload);
}
function messageFor(entityType, lang) {
    return pushMessageFor(entityType, lang);
}
/** SW 向け 1 引数ラッパ（正本は setAppBadgeSafelyWithNav）。 */
async function setAppBadgeSafely(count) {
    await setAppBadgeSafelyWithNav(self.navigator, count);
}
async function clearAppBadgeSafely() {
    await clearAppBadgeSafelyWithNav(self.navigator);
}
async function readStoredLang() {
    try {
        const cache = await caches.open(META_CACHE);
        const res = await cache.match("/lang");
        if (!res)
            return DEFAULT_LANG;
        return normalizeLang(await res.text());
    }
    catch (_a) {
        return DEFAULT_LANG;
    }
}
async function readUnreadCount() {
    try {
        const cache = await caches.open(META_CACHE);
        const res = await cache.match(UNREAD_COUNT_PATH);
        if (!res)
            return 0;
        return parseUnreadCount(await res.text());
    }
    catch (_a) {
        return 0;
    }
}
async function writeUnreadCount(count) {
    try {
        const cache = await caches.open(META_CACHE);
        await cache.put(UNREAD_COUNT_PATH, new Response(String(count)));
    }
    catch (_a) {
        // Cache 失敗はバッジ更新・消去を阻害しない
    }
}
/** 並行 push / reset の未読 RMW を直列化する */
const runUnreadExclusive = createSerialQueue();
async function resetUnreadBadge() {
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
    if (!data || typeof data !== "object")
        return;
    const message = data;
    if (message.type === "SET_LANG" && typeof message.lang === "string") {
        const lang = message.lang;
        event.waitUntil((async () => {
            const cache = await caches.open(META_CACHE);
            await cache.put("/lang", new Response(normalizeLang(lang)));
        })());
        return;
    }
    if (message.type === RESET_UNREAD_MESSAGE) {
        event.waitUntil(resetUnreadBadge());
    }
});
self.addEventListener("push", (event) => {
    event.waitUntil((async () => {
        let payload = null;
        try {
            payload = event.data ? event.data.json() : null;
        }
        catch (_a) {
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
    })());
});
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const target = (event.notification.data && event.notification.data.url) || "./";
    event.waitUntil((async () => {
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
    })());
});
