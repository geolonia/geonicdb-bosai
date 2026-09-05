import { describe, expect, it } from "vitest";
import {
  assertSubscriptionId,
  BOSAI_LIVE_ENTITY_TYPES,
  buildNgsiLdWebPushSubscription,
  extractSubscriptionId,
  parsePushSubscription,
  ValidationError,
} from "../lambda/webpush-proxy/build-subscription";

const VALID = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc",
  keys: {
    p256dh:
      "BPj1o6nm3Nh8fG7cdgKishjBD2PZTi7uGEEWlDB0bx6EecwtEw_jChwtibONK47AfA_0Z7nNF70DTI9v1pEMVrc",
    auth: "GbDpg-0-pZScFyrjK6ibEw",
  },
};

describe("parsePushSubscription", () => {
  it("accepts a PushSubscription-shaped body", () => {
    expect(parsePushSubscription(VALID)).toEqual(VALID);
  });

  it("rejects http:// endpoint (near-miss: GeonicDB requires https)", () => {
    expect(() =>
      parsePushSubscription({
        ...VALID,
        endpoint: "http://fcm.googleapis.com/fcm/send/insecure",
      }),
    ).toThrow(ValidationError);
  });

  it("rejects missing keys.auth", () => {
    expect(() =>
      parsePushSubscription({
        endpoint: VALID.endpoint,
        keys: { p256dh: VALID.keys.p256dh },
      }),
    ).toThrow(/keys.auth/);
  });
});

describe("buildNgsiLdWebPushSubscription", () => {
  it("shapes NGSI-LD webpush subscription for the three bosai live types", () => {
    const body = buildNgsiLdWebPushSubscription(VALID, {
      siteOrigin: "https://bosai.example.jp",
    });
    expect(body.type).toBe("Subscription");
    expect(body.entities).toEqual(
      BOSAI_LIVE_ENTITY_TYPES.map((type) => ({ type })),
    );
    // フロントの BOSAI_LIVE_ENTITY_TYPES と同一であること（src/lib/bosai-live-entity-types.ts）
    expect([...BOSAI_LIVE_ENTITY_TYPES]).toEqual([
      "bosai-Notice",
      "bosai-EmergencyBanner",
      "bosai-AlertLevel",
    ]);
    const notification = body.notification as {
      attributes: string[];
      endpoint: {
        uri: string;
        protocol: string;
        webpush: { keys: { p256dh: string; auth: string }; urgency: string };
      };
    };
    expect(notification.attributes).toEqual(["language"]);
    expect(notification.endpoint.uri).toBe(VALID.endpoint);
    expect(notification.endpoint.protocol).toBe("webpush");
    expect(notification.endpoint.webpush.keys).toEqual(VALID.keys);
    expect(notification.endpoint.webpush.urgency).toBe("high");
  });
});

describe("extractSubscriptionId / assertSubscriptionId", () => {
  it("reads id from Location header", () => {
    expect(
      extractSubscriptionId(
        "/ngsi-ld/v1/subscriptions/urn:ngsi-ld:Subscription:1",
        null,
      ),
    ).toBe("urn:ngsi-ld:Subscription:1");
  });

  it("rejects path traversal subscription ids (near-miss)", () => {
    expect(() => assertSubscriptionId("../etc/passwd")).toThrow(
      ValidationError,
    );
    expect(() => assertSubscriptionId("a/b")).toThrow(ValidationError);
  });
});
