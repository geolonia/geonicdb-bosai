import { describe, expect, it } from "vitest";
import {
  assertSubscriptionId,
  BOSAI_LIVE_ENTITY_TYPES,
  buildNgsiLdWebPushSubscription,
  extractSubscriptionId,
  parsePushSubscription,
  ValidationError,
} from "@/lib/build-webpush-subscription";

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

  it('rejects "https://" without hostname', () => {
    expect(() =>
      parsePushSubscription({
        ...VALID,
        endpoint: "https://",
      }),
    ).toThrow(/https:\/\//);
  });

  it("rejects malformed endpoint URL", () => {
    expect(() =>
      parsePushSubscription({
        ...VALID,
        endpoint: "https://[bad",
      }),
    ).toThrow(/https:\/\//);
  });

  it("rejects localhost and loopback (SSRF denylist)", () => {
    for (const endpoint of [
      "https://localhost/push",
      "https://localhost./push",
      "https://127.0.0.1/push",
      "https://127.0.0.2/v1",
    ]) {
      expect(() => parsePushSubscription({ ...VALID, endpoint })).toThrow(
        /host is not allowed/,
      );
    }
  });

  it("rejects RFC1918 and link-local IPv4 (SSRF denylist)", () => {
    for (const endpoint of [
      "https://10.0.0.1/push",
      "https://172.16.5.1/push",
      "https://172.31.255.255/push",
      "https://192.168.1.1/push",
      "https://169.254.10.20/push",
    ]) {
      expect(() => parsePushSubscription({ ...VALID, endpoint })).toThrow(
        /host is not allowed/,
      );
    }
  });

  it("rejects internal DNS names (SSRF denylist)", () => {
    for (const endpoint of [
      "https://push.internal/v1",
      "https://meta.corp/push",
      "https://device.local/push",
    ]) {
      expect(() => parsePushSubscription({ ...VALID, endpoint })).toThrow(
        /host is not allowed/,
      );
    }
  });

  it("still accepts public Push Service hosts under denylist", () => {
    expect(
      parsePushSubscription({
        ...VALID,
        endpoint: "https://updates.push.services.mozilla.com/wpush/v2/abc",
      }).endpoint,
    ).toBe("https://updates.push.services.mozilla.com/wpush/v2/abc");
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
    // shared/bosai-live-entity-types.ts が単一の定義元
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
