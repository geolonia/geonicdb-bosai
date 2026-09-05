import { afterEach, describe, expect, it, vi } from "vitest";
import { installAppBadgeClearOnForeground } from "@/lib/app-badge-client";
import { WEB_PUSH_RESET_UNREAD_MESSAGE } from "@/lib/web-push-sw-logic";

describe("installAppBadgeClearOnForeground", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clears badge on focus and visibilitychange when visible", () => {
    const clearAppBadge = vi.fn(async () => undefined);
    const postMessage = vi.fn();
    const listeners = new Map<string, EventListener>();
    const target = {
      navigator: {
        clearAppBadge,
        serviceWorker: {
          getRegistration: async () => ({
            active: { postMessage },
            waiting: null,
            installing: null,
          }),
        },
      },
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
    postMessage.mockClear();
    listeners.get("focus")?.(new Event("focus"));
    expect(clearAppBadge).toHaveBeenCalledTimes(1);

    dispose();
    expect(listeners.size).toBe(0);
  });

  it("posts RESET_UNREAD_COUNT to the active service worker", async () => {
    const clearAppBadge = vi.fn(async () => undefined);
    const postMessage = vi.fn();
    const target = {
      navigator: {
        clearAppBadge,
        serviceWorker: {
          getRegistration: async () => ({
            active: { postMessage },
            waiting: null,
            installing: null,
          }),
        },
      },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
    vi.stubGlobal("document", { visibilityState: "visible" });

    installAppBadgeClearOnForeground(target as unknown as Window);
    await vi.waitFor(() => {
      expect(postMessage).toHaveBeenCalledWith({
        type: WEB_PUSH_RESET_UNREAD_MESSAGE,
      });
    });
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
