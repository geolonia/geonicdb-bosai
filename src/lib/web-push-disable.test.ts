// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearStoredWebPushState,
  disableWebPushNotifications,
  readStoredWebPushState,
  unregisterWebPushSubscription,
  writeStoredWebPushState,
} from "@/lib/web-push-client";

describe("disableWebPushNotifications local cleanup", () => {
  const env = {
    NEXT_PUBLIC_GEONICDB_URL: "https://geonicdb.example.example",
    NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY: "gdb_webpush",
  };

  const storedState = {
    subscriptionId:
      "urn:ngsi-ld:Subscription:ea954746-ad7d-4dbd-a590-361c3381b64b",
    endpoint: "https://fcm.googleapis.com/fcm/send/x",
    enabledAt: "2026-09-05T00:00:00.000Z",
  };

  afterEach(() => {
    clearStoredWebPushState();
    vi.restoreAllMocks();
  });

  function stubServiceWorker(unsubscribe?: () => Promise<boolean>) {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration: async () =>
          unsubscribe
            ? {
                pushManager: {
                  getSubscription: async () => ({ unsubscribe }),
                },
              }
            : undefined,
      },
    });
  }

  it("clears localStorage even when PushSubscription.unsubscribe rejects", async () => {
    writeStoredWebPushState({
      subscriptionId: "urn:ngsi-ld:Subscription:stale",
      endpoint: "https://fcm.googleapis.com/fcm/send/x",
      enabledAt: "2026-09-05T00:00:00.000Z",
    });
    expect(readStoredWebPushState()?.subscriptionId).toBe(
      "urn:ngsi-ld:Subscription:stale",
    );

    const unsubscribe = vi.fn(async () => {
      throw new Error("unsubscribe failed");
    });
    stubServiceWorker(unsubscribe);

    const requestRaw = vi.fn(async () => new Response(null, { status: 204 }));

    await expect(
      disableWebPushNotifications({
        env,
        client: { requestRaw },
      }),
    ).rejects.toThrow(/unsubscribe failed/);

    expect(requestRaw).toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalled();
    expect(readStoredWebPushState()).toBeNull();
  });

  it("treats DELETE 404 as success and clears localStorage (#52)", async () => {
    writeStoredWebPushState(storedState);
    stubServiceWorker();

    const requestRaw = vi.fn(async () => new Response(null, { status: 404 }));

    await expect(
      disableWebPushNotifications({
        env,
        client: { requestRaw },
      }),
    ).resolves.toBeUndefined();

    expect(requestRaw).toHaveBeenCalled();
    expect(readStoredWebPushState()).toBeNull();
  });

  it("treats DELETE 410 as success and clears localStorage (#52)", async () => {
    writeStoredWebPushState(storedState);
    stubServiceWorker();

    const requestRaw = vi.fn(async () => new Response(null, { status: 410 }));

    await expect(
      disableWebPushNotifications({
        env,
        client: { requestRaw },
      }),
    ).resolves.toBeUndefined();

    expect(readStoredWebPushState()).toBeNull();
  });

  it("keeps localStorage and throws when DELETE returns 5xx (#52)", async () => {
    writeStoredWebPushState(storedState);
    stubServiceWorker();

    const requestRaw = vi.fn(async () => new Response(null, { status: 503 }));

    await expect(
      disableWebPushNotifications({
        env,
        client: { requestRaw },
      }),
    ).rejects.toThrow(/Web Push unregister failed: 503/);

    expect(readStoredWebPushState()?.subscriptionId).toBe(
      storedState.subscriptionId,
    );
  });

  it("keeps localStorage on 403 (near-miss: auth error is not gone) (#52)", async () => {
    writeStoredWebPushState(storedState);
    stubServiceWorker();

    const requestRaw = vi.fn(async () => new Response(null, { status: 403 }));

    await expect(
      disableWebPushNotifications({
        env,
        client: { requestRaw },
      }),
    ).rejects.toThrow(/Web Push unregister failed: 403/);

    expect(readStoredWebPushState()?.subscriptionId).toBe(
      storedState.subscriptionId,
    );
  });
});

describe("unregisterWebPushSubscription idempotent delete", () => {
  it("does not throw on 404", async () => {
    const requestRaw = vi.fn(async () => new Response(null, { status: 404 }));
    await expect(
      unregisterWebPushSubscription("urn:ngsi-ld:Subscription:missing", {
        client: { requestRaw },
      }),
    ).resolves.toBeUndefined();
  });

  it("does not throw on 410", async () => {
    const requestRaw = vi.fn(async () => new Response(null, { status: 410 }));
    await expect(
      unregisterWebPushSubscription("urn:ngsi-ld:Subscription:gone", {
        client: { requestRaw },
      }),
    ).resolves.toBeUndefined();
  });

  it("throws on 500", async () => {
    const requestRaw = vi.fn(async () => new Response(null, { status: 500 }));
    await expect(
      unregisterWebPushSubscription("urn:ngsi-ld:Subscription:x", {
        client: { requestRaw },
      }),
    ).rejects.toThrow(/500/);
  });
});
