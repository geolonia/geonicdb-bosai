import { afterEach, describe, expect, it, vi } from "vitest";
import {
  handleWebPushProxy,
  type LambdaHttpEvent,
} from "../lambda/webpush-proxy/handler";

const VALID_BODY = JSON.stringify({
  endpoint: "https://fcm.googleapis.com/fcm/send/abc",
  keys: {
    p256dh:
      "BPj1o6nm3Nh8fG7cdgKishjBD2PZTi7uGEEWlDB0bx6EecwtEw_jChwtibONK47AfA_0Z7nNF70DTI9v1pEMVrc",
    auth: "GbDpg-0-pZScFyrjK6ibEw",
  },
});

const ENV = {
  GEONICDB_URL: "https://geonicdb.example.jp",
  GEONICDB_API_KEY_SECRET_ARN:
    "arn:aws:secretsmanager:ap-northeast-1:111:secret:x",
  GEONICDB_TENANT: "miya",
  CORS_ALLOW_ORIGIN: "https://bosai.example.jp",
};

describe("handleWebPushProxy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POSTs a webpush NGSI-LD subscription to GeonicDB", async () => {
    const fetchFn = vi.fn(async (_url: string, init?: RequestInit) => {
      const parsed = JSON.parse(String(init?.body)) as {
        notification: { endpoint: { protocol: string } };
      };
      expect(parsed.notification.endpoint.protocol).toBe("webpush");
      expect((init?.headers as Record<string, string>)["X-API-Key"]).toBe(
        "test-key",
      );
      expect((init?.headers as Record<string, string>)["Fiware-Service"]).toBe(
        "miya",
      );
      return new Response(null, {
        status: 201,
        headers: {
          Location: "/ngsi-ld/v1/subscriptions/urn:ngsi-ld:Subscription:wp1",
        },
      });
    });

    const event: LambdaHttpEvent = {
      requestContext: { http: { method: "POST" } },
      body: VALID_BODY,
    };
    const result = await handleWebPushProxy(event, {
      env: ENV,
      fetchFn: fetchFn as unknown as typeof fetch,
      getApiKey: async () => "test-key",
    });

    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body)).toEqual({
      subscriptionId: "urn:ngsi-ld:Subscription:wp1",
    });
    expect(fetchFn).toHaveBeenCalledWith(
      "https://geonicdb.example.jp/ngsi-ld/v1/subscriptions",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("DELETEs the subscription by id", async () => {
    const fetchFn = vi.fn(async () => new Response(null, { status: 204 }));
    const result = await handleWebPushProxy(
      {
        requestContext: { http: { method: "DELETE" } },
        queryStringParameters: { id: "urn:ngsi-ld:Subscription:wp1" },
      },
      {
        env: ENV,
        fetchFn: fetchFn as unknown as typeof fetch,
        getApiKey: async () => "test-key",
      },
    );
    expect(result.statusCode).toBe(204);
    expect(fetchFn).toHaveBeenCalledWith(
      "https://geonicdb.example.jp/ngsi-ld/v1/subscriptions/urn%3Angsi-ld%3ASubscription%3Awp1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("returns 400 for http endpoint (near-miss)", async () => {
    const result = await handleWebPushProxy(
      {
        requestContext: { http: { method: "POST" } },
        body: JSON.stringify({
          endpoint: "http://insecure.example/push",
          keys: {
            p256dh:
              "BPj1o6nm3Nh8fG7cdgKishjBD2PZTi7uGEEWlDB0bx6EecwtEw_jChwtibONK47AfA_0Z7nNF70DTI9v1pEMVrc",
            auth: "GbDpg-0-pZScFyrjK6ibEw",
          },
        }),
      },
      {
        env: ENV,
        getApiKey: async () => "test-key",
      },
    );
    expect(result.statusCode).toBe(400);
  });
});
