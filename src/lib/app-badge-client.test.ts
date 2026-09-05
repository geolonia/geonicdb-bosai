import { afterEach, describe, expect, it, vi } from "vitest";
import { installAppBadgeClearOnForeground } from "@/lib/app-badge-client";

describe("installAppBadgeClearOnForeground", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clears badge on focus and visibilitychange when visible", () => {
    const clearAppBadge = vi.fn(async () => undefined);
    const listeners = new Map<string, EventListener>();
    const target = {
      navigator: { clearAppBadge },
      addEventListener: (type: string, listener: EventListener) => {
        listeners.set(type, listener);
      },
      removeEventListener: (type: string) => {
        listeners.delete(type);
      },
    };
    vi.stubGlobal("document", { visibilityState: "visible" });

    const dispose = installAppBadgeClearOnForeground(
      target as unknown as Window,
    );
    expect(clearAppBadge).toHaveBeenCalledTimes(1);

    clearAppBadge.mockClear();
    listeners.get("focus")?.(new Event("focus"));
    expect(clearAppBadge).toHaveBeenCalledTimes(1);

    dispose();
    expect(listeners.size).toBe(0);
  });

  it("skips clear while document is hidden", () => {
    const clearAppBadge = vi.fn(async () => undefined);
    const listeners = new Map<string, EventListener>();
    const target = {
      navigator: { clearAppBadge },
      addEventListener: (type: string, listener: EventListener) => {
        listeners.set(type, listener);
      },
      removeEventListener: (type: string) => {
        listeners.delete(type);
      },
    };
    vi.stubGlobal("document", { visibilityState: "hidden" });

    installAppBadgeClearOnForeground(target as unknown as Window);
    // 初期 clear は hidden のためスキップ
    expect(clearAppBadge).not.toHaveBeenCalled();

    listeners.get("visibilitychange")?.(new Event("visibilitychange"));
    expect(clearAppBadge).not.toHaveBeenCalled();
  });
});
