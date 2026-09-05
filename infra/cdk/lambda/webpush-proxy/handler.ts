/**
 * Web Push 購読登録プロキシ（Lambda Function URL）。
 *
 * POST  body: { endpoint, keys: { p256dh, auth } }
 *   → GeonicDB POST /ngsi-ld/v1/subscriptions (protocol=webpush)
 * DELETE ?id=<subscriptionId>
 *   → GeonicDB DELETE /ngsi-ld/v1/subscriptions/{id}
 *
 * OPTIONS → CORS preflight
 */

import {
  assertSubscriptionId,
  buildNgsiLdWebPushSubscription,
  extractSubscriptionId,
  parsePushSubscription,
  ValidationError,
} from "./build-subscription";
import { getSecretString } from "./secrets";

export type LambdaHttpEvent = {
  requestContext?: { http?: { method?: string } };
  rawPath?: string;
  rawQueryString?: string;
  headers?: Record<string, string | undefined>;
  body?: string | null;
  isBase64Encoded?: boolean;
  queryStringParameters?: Record<string, string | undefined> | null;
};

export type LambdaHttpResult = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

type Env = {
  GEONICDB_URL: string;
  GEONICDB_API_KEY_SECRET_ARN: string;
  GEONICDB_TENANT?: string;
  BOSAI_CONTEXT_URL?: string;
  SITE_ORIGIN?: string;
  CORS_ALLOW_ORIGIN?: string;
};

function readEnv(env: NodeJS.ProcessEnv = process.env): Env {
  const url = (env.GEONICDB_URL ?? "").trim().replace(/\/+$/, "");
  const secretArn = (env.GEONICDB_API_KEY_SECRET_ARN ?? "").trim();
  if (!url) throw new Error("GEONICDB_URL is not set");
  if (!secretArn) throw new Error("GEONICDB_API_KEY_SECRET_ARN is not set");
  return {
    GEONICDB_URL: url,
    GEONICDB_API_KEY_SECRET_ARN: secretArn,
    GEONICDB_TENANT: env.GEONICDB_TENANT?.trim() || undefined,
    BOSAI_CONTEXT_URL: env.BOSAI_CONTEXT_URL?.trim() || undefined,
    SITE_ORIGIN: env.SITE_ORIGIN?.trim() || undefined,
    CORS_ALLOW_ORIGIN: (() => {
      const raw = env.CORS_ALLOW_ORIGIN?.trim();
      if (!raw || raw === "*") {
        throw new Error(
          "CORS_ALLOW_ORIGIN must be an absolute http(s) origin (not *)",
        );
      }
      return raw;
    })(),
  };
}

function corsHeaders(allowOrigin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonResult(
  statusCode: number,
  body: unknown,
  allowOrigin: string,
): LambdaHttpResult {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(allowOrigin),
    },
    body: JSON.stringify(body),
  };
}

function decodeBody(event: LambdaHttpEvent): string {
  if (!event.body) return "";
  if (event.isBase64Encoded) {
    return Buffer.from(event.body, "base64").toString("utf8");
  }
  return event.body;
}

function methodOf(event: LambdaHttpEvent): string {
  return (event.requestContext?.http?.method ?? "GET").toUpperCase();
}

function queryParam(event: LambdaHttpEvent, name: string): string | undefined {
  const fromMap = event.queryStringParameters?.[name];
  if (fromMap) return fromMap;
  const raw = event.rawQueryString ?? "";
  if (!raw) return undefined;
  const params = new URLSearchParams(raw);
  return params.get(name) ?? undefined;
}

export type FetchLike = typeof fetch;

export async function handleWebPushProxy(
  event: LambdaHttpEvent,
  deps: {
    env?: NodeJS.ProcessEnv;
    fetchFn?: FetchLike;
    getApiKey?: (secretArn: string) => Promise<string>;
  } = {},
): Promise<LambdaHttpResult> {
  let env: Env;
  try {
    env = readEnv(deps.env ?? process.env);
  } catch {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ error: "config error" }),
    };
  }

  const allowOrigin = env.CORS_ALLOW_ORIGIN!;
  const method = methodOf(event);

  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders(allowOrigin),
      body: "",
    };
  }

  const fetchFn = deps.fetchFn ?? fetch;
  const getApiKey = deps.getApiKey ?? ((arn: string) => getSecretString(arn));

  try {
    if (method === "POST") {
      let parsedJson: unknown;
      try {
        const raw = decodeBody(event);
        parsedJson = raw ? JSON.parse(raw) : null;
      } catch {
        throw new ValidationError("body must be valid JSON");
      }
      const subscription = parsePushSubscription(parsedJson);
      const ngsiBody = buildNgsiLdWebPushSubscription(subscription, {
        siteOrigin: env.SITE_ORIGIN,
      });

      const apiKey = await getApiKey(env.GEONICDB_API_KEY_SECRET_ARN);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-Key": apiKey,
      };
      if (env.GEONICDB_TENANT) {
        headers["Fiware-Service"] = env.GEONICDB_TENANT;
      }
      if (env.BOSAI_CONTEXT_URL) {
        headers.Link = `<${env.BOSAI_CONTEXT_URL}>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"`;
      }

      const response = await fetchFn(
        `${env.GEONICDB_URL}/ngsi-ld/v1/subscriptions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(ngsiBody),
          signal: AbortSignal.timeout(8_000),
        },
      );

      const responseText = await response.text();
      let responseJson: unknown = null;
      if (responseText) {
        try {
          responseJson = JSON.parse(responseText);
        } catch {
          responseJson = null;
        }
      }

      if (response.status !== 201 && response.status !== 200) {
        return jsonResult(
          502,
          {
            error: "GeonicDB subscription create failed",
            upstreamStatus: response.status,
          },
          allowOrigin,
        );
      }

      const location =
        response.headers.get("Location") ?? response.headers.get("location");
      const subscriptionId = extractSubscriptionId(location, responseJson);

      if (!subscriptionId) {
        return jsonResult(
          502,
          { error: "GeonicDB did not return subscription id" },
          allowOrigin,
        );
      }

      return jsonResult(201, { subscriptionId }, allowOrigin);
    }

    if (method === "DELETE") {
      const rawId = queryParam(event, "id");
      if (!rawId) {
        throw new ValidationError("id query parameter is required");
      }
      const subscriptionId = assertSubscriptionId(rawId);
      const apiKey = await getApiKey(env.GEONICDB_API_KEY_SECRET_ARN);
      const headers: Record<string, string> = {
        Accept: "application/json",
        "X-API-Key": apiKey,
      };
      if (env.GEONICDB_TENANT) {
        headers["Fiware-Service"] = env.GEONICDB_TENANT;
      }

      const response = await fetchFn(
        `${env.GEONICDB_URL}/ngsi-ld/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
        { method: "DELETE", headers, signal: AbortSignal.timeout(8_000) },
      );

      if (response.status !== 204 && response.status !== 200) {
        return jsonResult(
          502,
          {
            error: "GeonicDB subscription delete failed",
            upstreamStatus: response.status,
          },
          allowOrigin,
        );
      }

      return {
        statusCode: 204,
        headers: corsHeaders(allowOrigin),
        body: "",
      };
    }

    return jsonResult(405, { error: "Method not allowed" }, allowOrigin);
  } catch (err) {
    if (err instanceof ValidationError) {
      return jsonResult(400, { error: err.message }, allowOrigin);
    }
    if (
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError")
    ) {
      console.error("webpush proxy upstream timeout", err);
      return jsonResult(504, { error: "upstream timeout" }, allowOrigin);
    }
    console.error("webpush proxy error", err);
    return jsonResult(500, { error: "internal error" }, allowOrigin);
  }
}

export async function handler(
  event: LambdaHttpEvent,
): Promise<LambdaHttpResult> {
  return handleWebPushProxy(event);
}
