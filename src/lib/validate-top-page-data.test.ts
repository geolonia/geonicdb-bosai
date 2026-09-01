import { describe, expect, it } from "vitest";
import {
  parseAlertLevel,
  parseEmergencyBanner,
  parseNewsList,
  validateEmergencyBannerLinkHref,
} from "@/lib/validate-top-page-data";

describe("parseEmergencyBanner", () => {
  it("parses neutral default banner", () => {
    const data = parseEmergencyBanner({
      variant: "お知らせ",
      heading: "現在、特別な警戒情報等はありません",
      description: "特に発令中の避難情報はありません。",
      link: null,
      updatedAt: "2026-09-01T09:00:00+09:00",
    });
    expect(data.variant).toBe("お知らせ");
    expect(data.link).toBeNull();
  });

  it("accepts https link", () => {
    const data = parseEmergencyBanner({
      variant: "避難指示",
      heading: "避難指示が発令されました",
      description: "直ちに避難してください。",
      link: { href: "https://example.com/evacuation", label: "詳細" },
      updatedAt: "2026-09-01T09:00:00+09:00",
    });
    expect(data.link?.href).toBe("https://example.com/evacuation");
  });

  it("accepts relative path link", () => {
    const data = parseEmergencyBanner({
      variant: "注意喚起",
      heading: "注意喚起",
      description: "最新情報を確認してください。",
      link: { href: "/evacuation", label: "避難情報" },
      updatedAt: "2026-09-01T09:00:00+09:00",
    });
    expect(data.link?.href).toBe("/evacuation");
  });

  it("rejects javascript: scheme in link href", () => {
    expect(() =>
      parseEmergencyBanner({
        variant: "避難指示",
        heading: "test",
        description: "test",
        link: { href: "javascript:alert(1)", label: "詳細" },
        updatedAt: "2026-09-01T09:00:00+09:00",
      }),
    ).toThrow(/must use http, https, or a relative path/);
  });

  it("rejects ftp: scheme in link href", () => {
    expect(() =>
      parseEmergencyBanner({
        variant: "避難指示",
        heading: "test",
        description: "test",
        link: { href: "ftp://example.com/file", label: "詳細" },
        updatedAt: "2026-09-01T09:00:00+09:00",
      }),
    ).toThrow(/must use http, https, or a relative path/);
  });

  // near-miss: protocol-relative URL looks like a path but is not
  it("rejects protocol-relative link href", () => {
    expect(() =>
      parseEmergencyBanner({
        variant: "避難指示",
        heading: "test",
        description: "test",
        link: { href: "//evil.example.com/phish", label: "詳細" },
        updatedAt: "2026-09-01T09:00:00+09:00",
      }),
    ).toThrow(/protocol-relative/);
  });

  it("rejects unknown severity variant", () => {
    expect(() =>
      parseEmergencyBanner({
        variant: "情報",
        heading: "test",
        description: "test",
        link: null,
        updatedAt: "2026-09-01T09:00:00+09:00",
      }),
    ).toThrow(/Invalid banner variant/);
  });

  // near-miss: numeric string as variant name
  it("rejects numeric string as variant", () => {
    expect(() =>
      parseEmergencyBanner({
        variant: "3",
        heading: "test",
        description: "test",
        link: null,
        updatedAt: "2026-09-01T09:00:00+09:00",
      }),
    ).toThrow(/Invalid banner variant/);
  });

  it("rejects invalid updatedAt", () => {
    expect(() =>
      parseEmergencyBanner({
        variant: "お知らせ",
        heading: "test",
        description: "test",
        link: null,
        updatedAt: "not-a-date",
      }),
    ).toThrow(/valid ISO date-time/);
  });

  it("parses localized heading object", () => {
    const data = parseEmergencyBanner({
      variant: "お知らせ",
      heading: { ja: "日本語", en: "English" },
      description: "test",
      link: null,
      updatedAt: "2026-09-01T09:00:00+09:00",
    });
    expect(data.heading).toEqual({ ja: "日本語", en: "English" });
  });
});

describe("validateEmergencyBannerLinkHref", () => {
  it("accepts http URLs", () => {
    expect(() =>
      validateEmergencyBannerLinkHref("http://localhost:3000/info"),
    ).not.toThrow();
  });
});

describe("parseAlertLevel", () => {
  it("parses level 1 payload", () => {
    const data = parseAlertLevel({
      level: 1,
      label: "早期注意情報（平時）",
      updatedAt: "2026-09-01T09:00:00+09:00",
    });
    expect(data.level).toBe(1);
  });

  it("rejects level 0", () => {
    expect(() =>
      parseAlertLevel({
        level: 0,
        label: "invalid",
        updatedAt: "2026-09-01T09:00:00+09:00",
      }),
    ).toThrow(/Invalid alert level/);
  });

  // near-miss: level 6 is out of range
  it("rejects level 6", () => {
    expect(() =>
      parseAlertLevel({
        level: 6,
        label: "too high",
        updatedAt: "2026-09-01T09:00:00+09:00",
      }),
    ).toThrow(/Invalid alert level/);
  });

  it("rejects invalid updatedAt", () => {
    expect(() =>
      parseAlertLevel({
        level: 1,
        label: "test",
        updatedAt: "invalid",
      }),
    ).toThrow(/valid ISO date-time/);
  });
});

describe("parseNewsList", () => {
  it("parses news items with timestamps", () => {
    const data = parseNewsList({
      items: [
        {
          id: "news-001",
          title: "防災訓練のお知らせ",
          summary: "9月第1土曜日に実施",
          category: "お知らせ",
          updatedAt: "2026-08-28T10:00:00+09:00",
        },
      ],
    });
    expect(data.items).toHaveLength(1);
    expect(data.items[0]?.updatedAt).toContain("2026");
  });

  it("rejects invalid updatedAt on news item", () => {
    expect(() =>
      parseNewsList({
        items: [
          {
            id: "news-001",
            title: "test",
            summary: "test",
            category: "test",
            updatedAt: "not-a-date",
          },
        ],
      }),
    ).toThrow(/valid ISO date-time/);
  });
});
