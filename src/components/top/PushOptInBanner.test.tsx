// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PushOptInBanner } from "@/components/top/PushOptInBanner";
import { PUSH_OPT_IN_BANNER_DISMISS_MS } from "@/config/push-opt-in-banner";
import { UI_STRINGS } from "@/config/ui-strings";
import { SITE_LANGUAGES } from "@/config/site-language";
import {
  PUSH_OPT_IN_BANNER_DISMISS_STORAGE_KEY,
  PUSH_OPT_IN_SWITCH_ID,
} from "@/lib/push-opt-in-banner";
import { testStrings } from "@/test/fixtures";

/**
 * 帯は初回操作 or 無操作待ちまで出ない（CLS 対策）。テストでは操作で解除する。
 * 解除は click / keyup であって pointerdown ではない（最初のタップを潰さないため）。
 */
async function revealByInteraction() {
  await userEvent.click(document.body);
}

function renderBanner(recommended = true) {
  return render(
    <PushOptInBanner strings={testStrings} recommended={recommended} />,
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PushOptInBanner", () => {
  it("stays hidden until the first interaction (CLS guard)", async () => {
    renderBanner();
    expect(screen.queryByTestId("push-opt-in-banner")).not.toBeInTheDocument();

    await revealByInteraction();
    expect(screen.getByTestId("push-opt-in-banner")).toBeInTheDocument();
  });

  it("does not reveal on pointer press alone, so the first tap is not swallowed", () => {
    renderBanner();

    // 押下時点で差し込むと帯の高さだけページがずれ、pointerup が別要素に
    // 当たって click が body へ飛ぶ = 利用者の最初のタップが消える。
    // near-miss: pointerdown / mousedown で出す実装はここで赤になる。
    act(() => {
      window.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      window.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(screen.queryByTestId("push-opt-in-banner")).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(screen.getByTestId("push-opt-in-banner")).toBeInTheDocument();
  });

  it("reveals on keydown, before Tab settles focus past the banner", () => {
    renderBanner();

    // keyup で出すと Tab の移動先が確定した後に帯が挿入され、帯は DOM 上で
    // 前方にあるためその回の順次移動で飛ばされる（前方 Tab では到達不能）。
    // near-miss: keyup で出す実装はここで赤になる。
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
      );
    });
    expect(screen.getByTestId("push-opt-in-banner")).toBeInTheDocument();
  });

  it("never reveals itself without any user input (no idle timer)", () => {
    vi.useFakeTimers();
    try {
      renderBanner();
      act(() => {
        vi.advanceTimersByTime(10 * 60 * 1000);
      });
      // 文書フローに載る帯を無入力で差し込むと、読んでいる最中にページが
      // 飛ぶ（実ユーザーの CLS）。A2HS 帯の無操作タイマーは position: fixed
      // + body padding 予約が前提なので流用できない。
      // near-miss: 無操作タイマーを足す実装はここで赤になる。
      expect(
        screen.queryByTestId("push-opt-in-banner"),
      ).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("remembers an interaction that happened before the push state resolved", async () => {
    // Push 状態の解決（SW への非同期照会）より先に操作されることがある。
    // near-miss: 監視開始を recommended まで待つ実装だとこの操作を取りこぼし、
    // 帯は 30 秒タイマーまで出ない。
    const { rerender } = render(
      <PushOptInBanner strings={testStrings} recommended={false} />,
    );
    await revealByInteraction();
    expect(screen.queryByTestId("push-opt-in-banner")).not.toBeInTheDocument();

    rerender(<PushOptInBanner strings={testStrings} recommended />);
    expect(screen.getByTestId("push-opt-in-banner")).toBeInTheDocument();
  });

  it("never shows when notifications are already on / unsupported", async () => {
    renderBanner(false);
    await revealByInteraction();
    // near-miss: recommended を無視して dismiss 状態だけで出すと、購読済みの
    // 利用者にも「オンにしましょう」と出てしまう
    expect(screen.queryByTestId("push-opt-in-banner")).not.toBeInTheDocument();
  });

  it("links to the footer toggle so it works without JS", async () => {
    renderBanner();
    await revealByInteraction();

    const link = screen.getByRole("link", {
      name: testStrings.pushOptInBannerText,
    });
    expect(link).toHaveAttribute("href", `#${PUSH_OPT_IN_SWITCH_ID}`);
  });

  it("scrolls to and focuses the footer toggle when the text is clicked", async () => {
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.id = PUSH_OPT_IN_SWITCH_ID;
    document.body.append(toggle);
    const scrollIntoView = vi.fn();
    toggle.scrollIntoView = scrollIntoView;

    try {
      renderBanner();
      await revealByInteraction();
      await userEvent.click(
        screen.getByRole("link", { name: testStrings.pushOptInBannerText }),
      );

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView.mock.calls[0][0]).toMatchObject({
        block: "center",
      });
      // 「飛んでいく」= スクロールだけでなくトグル本体にフォーカスが載ること
      expect(document.activeElement).toBe(toggle);
    } finally {
      toggle.remove();
    }
  });

  it("hides on dismiss and persists the dismissal", async () => {
    renderBanner();
    await revealByInteraction();
    await userEvent.click(
      screen.getByRole("button", {
        name: testStrings.pushOptInBannerDismissLabel,
      }),
    );

    expect(screen.queryByTestId("push-opt-in-banner")).not.toBeInTheDocument();
    expect(
      localStorage.getItem(PUSH_OPT_IN_BANNER_DISMISS_STORAGE_KEY),
    ).not.toBeNull();
  });

  it("stays hidden on a fresh visit inside the dismissal window", async () => {
    localStorage.setItem(
      PUSH_OPT_IN_BANNER_DISMISS_STORAGE_KEY,
      String(Date.now() - (PUSH_OPT_IN_BANNER_DISMISS_MS - 60_000)),
    );
    renderBanner();
    await revealByInteraction();
    expect(screen.queryByTestId("push-opt-in-banner")).not.toBeInTheDocument();
  });

  it("shows again once the dismissal window has elapsed", async () => {
    localStorage.setItem(
      PUSH_OPT_IN_BANNER_DISMISS_STORAGE_KEY,
      String(Date.now() - PUSH_OPT_IN_BANNER_DISMISS_MS - 1),
    );
    renderBanner();
    await revealByInteraction();
    expect(screen.getByTestId("push-opt-in-banner")).toBeInTheDocument();
  });

  it("has the recommendation copy and dismiss label in every language", () => {
    for (const lang of SITE_LANGUAGES) {
      const strings = UI_STRINGS[lang];
      expect(strings.pushOptInBannerText.trim().length).toBeGreaterThan(0);
      expect(strings.pushOptInBannerDismissLabel.trim().length).toBeGreaterThan(
        0,
      );
    }
  });
});
