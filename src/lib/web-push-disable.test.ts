// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearStoredWebPushState,
  disableWebPushNotifications,
  readStoredWebPushState,
  writeStoredWebPushState,
} from "@/lib/web-push-client";

describe("disableWebPushNotifications local cleanup", () => {
  const env = {
    NEXT_PUBLIC_GEONICDB_URL: "https://geonicdb.example.example",
    NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY: "gdb_webpush",
  };

  afterEach(() => {
    clearStoredWebPushState();
    vi.restoreAllMocks();
  });

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
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration: async () => ({
          pushManager: {
            getSubscription: async () => ({ unsubscribe }),
          },
        }),
      },
    });

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
});
