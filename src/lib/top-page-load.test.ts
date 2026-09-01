import { describe, expect, it } from "vitest";
import { mockPaths, viewStatus } from "@/lib/top-page-load";

describe("mockPaths", () => {
  it("encodes language codes for fetch URLs", () => {
    expect(mockPaths("ja-easy").alertLevel).toBe(
      "/mock/alert-level/ja-easy.json",
    );
    expect(mockPaths("zh-CN").notices).toBe("/mock/notices/zh-CN.json");
  });
});

describe("viewStatus", () => {
  it("stays loading until dataLang matches the current language", () => {
    expect(
      viewStatus(
        { status: "ready", dataLang: "ja", data: { ok: true } },
        "ja-easy",
      ),
    ).toBe("loading");
  });

  it("surfaces ready/error only for the active language", () => {
    expect(
      viewStatus(
        { status: "ready", dataLang: "ja-easy", data: { ok: true } },
        "ja-easy",
      ),
    ).toBe("ready");
    expect(
      viewStatus({ status: "error", dataLang: "en", data: null }, "en"),
    ).toBe("error");
  });

  // near-miss: ready data for another language must not leak through
  it("does not treat other-language ready state as ready", () => {
    expect(
      viewStatus({ status: "ready", dataLang: "ko", data: 1 }, "vi"),
    ).toBe("loading");
  });
});
