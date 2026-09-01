import {
  ALERT_LEVEL_COLORS,
  BANNER_VARIANTS,
  type AlertLevel,
  type BannerVariant,
} from "@/config/alert-colors";
import { isSiteLanguage, type SiteLanguage } from "@/config/site-language";
import type {
  BosaiAlertLevel,
  BosaiEmergencyBanner,
  BosaiNotice,
  BosaiNoticeList,
} from "@/types/top-page";

const ALERT_LEVELS = Object.keys(ALERT_LEVEL_COLORS).map(
  Number,
) as AlertLevel[];

export function isValidDateTime(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

/**
 * NGSI-LD Property / keyValues のどちらでも値を取り出す。
 * `{ "type": "Property", "value": X }` または素の値。
 */
export function readNgsiLdValue(raw: unknown): unknown {
  if (
    raw &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    "value" in raw &&
    (raw as { type?: unknown }).type === "Property"
  ) {
    return (raw as { value: unknown }).value;
  }
  return raw;
}

function readStringField(
  record: Record<string, unknown>,
  key: string,
  context: string,
): string {
  const value = readNgsiLdValue(record[key]);
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${context}: ${key} is required`);
  }
  return value;
}

function readOptionalStringField(
  record: Record<string, unknown>,
  key: string,
  context: string,
): string | null {
  if (!(key in record) || record[key] == null) {
    return null;
  }
  const value = readNgsiLdValue(record[key]);
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new Error(`${context}: ${key} must be a string or null`);
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseUpdatedAt(value: unknown, context: string): string {
  const raw = readNgsiLdValue(value);
  if (typeof raw !== "string") {
    throw new Error(`${context} updatedAt is required`);
  }
  if (!isValidDateTime(raw)) {
    throw new Error(`${context} updatedAt must be a valid ISO date-time`);
  }
  return raw;
}

function parseCommonProps(
  record: Record<string, unknown>,
  context: string,
): { language: SiteLanguage; translationGroup: string; updatedAt: string } {
  const languageRaw = readNgsiLdValue(record.language);
  if (!isSiteLanguage(languageRaw)) {
    throw new Error(`${context}: invalid language ${String(languageRaw)}`);
  }
  return {
    language: languageRaw,
    translationGroup: readStringField(record, "translationGroup", context),
    updatedAt: parseUpdatedAt(record.updatedAt, context),
  };
}

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

/** 緊急バナー・Markdown 内リンクで許可する href。 */
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

export function isSafeHref(href: string): boolean {
  try {
    validateEmergencyBannerLinkHref(href);
    return true;
  } catch {
    return false;
  }
}

export function parseEmergencyBanner(data: unknown): BosaiEmergencyBanner {
  if (!data || typeof data !== "object") {
    throw new Error("Emergency banner payload must be an object");
  }
  const record = data as Record<string, unknown>;
  const common = parseCommonProps(record, "Emergency banner");
  const id = readStringField(record, "id", "Emergency banner");
  const type = readNgsiLdValue(record.type);
  if (type !== "bosai-EmergencyBanner") {
    throw new Error(`Emergency banner type must be bosai-EmergencyBanner`);
  }
  const variantRaw = readNgsiLdValue(record.variant);
  if (!isBannerVariant(variantRaw)) {
    throw new Error(`Invalid banner variant: ${String(variantRaw)}`);
  }
  const heading = readStringField(record, "heading", "Emergency banner");
  const body = readStringField(record, "body", "Emergency banner");
  const linkHref = readOptionalStringField(
    record,
    "linkHref",
    "Emergency banner",
  );
  const linkText = readOptionalStringField(
    record,
    "linkText",
    "Emergency banner",
  );
  if (linkHref) {
    validateEmergencyBannerLinkHref(linkHref);
  }
  if ((linkHref && !linkText) || (!linkHref && linkText)) {
    throw new Error(
      "Emergency banner linkHref and linkText must both be set or both null",
    );
  }
  return {
    id,
    type: "bosai-EmergencyBanner",
    ...common,
    variant: variantRaw,
    heading,
    body,
    linkHref,
    linkText,
  };
}

export function parseAlertLevel(data: unknown): BosaiAlertLevel {
  if (!data || typeof data !== "object") {
    throw new Error("Alert level payload must be an object");
  }
  const record = data as Record<string, unknown>;
  const common = parseCommonProps(record, "Alert level");
  const id = readStringField(record, "id", "Alert level");
  const type = readNgsiLdValue(record.type);
  if (type !== "bosai-AlertLevel") {
    throw new Error(`Alert level type must be bosai-AlertLevel`);
  }
  const levelRaw = readNgsiLdValue(record.level);
  if (!isAlertLevel(levelRaw)) {
    throw new Error(`Invalid alert level: ${String(levelRaw)}`);
  }
  return {
    id,
    type: "bosai-AlertLevel",
    ...common,
    level: levelRaw,
    label: readStringField(record, "label", "Alert level"),
    body: readStringField(record, "body", "Alert level"),
  };
}

function parseNoticeItem(item: unknown, index: number): BosaiNotice {
  if (!item || typeof item !== "object") {
    throw new Error(`Notice ${index} must be an object`);
  }
  const record = item as Record<string, unknown>;
  const context = `Notice ${index}`;
  const common = parseCommonProps(record, context);
  const id = readStringField(record, "id", context);
  const type = readNgsiLdValue(record.type);
  if (type !== "bosai-Notice") {
    throw new Error(`${context}: type must be bosai-Notice`);
  }
  const publishedAtRaw = readNgsiLdValue(record.publishedAt);
  if (typeof publishedAtRaw !== "string" || !isValidDateTime(publishedAtRaw)) {
    throw new Error(`${context}: publishedAt must be a valid ISO date-time`);
  }
  return {
    id,
    type: "bosai-Notice",
    ...common,
    title: readStringField(record, "title", context),
    body: readStringField(record, "body", context),
    publishedAt: publishedAtRaw,
  };
}

export function parseNoticeList(data: unknown): BosaiNoticeList {
  if (Array.isArray(data)) {
    return {
      items: data.map((item, index) => parseNoticeItem(item, index)),
    };
  }
  if (!data || typeof data !== "object") {
    throw new Error("Notice list payload must be an object or array");
  }
  const record = data as Record<string, unknown>;
  if (!Array.isArray(record.items)) {
    throw new Error("Notice list items must be an array");
  }
  return {
    items: record.items.map((item, index) => parseNoticeItem(item, index)),
  };
}

/** @deprecated use parseNoticeList */
export const parseNewsList = parseNoticeList;
