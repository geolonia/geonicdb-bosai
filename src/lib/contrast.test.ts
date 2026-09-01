import { describe, expect, it } from "vitest";
import {
  ALERT_LEVEL_COLORS,
  BANNER_VARIANT_COLORS,
} from "@/config/alert-colors";
import { contrastRatio } from "@/lib/contrast";

describe("contrast helpers", () => {
  it("meets AA for yellow alert level 2 text on #F2E700", () => {
    const { bg, text } = ALERT_LEVEL_COLORS[2];
    expect(bg.toUpperCase()).toBe("#F2E700");
    expect(contrastRatio(text, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("meets AA for advisory banner (yellow) text", () => {
    const { bg, text } = BANNER_VARIANT_COLORS.advisory;
    expect(contrastRatio(text, bg)).toBeGreaterThanOrEqual(4.5);
  });

  // near-miss: white text on yellow would fail AA
  it("rejects white text on yellow as insufficient contrast", () => {
    expect(contrastRatio("#FFFFFF", "#F2E700")).toBeLessThan(4.5);
  });
});
