import { describe, expect, it } from "vitest";
import {
  assertAbsoluteHttpOrigin,
  assertAbsoluteHttpUrl,
} from "./assert-absolute-http-origin";

describe("assertAbsoluteHttpOrigin / assertAbsoluteHttpUrl", () => {
  it("returns origin for absolute https URL", () => {
    expect(
      assertAbsoluteHttpOrigin(
        "https://xxx.lambda-url.ap-northeast-1.on.aws/",
        "webPushRegisterUrl",
      ),
    ).toBe("https://xxx.lambda-url.ap-northeast-1.on.aws");
  });

  it("keeps path on assertAbsoluteHttpUrl", () => {
    expect(
      assertAbsoluteHttpUrl(
        "https://geonicdb.example.jp/prefix/",
        "webPush.geonicdbUrl",
      ),
    ).toBe("https://geonicdb.example.jp/prefix");
  });

  it("rejects relative path with a clear message (near-miss DX trap)", () => {
    expect(() =>
      assertAbsoluteHttpOrigin("/api/webpush", "webPushRegisterUrl"),
    ).toThrow(/absolute http\(s\) URL.*relative path: \/api\/webpush/);
    expect(() =>
      assertAbsoluteHttpUrl("/api/webpush", "webPush.geonicdbUrl"),
    ).toThrow(/relative path: \/api\/webpush/);
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
