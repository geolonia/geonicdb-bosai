import { describe, expect, it } from "vitest";
import { resolveLocalizedString } from "@/lib/localized-string";

describe("resolveLocalizedString", () => {
  it("returns plain strings unchanged", () => {
    expect(resolveLocalizedString("hello", "en")).toBe("hello");
  });

  it("resolves requested language with ja fallback", () => {
    expect(resolveLocalizedString({ ja: "日本語", en: "English" }, "en")).toBe(
      "English",
    );
    expect(resolveLocalizedString({ ja: "日本語", en: "English" }, "ja-easy")).toBe(
      "日本語",
    );
  });
});
