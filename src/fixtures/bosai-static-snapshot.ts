import { SITE_LANGUAGES, type SiteLanguage } from "@/config/site-language";
import type {
  BosaiLangSnapshot,
  BosaiStaticSnapshot,
} from "@/types/bosai-static-snapshot";
import type {
  BosaiAlertLevel,
  BosaiEmergencyBanner,
  BosaiNotice,
} from "@/types/top-page";

/**
 * CI / ローカルで GeonicDB 無しの静的 export 用フィクスチャ。
 * 本番デプロイ（cron 含む）では `BOSAI_USE_SNAPSHOT_FIXTURE` を立てないこと。
 */
const FIXTURE_BANNER: BosaiEmergencyBanner = {
  id: "urn:ngsi-ld:bosai-EmergencyBanner:fixture:ja",
  type: "bosai-EmergencyBanner",
  language: "ja",
  translationGroup: "current-banner",
  variant: "notice",
  heading: "フィクスチャ見出し",
  body: "CI / ローカル用の埋め込みデータです。",
  linkHref: null,
  linkText: null,
  updatedAt: "2026-09-02T00:00:00+09:00",
};

const FIXTURE_ALERT: BosaiAlertLevel = {
  id: "urn:ngsi-ld:bosai-AlertLevel:fixture:ja",
  type: "bosai-AlertLevel",
  language: "ja",
  translationGroup: "current-alert-level",
  level: 1,
  label: "警戒レベル1",
  body: "フィクスチャの警戒レベル本文です。",
  updatedAt: "2026-09-02T00:00:00+09:00",
};

const FIXTURE_NOTICE: BosaiNotice = {
  id: "urn:ngsi-ld:bosai-Notice:fixture:ja",
  type: "bosai-Notice",
  language: "ja",
  translationGroup: "fixture",
  title: "フィクスチャお知らせ",
  body: "CI / ローカル用です。",
  publishedAt: "2026-09-02T00:00:00+09:00",
  updatedAt: "2026-09-02T00:00:00+09:00",
};

function fail(): BosaiLangSnapshot["banner"] {
  return { ok: false, data: null, fetchedAt: null };
}

/** `BOSAI_USE_SNAPSHOT_FIXTURE=1` 時のみ。ja に最低限の成功リソースを入れる。 */
export function createBosaiStaticSnapshotFixture(
  builtAt: string,
): BosaiStaticSnapshot {
  const languages = Object.fromEntries(
    SITE_LANGUAGES.map((lang) => {
      if (lang !== "ja") {
        return [
          lang,
          { banner: fail(), alertLevel: fail(), notices: fail() },
        ] as const;
      }
      const snap: BosaiLangSnapshot = {
        banner: { ok: true, data: FIXTURE_BANNER, fetchedAt: builtAt },
        alertLevel: { ok: true, data: FIXTURE_ALERT, fetchedAt: builtAt },
        notices: { ok: true, data: [FIXTURE_NOTICE], fetchedAt: builtAt },
      };
      return [lang, snap] as const;
    }),
  ) as Record<SiteLanguage, BosaiLangSnapshot>;
  return { builtAt, languages };
}

export function shouldUseBosaiStaticSnapshotFixture(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.BOSAI_USE_SNAPSHOT_FIXTURE === "1";
}
