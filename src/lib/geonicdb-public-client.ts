import GeonicDB from "@geolonia/geonicdb-sdk";
import type { SiteLanguage } from "@/config/site-language";

/** テスト注入しやすいよう、process.env 互換の薄い辞書型。 */
export type PublicEnvLike = Record<string, string | undefined>;

/** Fiware-Service / GeonicDB tenant 名として許可する形式。 */
const TENANT_PATTERN = /^[a-z0-9_]+$/;

export type GeonicdbPublicConfig = {
  baseUrl: string;
  tenant?: string;
  /**
   * WebSocket購読用の読み取り専用APIキー（任意）。
   * SDKの `connect()` は匿名モードでは例外を投げる仕様のため、WS購読には
   * 非匿名セッションが必須。未設定時はREST読み取りのみ匿名モードで行う
   * （WS購読はスキップされる）。
   */
  wsApiKey?: string;
  /**
   * Web Push サブスクリプション操作用 API キー（任意）。
   * ポリシー `bosai-webpush-proxy-write`: `/ngsi-ld/v1/subscriptions*` への
   * POST/DELETE/GET と、配信時認可用の `bosai-*` への GET。エンティティ書き込み不可。
   * 未設定時は Web Push オプトイン UI を出さない。
   */
  webpushApiKey?: string;
};

function readOptional(env: PublicEnvLike, key: string): string | undefined {
  const value = env[key]?.trim();
  return value ? value : undefined;
}

/**
 * 住民向け公開ページ用の GeonicDB 接続設定。
 *
 * `NEXT_PUBLIC_*` はビルド時にクライアントへ埋め込まれる。URL とテナント名は
 * 秘密情報ではない（REQUIREMENTS.md 2.1）。
 *
 * クライアント埋め込みキーは第三者に見える前提。**エンティティ書き込み可能な
 * キー（`bosai-write` / `bosai-staff-write`）を絶対に設定しないこと。**
 * 許可されるのは次の用途に絞ったキーのみ:
 * - `NEXT_PUBLIC_GEONICDB_WS_API_KEY` — WebSocket 購読専用（`bosai-read` =
 *   GET + WS のみ）
 * - `NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY` — サブスクリプション操作と配信時認可用
 *   （`bosai-webpush-proxy-write` = subscriptions の POST/DELETE/GET +
 *   `bosai-*` の GET。エンティティ書き込み権限なし。詳細は docs/geonicdb-setup.md）
 */
export function resolveGeonicdbPublicConfig(
  env: PublicEnvLike = {
    NEXT_PUBLIC_GEONICDB_URL: process.env.NEXT_PUBLIC_GEONICDB_URL,
    NEXT_PUBLIC_GEONICDB_TENANT: process.env.NEXT_PUBLIC_GEONICDB_TENANT,
    NEXT_PUBLIC_GEONICDB_WS_API_KEY:
      process.env.NEXT_PUBLIC_GEONICDB_WS_API_KEY,
    NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY:
      process.env.NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY,
  },
): GeonicdbPublicConfig {
  const raw = (env.NEXT_PUBLIC_GEONICDB_URL ?? "").trim();
  if (!raw) {
    throw new Error("NEXT_PUBLIC_GEONICDB_URL is not set");
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`NEXT_PUBLIC_GEONICDB_URL is not a valid URL: ${raw}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `NEXT_PUBLIC_GEONICDB_URL must use http or https protocol: ${raw}`,
    );
  }

  const baseUrl = raw.replace(/\/+$/, "");
  const tenant = readOptional(env, "NEXT_PUBLIC_GEONICDB_TENANT");
  if (tenant && !TENANT_PATTERN.test(tenant)) {
    throw new Error(
      `NEXT_PUBLIC_GEONICDB_TENANT must match ${TENANT_PATTERN}: ${tenant}`,
    );
  }
  const wsApiKey = readOptional(env, "NEXT_PUBLIC_GEONICDB_WS_API_KEY");
  const webpushApiKey = readOptional(
    env,
    "NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY",
  );

  return {
    baseUrl,
    ...(tenant ? { tenant } : {}),
    ...(wsApiKey ? { wsApiKey } : {}),
    ...(webpushApiKey ? { webpushApiKey } : {}),
  };
}

let singleton: GeonicDB | null = null;
let wsSingleton: GeonicDB | null = null;
let webpushSingleton: GeonicDB | null = null;

/**
 * 匿名モード（`anonymous: true`）の GeonicDB クライアント（シングルトン）。
 * REST読み取り用。API キーは渡さない。サーバー側 XACML（bosai-public-read）に委ねる。
 */
export function getGeonicdbPublicClient(): GeonicDB {
  if (!singleton) {
    const config = resolveGeonicdbPublicConfig();
    singleton = new GeonicDB({
      baseUrl: config.baseUrl,
      tenant: config.tenant,
      anonymous: true,
    });
  }
  return singleton;
}

/**
 * WebSocket購読用の GeonicDB クライアント（シングルトン）。読み取り専用キーで認証する。
 * 設定未解決（URL未設定等）または `NEXT_PUBLIC_GEONICDB_WS_API_KEY` 未設定の場合は
 * null を返す（WS購読なしで動作を継続する。REST読み取りのエラー処理とは独立させる）。
 */
export function getGeonicdbWsClient(): GeonicDB | null {
  let config: GeonicdbPublicConfig;
  try {
    config = resolveGeonicdbPublicConfig();
  } catch {
    return null;
  }
  if (!config.wsApiKey) return null;
  if (!wsSingleton) {
    wsSingleton = new GeonicDB({
      baseUrl: config.baseUrl,
      tenant: config.tenant,
      apiKey: config.wsApiKey,
    });
  }
  return wsSingleton;
}

/**
 * Web Push サブスクリプション CRUD 用の GeonicDB クライアント（シングルトン）。
 * `NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY` 未設定時は null。
 * DPoP / オリジン制限は SDK の apiKey 経路に委譲する（手書き再実装しない）。
 */
export function getGeonicdbWebPushClient(env?: PublicEnvLike): GeonicDB | null {
  let config: GeonicdbPublicConfig;
  try {
    config = resolveGeonicdbPublicConfig(
      env ?? {
        NEXT_PUBLIC_GEONICDB_URL: process.env.NEXT_PUBLIC_GEONICDB_URL,
        NEXT_PUBLIC_GEONICDB_TENANT: process.env.NEXT_PUBLIC_GEONICDB_TENANT,
        NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY:
          process.env.NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY,
      },
    );
  } catch {
    return null;
  }
  if (!config.webpushApiKey) return null;
  // テスト注入の env があるときはシングルトンを使わず毎回生成する
  if (env) {
    return new GeonicDB({
      baseUrl: config.baseUrl,
      tenant: config.tenant,
      apiKey: config.webpushApiKey,
    });
  }
  if (!webpushSingleton) {
    webpushSingleton = new GeonicDB({
      baseUrl: config.baseUrl,
      tenant: config.tenant,
      apiKey: config.webpushApiKey,
    });
  }
  return webpushSingleton;
}

/** @internal テスト用 */
export function resetGeonicdbPublicClientForTests(): void {
  singleton = null;
  wsSingleton = null;
  webpushSingleton = null;
}

/** NGSI-LD `q` 用: サイト言語で絞り込む。 */
export function languagePropertyQuery(lang: SiteLanguage): string {
  // NGSI-LD q の文字列リテラル。lang は allowlist 済みの SiteLanguage のみ。
  return `language=="${lang}"`;
}
