import GeonicDB from "@geolonia/geonicdb-sdk";

export type GeonicdbConfig = {
  baseUrl: string;
  apiKey?: string;
  tenant?: string;
};

/** テスト注入しやすいよう、process.env 互換の薄い辞書型。 */
export type EnvLike = Record<string, string | undefined>;

/** Fiware-Service / GeonicDB tenant 名として許可する形式。 */
const TENANT_PATTERN = /^[a-z0-9_]+$/;

function readOptional(env: EnvLike, key: string): string | undefined {
  const value = env[key]?.trim();
  return value ? value : undefined;
}

/**
 * GeonicDB 接続設定を環境変数から解決する。
 *
 * 用途は職員向け管理画面・書き込み経路向け（REQUIREMENTS.md 2.1）。
 * 住民向け公開ページから GeonicDB へ直接接続するために使わないこと。
 */
export function resolveGeonicdbConfig(
  env: EnvLike = process.env,
): GeonicdbConfig {
  const raw = (env.GEONICDB_URL ?? "").trim();
  if (!raw) {
    throw new Error("GEONICDB_URL is not set");
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`GEONICDB_URL is not a valid URL: ${raw}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`GEONICDB_URL must use http or https protocol: ${raw}`);
  }

  const baseUrl = raw.replace(/\/+$/, "");
  const apiKey = readOptional(env, "GEONICDB_API_KEY");
  const tenant = readOptional(env, "GEONICDB_TENANT");
  if (tenant && !TENANT_PATTERN.test(tenant)) {
    throw new Error(`GEONICDB_TENANT must match ${TENANT_PATTERN}: ${tenant}`);
  }

  return {
    baseUrl,
    ...(apiKey ? { apiKey } : {}),
    ...(tenant ? { tenant } : {}),
  };
}

/** 職員向け経路用の GeonicDB SDK クライアントを生成する。 */
export function createGeonicdbClient(env: EnvLike = process.env): GeonicDB {
  const config = resolveGeonicdbConfig(env);
  return new GeonicDB({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    tenant: config.tenant,
  });
}
