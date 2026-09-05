"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { UiStrings } from "@/config/ui-strings";
import {
  A2HS_RESERVE_CSS_VAR,
  A2HS_VISIBLE_HTML_CLASS,
  dismissA2hsPrompt,
  isA2hsDismissed,
  isIosLikeDevice,
  isRunningAsInstalledPwa,
} from "@/lib/a2hs";

type Props = {
  strings: UiStrings;
};

/** Chromium 系の beforeinstallprompt が載せるイベント */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * useEffect 登録前に BIP が発火しても取りこぼさないようモジュールで保持する。
 * （CodeRabbit #60: mount 前発火の取りこぼし防止）
 */
let stashedBeforeInstallPrompt: BeforeInstallPromptEvent | null = null;
const bipListeners = new Set<(event: BeforeInstallPromptEvent) => void>();

function notifyBipListeners(event: BeforeInstallPromptEvent): void {
  for (const listener of bipListeners) {
    listener(event);
  }
}

function onWindowBeforeInstallPrompt(event: Event): void {
  event.preventDefault();
  const bip = event as BeforeInstallPromptEvent;
  stashedBeforeInstallPrompt = bip;
  notifyBipListeners(bip);
}

function ensureBeforeInstallPromptBootstrap(): void {
  if (typeof window === "undefined") return;
  const flagged = window as Window & { __bosaiA2hsBipBootstrapped?: boolean };
  if (flagged.__bosaiA2hsBipBootstrapped) return;
  flagged.__bosaiA2hsBipBootstrapped = true;
  window.addEventListener("beforeinstallprompt", onWindowBeforeInstallPrompt);
}

/** テスト用: モジュール保持と bootstrap フラグをリセットする */
export function resetBeforeInstallPromptBootstrapForTests(): void {
  stashedBeforeInstallPrompt = null;
  bipListeners.clear();
  if (typeof window !== "undefined") {
    const flagged = window as Window & { __bosaiA2hsBipBootstrapped?: boolean };
    if (flagged.__bosaiA2hsBipBootstrapped) {
      window.removeEventListener(
        "beforeinstallprompt",
        onWindowBeforeInstallPrompt,
      );
      flagged.__bosaiA2hsBipBootstrapped = false;
    }
  }
}

/** テスト用: BIP 早期捕捉リスナーを再度張る */
export function bootstrapBeforeInstallPromptForTests(): void {
  ensureBeforeInstallPromptBootstrap();
}

ensureBeforeInstallPromptBootstrap();

function subscribeNoop(): () => void {
  return () => undefined;
}

function getIsClientSnapshot(): boolean {
  return true;
}

function getServerSnapshot(): boolean {
  return false;
}

function clearA2hsViewportReserve(): void {
  document.documentElement.classList.remove(A2HS_VISIBLE_HTML_CLASS);
  document.documentElement.style.removeProperty(A2HS_RESERVE_CSS_VAR);
}

/**
 * ホーム画面への追加（A2HS）導線。
 * - PWA 起動中は出さない
 * - 一度閉じたら再表示しない
 * - Android/Chrome: beforeinstallprompt → 独自ボタンで prompt()
 * - iOS: 共有メニュー手順の案内のみ（BIP は発火しない）
 * - fixed 帯の高さ分を body padding で確保（末尾が隠れない / CLS 回避）
 */
export function AddToHomeScreenPrompt({ strings }: Props) {
  const titleId = useId();
  const bannerRef = useRef<HTMLElement>(null);
  const isClient = useSyncExternalStore(
    subscribeNoop,
    getIsClientSnapshot,
    getServerSnapshot,
  );
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(() => stashedBeforeInstallPrompt);
  const [dismissedLocal, setDismissedLocal] = useState(false);

  let standalone = false;
  let dismissedStored = false;
  let iosLike = false;
  if (isClient) {
    try {
      standalone = isRunningAsInstalledPwa();
      dismissedStored = isA2hsDismissed();
      iosLike = isIosLikeDevice();
    } catch {
      // 判定失敗時は導線を出さず主要情報の描画を優先
      standalone = false;
      dismissedStored = true;
      iosLike = false;
    }
  }
  const dismissed = dismissedLocal || dismissedStored;

  useEffect(() => {
    if (!isClient || standalone || dismissed) return;

    ensureBeforeInstallPromptBootstrap();

    const onBip = (event: BeforeInstallPromptEvent) => {
      setDeferredPrompt(event);
    };
    bipListeners.add(onBip);
    return () => {
      bipListeners.delete(onBip);
    };
  }, [isClient, standalone, dismissed]);

  const visible =
    isClient &&
    !standalone &&
    !dismissed &&
    (iosLike || deferredPrompt != null);

  // fixed 帯の実高さを CSS 変数へ反映し、非表示時は余白クラスも外す
  useEffect(() => {
    if (!visible) {
      clearA2hsViewportReserve();
      return;
    }

    const root = document.documentElement;
    root.classList.add(A2HS_VISIBLE_HTML_CLASS);

    const banner = bannerRef.current;
    if (!banner) {
      return () => {
        clearA2hsViewportReserve();
      };
    }

    const syncReserve = () => {
      const height = banner.getBoundingClientRect().height;
      root.style.setProperty(A2HS_RESERVE_CSS_VAR, `${height}px`);
    };
    syncReserve();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", syncReserve);
      return () => {
        window.removeEventListener("resize", syncReserve);
        clearA2hsViewportReserve();
      };
    }

    const observer = new ResizeObserver(syncReserve);
    observer.observe(banner);
    return () => {
      observer.disconnect();
      clearA2hsViewportReserve();
    };
  }, [visible]);

  const onDismiss = useCallback(() => {
    dismissA2hsPrompt();
    setDismissedLocal(true);
    setDeferredPrompt(null);
    stashedBeforeInstallPrompt = null;
  }, []);

  const onInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      // ネイティブ UI でキャンセルした場合は永続 dismiss しない（再試行可）
      if (outcome !== "accepted") {
        setDeferredPrompt(null);
        stashedBeforeInstallPrompt = null;
        return;
      }
    } catch {
      // ユーザーキャンセルやブラウザ拒否は黙って閉じない（再試行可）
      return;
    }
    setDeferredPrompt(null);
    stashedBeforeInstallPrompt = null;
    dismissA2hsPrompt();
    setDismissedLocal(true);
  }, [deferredPrompt]);

  if (!visible) {
    return null;
  }

  return (
    <aside
      ref={bannerRef}
      className="a2hs-prompt"
      role="region"
      aria-labelledby={titleId}
      data-testid="a2hs-prompt"
    >
      <div className="a2hs-prompt__row">
        <div className="a2hs-prompt__copy">
          <p className="a2hs-prompt__title" id={titleId}>
            {strings.a2hsTitle}
          </p>
          <p className="a2hs-prompt__hint">
            {iosLike ? strings.a2hsIosHint : strings.a2hsDescription}
          </p>
        </div>
        <div className="a2hs-prompt__actions">
          {deferredPrompt ? (
            <button
              type="button"
              className="a2hs-prompt__install"
              onClick={() => {
                void onInstall();
              }}
            >
              {strings.a2hsInstallLabel}
            </button>
          ) : null}
          <button
            type="button"
            className="a2hs-prompt__dismiss"
            onClick={onDismiss}
            aria-label={strings.a2hsDismissLabel}
          >
            {strings.a2hsDismissLabel}
          </button>
        </div>
      </div>
    </aside>
  );
}
