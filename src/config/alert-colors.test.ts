import { describe, expect, it } from "vitest";
import {
  ALERT_LEVEL_COLORS,
  BANNER_VARIANT_COLORS,
} from "@/config/alert-colors";
import { SITE_LANGUAGES } from "@/config/site-language";
import { UI_STRINGS } from "@/config/ui-strings";

describe("alert-colors", () => {
  it("defines all five alert levels with text colors", () => {
    expect(Object.keys(ALERT_LEVEL_COLORS)).toEqual(["1", "2", "3", "4", "5"]);
    for (const level of [1, 2, 3, 4, 5] as const) {
      expect(UI_STRINGS.ja.alertLevelMeta[level].action.length).toBeGreaterThan(
        0,
      );
    }
  });

  it("maps all five banner severity variants", () => {
    expect(Object.keys(BANNER_VARIANT_COLORS)).toEqual([
      "緊急安全確保",
      "避難指示",
      "高齢者等避難",
      "注意喚起",
      "お知らせ",
    ]);
  });

  it("uses dark text on yellow level 2 for contrast", () => {
    expect(ALERT_LEVEL_COLORS[2].text).toBe("#1a1a1a");
  });

  it("provides localized alert level metadata for each language", () => {
    for (const lang of SITE_LANGUAGES) {
      expect(UI_STRINGS[lang].alertLevelMeta[5].action.length).toBeGreaterThan(
        0,
      );
    }
  });
});
