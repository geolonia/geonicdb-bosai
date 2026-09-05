import { describe, expect, it } from "vitest";
import { assertWebPushCloudFrontContext } from "./assert-webpush-cloudfront-context";

describe("assertWebPushCloudFrontContext", () => {
  it("no-ops when Web Push is off", () => {
    expect(() =>
      assertWebPushCloudFrontContext({
        enableWebPush: false,
        enableWebPushCloudFront: false,
      }),
    ).not.toThrow();
  });

  it("rejects enableWebPush without geonicdbUrl (standalone silent no-proxy)", () => {
    expect(() =>
      assertWebPushCloudFrontContext({
        enableWebPush: true,
        enableWebPushCloudFront: false,
        geonicdbUrlRaw: undefined,
      }),
    ).toThrow(/enableWebPush=true requires -c geonicdbUrl/);
    expect(() =>
      assertWebPushCloudFrontContext({
        enableWebPush: true,
        enableWebPushCloudFront: false,
        geonicdbUrlRaw: "  ",
      }),
    ).toThrow(/enableWebPush=true requires -c geonicdbUrl/);
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

  it("rejects CloudFront flag without geonicdbUrl", () => {
    expect(() =>
      assertWebPushCloudFrontContext({
        enableWebPush: true,
        enableWebPushCloudFront: true,
        geonicdbUrlRaw: undefined,
      }),
    ).toThrow(/enableWebPush=true requires -c geonicdbUrl/);
  });

  it("accepts enableWebPush + geonicdbUrl (CloudFront off)", () => {
    expect(() =>
      assertWebPushCloudFrontContext({
        enableWebPush: true,
        enableWebPushCloudFront: false,
        geonicdbUrlRaw: "https://geonicdb.example.example",
      }),
    ).not.toThrow();
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
