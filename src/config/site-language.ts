/** 対応言語コード（優先順位順。docs/i18n.md 参照）。 */
export const SITE_LANGUAGES = ["ja", "en", "zh-CN", "vi", "ko"] as const;

export type SiteLanguage = (typeof SITE_LANGUAGES)[number];

/** 言語切替UI用の表示名（各言語の自称。現在のUI言語に依存しない）。 */
export const SITE_LANGUAGE_LABELS: Record<SiteLanguage, string> = {
  ja: "日本語",
  en: "English",
  "zh-CN": "简体中文",
  vi: "Tiếng Việt",
  ko: "한국어",
};

/**
 * 言語切替UIのアイコン（国旗絵文字）。
 *
 * 言語と国は本来1:1ではない（英語は多数の国で話される）ため、国旗は
 * **視認性のための装飾**として扱い、必ず `SITE_LANGUAGE_LABELS` の
 * 言語名を併記する。スクリーンリーダーには `aria-hidden` で読ませない。
 */
export const SITE_LANGUAGE_FLAGS: Record<SiteLanguage, string> = {
  ja: "🇯🇵",
  en: "🇬🇧",
  "zh-CN": "🇨🇳",
  vi: "🇻🇳",
  ko: "🇰🇷",
};

const HTML_LANG: Record<SiteLanguage, string> = {
  ja: "ja",
  en: "en",
  "zh-CN": "zh-CN",
  vi: "vi",
  ko: "ko",
};

export function toHtmlLang(lang: SiteLanguage): string {
  return HTML_LANG[lang];
}

export function isSiteLanguage(value: unknown): value is SiteLanguage {
  return (
    typeof value === "string" &&
    (SITE_LANGUAGES as readonly string[]).includes(value)
  );
}

const DATE_LOCALE: Record<SiteLanguage, string> = {
  ja: "ja-JP",
  en: "en-US",
  "zh-CN": "zh-CN",
  vi: "vi-VN",
  ko: "ko-KR",
};

export function toDateLocale(lang: SiteLanguage): string {
  return DATE_LOCALE[lang];
}

export const LANG_STORAGE_KEY = "geonicdb-bosai-lang";
