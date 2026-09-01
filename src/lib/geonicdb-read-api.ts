/**
 * GeonicDB（NGSI-LD）への読み取り参照実装。
 *
 * 住民向け静的ページからは import しないこと（REQUIREMENTS.md 2.1 /
 * docs/data-model.md）。将来の短 TTL キャッシュ層がクエリ組み立ての手本にする。
 */
import type GeonicDB from "@geolonia/geonicdb-sdk";
import type { GetEntitiesParams } from "@geolonia/geonicdb-sdk";
import type { SiteLanguage } from "@/config/site-language";

export const BOSAI_ENTITY_TYPES = {
  notice: "bosai-Notice",
  emergencyBanner: "bosai-EmergencyBanner",
  alertLevel: "bosai-AlertLevel",
} as const;

export const BOSAI_TRANSLATION_GROUPS = {
  emergencyBanner: "current-banner",
  alertLevel: "current-alert-level",
} as const;

/** NGSI-LD `q` 用に言語コードをクォートする。 */
export function quoteNgsiLdString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function buildNoticesQuery(
  language: SiteLanguage,
  options: { limit?: number } = {},
): GetEntitiesParams {
  return {
    type: BOSAI_ENTITY_TYPES.notice,
    q: `language==${quoteNgsiLdString(language)}`,
    orderBy: "publishedAt",
    orderDirection: "desc",
    limit: options.limit ?? 20,
  };
}

export function buildEmergencyBannerQuery(
  language: SiteLanguage,
): GetEntitiesParams {
  return {
    type: BOSAI_ENTITY_TYPES.emergencyBanner,
    q: `translationGroup==${quoteNgsiLdString(BOSAI_TRANSLATION_GROUPS.emergencyBanner)};language==${quoteNgsiLdString(language)}`,
    limit: 1,
  };
}

export function buildAlertLevelQuery(
  language: SiteLanguage,
): GetEntitiesParams {
  return {
    type: BOSAI_ENTITY_TYPES.alertLevel,
    q: `translationGroup==${quoteNgsiLdString(BOSAI_TRANSLATION_GROUPS.alertLevel)};language==${quoteNgsiLdString(language)}`,
    limit: 1,
  };
}

export type GeonicdbReadClient = Pick<GeonicDB, "getEntities">;

export async function fetchNotices(
  client: GeonicdbReadClient,
  language: SiteLanguage,
  options?: { limit?: number },
): Promise<Record<string, unknown>[]> {
  return client.getEntities(buildNoticesQuery(language, options));
}

export async function fetchEmergencyBanner(
  client: GeonicdbReadClient,
  language: SiteLanguage,
): Promise<Record<string, unknown> | null> {
  const entities = await client.getEntities(
    buildEmergencyBannerQuery(language),
  );
  return entities[0] ?? null;
}

export async function fetchAlertLevel(
  client: GeonicdbReadClient,
  language: SiteLanguage,
): Promise<Record<string, unknown> | null> {
  const entities = await client.getEntities(buildAlertLevelQuery(language));
  return entities[0] ?? null;
}
