/**
 * Service Worker の push 通知文言・バッジロジック（unit test / ページ側と共有可能な純粋関数）。
 * `public/sw.js` は静的配信のため同内容を埋め込んでいる — 変更時は両方更新。
 */

import type { SiteLanguage } from "@/config/site-language";
import { SITE_LANGUAGES } from "@/config/site-language";

export type PushCopy = { title: string; body: string };

export const WEB_PUSH_MESSAGES: Record<
  SiteLanguage,
  Record<string, PushCopy>
> = {
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

export function normalizePushLang(lang: string | undefined): SiteLanguage {
  if (!lang) return "ja";
  if ((SITE_LANGUAGES as readonly string[]).includes(lang)) {
    return lang as SiteLanguage;
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
  lang: SiteLanguage,
): PushCopy {
  const pack = WEB_PUSH_MESSAGES[lang];
  if (entityType && pack[entityType]) return pack[entityType];
  return pack.default;
}

/** Badging API の最小面（Service Worker / Window の navigator）。 */
export type AppBadgeNavigator = {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

/**
 * 通知受信時にアプリアイコンへバッジを立てる。
 * 未対応環境・失敗時は握りつぶし（通知自体は落とさない）。
 */
export async function setAppBadgeSafely(
  nav: AppBadgeNavigator | null | undefined,
): Promise<void> {
  if (!nav || typeof nav.setAppBadge !== "function") return;
  try {
    await nav.setAppBadge();
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
