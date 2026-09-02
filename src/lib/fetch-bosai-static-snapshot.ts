import { SITE_LANGUAGES, type SiteLanguage } from "@/config/site-language";
import {
  createBosaiStaticSnapshotFixture,
  shouldUseBosaiStaticSnapshotFixture,
} from "@/fixtures/bosai-static-snapshot";
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

/** 失敗時は成功取得時刻を持たない（試行時刻を「最終取得」にしない / F-45）。 */
function failResult(): BosaiResourceResult<never> {
  return { ok: false, data: null, fetchedAt: null };
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
  now: () => Date,
): Promise<BosaiResourceResult<BosaiEmergencyBanner>> {
  try {
    const entities = await client.getEntities({
      type: "bosai-EmergencyBanner",
      q: languagePropertyQuery(lang),
      limit: 1,
    });
    const data = parseFirst(entities, parseEmergencyBanner);
    if (!data) return failResult();
    return okResult(data, now().toISOString());
  } catch {
    return failResult();
  }
}

async function fetchAlertLevel(
  client: BosaiEntitiesClient,
  lang: SiteLanguage,
  now: () => Date,
): Promise<BosaiResourceResult<BosaiAlertLevel>> {
  try {
    const entities = await client.getEntities({
      type: "bosai-AlertLevel",
      q: languagePropertyQuery(lang),
      limit: 1,
    });
    const data = parseFirst(entities, parseAlertLevel);
    if (!data) return failResult();
    return okResult(data, now().toISOString());
  } catch {
    return failResult();
  }
}

async function fetchNotices(
  client: BosaiEntitiesClient,
  lang: SiteLanguage,
  now: () => Date,
): Promise<BosaiResourceResult<BosaiNotice[]>> {
  try {
    const entities = await client.getEntities({
      type: "bosai-Notice",
      q: languagePropertyQuery(lang),
      limit: 50,
    });
    const data = parseNoticeList(entities).items;
    return okResult(data, now().toISOString());
  } catch {
    return failResult();
  }
}

async function fetchLangSnapshot(
  client: BosaiEntitiesClient,
  lang: SiteLanguage,
  now: () => Date,
): Promise<BosaiLangSnapshot> {
  const [banner, alertLevel, notices] = await Promise.all([
    fetchBanner(client, lang, now),
    fetchAlertLevel(client, lang, now),
    fetchNotices(client, lang, now),
  ]);
  return { banner, alertLevel, notices };
}

function emptyLangSnapshot(): BosaiLangSnapshot {
  return {
    banner: failResult(),
    alertLevel: failResult(),
    notices: failResult(),
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

/** スナップショット内の成功リソース数（言語 × banner/alert/notices）。 */
export function countSuccessfulBosaiResources(
  snapshot: BosaiStaticSnapshot,
): number {
  let count = 0;
  for (const lang of SITE_LANGUAGES) {
    const snap = snapshot.languages[lang];
    if (snap.banner.ok) count += 1;
    if (snap.alertLevel.ok) count += 1;
    if (snap.notices.ok) count += 1;
  }
  return count;
}

/**
 * 成功リソースが 1 つも無いスナップショットでのデプロイを拒否する（N-10）。
 * 定期リビルド時に GeonicDB 全滅 → 空 HTML で前回公開を上書きする fail-open を防ぐ。
 * リソース単位の部分失敗は許可する（count >= 1 なら通す）。
 */
export function assertBosaiStaticSnapshotDeployable(
  snapshot: BosaiStaticSnapshot,
): void {
  if (countSuccessfulBosaiResources(snapshot) === 0) {
    throw new Error(
      "Bosai static snapshot has no successful resources; refusing to overwrite last published state (N-10)",
    );
  }
}

/**
 * ビルド時に GeonicDB から主要エンティティを取得し、静的 HTML へ埋め込む用の
 * スナップショットを返す。リソース単位の失敗は ok:false に隔離する（N-10 / F-45）。
 * デプロイ可否は `assertBosaiStaticSnapshotDeployable` で判定する（全滅はビルド失敗）。
 *
 * 避難所など後続ページでも同じ入口を拡張して再利用する
 * （手順は docs/availability-ops.md セクション 5）。
 */
export async function fetchBosaiStaticSnapshot(options?: {
  client?: BosaiEntitiesClient;
  now?: () => Date;
}): Promise<BosaiStaticSnapshot> {
  const now = options?.now ?? (() => new Date());
  const builtAt = now().toISOString();
  const client = resolveClient(options?.client);

  if (!client) {
    if (shouldUseBosaiStaticSnapshotFixture()) {
      return createBosaiStaticSnapshotFixture(builtAt);
    }
    const languages = Object.fromEntries(
      SITE_LANGUAGES.map((lang) => [lang, emptyLangSnapshot()]),
    ) as Record<SiteLanguage, BosaiLangSnapshot>;
    return { builtAt, languages };
  }

  const entries = await Promise.all(
    SITE_LANGUAGES.map(
      async (lang) =>
        [lang, await fetchLangSnapshot(client, lang, now)] as const,
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
