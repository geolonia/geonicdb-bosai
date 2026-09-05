import { describe, expect, it } from "vitest";
import {
  detectSiteLanguage,
  isSiteLanguage,
  matchSiteLanguage,
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

describe("matchSiteLanguage", () => {
  it("matches exact tags case-insensitively", () => {
    expect(matchSiteLanguage("ja")).toBe("ja");
    expect(matchSiteLanguage("zh-cn")).toBe("zh-CN");
    expect(matchSiteLanguage("KO")).toBe("ko");
  });

  it("matches by primary subtag for regional variants", () => {
    expect(matchSiteLanguage("ja-JP")).toBe("ja");
    expect(matchSiteLanguage("en-US")).toBe("en");
    expect(matchSiteLanguage("en-GB")).toBe("en");
    expect(matchSiteLanguage("vi-VN")).toBe("vi");
    expect(matchSiteLanguage("ko-KR")).toBe("ko");
  });

  it("maps simplified Chinese variants to zh-CN", () => {
    expect(matchSiteLanguage("zh")).toBe("zh-CN");
    expect(matchSiteLanguage("zh-Hans")).toBe("zh-CN");
    expect(matchSiteLanguage("zh-Hans-CN")).toBe("zh-CN");
  });

  // near-miss: 繁体字は簡体字とは別の書記体系。あえて一致させない
  it("does not map traditional Chinese to zh-CN", () => {
    expect(matchSiteLanguage("zh-TW")).toBeNull();
    expect(matchSiteLanguage("zh-Hant")).toBeNull();
    expect(matchSiteLanguage("zh-HK")).toBeNull();
    expect(matchSiteLanguage("zh-Hant-TW")).toBeNull();
  });

  it("returns null for unsupported languages", () => {
    expect(matchSiteLanguage("pt-BR")).toBeNull();
    expect(matchSiteLanguage("ne")).toBeNull();
    expect(matchSiteLanguage("")).toBeNull();
  });
});

describe("detectSiteLanguage", () => {
  it("picks the first supported language in browser preference order", () => {
    expect(detectSiteLanguage(["pt-BR", "vi-VN", "en-US"])).toBe("vi");
  });

  it("returns null when nothing matches", () => {
    expect(detectSiteLanguage(["pt-BR", "ne-NP"])).toBeNull();
    expect(detectSiteLanguage([])).toBeNull();
    expect(detectSiteLanguage(undefined)).toBeNull();
  });

  // near-miss: 繁体字しか設定していない環境は zh-CN を選ばず、後続候補に委ねる
  it("skips traditional Chinese and falls through to the next candidate", () => {
    expect(detectSiteLanguage(["zh-TW", "en-US"])).toBe("en");
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
      expect(UI_STRINGS[lang].a2hsTitle.length).toBeGreaterThan(0);
      expect(UI_STRINGS[lang].a2hsIosHint.length).toBeGreaterThan(0);
      expect(UI_STRINGS[lang].a2hsDismissLabel.length).toBeGreaterThan(0);
    }
  });

  it("provides distinct zh-CN / vi / ko site titles", () => {
    expect(UI_STRINGS["zh-CN"].siteTitle).toBe("防灾信息");
    expect(UI_STRINGS.vi.siteTitle).toMatch(/thiên tai/i);
    expect(UI_STRINGS.ko.siteTitle).toBe("방재 정보");
  });
});
