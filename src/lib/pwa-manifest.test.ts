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

describe("unread count helpers (#45)", () => {
  it("parseUnreadCount accepts non-negative integers", async () => {
    const { parseUnreadCount } = await import("@/lib/web-push-sw-logic");
    expect(parseUnreadCount("0")).toBe(0);
    expect(parseUnreadCount("1")).toBe(1);
    expect(parseUnreadCount("42")).toBe(42);
  });

  it("parseUnreadCount near-miss: rejects non-integer / negative / empty", async () => {
    const { parseUnreadCount } = await import("@/lib/web-push-sw-logic");
    expect(parseUnreadCount(undefined)).toBe(0);
    expect(parseUnreadCount(null)).toBe(0);
    expect(parseUnreadCount("")).toBe(0);
    expect(parseUnreadCount("abc")).toBe(0);
    expect(parseUnreadCount("-1")).toBe(0);
    expect(parseUnreadCount("1.9")).toBe(1); // parseInt truncates toward zero
    expect(parseUnreadCount("01")).toBe(1);
  });

  it("incrementUnreadCount adds one from zero or positive", async () => {
    const { incrementUnreadCount, resetUnreadCount } =
      await import("@/lib/web-push-sw-logic");
    expect(incrementUnreadCount(0)).toBe(1);
    expect(incrementUnreadCount(2)).toBe(3);
    expect(incrementUnreadCount(Number.NaN)).toBe(1);
    expect(incrementUnreadCount(-5)).toBe(1);
    expect(resetUnreadCount()).toBe(0);
  });
});

describe("setAppBadgeSafely / clearAppBadgeSafely", () => {
  it("passes a positive numeric count to setAppBadge (#45 regression)", async () => {
    const { setAppBadgeSafely } = await import("@/lib/web-push-sw-logic");
    const setAppBadge = vi.fn<(contents?: number) => Promise<void>>(
      async () => undefined,
    );
    await setAppBadgeSafely({ setAppBadge }, 3);
    expect(setAppBadge).toHaveBeenCalledTimes(1);
    expect(setAppBadge).toHaveBeenCalledWith(3);
    // 引数なし呼び出しは iOS で描画されないため禁止
    const firstCall = setAppBadge.mock.calls[0];
    expect(firstCall).toBeDefined();
    expect(firstCall).toHaveLength(1);
    expect(firstCall![0]).toEqual(expect.any(Number));
  });

  it("floors fractional counts and skips non-positive via clear", async () => {
    const { setAppBadgeSafely } = await import("@/lib/web-push-sw-logic");
    const setAppBadge = vi.fn(async () => undefined);
    const clearAppBadge = vi.fn(async () => undefined);
    await setAppBadgeSafely({ setAppBadge, clearAppBadge }, 2.9);
    expect(setAppBadge).toHaveBeenCalledWith(2);
    setAppBadge.mockClear();
    clearAppBadge.mockClear();
    await setAppBadgeSafely({ setAppBadge, clearAppBadge }, 0);
    expect(setAppBadge).not.toHaveBeenCalled();
    expect(clearAppBadge).toHaveBeenCalledTimes(1);
  });

  it("no-ops when setAppBadge is missing (unsupported browser)", async () => {
    const { setAppBadgeSafely } = await import("@/lib/web-push-sw-logic");
    await expect(setAppBadgeSafely({}, 1)).resolves.toBeUndefined();
    await expect(setAppBadgeSafely(null, 1)).resolves.toBeUndefined();
  });

  it("swallows setAppBadge rejection so push handler stays healthy", async () => {
    const { setAppBadgeSafely } = await import("@/lib/web-push-sw-logic");
    const setAppBadge = vi.fn(async () => {
      throw new Error("badge denied");
    });
    await expect(
      setAppBadgeSafely({ setAppBadge }, 1),
    ).resolves.toBeUndefined();
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

  it("clears badge even when unread count write fails (#45 audit)", async () => {
    const { resetUnreadBadgeState, clearAppBadgeSafely } =
      await import("@/lib/web-push-sw-logic");
    const clearAppBadge = vi.fn(async () => undefined);
    await expect(
      resetUnreadBadgeState({
        writeUnreadCount: async () => {
          throw new Error("cache.put failed");
        },
        clearBadge: () => clearAppBadgeSafely({ clearAppBadge }),
      }),
    ).resolves.toBeUndefined();
    expect(clearAppBadge).toHaveBeenCalledTimes(1);
  });

  it("serializes concurrent unread bumps to final count 2 (#45 CodeRabbit)", async () => {
    const { bumpUnreadCountState, createSerialQueue, setAppBadgeSafely } =
      await import("@/lib/web-push-sw-logic");
    let stored = 0;
    const setAppBadge = vi.fn(async () => undefined);
    const queue = createSerialQueue();

    const bump = () =>
      queue(() =>
        bumpUnreadCountState({
          readUnreadCount: async () => stored,
          writeUnreadCount: async (count) => {
            stored = count;
          },
          setBadge: (count) => setAppBadgeSafely({ setAppBadge }, count),
          // キュー無しだと両方が 0 を読んで 1 になるギャップを再現
          yieldBeforeWrite: async () => {
            await Promise.resolve();
          },
        }),
      );

    await Promise.all([bump(), bump()]);
    expect(stored).toBe(2);
    expect(setAppBadge).toHaveBeenLastCalledWith(2);
    expect(setAppBadge).toHaveBeenCalledTimes(2);
  });

  it("near-miss: without serial queue concurrent bumps lose a count", async () => {
    const { bumpUnreadCountState, setAppBadgeSafely } =
      await import("@/lib/web-push-sw-logic");
    let stored = 0;
    const setAppBadge = vi.fn(async () => undefined);
    const bump = () =>
      bumpUnreadCountState({
        readUnreadCount: async () => stored,
        writeUnreadCount: async (count) => {
          stored = count;
        },
        setBadge: (count) => setAppBadgeSafely({ setAppBadge }, count),
        yieldBeforeWrite: async () => {
          await Promise.resolve();
        },
      });

    await Promise.all([bump(), bump()]);
    // 直列化なしでは両方 0→1 になり最終 1（取りこぼし）
    expect(stored).toBe(1);
  });
});
