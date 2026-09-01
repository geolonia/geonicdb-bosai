import { describe, expect, it } from "vitest";
import {
  parseAlertLevel,
  parseEmergencyBanner,
  parseNewsList,
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

  // near-miss: level number string is not a valid variant name
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
});
