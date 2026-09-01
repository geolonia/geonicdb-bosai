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

/** 既定言語（ブラウザ言語が一つも一致しない場合のフォールバック）。 */
export const DEFAULT_SITE_LANGUAGE: SiteLanguage = "ja";

/**
 * BCP47 言語タグ 1 件を対応言語へ対応付ける。一致しなければ null。
 *
 * - 完全一致を優先（大文字小文字は無視。`zh-cn` → `zh-CN`）
 * - 次にプライマリサブタグで一致（`ja-JP` → `ja`、`en-US` → `en`）
 * - **中国語は簡体字のみ対応**。繁体字（`zh-Hant` / `zh-TW` / `zh-HK` / `zh-MO`）は
 *   簡体字とは別の書記体系のため、あえて一致させない（誤って読みにくい表記を
 *   出すより、他の候補言語や既定言語に委ねる）。
 */
export function matchSiteLanguage(tag: string): SiteLanguage | null {
  const normalized = tag.trim().toLowerCase();
  if (!normalized) return null;

  for (const code of SITE_LANGUAGES) {
    if (code.toLowerCase() === normalized) return code;
  }

  const primary = normalized.split("-")[0];
  if (primary === "zh") {
    if (/(^|-)(hant|tw|hk|mo)(-|$)/.test(normalized)) return null;
    return "zh-CN";
  }

  for (const code of SITE_LANGUAGES) {
    if (code.split("-")[0] === primary) return code;
  }
  return null;
}

/**
 * ブラウザの言語設定（`navigator.languages` 相当）から、対応言語を優先順に探す。
 * 一致が無ければ null（呼び出し側で `DEFAULT_SITE_LANGUAGE` にフォールバックする）。
 */
export function detectSiteLanguage(
  tags: readonly string[] | undefined,
): SiteLanguage | null {
  if (!tags) return null;
  for (const tag of tags) {
    const matched = matchSiteLanguage(tag);
    if (matched) return matched;
  }
  return null;
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
