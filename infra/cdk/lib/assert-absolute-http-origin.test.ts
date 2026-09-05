import { describe, expect, it } from "vitest";
import {
  assertAbsoluteHttpOrigin,
  assertAbsoluteHttpUrl,
} from "./assert-absolute-http-origin";

describe("assertAbsoluteHttpOrigin / assertAbsoluteHttpUrl", () => {
  it("returns origin for absolute https URL", () => {
    expect(
      assertAbsoluteHttpOrigin(
        "https://geonicdb.example.example/",
        "geonicdbUrl",
      ),
    ).toBe("https://geonicdb.example.example");
  });

  it("keeps path on assertAbsoluteHttpUrl", () => {
    expect(
      assertAbsoluteHttpUrl(
        "https://geonicdb.example.jp/prefix/",
        "geonicdbUrl",
      ),
    ).toBe("https://geonicdb.example.jp/prefix");
  });

  it("rejects relative path with a clear message (near-miss DX trap)", () => {
    expect(() =>
      assertAbsoluteHttpOrigin("/relative/path", "geonicdbUrl"),
    ).toThrow(/absolute http\(s\) URL.*relative path: \/relative\/path/);
    expect(() =>
      assertAbsoluteHttpUrl("/relative/path", "geonicdbUrl"),
    ).toThrow(/relative path: \/relative\/path/);
  });

  it("rejects bare hostname without scheme", () => {
    expect(() =>
      assertAbsoluteHttpOrigin("bosai.example.jp", "siteOrigin"),
    ).toThrow(/valid absolute http\(s\) URL/);
  });

  it("returns undefined for empty", () => {
    expect(assertAbsoluteHttpOrigin(undefined, "x")).toBeUndefined();
    expect(assertAbsoluteHttpUrl("  ", "x")).toBeUndefined();
  });
});
