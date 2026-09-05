// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddToHomeScreenPrompt } from "@/components/top/AddToHomeScreenPrompt";
import { SITE_LANGUAGES } from "@/config/site-language";
import { UI_STRINGS } from "@/config/ui-strings";
import { A2HS_DISMISS_STORAGE_KEY, A2HS_VISIBLE_HTML_CLASS } from "@/lib/a2hs";
import {
  bootstrapBeforeInstallPromptForTests,
  resetBeforeInstallPromptBootstrapForTests,
} from "@/lib/a2hs-bip-bridge";
import { testStrings } from "@/test/fixtures";

type MatchMediaResult = {
  matches: boolean;
  media: string;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};

function stubMatchMedia(standalone: boolean) {
  window.matchMedia = vi.fn((query: string): MatchMediaResult => ({
    matches: standalone && query === "(display-mode: standalone)",
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function stubNavigator(options: {
  standalone?: boolean;
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
}) {
  Object.defineProperty(navigator, "standalone", {
    configurable: true,
    value: options.standalone ?? false,
  });
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    value:
      options.userAgent ??
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0",
  });
  Object.defineProperty(navigator, "platform", {
    configurable: true,
    value: options.platform ?? "Linux x86_64",
  });
  Object.defineProperty(navigator, "maxTouchPoints", {
    configurable: true,
    value: options.maxTouchPoints ?? 0,
  });
}

function fireBeforeInstallPrompt(
  outcome: "accepted" | "dismissed" = "accepted",
) {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const userChoice = Promise.resolve({ outcome });
  const event = new Event("beforeinstallprompt", {
    cancelable: true,
  }) as Event & {
    prompt: typeof prompt;
    userChoice: typeof userChoice;
  };
  event.prompt = prompt;
  event.userChoice = userChoice;
  window.dispatchEvent(event);
  return { prompt, event };
}

describe("AddToHomeScreenPrompt (#55)", () => {
  beforeEach(() => {
    localStorage.clear();
    resetBeforeInstallPromptBootstrapForTests();
    bootstrapBeforeInstallPromptForTests();
    stubMatchMedia(false);
    stubNavigator({});
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    resetBeforeInstallPromptBootstrapForTests();
    document.documentElement.classList.remove(A2HS_VISIBLE_HTML_CLASS);
    document.documentElement.style.removeProperty("--a2hs-reserve");
  });

  it("does not render when display-mode is standalone", async () => {
    stubMatchMedia(true);
    render(<AddToHomeScreenPrompt strings={testStrings} />);
    fireBeforeInstallPrompt();
    await expect(
      screen.findByTestId("a2hs-prompt", {}, { timeout: 200 }),
    ).rejects.toThrow();
  });

  it("does not render when navigator.standalone is true", async () => {
    stubNavigator({
      standalone: true,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      platform: "iPhone",
      maxTouchPoints: 5,
    });
    render(<AddToHomeScreenPrompt strings={testStrings} />);
    await expect(
      screen.findByTestId("a2hs-prompt", {}, { timeout: 200 }),
    ).rejects.toThrow();
  });

  it("shows iOS install instructions without waiting for beforeinstallprompt", async () => {
    stubNavigator({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      platform: "iPhone",
      maxTouchPoints: 5,
    });
    render(<AddToHomeScreenPrompt strings={testStrings} />);
    expect(await screen.findByTestId("a2hs-prompt")).toBeInTheDocument();
    expect(screen.getByText(testStrings.a2hsIosHint)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: testStrings.a2hsInstallLabel }),
    ).not.toBeInTheDocument();
  });

  it("shows Chromium install button after beforeinstallprompt", async () => {
    render(<AddToHomeScreenPrompt strings={testStrings} />);
    expect(screen.queryByTestId("a2hs-prompt")).not.toBeInTheDocument();

    const { prompt } = fireBeforeInstallPrompt();
    expect(await screen.findByTestId("a2hs-prompt")).toBeInTheDocument();
    expect(screen.getByText(testStrings.a2hsDescription)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: testStrings.a2hsInstallLabel }),
    );
    await waitFor(() => {
      expect(prompt).toHaveBeenCalled();
    });
    expect(localStorage.getItem(A2HS_DISMISS_STORAGE_KEY)).toBe("1");
  });

  it("captures beforeinstallprompt fired before mount (#60 CodeRabbit)", async () => {
    fireBeforeInstallPrompt();
    render(<AddToHomeScreenPrompt strings={testStrings} />);
    expect(await screen.findByTestId("a2hs-prompt")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: testStrings.a2hsInstallLabel }),
    ).toBeInTheDocument();
  });

  it("shows install UI when BIP fires after mount (#60)", async () => {
    render(<AddToHomeScreenPrompt strings={testStrings} />);
    expect(screen.queryByTestId("a2hs-prompt")).not.toBeInTheDocument();
    fireBeforeInstallPrompt();
    expect(await screen.findByTestId("a2hs-prompt")).toBeInTheDocument();
  });

  it("does not persist dismiss when native install UI is cancelled (#60)", async () => {
    render(<AddToHomeScreenPrompt strings={testStrings} />);
    const { prompt } = fireBeforeInstallPrompt("dismissed");
    expect(await screen.findByTestId("a2hs-prompt")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: testStrings.a2hsInstallLabel }),
    );
    await waitFor(() => {
      expect(prompt).toHaveBeenCalled();
    });
    expect(localStorage.getItem(A2HS_DISMISS_STORAGE_KEY)).toBeNull();
    // 閉じるボタンで明示 dismiss するまでは再表示可能（install ボタンは消える）
    expect(screen.queryByTestId("a2hs-prompt")).not.toBeInTheDocument();
  });

  it("does not reappear after dismiss", async () => {
    stubNavigator({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      platform: "iPhone",
      maxTouchPoints: 5,
    });
    const { unmount } = render(<AddToHomeScreenPrompt strings={testStrings} />);
    expect(await screen.findByTestId("a2hs-prompt")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: testStrings.a2hsDismissLabel }),
    );
    expect(screen.queryByTestId("a2hs-prompt")).not.toBeInTheDocument();
    expect(localStorage.getItem(A2HS_DISMISS_STORAGE_KEY)).toBe("1");

    unmount();
    render(<AddToHomeScreenPrompt strings={testStrings} />);
    await expect(
      screen.findByTestId("a2hs-prompt", {}, { timeout: 200 }),
    ).rejects.toThrow();
  });

  it("toggles html reserve class only while the bar is visible (#55)", async () => {
    stubNavigator({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      platform: "iPhone",
      maxTouchPoints: 5,
    });
    render(<AddToHomeScreenPrompt strings={testStrings} />);
    await screen.findByTestId("a2hs-prompt");
    await waitFor(() => {
      expect(
        document.documentElement.classList.contains(A2HS_VISIBLE_HTML_CLASS),
      ).toBe(true);
    });

    await userEvent.click(
      screen.getByRole("button", { name: testStrings.a2hsDismissLabel }),
    );
    await waitFor(() => {
      expect(
        document.documentElement.classList.contains(A2HS_VISIBLE_HTML_CLASS),
      ).toBe(false);
    });
  });

  it("exposes localized copy in all five languages", async () => {
    stubNavigator({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      platform: "iPhone",
      maxTouchPoints: 5,
    });

    for (const lang of SITE_LANGUAGES) {
      const strings = UI_STRINGS[lang];
      const { unmount } = render(<AddToHomeScreenPrompt strings={strings} />);
      expect(await screen.findByText(strings.a2hsTitle)).toBeInTheDocument();
      expect(screen.getByText(strings.a2hsIosHint)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: strings.a2hsDismissLabel }),
      ).toBeInTheDocument();
      unmount();
      cleanup();
    }
  });

  // near-miss: BIP が無い非 iOS では導線を出さない（永久待ちしない）
  it("near-miss: non-iOS without beforeinstallprompt stays hidden", async () => {
    render(<AddToHomeScreenPrompt strings={testStrings} />);
    await expect(
      screen.findByTestId("a2hs-prompt", {}, { timeout: 200 }),
    ).rejects.toThrow();
  });
});
