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
  it("defines six languages in priority order", () => {
    expect([...SITE_LANGUAGES]).toEqual([
      "ja",
      "ja-easy",
      "en",
      "zh-CN",
      "vi",
      "ko",
    ]);
  });

  it("maps each language to the correct html lang attribute", () => {
    expect(toHtmlLang("ja")).toBe("ja");
    expect(toHtmlLang("ja-easy")).toBe("ja");
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

  it("provides date locales for all languages", () => {
    expect(toDateLocale("zh-CN")).toBe("zh-CN");
    expect(toDateLocale("vi")).toBe("vi-VN");
    expect(toDateLocale("ko")).toBe("ko-KR");
    expect(toDateLocale("ja-easy")).toBe("ja-JP");
  });
});

describe("UI_STRINGS i18n coverage", () => {
  it("has an independent string set for every site language", () => {
    for (const lang of SITE_LANGUAGES) {
      expect(UI_STRINGS[lang].siteTitle.length).toBeGreaterThan(0);
      expect(UI_STRINGS[lang].alertLevelMeta[5].action.length).toBeGreaterThan(
        0,
      );
      expect(UI_STRINGS[lang].bannerVariants.緊急安全確保.length).toBeGreaterThan(
        0,
      );
      expect(SITE_LANGUAGE_LABELS[lang].length).toBeGreaterThan(0);
    }
  });

  it("does not reuse Japanese banner labels for ja-easy action copy", () => {
    expect(UI_STRINGS["ja-easy"].bannerVariants.緊急安全確保).not.toBe(
      UI_STRINGS.ja.bannerVariants.緊急安全確保,
    );
    expect(UI_STRINGS["ja-easy"].bannerVariants.緊急安全確保).toMatch(/あんぜん/);
  });

  it("provides distinct zh-CN / vi / ko site titles", () => {
    expect(UI_STRINGS["zh-CN"].siteTitle).toBe("防灾信息");
    expect(UI_STRINGS.vi.siteTitle).toMatch(/thiên tai/i);
    expect(UI_STRINGS.ko.siteTitle).toBe("방재 정보");
  });
});
