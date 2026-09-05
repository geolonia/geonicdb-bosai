import { describe, expect, it, vi } from "vitest";
import {
  extractEntityTypeFromPushPayload,
  normalizePushLang,
  pushMessageFor,
} from "@/lib/web-push-sw-logic";
import {
  clearStoredWebPushState,
  fetchVapidPublicKey,
  isWebPushConfigured,
  readStoredWebPushState,
  registerWebPushSubscription,
  unregisterWebPushSubscription,
  urlBase64ToUint8Array,
  writeStoredWebPushState,
  type WebPushGeonicdbClient,
} from "@/lib/web-push-client";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

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

  it("falls back to default for legacy entity types (#48 near-miss)", () => {
    // 旧購読から bosai-Notice / bosai-EmergencyBanner が来ても壊れない
    const notice = pushMessageFor("bosai-Notice", "ja");
    expect(notice.title).toBe("防災情報");
    const banner = pushMessageFor("bosai-EmergencyBanner", "en");
    expect(banner.title).toBe("Disaster information");
  });

  it("near-miss: unknown lang prefix falls back to ja", () => {
    expect(normalizePushLang("fr-FR")).toBe("ja");
  });

  it("WEB_PUSH_SITE_LANGUAGES matches SITE_LANGUAGES (#42)", async () => {
    const { SITE_LANGUAGES } = await import("@/config/site-language");
    const { WEB_PUSH_SITE_LANGUAGES } = await import("@/lib/web-push-sw-logic");
    expect([...WEB_PUSH_SITE_LANGUAGES]).toEqual([...SITE_LANGUAGES]);
  });

  it("near-miss: reordered language list must not match SITE_LANGUAGES (#42)", async () => {
    const { SITE_LANGUAGES } = await import("@/config/site-language");
    const { WEB_PUSH_SITE_LANGUAGES } = await import("@/lib/web-push-sw-logic");
    const base = [...SITE_LANGUAGES];
    expect(base.length).toBeGreaterThanOrEqual(2);
    // 要素は同じでも順序が違えばサイト言語の優先順位とズレる（通ってはいけない）
    const reordered = [base[1], base[0], ...base.slice(2)];
    expect(reordered).not.toEqual([...SITE_LANGUAGES]);
    expect(reordered).not.toEqual([...WEB_PUSH_SITE_LANGUAGES]);
    expect([...WEB_PUSH_SITE_LANGUAGES]).toEqual([...SITE_LANGUAGES]);
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

  it("isWebPushConfigured requires WEBPUSH API key (not a register proxy URL)", () => {
    expect(
      isWebPushConfigured({
        NEXT_PUBLIC_GEONICDB_URL: "https://geonicdb.example.example",
      }),
    ).toBe(false);
    expect(
      isWebPushConfigured({
        NEXT_PUBLIC_GEONICDB_URL: "https://geonicdb.example.example",
        NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY: "gdb_webpush",
      }),
    ).toBe(true);
  });
});

describe("registerWebPushSubscription (direct GeonicDB)", () => {
  const pushJson = {
    endpoint: "https://fcm.googleapis.com/fcm/send/abc",
    keys: {
      p256dh:
        "BPj1o6nm3Nh8fG7cdgKishjBD2PZTi7uGEEWlDB0bx6EecwtEw_jChwtibONK47AfA_0Z7nNF70DTI9v1pEMVrc",
      auth: "GbDpg-0-pZScFyrjK6ibEw",
    },
  };

  it("POSTs NGSI-LD webpush subscription to /ngsi-ld/v1/subscriptions", async () => {
    let postedBody: unknown;
    const requestRaw = vi.fn(
      async (method: string, path: string, body?: unknown) => {
        expect(method).toBe("POST");
        expect(path).toBe("/ngsi-ld/v1/subscriptions");
        postedBody = body;
        return new Response(null, {
          status: 201,
          headers: {
            Location: "/ngsi-ld/v1/subscriptions/urn:ngsi-ld:Subscription:42",
          },
        });
      },
    );
    const client: WebPushGeonicdbClient = { requestRaw };

    await expect(
      registerWebPushSubscription(pushJson, {
        client,
        siteOrigin: "https://geolonia.github.io",
      }),
    ).resolves.toBe("urn:ngsi-ld:Subscription:42");

    expect(requestRaw).toHaveBeenCalledTimes(1);
    const body = postedBody as {
      type: string;
      notification: { endpoint: { protocol: string }; attributes: string[] };
    };
    expect(body.type).toBe("Subscription");
    expect(body.notification.endpoint.protocol).toBe("webpush");
    expect(body.notification.attributes).toEqual(["language"]);
  });

  it("rejects private push endpoints before calling GeonicDB (near-miss)", async () => {
    const requestRaw = vi.fn();
    await expect(
      registerWebPushSubscription(
        {
          ...pushJson,
          endpoint: "https://127.0.0.1/push",
        },
        { client: { requestRaw } },
      ),
    ).rejects.toThrow(/host is not allowed/);
    expect(requestRaw).not.toHaveBeenCalled();
  });

  it("DELETEs subscription by id", async () => {
    const requestRaw = vi.fn(async () => new Response(null, { status: 204 }));
    await unregisterWebPushSubscription("urn:ngsi-ld:Subscription:42", {
      client: { requestRaw },
    });
    expect(requestRaw).toHaveBeenCalledWith(
      "DELETE",
      "/ngsi-ld/v1/subscriptions/urn%3Angsi-ld%3ASubscription%3A42",
    );
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

  it("sets and clears app badge around notification (#41)", () => {
    const pushHandler = sw.slice(
      sw.indexOf('self.addEventListener("push"'),
      sw.indexOf('self.addEventListener("notificationclick"'),
    );
    const clickHandler = sw.slice(
      sw.indexOf('self.addEventListener("notificationclick"'),
    );

    expect(pushHandler).toMatch(/setAppBadgeSafely/);
    expect(clickHandler).toMatch(/await resetUnreadBadge\(\)/);
    expect(sw).toMatch(/nav\.setAppBadge/);
    expect(sw).toMatch(/nav\.clearAppBadge/);
  });

  it("passes numeric unread count to setAppBadge (#45 regression)", () => {
    // 引数なし setAppBadge() は iOS でバッジが描画されない
    expect(sw).not.toMatch(/nav\.setAppBadge\(\s*\)/);
    expect(sw).toMatch(/nav\.setAppBadge\(\s*[a-zA-Z_]\w*\s*\)/);
    // 1 引数ラッパ経由（生成後は WithNav 正本 + count ラッパ）
    expect(sw).toMatch(/async function setAppBadgeSafely\(\s*count\s*\)/);
    expect(sw).toMatch(/["']\/unread-count["']/);
    expect(sw).toMatch(/RESET_UNREAD_COUNT/);
    const pushHandler = sw.slice(
      sw.indexOf('self.addEventListener("push"'),
      sw.indexOf('self.addEventListener("notificationclick"'),
    );
    expect(pushHandler).toMatch(/bumpUnreadCountState|incrementUnreadCount/);
  });

  it("writeUnreadCount failures do not block clearAppBadge (#45 audit)", () => {
    const writeFn = sw.slice(
      sw.indexOf("async function writeUnreadCount"),
      sw.indexOf("/** 並行 push"),
    );
    const resetFn = sw.slice(
      sw.indexOf("async function resetUnreadBadge"),
      sw.indexOf('self.addEventListener("install"'),
    );
    expect(writeFn).toMatch(/try\s*\{/);
    // tsc は catch { を catch (_a) { に下げうる
    expect(writeFn).toMatch(/catch\s*(\(\w*\)\s*)?\{/);
    expect(resetFn).toMatch(/clearAppBadgeSafely|clearBadge/);
    expect(resetFn).toMatch(/runUnreadExclusive/);
    // clear が write の後にあり、write の try 外でも呼ばれる
    const clearIdx = Math.max(
      resetFn.indexOf("clearBadge"),
      resetFn.indexOf("clearAppBadgeSafely"),
    );
    const writeCallIdx = resetFn.indexOf("writeUnreadCount");
    expect(writeCallIdx).toBeGreaterThanOrEqual(0);
    expect(clearIdx).toBeGreaterThan(writeCallIdx);
  });

  it("serializes unread RMW via runUnreadExclusive (#45 CodeRabbit)", () => {
    expect(sw).toMatch(/runUnreadExclusive/);
    const pushHandler = sw.slice(
      sw.indexOf('self.addEventListener("push"'),
      sw.indexOf('self.addEventListener("notificationclick"'),
    );
    expect(pushHandler).toMatch(/runUnreadExclusive/);
  });

  it("is generated from web-push-sw-logic (#42 freshness)", async () => {
    const { buildServiceWorkerSource } = await import(
      pathToFileURL(path.resolve(__dirname, "../../scripts/generate-sw.mjs"))
        .href
    );
    const expected = buildServiceWorkerSource();
    expect(sw.replace(/\r\n/g, "\n")).toBe(expected);
  });

  it("rejects module syntax left in generated output (#42 fail-closed)", async () => {
    const { assertClassicScriptOutput, assertBadgeRenameConsistency } =
      await import(
        pathToFileURL(path.resolve(__dirname, "../../scripts/generate-sw.mjs"))
          .href
      );
    expect(() => assertClassicScriptOutput("const x = 1;\n")).not.toThrow();
    // コメント内の import 言及は許容
    expect(() =>
      assertClassicScriptOutput("/* do not import */\nconst x = 1;\n"),
    ).not.toThrow();
    // near-miss: require( が残ると classic SW として壊れる
    expect(() =>
      assertClassicScriptOutput('const m = require("fs");\n'),
    ).toThrow(/require\(/);
    expect(() =>
      assertClassicScriptOutput('const m = await import("./x.js");\n'),
    ).toThrow(/import/);
    expect(() => assertClassicScriptOutput("export const x = 1;\n")).toThrow(
      /export/,
    );

    const good = `async function setAppBadgeSafelyWithNav(nav, count) {}
async function clearAppBadgeSafelyWithNav(nav) {}
async function setAppBadgeSafely(count) {
  await setAppBadgeSafelyWithNav(self.navigator, count);
}
async function clearAppBadgeSafely() {
  await clearAppBadgeSafelyWithNav(self.navigator);
}
`;
    expect(() => assertBadgeRenameConsistency(good)).not.toThrow();
    expect(() =>
      assertBadgeRenameConsistency(
        good.replace(/setAppBadgeSafelyWithNav/g, "setAppBadgeSafely"),
      ),
    ).toThrow(/duplicate top-level function|missing renamed/);
  });
});

describe("BOSAI_LIVE / WEBPUSH entity types single source (#48)", () => {
  it("frontend re-export matches shared module", async () => {
    const {
      BOSAI_LIVE_ENTITY_TYPES: liveFromSrc,
      BOSAI_WEBPUSH_ENTITY_TYPES: pushFromSrc,
    } = await import("@/lib/bosai-live-entity-types");
    const {
      BOSAI_LIVE_ENTITY_TYPES: liveFromShared,
      BOSAI_WEBPUSH_ENTITY_TYPES: pushFromShared,
    } = await import("../../shared/bosai-live-entity-types");
    expect(liveFromSrc).toBe(liveFromShared);
    expect(pushFromSrc).toBe(pushFromShared);
    expect([...liveFromShared]).toEqual([
      "bosai-Notice",
      "bosai-EmergencyBanner",
      "bosai-AlertLevel",
    ]);
    expect([...pushFromShared]).toEqual(["bosai-AlertLevel"]);
  });
});
