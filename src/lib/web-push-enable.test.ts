// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearStoredWebPushState,
  enableWebPushNotifications,
  readStoredWebPushState,
  writeStoredWebPushState,
} from "@/lib/web-push-client";

/**
 * SDK の GeonicDB#subscribeWebPush() は VAPID 鍵ローテーション時、既存 PushSubscription
 * が現在の鍵とまだ一致するかを検証し、不一致なら再 subscribe する。旧 bosai 実装は
 * `registration.pushManager.getSubscription()` を直接呼び、endpoint 文字列が一致するだけで
 * 無条件に既存購読を再利用していた（鍵ローテーション後も stale な購読を掴み続けるバグ）。
 * ここでは bosai 側がブラウザ購読の取得/再利用判定を一切自前で行わず、SDK に一本化されて
 * いることを構造的に検証する（pushManager への直接アクセスがあれば fail する）。
 */
describe("enableWebPushNotifications delegates subscribe/reuse to SDK (VAPID rotation regression)", () => {
  const env = {
    NEXT_PUBLIC_GEONICDB_URL: "https://geonicdb.example.example",
    NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY: "gdb_webpush",
  };

  afterEach(() => {
    clearStoredWebPushState();
    vi.restoreAllMocks();
  });

  function stubBrowserPushApis() {
    const getSubscription = vi.fn(async () => {
      throw new Error(
        "must not call pushManager.getSubscription directly — delegate to client.subscribeWebPush",
      );
    });
    const subscribe = vi.fn(async () => {
      throw new Error(
        "must not call pushManager.subscribe directly — delegate to client.subscribeWebPush",
      );
    });
    const registration = {
      active: null,
      waiting: null,
      installing: null,
      pushManager: { getSubscription, subscribe },
    } as unknown as ServiceWorkerRegistration;

    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: {
        permission: "default",
        requestPermission: vi.fn(async () => "granted"),
      },
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        register: vi.fn(async () => registration),
        ready: Promise.resolve(registration),
      },
    });
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: function PushManager() {},
    });

    return { registration, getSubscription, subscribe };
  }

  it("uses client.subscribeWebPush()'s result for registration and never touches pushManager directly", async () => {
    const { registration, getSubscription, subscribe } = stubBrowserPushApis();

    const freshSubscription = {
      endpoint: "https://fcm.googleapis.com/fcm/send/fresh-after-rotation",
      toJSON: () => ({
        endpoint: "https://fcm.googleapis.com/fcm/send/fresh-after-rotation",
        keys: { p256dh: "fresh-p256dh", auth: "fresh-auth" },
      }),
    } as unknown as PushSubscription;

    const subscribeWebPush = vi.fn(async (opts) => {
      expect(opts?.serviceWorkerRegistration).toBe(registration);
      return freshSubscription;
    });

    let postedBody: unknown;
    const requestRaw = vi.fn(
      async (method: string, path: string, body?: unknown) => {
        expect(method).toBe("POST");
        expect(path).toBe("/ngsi-ld/v1/subscriptions");
        postedBody = body;
        return new Response(null, {
          status: 201,
          headers: {
            Location: "/ngsi-ld/v1/subscriptions/urn:ngsi-ld:Subscription:1",
          },
        });
      },
    );

    const state = await enableWebPushNotifications({
      lang: "ja",
      env,
      client: { requestRaw, subscribeWebPush },
    });

    expect(subscribeWebPush).toHaveBeenCalledTimes(1);
    expect(getSubscription).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();

    expect(state.endpoint).toBe(
      "https://fcm.googleapis.com/fcm/send/fresh-after-rotation",
    );
    const body = postedBody as {
      notification: { endpoint: { uri: string; webpush: { keys: unknown } } };
    };
    expect(body.notification.endpoint.uri).toBe(
      "https://fcm.googleapis.com/fcm/send/fresh-after-rotation",
    );
    expect(body.notification.endpoint.webpush.keys).toEqual({
      p256dh: "fresh-p256dh",
      auth: "fresh-auth",
    });
    expect(readStoredWebPushState()?.endpoint).toBe(
      "https://fcm.googleapis.com/fcm/send/fresh-after-rotation",
    );
  });

  it("re-enable with same endpoint+lang still calls subscribeWebPush (rotation check on every enable)", async () => {
    const { registration } = stubBrowserPushApis();
    const endpoint = "https://fcm.googleapis.com/fcm/send/stable";
    writeStoredWebPushState({
      subscriptionId: "urn:ngsi-ld:Subscription:existing",
      endpoint,
      enabledAt: "2026-09-05T00:00:00.000Z",
      lang: "ja",
    });

    const subscription = {
      endpoint,
      toJSON: () => ({ endpoint, keys: { p256dh: "p", auth: "a" } }),
    } as unknown as PushSubscription;
    const subscribeWebPush = vi.fn(async (opts) => {
      expect(opts?.serviceWorkerRegistration).toBe(registration);
      return subscription;
    });
    const requestRaw = vi.fn();

    const state = await enableWebPushNotifications({
      lang: "ja",
      env,
      client: { requestRaw, subscribeWebPush },
    });

    expect(subscribeWebPush).toHaveBeenCalledTimes(1);
    // 言語・endpoint とも一致するので GeonicDB への再POSTはしない
    expect(requestRaw).not.toHaveBeenCalled();
    expect(state.subscriptionId).toBe("urn:ngsi-ld:Subscription:existing");
  });
});
