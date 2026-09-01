import { describe, expect, it } from "vitest";
import {
  isSiteLanguage,
  SITE_LANGUAGE_LABELS,
  SITE_LANGUAGES,
  toDateLocale,
  toHtmlLang,
} from "@/config/site-language";
import { UI_STRINGS } from "@/config/ui-strings";

describe("site-language", () => {
  it("defines five languages in priority order", () => {
    expect([...SITE_LANGUAGES]).toEqual(["ja", "en", "zh-CN", "vi", "ko"]);
  });

  it("maps each language to the correct html lang attribute", () => {
    expect(toHtmlLang("ja")).toBe("ja");
    expect(toHtmlLang("en")).toBe("en");
    expect(toHtmlLang("zh-CN")).toBe("zh-CN");
    expect(toHtmlLang("vi")).toBe("vi");
    expect(toHtmlLang("ko")).toBe("ko");
  });

  // near-miss: zh is not the same as zh-CN for this site
  it("rejects bare zh as a site language", () => {
    expect(isSiteLanguage("zh")).toBe(false);
    expect(isSiteLanguage("zh-CN")).toBe(true);
  });

  // near-miss: 旧コード ja-easy は対応言語から外した
  it("rejects legacy ja-easy as a site language", () => {
    expect(isSiteLanguage("ja-easy")).toBe(false);
  });

  it("provides date locales for all languages", () => {
    expect(toDateLocale("ja")).toBe("ja-JP");
    expect(toDateLocale("zh-CN")).toBe("zh-CN");
    expect(toDateLocale("vi")).toBe("vi-VN");
    expect(toDateLocale("ko")).toBe("ko-KR");
  });
});

describe("UI_STRINGS i18n coverage", () => {
  it("has an independent string set for every site language", () => {
    for (const lang of SITE_LANGUAGES) {
      expect(UI_STRINGS[lang].siteTitle.length).toBeGreaterThan(0);
      expect(UI_STRINGS[lang].alertLevelMeta[5].action.length).toBeGreaterThan(
        0,
      );
      expect(
        UI_STRINGS[lang].bannerVariants["emergency-safety"].length,
      ).toBeGreaterThan(0);
      expect(SITE_LANGUAGE_LABELS[lang].length).toBeGreaterThan(0);
    }
  });

  it("provides distinct zh-CN / vi / ko site titles", () => {
    expect(UI_STRINGS["zh-CN"].siteTitle).toBe("防灾信息");
    expect(UI_STRINGS.vi.siteTitle).toMatch(/thiên tai/i);
    expect(UI_STRINGS.ko.siteTitle).toBe("방재 정보");
  });
});
