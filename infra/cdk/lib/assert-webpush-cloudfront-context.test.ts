import { describe, expect, it } from "vitest";
import { assertWebPushCloudFrontContext } from "./assert-webpush-cloudfront-context";

describe("assertWebPushCloudFrontContext", () => {
  it("no-ops when CloudFront wiring is off", () => {
    expect(() =>
      assertWebPushCloudFrontContext({
        enableWebPush: false,
        enableWebPushCloudFront: false,
      }),
    ).not.toThrow();
  });

  it("rejects CloudFront flag without enableWebPush", () => {
    expect(() =>
      assertWebPushCloudFrontContext({
        enableWebPush: false,
        enableWebPushCloudFront: true,
        geonicdbUrlRaw: "https://geonicdb.example.example",
      }),
    ).toThrow(/requires enableWebPush=true/);
  });

  it("rejects CloudFront flag without geonicdbUrl (near-miss: silent no-proxy)", () => {
    expect(() =>
      assertWebPushCloudFrontContext({
        enableWebPush: true,
        enableWebPushCloudFront: true,
        geonicdbUrlRaw: undefined,
      }),
    ).toThrow(/requires -c geonicdbUrl/);
    expect(() =>
      assertWebPushCloudFrontContext({
        enableWebPush: true,
        enableWebPushCloudFront: true,
        geonicdbUrlRaw: "   ",
      }),
    ).toThrow(/requires -c geonicdbUrl/);
  });

  it("accepts enableWebPush + CloudFront + geonicdbUrl", () => {
    expect(() =>
      assertWebPushCloudFrontContext({
        enableWebPush: true,
        enableWebPushCloudFront: true,
        geonicdbUrlRaw: "https://geonicdb.example.example",
      }),
    ).not.toThrow();
  });
});
