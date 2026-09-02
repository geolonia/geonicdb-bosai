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

/** SDK に AbortSignal が無いため、ビルド時 fetch を Promise.race で打ち切る。 */
export const BOSAI_SNAPSHOT_FETCH_TIMEOUT_MS = 15_000;

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number = BOSAI_SNAPSHOT_FETCH_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Bosai snapshot fetch timed out after ${ms}ms`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

async function getEntitiesBounded(
  client: BosaiEntitiesClient,
  params: { type: string; q?: string; limit?: number },
  timeoutMs: number,
): Promise<unknown[]> {
  return withTimeout(client.getEntities(params), timeoutMs);
}

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
  timeoutMs: number,
): Promise<BosaiResourceResult<BosaiEmergencyBanner>> {
  try {
    const entities = await getEntitiesBounded(
      client,
      {
        type: "bosai-EmergencyBanner",
        q: languagePropertyQuery(lang),
        limit: 1,
      },
      timeoutMs,
    );
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
  timeoutMs: number,
): Promise<BosaiResourceResult<BosaiAlertLevel>> {
  try {
    const entities = await getEntitiesBounded(
      client,
      {
        type: "bosai-AlertLevel",
        q: languagePropertyQuery(lang),
        limit: 1,
      },
      timeoutMs,
    );
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
  timeoutMs: number,
): Promise<BosaiResourceResult<BosaiNotice[]>> {
  try {
    const entities = await getEntitiesBounded(
      client,
      {
        type: "bosai-Notice",
        q: languagePropertyQuery(lang),
        limit: 50,
      },
      timeoutMs,
    );
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
  timeoutMs: number,
): Promise<BosaiLangSnapshot> {
  const [banner, alertLevel, notices] = await Promise.all([
    fetchBanner(client, lang, now, timeoutMs),
    fetchAlertLevel(client, lang, now, timeoutMs),
    fetchNotices(client, lang, now, timeoutMs),
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
  /** テスト短縮用。未指定時は `BOSAI_SNAPSHOT_FETCH_TIMEOUT_MS`。 */
  fetchTimeoutMs?: number;
}): Promise<BosaiStaticSnapshot> {
  const now = options?.now ?? (() => new Date());
  const builtAt = now().toISOString();
  const timeoutMs = options?.fetchTimeoutMs ?? BOSAI_SNAPSHOT_FETCH_TIMEOUT_MS;
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
        [lang, await fetchLangSnapshot(client, lang, now, timeoutMs)] as const,
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
