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
  });

  it("maps English banner severity variants from data-model.md", () => {
    expect(Object.keys(BANNER_VARIANT_COLORS)).toEqual([
      "emergency-safety",
      "evacuation-order",
      "elderly-evacuation",
      "advisory",
      "notice",
    ]);
  });

  it("uses dark text on yellow level 2 for contrast", () => {
    expect(ALERT_LEVEL_COLORS[2].text).toBe("#1a1a1a");
  });

  it("provides localized banner labels for each language", () => {
    for (const lang of SITE_LANGUAGES) {
      expect(
        UI_STRINGS[lang].bannerVariants["emergency-safety"].length,
      ).toBeGreaterThan(0);
    }
  });
});
