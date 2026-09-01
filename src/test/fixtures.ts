import { BANNER_VARIANTS, type BannerVariant } from "@/config/alert-colors";
import { UI_STRINGS } from "@/config/ui-strings";
import type {
  BosaiAlertLevel,
  BosaiEmergencyBanner,
  BosaiNotice,
} from "@/types/top-page";

export const testStrings = UI_STRINGS.ja;

export function makeBanner(
  variant: BannerVariant,
  overrides: Partial<BosaiEmergencyBanner> = {},
): BosaiEmergencyBanner {
  return {
    id: `urn:ngsi-ld:bosai-EmergencyBanner:current-banner:ja`,
    type: "bosai-EmergencyBanner",
    language: "ja",
    translationGroup: "current-banner",
    variant,
    heading: `${variant} heading`,
    body: `${variant} body`,
    linkHref: null,
    linkText: null,
    updatedAt: "2026-09-01T09:00:00+09:00",
    ...overrides,
  };
}

export function makeAlertLevel(
  level: 1 | 2 | 3 | 4 | 5,
  overrides: Partial<BosaiAlertLevel> = {},
): BosaiAlertLevel {
  return {
    id: `urn:ngsi-ld:bosai-AlertLevel:current-alert-level:ja`,
    type: "bosai-AlertLevel",
    language: "ja",
    translationGroup: "current-alert-level",
    level,
    label: `警戒レベル${level}`,
    body: `level ${level} action`,
    updatedAt: "2026-09-01T09:00:00+09:00",
    ...overrides,
  };
}

export function makeNotice(overrides: Partial<BosaiNotice> = {}): BosaiNotice {
  return {
    id: "urn:ngsi-ld:bosai-Notice:test:ja",
    type: "bosai-Notice",
    language: "ja",
    translationGroup: "test",
    title: "テストお知らせ",
    body: "本文です。[詳細](/accessibility)",
    publishedAt: "2026-09-01T15:00:00+09:00",
    updatedAt: "2026-09-01T15:00:00+09:00",
    ...overrides,
  };
}

export const ALL_BANNER_VARIANTS = BANNER_VARIANTS;
