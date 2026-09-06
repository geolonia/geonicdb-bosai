"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { MouseEvent } from "react";
import type { UiStrings } from "@/config/ui-strings";
import {
  dismissPushOptInBanner,
  isPushOptInBannerDismissed,
  PUSH_OPT_IN_SWITCH_ID,
} from "@/lib/push-opt-in-banner";

type Props = {
  strings: Pick<
    UiStrings,
    "pushOptInBannerText" | "pushOptInBannerDismissLabel" | "pushToggleLabel"
  >;
  /**
   * 通知が未購読で、オンを勧めるべきか。
   * 対応状況・許可状態・購読有無はフッターの `PushNotificationOptIn` が
   * 解決済みなので、判定を二重に走らせず親経由で受け取る。
   */
  recommended: boolean;
};

function subscribeNoop(): () => void {
  return () => undefined;
}

function getIsClientSnapshot(): boolean {
  return true;
}

function getServerSnapshot(): boolean {
  return false;
}

function prefersReducedMotion(): boolean {
  try {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  } catch {
    return false;
  }
}

/**
 * ヘッダー上部の「通知をオンにすることをおすすめします」帯。
 *
 * - 通知がオフで、かつ操作可能なときだけ出す
 *   （オン・処理中・非対応・許可拒否では出さない）
 * - テキストはフッターの通知トグルへのリンク。JS が無くても
 *   `href="#push-opt-in-switch"` でトグル本体へ飛んでフォーカスが載る
 * - 閉じたら `PUSH_OPT_IN_BANNER_DISMISS_DAYS` 日は再表示しない
 * - 文書フローに入るので初回のユーザー入力まで出さない
 *   （CLS 対策。契機の選定理由は src/config/push-opt-in-banner.ts）
 */
export function PushOptInBanner({ strings, recommended }: Props) {
  const isClient = useSyncExternalStore(
    subscribeNoop,
    getIsClientSnapshot,
    getServerSnapshot,
  );
  const [dismissedLocal, setDismissedLocal] = useState(false);
  const [revealReady, setRevealReady] = useState(false);

  // isPushOptInBannerDismissed は storage 不在・例外・壊れた値をすべて
  // 内部で false に倒すので throw しない（ここで catch すると死んだ分岐になる）。
  const dismissed =
    dismissedLocal || (isClient && isPushOptInBannerDismissed());

  // 初回入力は recommended の解決を待たずに記録する。Push 状態の解決は
  // Service Worker への非同期照会なので、`recommended` が true になるまで
  // 待って監視を始めると、それより先に操作した利用者の分を取りこぼす。
  //
  // 契機は click（ポインタ）と keydown（キーボード）。理由と、無操作
  // タイマーを置かない理由は src/config/push-opt-in-banner.ts を参照。
  useEffect(() => {
    if (!isClient || dismissed) return;

    const enable = () => {
      setRevealReady(true);
    };
    window.addEventListener("click", enable, { once: true });
    window.addEventListener("keydown", enable, { once: true });
    return () => {
      window.removeEventListener("click", enable);
      window.removeEventListener("keydown", enable);
    };
  }, [isClient, dismissed]);

  const onDismiss = useCallback(() => {
    dismissPushOptInBanner();
    setDismissedLocal(true);
  }, []);

  const onJumpToToggle = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(PUSH_OPT_IN_SWITCH_ID);
    // 見つからなければ preventDefault せず、素のアンカー移動に任せる
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "center",
    });
    // スクロールは scrollIntoView に任せ、focus では動かさない
    target.focus({ preventScroll: true });
  }, []);

  if (!(isClient && recommended && !dismissed && revealReady)) {
    return null;
  }

  return (
    <aside
      className="push-opt-in-banner"
      aria-label={strings.pushToggleLabel}
      data-testid="push-opt-in-banner"
    >
      <div className="push-opt-in-banner__row">
        <a
          className="push-opt-in-banner__link"
          href={`#${PUSH_OPT_IN_SWITCH_ID}`}
          onClick={onJumpToToggle}
        >
          {strings.pushOptInBannerText}
        </a>
        <button
          type="button"
          className="push-opt-in-banner__dismiss"
          onClick={onDismiss}
        >
          {strings.pushOptInBannerDismissLabel}
        </button>
      </div>
    </aside>
  );
}
