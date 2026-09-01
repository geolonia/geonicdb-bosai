import {
  BANNER_VARIANT_COLORS,
  ALERT_LEVEL_COLORS,
  type BannerVariant,
  type AlertLevel,
} from "@/config/alert-colors";
import type { LocalizedString } from "@/lib/localized-string";
import type {
  AlertLevelData,
  EmergencyBannerData,
  NewsItem,
  NewsListData,
  SiteLanguage,
} from "@/types/top-page";

const BANNER_VARIANTS = Object.keys(BANNER_VARIANT_COLORS) as BannerVariant[];
const ALERT_LEVELS = Object.keys(ALERT_LEVEL_COLORS).map(
  Number,
) as AlertLevel[];
const SITE_LANGUAGES: SiteLanguage[] = ["ja", "ja-easy", "en"];

function isBannerVariant(value: unknown): value is BannerVariant {
  return (
    typeof value === "string" &&
    BANNER_VARIANTS.includes(value as BannerVariant)
  );
}

function isAlertLevel(value: unknown): value is AlertLevel {
  return (
    typeof value === "number" && ALERT_LEVELS.includes(value as AlertLevel)
  );
}

export function isValidDateTime(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function parseUpdatedAt(value: unknown, context: string): string {
  if (typeof value !== "string") {
    throw new Error(`${context} updatedAt is required`);
  }
  if (!isValidDateTime(value)) {
    throw new Error(`${context} updatedAt must be a valid ISO date-time`);
  }
  return value;
}

function parseLocalizedString(value: unknown, field: string): LocalizedString {
  if (typeof value === "string") {
    if (!value.trim()) {
      throw new Error(`${field} is required`);
    }
    return value;
  }
  if (!value || typeof value !== "object") {
    throw new Error(`${field} must be a string or localized object`);
  }
  const record = value as Record<string, unknown>;
  const ja = record.ja;
  if (typeof ja !== "string" || !ja.trim()) {
    throw new Error(`${field} requires a non-empty ja translation`);
  }
  const localized: Partial<Record<SiteLanguage, string>> = { ja };
  for (const lang of SITE_LANGUAGES) {
    if (lang === "ja") continue;
    const translation = record[lang];
    if (translation == null) continue;
    if (typeof translation !== "string" || !translation.trim()) {
      throw new Error(`${field}.${lang} must be a non-empty string`);
    }
    localized[lang] = translation;
  }
  return localized;
}

/** 緊急バナーリンク先として許可する href（http/https または先頭 / の相対パス）。 */
export function validateEmergencyBannerLinkHref(href: string): void {
  const trimmed = href.trim();
  if (!trimmed) {
    throw new Error("Emergency banner link href must not be empty");
  }
  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//")) {
      throw new Error(
        `Emergency banner link href must not be protocol-relative: ${href}`,
      );
    }
    return;
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Emergency banner link href is not a valid URL: ${href}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `Emergency banner link href must use http, https, or a relative path: ${href}`,
    );
  }
}

export function parseEmergencyBanner(data: unknown): EmergencyBannerData {
  if (!data || typeof data !== "object") {
    throw new Error("Emergency banner payload must be an object");
  }
  const record = data as Record<string, unknown>;
  if (!isBannerVariant(record.variant)) {
    throw new Error(`Invalid banner variant: ${String(record.variant)}`);
  }
  const heading = parseLocalizedString(
    record.heading,
    "Emergency banner heading",
  );
  const description = parseLocalizedString(
    record.description,
    "Emergency banner description",
  );
  const updatedAt = parseUpdatedAt(record.updatedAt, "Emergency banner");
  let link: EmergencyBannerData["link"] = null;
  if (record.link != null) {
    if (typeof record.link !== "object") {
      throw new Error("Emergency banner link must be an object or null");
    }
    const linkRecord = record.link as Record<string, unknown>;
    if (typeof linkRecord.href !== "string") {
      throw new Error("Emergency banner link requires href");
    }
    const label = parseLocalizedString(
      linkRecord.label,
      "Emergency banner link label",
    );
    validateEmergencyBannerLinkHref(linkRecord.href);
    link = { href: linkRecord.href, label };
  }
  return {
    variant: record.variant,
    heading,
    description,
    link,
    updatedAt,
  };
}

export function parseAlertLevel(data: unknown): AlertLevelData {
  if (!data || typeof data !== "object") {
    throw new Error("Alert level payload must be an object");
  }
  const record = data as Record<string, unknown>;
  if (!isAlertLevel(record.level)) {
    throw new Error(`Invalid alert level: ${String(record.level)}`);
  }
  const label = parseLocalizedString(record.label, "Alert level label");
  const updatedAt = parseUpdatedAt(record.updatedAt, "Alert level");
  return {
    level: record.level,
    label,
    updatedAt,
  };
}

function parseNewsItem(item: unknown, index: number): NewsItem {
  if (!item || typeof item !== "object") {
    throw new Error(`News item ${index} must be an object`);
  }
  const record = item as Record<string, unknown>;
  if (typeof record.id !== "string" || !record.id.trim()) {
    throw new Error(`News item ${index}: id is required`);
  }
  const title = parseLocalizedString(record.title, `News item ${index} title`);
  const summary = parseLocalizedString(
    record.summary,
    `News item ${index} summary`,
  );
  const category = parseLocalizedString(
    record.category,
    `News item ${index} category`,
  );
  const updatedAt = parseUpdatedAt(
    record.updatedAt,
    `News item ${index}`,
  );
  return {
    id: record.id,
    title,
    summary,
    category,
    updatedAt,
  };
}

export function parseNewsList(data: unknown): NewsListData {
  if (!data || typeof data !== "object") {
    throw new Error("News list payload must be an object");
  }
  const record = data as Record<string, unknown>;
  if (!Array.isArray(record.items)) {
    throw new Error("News list items must be an array");
  }
  return {
    items: record.items.map((item, index) => parseNewsItem(item, index)),
  };
}
