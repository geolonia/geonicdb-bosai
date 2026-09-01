import { afterEach, describe, expect, it } from "vitest";
import {
  getGeonicdbPublicClient,
  languagePropertyQuery,
  resetGeonicdbPublicClientForTests,
  resolveGeonicdbPublicConfig,
} from "@/lib/geonicdb-public-client";

describe("resolveGeonicdbPublicConfig", () => {
  it("resolves URL and tenant without an API key", () => {
    const config = resolveGeonicdbPublicConfig({
      NEXT_PUBLIC_GEONICDB_URL: "https://geonicdb.geolonia.com/",
      NEXT_PUBLIC_GEONICDB_TENANT: "miya",
    });
    expect(config).toEqual({
      baseUrl: "https://geonicdb.geolonia.com",
      tenant: "miya",
    });
  });

  it("rejects missing NEXT_PUBLIC_GEONICDB_URL", () => {
    expect(() => resolveGeonicdbPublicConfig({})).toThrow(
      /NEXT_PUBLIC_GEONICDB_URL is not set/,
    );
  });

  // near-miss: ftp は URL としては合法だが拒否
  it("rejects non-http(s) protocols", () => {
    expect(() =>
      resolveGeonicdbPublicConfig({
        NEXT_PUBLIC_GEONICDB_URL: "ftp://geonicdb.example.com",
      }),
    ).toThrow(/must use http or https/);
  });
});

describe("getGeonicdbPublicClient", () => {
  const prevUrl = process.env.NEXT_PUBLIC_GEONICDB_URL;
  const prevTenant = process.env.NEXT_PUBLIC_GEONICDB_TENANT;

  afterEach(() => {
    resetGeonicdbPublicClientForTests();
    if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_GEONICDB_URL;
    else process.env.NEXT_PUBLIC_GEONICDB_URL = prevUrl;
    if (prevTenant === undefined) {
      delete process.env.NEXT_PUBLIC_GEONICDB_TENANT;
    } else {
      process.env.NEXT_PUBLIC_GEONICDB_TENANT = prevTenant;
    }
  });

  it("creates an anonymous client singleton", () => {
    process.env.NEXT_PUBLIC_GEONICDB_URL = "https://geonicdb.geolonia.com";
    process.env.NEXT_PUBLIC_GEONICDB_TENANT = "miya";
    resetGeonicdbPublicClientForTests();
    const a = getGeonicdbPublicClient();
    const b = getGeonicdbPublicClient();
    expect(a).toBe(b);
  });
});

describe("languagePropertyQuery", () => {
  it("builds an NGSI-LD q filter for site languages", () => {
    expect(languagePropertyQuery("ja")).toBe('language=="ja"');
    expect(languagePropertyQuery("zh-CN")).toBe('language=="zh-CN"');
    expect(languagePropertyQuery("ko")).toBe('language=="ko"');
  });
});
