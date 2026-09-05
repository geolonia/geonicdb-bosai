/**
 * Secrets Manager 読み取り（TTL キャッシュ付き・最小実装）。
 * geonicdb 本体の AwsSecretsProvider をコピーせず、同趣旨の短い実装。
 */

import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

const DEFAULT_TTL_MS = 5 * 60 * 1000;

type CacheEntry = { value: string; expiresAt: number };

let client: SecretsManagerClient | null = null;
const cache = new Map<string, CacheEntry>();

function getClient(): SecretsManagerClient {
  if (!client) {
    client = new SecretsManagerClient({});
  }
  return client;
}

/** @internal テスト用 */
export function resetSecretCacheForTests(): void {
  cache.clear();
  client = null;
}

export async function getSecretString(
  secretId: string,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<string> {
  if (!secretId) {
    throw new Error("secretId is empty");
  }
  const cached = cache.get(secretId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value;
  }

  const response = await getClient().send(
    new GetSecretValueCommand({ SecretId: secretId }),
  );
  const value = response.SecretString;
  if (!value) {
    throw new Error("Secret has no SecretString");
  }

  // JSON secret `{"apiKey":"..."}` または平文キー文字列の両方を許容
  let apiKey = value.trim();
  if (apiKey.startsWith("{")) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(apiKey) as Record<string, unknown>;
    } catch {
      throw new Error("Secret JSON is invalid");
    }
    const fromJson =
      (typeof parsed.apiKey === "string" && parsed.apiKey) ||
      (typeof parsed.GEONICDB_API_KEY === "string" &&
        parsed.GEONICDB_API_KEY) ||
      (typeof parsed.value === "string" && parsed.value);
    if (!fromJson) {
      throw new Error("Secret JSON missing apiKey");
    }
    apiKey = fromJson.trim();
  }

  cache.set(secretId, { value: apiKey, expiresAt: Date.now() + ttlMs });
  return apiKey;
}
