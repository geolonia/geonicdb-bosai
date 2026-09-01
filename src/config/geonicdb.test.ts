import { describe, expect, it } from "vitest";
import {
  resolveGeonicdbConfig,
  resolveGeonicdbSyncConfig,
} from "@/config/geonicdb";

describe("resolveGeonicdbConfig", () => {
  it("resolves a valid https endpoint and strips trailing slashes", () => {
    const config = resolveGeonicdbConfig({
      GEONICDB_URL: "https://geonicdb.geolonia.com/",
      GEONICDB_API_KEY: "gdb_test_key",
      GEONICDB_TENANT: "demo",
    });

    expect(config).toEqual({
      baseUrl: "https://geonicdb.geolonia.com",
      apiKey: "gdb_test_key",
      tenant: "demo",
    });
  });

  it("rejects missing GEONICDB_URL", () => {
    expect(() => resolveGeonicdbConfig({})).toThrow(/GEONICDB_URL is not set/);
  });

  it("rejects whitespace-only GEONICDB_URL", () => {
    expect(() => resolveGeonicdbConfig({ GEONICDB_URL: "   " })).toThrow(
      /GEONICDB_URL is not set/,
    );
  });

  it("rejects a malformed URL", () => {
    expect(() => resolveGeonicdbConfig({ GEONICDB_URL: "not-a-url" })).toThrow(
      /not a valid URL/,
    );
  });

  // near-miss: scheme が http(s) 以外なら拒否（ftp は URL としては合法）
  it("rejects non-http(s) protocols such as ftp", () => {
    expect(() =>
      resolveGeonicdbConfig({ GEONICDB_URL: "ftp://geonicdb.example.com" }),
    ).toThrow(/must use http or https/);
  });

  it("accepts http localhost endpoints used in local development", () => {
    const config = resolveGeonicdbConfig({
      GEONICDB_URL: "http://localhost:3000",
    });
    expect(config.baseUrl).toBe("http://localhost:3000");
    expect(config.apiKey).toBeUndefined();
    expect(config.tenant).toBeUndefined();
  });

  it("accepts tenant names with lowercase letters, digits, and underscore", () => {
    const config = resolveGeonicdbConfig({
      GEONICDB_URL: "https://geonicdb.geolonia.com",
      GEONICDB_TENANT: "demo_tenant1",
    });
    expect(config.tenant).toBe("demo_tenant1");
  });

  // near-miss: ハイフンは見た目は妥当だがテナント仕様外
  it("rejects tenant names that include a hyphen", () => {
    expect(() =>
      resolveGeonicdbConfig({
        GEONICDB_URL: "https://geonicdb.geolonia.com",
        GEONICDB_TENANT: "demo-tenant",
      }),
    ).toThrow(/GEONICDB_TENANT must match/);
  });

  it("rejects tenant names with uppercase letters", () => {
    expect(() =>
      resolveGeonicdbConfig({
        GEONICDB_URL: "https://geonicdb.geolonia.com",
        GEONICDB_TENANT: "Demo",
      }),
    ).toThrow(/GEONICDB_TENANT must match/);
  });
});

describe("resolveGeonicdbSyncConfig", () => {
  it("prefers GEONICDB_SYNC_API_KEY over GEONICDB_API_KEY", () => {
    const config = resolveGeonicdbSyncConfig({
      GEONICDB_URL: "https://geonicdb.geolonia.com",
      GEONICDB_API_KEY: "staff_key",
      GEONICDB_SYNC_API_KEY: "sync_key",
      GEONICDB_TENANT: "demo",
    });
    expect(config).toEqual({
      baseUrl: "https://geonicdb.geolonia.com",
      apiKey: "sync_key",
      tenant: "demo",
    });
  });

  it("falls back to GEONICDB_API_KEY when sync key is unset", () => {
    const config = resolveGeonicdbSyncConfig({
      GEONICDB_URL: "https://geonicdb.geolonia.com/",
      GEONICDB_API_KEY: "staff_key",
    });
    expect(config.apiKey).toBe("staff_key");
  });

  // near-miss: 空白のみの SYNC キーは未設定扱い → staff キーへフォールバック
  it("treats whitespace-only GEONICDB_SYNC_API_KEY as unset and falls back", () => {
    const config = resolveGeonicdbSyncConfig({
      GEONICDB_URL: "https://geonicdb.geolonia.com",
      GEONICDB_API_KEY: "staff_key",
      GEONICDB_SYNC_API_KEY: "   ",
    });
    expect(config.apiKey).toBe("staff_key");
  });

  it("omits apiKey when neither sync nor staff key is set", () => {
    const config = resolveGeonicdbSyncConfig({
      GEONICDB_URL: "https://geonicdb.geolonia.com",
    });
    expect(config.apiKey).toBeUndefined();
  });
});
