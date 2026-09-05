"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
} from "react";
import type { UiStrings } from "@/config/ui-strings";
import {
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

function subscribeNoop(): () => void {
  return () => undefined;
}

function getIsClientSnapshot(): boolean {
  return true;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * ホーム画面への追加（A2HS）導線。
 * - PWA 起動中は出さない
 * - 一度閉じたら再表示しない
 * - Android/Chrome: beforeinstallprompt → 独自ボタンで prompt()
 * - iOS: 共有メニュー手順の案内のみ（BIP は発火しない）
 */
export function AddToHomeScreenPrompt({ strings }: Props) {
  const titleId = useId();
  const isClient = useSyncExternalStore(
    subscribeNoop,
    getIsClientSnapshot,
    getServerSnapshot,
  );
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissedLocal, setDismissedLocal] = useState(false);

  const standalone = isClient && isRunningAsInstalledPwa();
  const dismissedStored = isClient && isA2hsDismissed();
  const iosLike = isClient && isIosLikeDevice();
  const dismissed = dismissedLocal || dismissedStored;

  useEffect(() => {
    if (!isClient || standalone || dismissed) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, [isClient, standalone, dismissed]);

  const onDismiss = useCallback(() => {
    dismissA2hsPrompt();
    setDismissedLocal(true);
    setDeferredPrompt(null);
  }, []);

  const onInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch {
      // ユーザーキャンセルやブラウザ拒否は黙って閉じない（再試行可）
      return;
    }
    setDeferredPrompt(null);
    dismissA2hsPrompt();
    setDismissedLocal(true);
  }, [deferredPrompt]);

  const visible =
    isClient &&
    !standalone &&
    !dismissed &&
    (iosLike || deferredPrompt != null);

  if (!visible) {
    return null;
  }

  return (
    <aside
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
