import {
  BANNER_VARIANT_COLORS,
  ALERT_LEVEL_COLORS,
  type BannerVariant,
  type AlertLevel,
} from "@/config/alert-colors";
import type {
  AlertLevelData,
  EmergencyBannerData,
  NewsItem,
  NewsListData,
} from "@/types/top-page";

const BANNER_VARIANTS = Object.keys(BANNER_VARIANT_COLORS) as BannerVariant[];
const ALERT_LEVELS = Object.keys(ALERT_LEVEL_COLORS).map(
  Number,
) as AlertLevel[];

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
  if (typeof record.heading !== "string" || !record.heading.trim()) {
    throw new Error("Emergency banner heading is required");
  }
  if (typeof record.description !== "string") {
    throw new Error("Emergency banner description is required");
  }
  if (typeof record.updatedAt !== "string") {
    throw new Error("Emergency banner updatedAt is required");
  }
  let link: EmergencyBannerData["link"] = null;
  if (record.link != null) {
    if (typeof record.link !== "object") {
      throw new Error("Emergency banner link must be an object or null");
    }
    const linkRecord = record.link as Record<string, unknown>;
    if (
      typeof linkRecord.href !== "string" ||
      typeof linkRecord.label !== "string"
    ) {
      throw new Error("Emergency banner link requires href and label");
    }
    validateEmergencyBannerLinkHref(linkRecord.href);
    link = { href: linkRecord.href, label: linkRecord.label };
  }
  return {
    variant: record.variant,
    heading: record.heading,
    description: record.description,
    link,
    updatedAt: record.updatedAt,
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
  if (typeof record.label !== "string" || !record.label.trim()) {
    throw new Error("Alert level label is required");
  }
  if (typeof record.updatedAt !== "string") {
    throw new Error("Alert level updatedAt is required");
  }
  return {
    level: record.level,
    label: record.label,
    updatedAt: record.updatedAt,
  };
}

function parseNewsItem(item: unknown, index: number): NewsItem {
  if (!item || typeof item !== "object") {
    throw new Error(`News item ${index} must be an object`);
  }
  const record = item as Record<string, unknown>;
  for (const key of ["id", "title", "summary", "category", "updatedAt"]) {
    if (typeof record[key] !== "string" || !String(record[key]).trim()) {
      throw new Error(`News item ${index}: ${key} is required`);
    }
  }
  return {
    id: record.id as string,
    title: record.title as string,
    summary: record.summary as string,
    category: record.category as string,
    updatedAt: record.updatedAt as string,
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
