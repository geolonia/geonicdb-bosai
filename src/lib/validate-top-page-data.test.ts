import { describe, expect, it } from "vitest";
import {
  isSafeHref,
  parseAlertLevel,
  parseEmergencyBanner,
  parseNoticeList,
  readNgsiLdValue,
  validateEmergencyBannerLinkHref,
} from "@/lib/validate-top-page-data";

const baseBanner = {
  id: "urn:ngsi-ld:bosai-EmergencyBanner:current-banner:ja",
  type: "bosai-EmergencyBanner",
  language: "ja",
  translationGroup: "current-banner",
  variant: "notice",
  heading: "現在、特別な警戒情報等はありません",
  body: "特に発令中の避難情報はありません。",
  linkHref: null,
  linkText: null,
  updatedAt: "2026-09-01T09:00:00+09:00",
};

describe("readNgsiLdValue", () => {
  it("unwraps Property values and passes through keyValues", () => {
    expect(readNgsiLdValue({ type: "Property", value: "ja" })).toBe("ja");
    expect(readNgsiLdValue("ja")).toBe("ja");
  });
});

describe("parseEmergencyBanner", () => {
  it("parses keyValues notice banner", () => {
    const data = parseEmergencyBanner(baseBanner);
    expect(data.variant).toBe("notice");
    expect(data.language).toBe("ja");
    expect(data.translationGroup).toBe("current-banner");
    expect(data.linkHref).toBeNull();
  });

  it("accepts https linkHref", () => {
    const data = parseEmergencyBanner({
      ...baseBanner,
      variant: "evacuation-order",
      heading: "避難指示が発令されました",
      body: "直ちに避難してください。",
      linkHref: "https://example.com/evacuation",
      linkText: "詳細",
    });
    expect(data.linkHref).toBe("https://example.com/evacuation");
  });

  it("accepts relative path linkHref", () => {
    const data = parseEmergencyBanner({
      ...baseBanner,
      variant: "advisory",
      linkHref: "/evacuation",
      linkText: "避難情報",
    });
    expect(data.linkHref).toBe("/evacuation");
  });

  it("parses normalized Property attributes", () => {
    const data = parseEmergencyBanner({
      id: baseBanner.id,
      type: "bosai-EmergencyBanner",
      language: { type: "Property", value: "en" },
      translationGroup: { type: "Property", value: "current-banner" },
      variant: { type: "Property", value: "notice" },
      heading: { type: "Property", value: "No special warnings" },
      body: { type: "Property", value: "All clear." },
      linkHref: { type: "Property", value: null },
      linkText: { type: "Property", value: null },
      updatedAt: { type: "Property", value: "2026-09-01T09:00:00+09:00" },
    });
    expect(data.language).toBe("en");
    expect(data.heading).toBe("No special warnings");
  });

  it("rejects javascript: scheme in linkHref", () => {
    expect(() =>
      parseEmergencyBanner({
        ...baseBanner,
        linkHref: "javascript:alert(1)",
        linkText: "詳細",
      }),
    ).toThrow(/must use http, https, or a relative path/);
  });

  it("rejects ftp: scheme in linkHref", () => {
    expect(() =>
      parseEmergencyBanner({
        ...baseBanner,
        linkHref: "ftp://example.com/file",
        linkText: "詳細",
      }),
    ).toThrow(/must use http, https, or a relative path/);
  });

  // near-miss: protocol-relative URL
  it("rejects protocol-relative linkHref", () => {
    expect(() =>
      parseEmergencyBanner({
        ...baseBanner,
        linkHref: "//evil.example.com/phish",
        linkText: "詳細",
      }),
    ).toThrow(/protocol-relative/);
  });

  it("rejects unknown severity variant", () => {
    expect(() =>
      parseEmergencyBanner({ ...baseBanner, variant: "情報" }),
    ).toThrow(/Invalid banner variant/);
  });

  // near-miss: legacy Japanese variant labels are no longer accepted
  it("rejects legacy Japanese variant labels", () => {
    expect(() =>
      parseEmergencyBanner({ ...baseBanner, variant: "お知らせ" }),
    ).toThrow(/Invalid banner variant/);
  });

  it("rejects invalid updatedAt", () => {
    expect(() =>
      parseEmergencyBanner({ ...baseBanner, updatedAt: "not-a-date" }),
    ).toThrow(/valid ISO date-time/);
  });

  it("rejects mismatched language", () => {
    expect(() =>
      parseEmergencyBanner({ ...baseBanner, language: "fr" }),
    ).toThrow(/invalid language/);
  });
});

describe("validateEmergencyBannerLinkHref / isSafeHref", () => {
  it("accepts http URLs", () => {
    expect(() =>
      validateEmergencyBannerLinkHref("http://localhost:3000/info"),
    ).not.toThrow();
    expect(isSafeHref("http://localhost:3000/info")).toBe(true);
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
  });
});

describe("parseAlertLevel", () => {
  const base = {
    id: "urn:ngsi-ld:bosai-AlertLevel:current-alert-level:ja",
    type: "bosai-AlertLevel",
    language: "ja",
    translationGroup: "current-alert-level",
    level: 1,
    label: "警戒レベル1：早期注意情報（平時）",
    body: "災害への心構えを高める",
    updatedAt: "2026-09-01T09:00:00+09:00",
  };

  it("parses level 1 payload", () => {
    expect(parseAlertLevel(base).level).toBe(1);
  });

  it("rejects level 0", () => {
    expect(() => parseAlertLevel({ ...base, level: 0 })).toThrow(
      /Invalid alert level/,
    );
  });

  // near-miss: level 6 is out of range
  it("rejects level 6", () => {
    expect(() => parseAlertLevel({ ...base, level: 6 })).toThrow(
      /Invalid alert level/,
    );
  });

  it("rejects invalid updatedAt", () => {
    expect(() => parseAlertLevel({ ...base, updatedAt: "invalid" })).toThrow(
      /valid ISO date-time/,
    );
  });
});

describe("parseNoticeList", () => {
  const notice = {
    id: "urn:ngsi-ld:bosai-Notice:2026-bousai-training:ja",
    type: "bosai-Notice",
    language: "ja",
    translationGroup: "2026-bousai-training",
    title: "防災訓練のお知らせ",
    body: "9月第1土曜日に実施\n\n[詳細](/evacuation)",
    publishedAt: "2026-08-28T10:00:00+09:00",
    updatedAt: "2026-08-28T10:00:00+09:00",
  };

  it("parses notice items with markdown body", () => {
    const data = parseNoticeList({ items: [notice] });
    expect(data.items).toHaveLength(1);
    expect(data.items[0]?.body).toContain("[詳細]");
  });

  it("parses multilingual-launch mock shape", () => {
    const data = parseNoticeList({
      items: [
        {
          id: "urn:ngsi-ld:bosai-Notice:2026-multilingual-launch:ja",
          type: "bosai-Notice",
          language: "ja",
          translationGroup: "2026-multilingual-launch",
          title: "多言語対応を開始しました",
          body: "本サイトは新たに **6つの言語** に対応しました。[方針](/accessibility)",
          publishedAt: "2026-09-01T15:00:00+09:00",
          updatedAt: "2026-09-01T15:00:00+09:00",
        },
      ],
    });
    expect(data.items[0]?.translationGroup).toBe("2026-multilingual-launch");
  });

  it("parses Property-form entities as returned by useLdEntities / getEntities", () => {
    const banner = parseEmergencyBanner({
      id: "urn:ngsi-ld:bosai-EmergencyBanner:current-banner:ja",
      type: "bosai-EmergencyBanner",
      language: { type: "Property", value: "ja" },
      translationGroup: { type: "Property", value: "current-banner" },
      variant: { type: "Property", value: "notice" },
      heading: { type: "Property", value: "高齢者等避難を解除しました" },
      body: {
        type: "Property",
        value: "高齢者等避難を解除しました。今後の気象情報にご注意ください。",
      },
      linkHref: { type: "Property", value: "/evacuation" },
      linkText: { type: "Property", value: "避難情報を見る" },
      updatedAt: { type: "Property", value: "2026-09-01T18:00:00+09:00" },
    });
    expect(banner.heading).toBe("高齢者等避難を解除しました");
    expect(banner.variant).toBe("notice");

    const alert = parseAlertLevel({
      id: "urn:ngsi-ld:bosai-AlertLevel:current-alert-level:ja",
      type: "bosai-AlertLevel",
      language: { type: "Property", value: "ja" },
      translationGroup: { type: "Property", value: "current-alert-level" },
      level: { type: "Property", value: 1 },
      label: { type: "Property", value: "警戒レベル1：早期注意情報（平時）" },
      body: {
        type: "Property",
        value: "高齢者等避難は解除されました。災害への心構えを引き続き高めてください",
      },
      updatedAt: { type: "Property", value: "2026-09-01T18:00:00+09:00" },
    });
    expect(alert.level).toBe(1);
    expect(alert.label).toContain("警戒レベル1");

    const notices = parseNoticeList([
      {
        id: "urn:ngsi-ld:bosai-Notice:2026-multilingual-launch:ja",
        type: "bosai-Notice",
        language: { type: "Property", value: "ja" },
        translationGroup: {
          type: "Property",
          value: "2026-multilingual-launch",
        },
        title: { type: "Property", value: "多言語対応を開始しました" },
        body: { type: "Property", value: "本文" },
        publishedAt: { type: "Property", value: "2026-09-01T15:00:00+09:00" },
        updatedAt: { type: "Property", value: "2026-09-01T15:00:00+09:00" },
      },
    ]);
    expect(notices.items).toHaveLength(1);
  });

  it("parses a bare array payload", () => {
    expect(parseNoticeList([notice]).items).toHaveLength(1);
  });

  it("rejects invalid updatedAt on notice item", () => {
    expect(() =>
      parseNoticeList({
        items: [{ ...notice, updatedAt: "not-a-date" }],
      }),
    ).toThrow(/valid ISO date-time/);
  });
});
