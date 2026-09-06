// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearStoredWebPushState,
  readStoredWebPushState,
  resyncWebPushSubscriptionLang,
  writeStoredWebPushState,
} from "@/lib/web-push-client";

describe("resyncWebPushSubscriptionLang (#61)", () => {
  const env = {
    NEXT_PUBLIC_GEONICDB_URL: "https://geonicdb.example.example",
    NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY: "gdb_webpush",
  };

  const endpoint = "https://fcm.googleapis.com/fcm/send/x";
  const keys = {
    p256dh:
      "BPj1o6nm3Nh8fG7cdgKishjBD2PZTi7uGEEWlDB0bx6EecwtEw_jChwtibONK47AfA_0Z7nNF70DTI9v1pEMVrc",
    auth: "GbDpg-0-pZScFyrjK6ibEw",
  };

  afterEach(() => {
    clearStoredWebPushState();
    vi.restoreAllMocks();
  });

  function stubPushSubscription() {
    const postMessage = vi.fn();
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration: async () => ({
          active: { postMessage },
          pushManager: {
            getSubscription: async () => ({
              endpoint,
              toJSON: () => ({ endpoint, keys }),
            }),
          },
        }),
      },
    });
    return { postMessage };
  }

  it("POSTs new q for the new lang then DELETEs the previous subscription", async () => {
    writeStoredWebPushState({
      subscriptionId: "urn:ngsi-ld:Subscription:old",
      endpoint,
      enabledAt: "2026-09-05T00:00:00.000Z",
      lang: "ja",
    });
    stubPushSubscription();

    const calls: Array<{ method: string; path: string; body?: unknown }> = [];
    const requestRaw = vi.fn(
      async (method: string, path: string, body?: unknown) => {
        calls.push({ method, path, body });
        if (method === "POST") {
          return new Response(null, {
            status: 201,
            headers: {
              Location:
                "/ngsi-ld/v1/subscriptions/urn:ngsi-ld:Subscription:new",
            },
          });
        }
        return new Response(null, { status: 204 });
      },
    );

    const next = await resyncWebPushSubscriptionLang({
      lang: "en",
      env,
      client: { requestRaw },
    });

    expect(calls[0]?.method).toBe("POST");
    expect((calls[0]?.body as { q: string }).q).toBe('language=="en"');
    expect(calls[1]).toEqual({
      method: "DELETE",
      path: "/ngsi-ld/v1/subscriptions/urn%3Angsi-ld%3ASubscription%3Aold",
      body: undefined,
    });
    expect(next).toMatchObject({
      subscriptionId: "urn:ngsi-ld:Subscription:new",
      lang: "en",
      endpoint,
    });
    expect(readStoredWebPushState()?.lang).toBe("en");
  });

  it("treats DELETE 404 on old subscription as success (#52 + #61)", async () => {
    writeStoredWebPushState({
      subscriptionId: "urn:ngsi-ld:Subscription:gone",
      endpoint,
      enabledAt: "2026-09-05T00:00:00.000Z",
      lang: "ja",
    });
    stubPushSubscription();

    const requestRaw = vi.fn(async (method: string) => {
      if (method === "POST") {
        return new Response(null, {
          status: 201,
          headers: {
            Location: "/ngsi-ld/v1/subscriptions/urn:ngsi-ld:Subscription:new",
          },
        });
      }
      return new Response(null, { status: 404 });
    });

    await expect(
      resyncWebPushSubscriptionLang({
        lang: "ko",
        env,
        client: { requestRaw },
      }),
    ).resolves.toMatchObject({
      subscriptionId: "urn:ngsi-ld:Subscription:new",
      lang: "ko",
    });
  });

  it("rolls back the new subscription when DELETE of old fails with 5xx", async () => {
    writeStoredWebPushState({
      subscriptionId: "urn:ngsi-ld:Subscription:old",
      endpoint,
      enabledAt: "2026-09-05T00:00:00.000Z",
      lang: "ja",
    });
    stubPushSubscription();

    const deleted: string[] = [];
    const requestRaw = vi.fn(async (method: string, path: string) => {
      if (method === "POST") {
        return new Response(null, {
          status: 201,
          headers: {
            Location: "/ngsi-ld/v1/subscriptions/urn:ngsi-ld:Subscription:new",
          },
        });
      }
      deleted.push(path);
      if (path.includes("Subscription%3Aold")) {
        return new Response(null, { status: 500 });
      }
      return new Response(null, { status: 204 });
    });

    await expect(
      resyncWebPushSubscriptionLang({
        lang: "vi",
        env,
        client: { requestRaw },
      }),
    ).rejects.toThrow(/unregister failed: 500/);

    expect(deleted.some((p) => p.includes("Subscription%3Aold"))).toBe(true);
    expect(deleted.some((p) => p.includes("Subscription%3Anew"))).toBe(true);
    // ローカルは旧のまま（二重も停止も残さない）
    expect(readStoredWebPushState()).toMatchObject({
      subscriptionId: "urn:ngsi-ld:Subscription:old",
      lang: "ja",
    });
  });

  it("leaves state unchanged when POST fails", async () => {
    writeStoredWebPushState({
      subscriptionId: "urn:ngsi-ld:Subscription:old",
      endpoint,
      enabledAt: "2026-09-05T00:00:00.000Z",
      lang: "ja",
    });
    stubPushSubscription();

    const requestRaw = vi.fn(
      async (_method: string, _path: string, _body?: unknown) =>
        new Response(null, { status: 503 }),
    );

    await expect(
      resyncWebPushSubscriptionLang({
        lang: "zh-CN",
        env,
        client: { requestRaw },
      }),
    ).rejects.toThrow(/register failed: 503/);

    expect(requestRaw).toHaveBeenCalledTimes(1);
    expect(requestRaw.mock.calls[0]?.[0]).toBe("POST");
    expect(readStoredWebPushState()).toMatchObject({
      subscriptionId: "urn:ngsi-ld:Subscription:old",
      lang: "ja",
    });
  });

  it("no-ops when lang already matches", async () => {
    writeStoredWebPushState({
      subscriptionId: "urn:ngsi-ld:Subscription:same",
      endpoint,
      enabledAt: "2026-09-05T00:00:00.000Z",
      lang: "ja",
    });
    const requestRaw = vi.fn();

    const next = await resyncWebPushSubscriptionLang({
      lang: "ja",
      env,
      client: { requestRaw },
    });

    expect(requestRaw).not.toHaveBeenCalled();
    expect(next.subscriptionId).toBe("urn:ngsi-ld:Subscription:same");
  });
});
