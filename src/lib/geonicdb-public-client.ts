import GeonicDB from "@geolonia/geonicdb-sdk";
import type { SiteLanguage } from "@/config/site-language";

/** テスト注入しやすいよう、process.env 互換の薄い辞書型。 */
export type PublicEnvLike = Record<string, string | undefined>;

/** Fiware-Service / GeonicDB tenant 名として許可する形式。 */
const TENANT_PATTERN = /^[a-z0-9_]+$/;

export type GeonicdbPublicConfig = {
  baseUrl: string;
  tenant?: string;
};

function readOptional(env: PublicEnvLike, key: string): string | undefined {
  const value = env[key]?.trim();
  return value ? value : undefined;
}

/**
 * 住民向け公開ページ用の GeonicDB 接続設定（匿名読み取り専用）。
 *
 * `NEXT_PUBLIC_*` はビルド時にクライアントへ埋め込まれるが、URL とテナント名のみで
 * 秘密情報ではない（REQUIREMENTS.md 2.1）。API キーは使わない。
 */
export function resolveGeonicdbPublicConfig(
  env: PublicEnvLike = {
    NEXT_PUBLIC_GEONICDB_URL: process.env.NEXT_PUBLIC_GEONICDB_URL,
    NEXT_PUBLIC_GEONICDB_TENANT: process.env.NEXT_PUBLIC_GEONICDB_TENANT,
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

  return {
    baseUrl,
    ...(tenant ? { tenant } : {}),
  };
}

let singleton: GeonicDB | null = null;

/**
 * 匿名モード（`anonymous: true`）の GeonicDB クライアント（シングルトン）。
 * API キーは渡さない。読み取りはサーバー側 XACML（bosai-public-read）に委ねる。
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

/** @internal テスト用 */
export function resetGeonicdbPublicClientForTests(): void {
  singleton = null;
}

/** NGSI-LD `q` 用: サイト言語で絞り込む。 */
export function languagePropertyQuery(lang: SiteLanguage): string {
  // NGSI-LD q の文字列リテラル。lang は allowlist 済みの SiteLanguage のみ。
  return `language=="${lang}"`;
}
