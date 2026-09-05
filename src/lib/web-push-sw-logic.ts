/**
 * Service Worker の push 通知文言・バッジロジック（unit test / ページ側と共有可能な純粋関数）。
 * `public/sw.js` は `scripts/generate-sw.mjs` が本ファイル + `src/sw/service-worker-handlers.ts`
 * から生成する（#42）。手編集しない。言語配列は `SITE_LANGUAGES` と二重定義のため、
 * 一致テストでガードする。
 *
 * 新規購読の通知対象は `bosai-AlertLevel` のみ（#48）。
 * 旧サブスクリプションから他タイプが届いても壊れないよう `default` は維持する。
 *
 * 外部ランタイム依存なし（SW へ tsc transpile だけで載せるため）。
 */

/** `SITE_LANGUAGES` と同値。SW バンドル依存ゼロ化のためのローカル定義（#42）。 */
export const WEB_PUSH_SITE_LANGUAGES = ["ja", "en", "zh-CN", "vi", "ko"] as const;

export type WebPushSiteLanguage = (typeof WEB_PUSH_SITE_LANGUAGES)[number];

export type PushCopy = { title: string; body: string };

export const WEB_PUSH_MESSAGES: Record<
  WebPushSiteLanguage,
  Record<string, PushCopy>
> = {
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

export function normalizePushLang(
  lang: string | undefined,
): WebPushSiteLanguage {
  if (!lang) return "ja";
  if ((WEB_PUSH_SITE_LANGUAGES as readonly string[]).includes(lang)) {
    return lang as WebPushSiteLanguage;
  }
  if (lang.startsWith("zh")) return "zh-CN";
  if (lang.startsWith("en")) return "en";
  if (lang.startsWith("vi")) return "vi";
  if (lang.startsWith("ko")) return "ko";
  if (lang.startsWith("ja")) return "ja";
  return "ja";
}

/** NGSI-LD / NGSIv2 通知 JSON からエンティティ type を取り出す */
export function extractEntityTypeFromPushPayload(
  payload: unknown,
): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const data = root.data;
  if (Array.isArray(data) && data[0] && typeof data[0] === "object") {
    const type = (data[0] as Record<string, unknown>).type;
    if (typeof type === "string" && type.length > 0) return type;
  }
  return null;
}

export function pushMessageFor(
  entityType: string | null,
  lang: WebPushSiteLanguage,
): PushCopy {
  const pack = WEB_PUSH_MESSAGES[lang];
  if (entityType && pack[entityType]) return pack[entityType];
  return pack.default;
}

/** Cache `bosai-webpush-meta` 内の未読件数キー。 */
export const WEB_PUSH_UNREAD_COUNT_CACHE_PATH = "/unread-count";

/** ページ → SW の未読リセット message.type。 */
export const WEB_PUSH_RESET_UNREAD_MESSAGE = "RESET_UNREAD_COUNT";

/**
 * Cache / Response 本文から未読件数を読む。
 * 非整数・負数・空は 0（壊れた値でバッジを誤表示しない）。
 */
export function parseUnreadCount(raw: string | null | undefined): number {
  if (raw == null || raw === "") return 0;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** push 1 件受信時の加算。不正な current は 0 扱い。 */
export function incrementUnreadCount(current: number): number {
  const base =
    Number.isFinite(current) && current > 0 ? Math.floor(current) : 0;
  return base + 1;
}

/** 通知タップ / フォアグラウンド復帰時のリセット値。 */
export function resetUnreadCount(): number {
  return 0;
}

/** Badging API の最小面（Service Worker / Window の navigator）。 */
export type AppBadgeNavigator = {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

/**
 * 通知受信時にアプリアイコンへ数値バッジを立てる。
 * iOS WebKit は数値引数が必要（引数なしのフラグ形式は描画されない — #45）。
 * 未対応環境・失敗時は握りつぶし（通知自体は落とさない）。
 */
export async function setAppBadgeSafely(
  nav: AppBadgeNavigator | null | undefined,
  count: number,
): Promise<void> {
  if (!nav || typeof nav.setAppBadge !== "function") return;
  const n = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  try {
    // 0 は clear と同等。正の整数のみ数値バッジとして渡す。
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

/** 通知クリック / フォアグラウンド復帰時にバッジを消す。 */
export async function clearAppBadgeSafely(
  nav: AppBadgeNavigator | null | undefined,
): Promise<void> {
  if (!nav || typeof nav.clearAppBadge !== "function") return;
  try {
    await nav.clearAppBadge();
  } catch {
    // クリア失敗は無視
  }
}

/**
 * 未読件数を 0 に書き戻したうえでバッジを消す。
 * cache.put 等が失敗しても clearBadge には必ず到達する（#45 検収指摘）。
 */
export async function resetUnreadBadgeState(deps: {
  writeUnreadCount: (count: number) => Promise<void>;
  clearBadge: () => Promise<void>;
}): Promise<void> {
  try {
    await deps.writeUnreadCount(0);
  } catch {
    // Cache 書き込み失敗はバッジ消去を阻害しない
  }
  await deps.clearBadge();
}

/**
 * Promise 連鎖による直列キュー。
 * 並行 push の read-modify-write が件数を取りこぼさないようにする（#45 CodeRabbit）。
 */
export function createSerialQueue(): <T>(task: () => Promise<T>) => Promise<T> {
  let tail: Promise<unknown> = Promise.resolve();
  return function runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const result = tail.then(task, task);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}

/**
 * 未読件数の読み取り→加算→書き込みを 1 トランザクションとして実行する。
 * `yieldBeforeWrite` は競合再現用（本番は渡さない）。
 */
export async function bumpUnreadCountState(deps: {
  readUnreadCount: () => Promise<number>;
  writeUnreadCount: (count: number) => Promise<void>;
  setBadge: (count: number) => Promise<void>;
  yieldBeforeWrite?: () => Promise<void>;
}): Promise<number> {
  const count = incrementUnreadCount(await deps.readUnreadCount());
  if (deps.yieldBeforeWrite) await deps.yieldBeforeWrite();
  await deps.writeUnreadCount(count);
  await deps.setBadge(count);
  return count;
}
