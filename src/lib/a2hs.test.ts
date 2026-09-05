// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  A2HS_DISMISS_STORAGE_KEY,
  dismissA2hsPrompt,
  isA2hsDismissed,
  isIosLikeDevice,
  isRunningAsInstalledPwa,
  type NavigatorWithStandalone,
} from "@/lib/a2hs";

const a2hsSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "./a2hs.ts"),
  "utf8",
);

function mockMatchMedia(matches: boolean): Pick<Window, "matchMedia"> {
  return {
    matchMedia: vi.fn().mockReturnValue({
      matches,
      media: "(display-mode: standalone)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  };
}

describe("isRunningAsInstalledPwa (#55)", () => {
  it("returns true when display-mode is standalone", () => {
    expect(
      isRunningAsInstalledPwa(mockMatchMedia(true), {
        standalone: false,
      } as NavigatorWithStandalone),
    ).toBe(true);
  });

  it("returns true when navigator.standalone is true (iOS)", () => {
    expect(
      isRunningAsInstalledPwa(mockMatchMedia(false), {
        standalone: true,
      } as NavigatorWithStandalone),
    ).toBe(true);
  });

  it("returns false in a normal browser tab", () => {
    expect(
      isRunningAsInstalledPwa(mockMatchMedia(false), {
        standalone: false,
      } as NavigatorWithStandalone),
    ).toBe(false);
  });

  // near-miss: browser / fullscreen は「インストール済み PWA」ではない
  it("near-miss: display-mode browser must not count as installed PWA", () => {
    const win = {
      matchMedia: vi.fn((query: string) => ({
        matches: query === "(display-mode: browser)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    } as unknown as Pick<Window, "matchMedia">;
    expect(
      isRunningAsInstalledPwa(win, {
        standalone: false,
      } as NavigatorWithStandalone),
    ).toBe(false);
  });

  // near-miss: standalone が明示的 false（未定義ではない）でもタブ扱い
  it("near-miss: navigator.standalone === false stays non-PWA", () => {
    expect(
      isRunningAsInstalledPwa(mockMatchMedia(false), {
        standalone: false,
      } as NavigatorWithStandalone),
    ).toBe(false);
  });

  it("does not throw when matchMedia is missing (falls back to navigator.standalone)", () => {
    expect(() =>
      isRunningAsInstalledPwa(
        {} as Pick<Window, "matchMedia">,
        {
          standalone: true,
        } as NavigatorWithStandalone,
      ),
    ).not.toThrow();
    expect(
      isRunningAsInstalledPwa(
        {} as Pick<Window, "matchMedia">,
        {
          standalone: true,
        } as NavigatorWithStandalone,
      ),
    ).toBe(true);
    expect(
      isRunningAsInstalledPwa(
        {} as Pick<Window, "matchMedia">,
        {
          standalone: false,
        } as NavigatorWithStandalone,
      ),
    ).toBe(false);
  });

  it("does not throw when matchMedia is not a function", () => {
    expect(
      isRunningAsInstalledPwa(
        { matchMedia: "nope" } as unknown as Pick<Window, "matchMedia">,
        { standalone: false } as NavigatorWithStandalone,
      ),
    ).toBe(false);
  });

  // near-miss: matchMedia 無し + standalone 無し → false（両方無ければ非 PWA）
  it("near-miss: without matchMedia and without standalone returns false", () => {
    expect(isRunningAsInstalledPwa({}, {})).toBe(false);
  });

  it("feature-detects matchMedia with typeof === function before calling", () => {
    // try/catch だけでは hollow になるため、呼び出し前の typeof ガードをソースで固定する
    expect(a2hsSource).toMatch(
      /typeof\s+win\.matchMedia\s*===\s*["']function["']/,
    );
  });
});

describe("isIosLikeDevice (#55)", () => {
  it("detects iPhone UA", () => {
    expect(
      isIosLikeDevice({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        platform: "iPhone",
        maxTouchPoints: 5,
      }),
    ).toBe(true);
  });

  it("detects iPadOS desktop UA (MacIntel + touch)", () => {
    expect(
      isIosLikeDevice({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        platform: "MacIntel",
        maxTouchPoints: 5,
      }),
    ).toBe(true);
  });

  // near-miss: タッチ無し Mac は iOS 扱いしない（BIP 待ちでよい）
  it("near-miss: MacIntel without touch is not iOS-like", () => {
    expect(
      isIosLikeDevice({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        platform: "MacIntel",
        maxTouchPoints: 0,
      }),
    ).toBe(false);
  });
});

describe("a2hs dismiss storage (#55)", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("records and reads dismissal", () => {
    expect(isA2hsDismissed()).toBe(false);
    dismissA2hsPrompt();
    expect(localStorage.getItem(A2HS_DISMISS_STORAGE_KEY)).toBe("1");
    expect(isA2hsDismissed()).toBe(true);
  });

  // near-miss: "true" / "0" は閉じていない扱い（厳密に "1" のみ）
  it('near-miss: only the value "1" counts as dismissed', () => {
    localStorage.setItem(A2HS_DISMISS_STORAGE_KEY, "true");
    expect(isA2hsDismissed()).toBe(false);
    localStorage.setItem(A2HS_DISMISS_STORAGE_KEY, "0");
    expect(isA2hsDismissed()).toBe(false);
  });
});
