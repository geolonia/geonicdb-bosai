import { describe, expect, it } from "vitest";
import {
  PUSH_OPT_IN_BANNER_DISMISS_DAYS,
  PUSH_OPT_IN_BANNER_DISMISS_MS,
} from "@/config/push-opt-in-banner";
import {
  dismissPushOptInBanner,
  isPushOptInBannerDismissed,
  PUSH_OPT_IN_BANNER_DISMISS_STORAGE_KEY,
} from "@/lib/push-opt-in-banner";

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    get size() {
      return map.size;
    },
    read: (key: string) => map.get(key) ?? null,
  };
}

const NOW = Date.UTC(2026, 8, 6, 12, 0, 0);

describe("push opt-in banner dismissal window", () => {
  it("derives the window from the configured number of days", () => {
    expect(PUSH_OPT_IN_BANNER_DISMISS_MS).toBe(
      PUSH_OPT_IN_BANNER_DISMISS_DAYS * 24 * 60 * 60 * 1000,
    );
  });

  it("is not dismissed when nothing was stored", () => {
    expect(isPushOptInBannerDismissed(NOW, fakeStorage())).toBe(false);
  });

  it("stays dismissed right after dismissing", () => {
    const storage = fakeStorage();
    dismissPushOptInBanner(NOW, storage);
    expect(storage.read(PUSH_OPT_IN_BANNER_DISMISS_STORAGE_KEY)).toBe(
      String(NOW),
    );
    expect(isPushOptInBannerDismissed(NOW, storage)).toBe(true);
  });

  it("re-appears once the configured window has elapsed", () => {
    const storage = fakeStorage();
    dismissPushOptInBanner(NOW, storage);

    // 猶予ちょうどで再表示。1ms 手前ではまだ出さない（境界の取り違えを防ぐ）
    expect(
      isPushOptInBannerDismissed(
        NOW + PUSH_OPT_IN_BANNER_DISMISS_MS - 1,
        storage,
      ),
    ).toBe(true);
    expect(
      isPushOptInBannerDismissed(NOW + PUSH_OPT_IN_BANNER_DISMISS_MS, storage),
    ).toBe(false);
  });

  it("near-miss: a 7 day window must not be read as 7 hours or 7 minutes", () => {
    const storage = fakeStorage();
    dismissPushOptInBanner(NOW, storage);
    const sixDays = 6 * 24 * 60 * 60 * 1000;
    // 6 日後はまだ黙っている。ここが false になる実装は単位を取り違えている
    expect(isPushOptInBannerDismissed(NOW + sixDays, storage)).toBe(true);
  });

  it("treats a corrupt stored value as not dismissed", () => {
    const storage = fakeStorage({
      [PUSH_OPT_IN_BANNER_DISMISS_STORAGE_KEY]: "not-a-number",
    });
    // 通知導線を黙って失わせない（壊れた値は「閉じていない」に倒す）
    expect(isPushOptInBannerDismissed(NOW, storage)).toBe(false);
  });

  it("bounds clock skew: a far-future timestamp does not silence it forever", () => {
    const storage = fakeStorage({
      [PUSH_OPT_IN_BANNER_DISMISS_STORAGE_KEY]: String(
        NOW + PUSH_OPT_IN_BANNER_DISMISS_MS + 1,
      ),
    });
    expect(isPushOptInBannerDismissed(NOW, storage)).toBe(false);
  });

  it("survives storage being unavailable (SSR / private mode)", () => {
    expect(isPushOptInBannerDismissed(NOW, null)).toBe(false);
    expect(() => dismissPushOptInBanner(NOW, null)).not.toThrow();

    const throwing = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };
    expect(isPushOptInBannerDismissed(NOW, throwing)).toBe(false);
    expect(() => dismissPushOptInBanner(NOW, throwing)).not.toThrow();
  });
});
