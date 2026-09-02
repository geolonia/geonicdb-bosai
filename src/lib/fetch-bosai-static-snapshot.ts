import { SITE_LANGUAGES, type SiteLanguage } from "@/config/site-language";
import {
  getGeonicdbPublicClient,
  languagePropertyQuery,
} from "@/lib/geonicdb-public-client";
import {
  parseAlertLevel,
  parseEmergencyBanner,
  parseNoticeList,
} from "@/lib/validate-top-page-data";
import type {
  BosaiLangSnapshot,
  BosaiResourceResult,
  BosaiStaticSnapshot,
} from "@/types/bosai-static-snapshot";
import type {
  BosaiAlertLevel,
  BosaiEmergencyBanner,
  BosaiNotice,
} from "@/types/top-page";

/** getEntities だけを使う薄いクライアント面（SDK / テストモック共用）。 */
export type BosaiEntitiesClient = {
  getEntities: (params: {
    type: string;
    q?: string;
    limit?: number;
  }) => Promise<unknown[]>;
};

function failResult(fetchedAt: string | null): BosaiResourceResult<never> {
  return { ok: false, data: null, fetchedAt };
}

function okResult<T>(data: T, fetchedAt: string): BosaiResourceResult<T> {
  return { ok: true, data, fetchedAt };
}

function parseFirst<T>(
  entities: unknown[],
  parser: (value: unknown) => T,
): T | null {
  const first = entities[0];
  if (!first) return null;
  try {
    return parser(first);
  } catch {
    return null;
  }
}

async function fetchBanner(
  client: BosaiEntitiesClient,
  lang: SiteLanguage,
  fetchedAt: string,
): Promise<BosaiResourceResult<BosaiEmergencyBanner>> {
  try {
    const entities = await client.getEntities({
      type: "bosai-EmergencyBanner",
      q: languagePropertyQuery(lang),
      limit: 1,
    });
    const data = parseFirst(entities, parseEmergencyBanner);
    if (!data) return failResult(fetchedAt);
    return okResult(data, fetchedAt);
  } catch {
    return failResult(fetchedAt);
  }
}

async function fetchAlertLevel(
  client: BosaiEntitiesClient,
  lang: SiteLanguage,
  fetchedAt: string,
): Promise<BosaiResourceResult<BosaiAlertLevel>> {
  try {
    const entities = await client.getEntities({
      type: "bosai-AlertLevel",
      q: languagePropertyQuery(lang),
      limit: 1,
    });
    const data = parseFirst(entities, parseAlertLevel);
    if (!data) return failResult(fetchedAt);
    return okResult(data, fetchedAt);
  } catch {
    return failResult(fetchedAt);
  }
}

async function fetchNotices(
  client: BosaiEntitiesClient,
  lang: SiteLanguage,
  fetchedAt: string,
): Promise<BosaiResourceResult<BosaiNotice[]>> {
  try {
    const entities = await client.getEntities({
      type: "bosai-Notice",
      q: languagePropertyQuery(lang),
      limit: 50,
    });
    const data = parseNoticeList(entities).items;
    return okResult(data, fetchedAt);
  } catch {
    return failResult(fetchedAt);
  }
}

async function fetchLangSnapshot(
  client: BosaiEntitiesClient,
  lang: SiteLanguage,
  fetchedAt: string,
): Promise<BosaiLangSnapshot> {
  const [banner, alertLevel, notices] = await Promise.all([
    fetchBanner(client, lang, fetchedAt),
    fetchAlertLevel(client, lang, fetchedAt),
    fetchNotices(client, lang, fetchedAt),
  ]);
  return { banner, alertLevel, notices };
}

function emptyLangSnapshot(fetchedAt: string | null): BosaiLangSnapshot {
  return {
    banner: failResult(fetchedAt),
    alertLevel: failResult(fetchedAt),
    notices: failResult(fetchedAt),
  };
}

function resolveClient(
  injected?: BosaiEntitiesClient,
): BosaiEntitiesClient | null {
  if (injected) return injected;
  try {
    return getGeonicdbPublicClient();
  } catch {
    return null;
  }
}

/**
 * ビルド時に GeonicDB から主要エンティティを取得し、静的 HTML へ埋め込む用の
 * スナップショットを返す。URL 未設定や取得失敗でもビルドは落とさず、
 * リソース単位で ok:false を返す（N-10 / F-45）。
 *
 * 避難所など後続ページでも同じ入口を拡張して再利用する
 * （手順は docs/availability-ops.md セクション 5）。
 */
export async function fetchBosaiStaticSnapshot(options?: {
  client?: BosaiEntitiesClient;
  now?: () => Date;
}): Promise<BosaiStaticSnapshot> {
  const builtAt = (options?.now ?? (() => new Date()))().toISOString();
  const client = resolveClient(options?.client);

  if (!client) {
    const languages = Object.fromEntries(
      SITE_LANGUAGES.map((lang) => [lang, emptyLangSnapshot(null)]),
    ) as Record<SiteLanguage, BosaiLangSnapshot>;
    return { builtAt, languages };
  }

  const entries = await Promise.all(
    SITE_LANGUAGES.map(
      async (lang) =>
        [lang, await fetchLangSnapshot(client, lang, builtAt)] as const,
    ),
  );

  return {
    builtAt,
    languages: Object.fromEntries(entries) as Record<
      SiteLanguage,
      BosaiLangSnapshot
    >,
  };
}
