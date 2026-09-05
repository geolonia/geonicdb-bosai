import { describe, expect, it, vi } from "vitest";
import {
  buildWebManifest,
  normalizeBasePath,
  withBasePath,
} from "@/lib/pwa-manifest";

describe("normalizeBasePath / withBasePath", () => {
  it("returns empty for unset or root", () => {
    expect(normalizeBasePath(undefined)).toBe("");
    expect(normalizeBasePath("")).toBe("");
    expect(normalizeBasePath(" / ")).toBe("");
    expect(normalizeBasePath("/")).toBe("");
  });

  it("normalizes gh-pages project path", () => {
    expect(normalizeBasePath("/geonicdb-bosai")).toBe("/geonicdb-bosai");
    expect(normalizeBasePath("/geonicdb-bosai/")).toBe("/geonicdb-bosai");
    expect(normalizeBasePath("geonicdb-bosai")).toBe("/geonicdb-bosai");
  });

  it("prefixes paths for local (no basePath) and gh-pages", () => {
    expect(withBasePath("/", "")).toBe("/");
    expect(withBasePath("/icons/icon-192.png", "")).toBe("/icons/icon-192.png");
    expect(withBasePath("/", "/geonicdb-bosai")).toBe("/geonicdb-bosai/");
    expect(withBasePath("/icons/icon-192.png", "/geonicdb-bosai")).toBe(
      "/geonicdb-bosai/icons/icon-192.png",
    );
  });

  it("near-miss: path without leading slash still joins under basePath", () => {
    expect(withBasePath("icons/icon-192.png", "/geonicdb-bosai")).toBe(
      "/geonicdb-bosai/icons/icon-192.png",
    );
  });
});

describe("buildWebManifest", () => {
  it("omits basePath for local / root hosting", () => {
    const m = buildWebManifest("");
    expect(m.start_url).toBe("/");
    expect(m.scope).toBe("/");
    expect(m.display).toBe("standalone");
    expect(m.icons?.every((i) => i.src.startsWith("/icons/"))).toBe(true);
    expect(m.icons?.some((i) => i.purpose === "maskable")).toBe(true);
  });

  it("includes /geonicdb-bosai on start_url, scope, and icons (gh-pages)", () => {
    const m = buildWebManifest("/geonicdb-bosai");
    expect(m.start_url).toBe("/geonicdb-bosai/");
    expect(m.scope).toBe("/geonicdb-bosai/");
    for (const icon of m.icons ?? []) {
      expect(icon.src.startsWith("/geonicdb-bosai/icons/")).toBe(true);
      expect(icon.src.includes("/geonicdb-bosai/geonicdb-bosai/")).toBe(false);
    }
  });
});

describe("setAppBadgeSafely / clearAppBadgeSafely", () => {
  it("calls setAppBadge when available", async () => {
    const { setAppBadgeSafely } = await import("@/lib/web-push-sw-logic");
    const setAppBadge = vi.fn(async () => undefined);
    await setAppBadgeSafely({ setAppBadge });
    expect(setAppBadge).toHaveBeenCalledTimes(1);
  });

  it("no-ops when setAppBadge is missing (unsupported browser)", async () => {
    const { setAppBadgeSafely } = await import("@/lib/web-push-sw-logic");
    await expect(setAppBadgeSafely({})).resolves.toBeUndefined();
    await expect(setAppBadgeSafely(null)).resolves.toBeUndefined();
  });

  it("swallows setAppBadge rejection so push handler stays healthy", async () => {
    const { setAppBadgeSafely } = await import("@/lib/web-push-sw-logic");
    const setAppBadge = vi.fn(async () => {
      throw new Error("badge denied");
    });
    await expect(setAppBadgeSafely({ setAppBadge })).resolves.toBeUndefined();
  });

  it("clears badge when clearAppBadge is available", async () => {
    const { clearAppBadgeSafely } = await import("@/lib/web-push-sw-logic");
    const clearAppBadge = vi.fn(async () => undefined);
    await clearAppBadgeSafely({ clearAppBadge });
    expect(clearAppBadge).toHaveBeenCalledTimes(1);
  });

  it("no-ops when clearAppBadge is missing", async () => {
    const { clearAppBadgeSafely } = await import("@/lib/web-push-sw-logic");
    await expect(clearAppBadgeSafely({})).resolves.toBeUndefined();
  });
});
