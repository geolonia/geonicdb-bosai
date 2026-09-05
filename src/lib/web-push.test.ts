import { describe, expect, it, vi } from "vitest";
import {
  extractEntityTypeFromPushPayload,
  normalizePushLang,
  pushMessageFor,
} from "@/lib/web-push-sw-logic";
import {
  clearStoredWebPushState,
  fetchVapidPublicKey,
  readStoredWebPushState,
  resolveWebPushRegisterUrl,
  urlBase64ToUint8Array,
  writeStoredWebPushState,
} from "@/lib/web-push-client";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("web-push-sw-logic", () => {
  it("extracts entity type from NGSI-LD notification payload", () => {
    expect(
      extractEntityTypeFromPushPayload({
        id: "urn:ngsi-ld:Notification:1",
        type: "Notification",
        data: [{ id: "x", type: "bosai-EmergencyBanner", language: "ja" }],
      }),
    ).toBe("bosai-EmergencyBanner");
  });

  it("returns short localized copy without entity body text", () => {
    const msg = pushMessageFor("bosai-AlertLevel", "ja");
    expect(msg.title).toBe("警戒レベル");
    expect(msg.body).not.toMatch(/level 5 action|本文/);
  });

  it("near-miss: unknown lang prefix falls back to ja", () => {
    expect(normalizePushLang("fr-FR")).toBe("ja");
  });
});

describe("fetchVapidPublicKey", () => {
  const env = {
    NEXT_PUBLIC_GEONICDB_URL: "https://geonicdb.example.example",
  };

  it("returns publicKey from a well-formed response", async () => {
    const fetchFn = vi.fn(async () =>
      Response.json({ publicKey: "  BPj1o6nm3Nh8fG7cdgK  " }),
    );
    await expect(
      fetchVapidPublicKey(env, fetchFn as typeof fetch),
    ).resolves.toBe("BPj1o6nm3Nh8fG7cdgK");
    expect(fetchFn).toHaveBeenCalledWith(
      "https://geonicdb.example.example/.well-known/webpush-vapid-key",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("throws when HTTP status is not ok", async () => {
    const fetchFn = vi.fn(async () => new Response("nope", { status: 503 }));
    await expect(
      fetchVapidPublicKey(env, fetchFn as typeof fetch),
    ).rejects.toThrow(/VAPID key fetch failed: 503/);
  });

  it("throws when publicKey is missing or empty (near-miss)", async () => {
    const missing = vi.fn(async () => Response.json({}));
    await expect(
      fetchVapidPublicKey(env, missing as typeof fetch),
    ).rejects.toThrow(/VAPID publicKey missing/);

    const blank = vi.fn(async () => Response.json({ publicKey: "   " }));
    await expect(
      fetchVapidPublicKey(env, blank as typeof fetch),
    ).rejects.toThrow(/VAPID publicKey missing/);

    const wrongType = vi.fn(async () => Response.json({ publicKey: 123 }));
    await expect(
      fetchVapidPublicKey(env, wrongType as typeof fetch),
    ).rejects.toThrow(/VAPID publicKey missing/);
  });
});

describe("web-push-client helpers", () => {
  it("decodes VAPID base64url keys", () => {
    const bytes = urlBase64ToUint8Array("AQID");
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
  });

  it("round-trips localStorage subscription state", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    };
    writeStoredWebPushState(
      {
        subscriptionId: "urn:ngsi-ld:Subscription:1",
        endpoint: "https://fcm.googleapis.com/fcm/send/x",
        enabledAt: "2026-09-05T00:00:00.000Z",
      },
      storage,
    );
    expect(readStoredWebPushState(storage)?.subscriptionId).toBe(
      "urn:ngsi-ld:Subscription:1",
    );
    clearStoredWebPushState(storage);
    expect(readStoredWebPushState(storage)).toBeNull();
  });

  it("resolveWebPushRegisterUrl returns null when unset", () => {
    expect(resolveWebPushRegisterUrl({})).toBeNull();
    expect(
      resolveWebPushRegisterUrl({
        NEXT_PUBLIC_WEBPUSH_REGISTER_URL: "/api/webpush/",
      }),
    ).toBe("/api/webpush");
  });
});

describe("public/sw.js push-only contract", () => {
  const sw = readFileSync(
    path.resolve(__dirname, "../../public/sw.js"),
    "utf8",
  );

  it("registers push and does not intercept fetch", () => {
    expect(sw).toMatch(/addEventListener\(\s*["']push["']/);
    expect(sw).not.toMatch(/addEventListener\(\s*["']fetch["']/);
  });
});

describe("BOSAI_LIVE_ENTITY_TYPES parity with Lambda", () => {
  it("matches the webpush subscription entity list", async () => {
    const { BOSAI_LIVE_ENTITY_TYPES } =
      await import("@/lib/bosai-live-entity-types");
    expect([...BOSAI_LIVE_ENTITY_TYPES]).toEqual([
      "bosai-Notice",
      "bosai-EmergencyBanner",
      "bosai-AlertLevel",
    ]);
  });
});
