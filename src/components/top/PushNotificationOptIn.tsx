"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { SiteLanguage } from "@/config/site-language";
import type { UiStrings } from "@/config/ui-strings";
import { installAppBadgeClearOnForeground } from "@/lib/app-badge-client";
import { isIosLikeDevice, isRunningAsInstalledPwa } from "@/lib/a2hs";
import {
  PUSH_OPT_IN_ANCHOR_ID,
  PUSH_OPT_IN_SWITCH_ID,
} from "@/lib/push-opt-in-banner";
import {
  disableWebPushNotifications,
  enableWebPushNotifications,
  isWebPushConfigured,
  readStoredWebPushState,
  resolveActiveWebPushState,
  resyncWebPushSubscriptionLang,
  syncServiceWorkerLang,
  writeStoredWebPushState,
  type StoredWebPushState,
} from "@/lib/web-push-client";

type Props = {
  lang: SiteLanguage;
  strings: UiStrings;
  /** #65: iOS 手順ダイアログを開く（帯 dismiss 後も到達できるよう親が所有） */
  onOpenIosGuide?: (opener: HTMLElement) => void;
  /**
   * 「通知をオンにすることを勧めるべきか」を親へ通知する。
   * ヘッダー上部の推奨帯（`PushOptInBanner`）が同じ判定を二重に走らせないよう、
   * 対応状況・許可状態・購読有無を解決済みのこちらから渡す。
   */
  onOptInRecommendedChange?: (recommended: boolean) => void;
};

function isPushSupported(): boolean {
  return (
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function isNotificationPermissionDenied(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "denied"
  );
}

function subscribeNoop(): () => void {
  return () => undefined;
}

function getIsClientSnapshot(): boolean {
  return true;
}

function getServerSnapshot(): boolean {
  return false;
}

export function PushNotificationOptIn({
  lang,
  strings,
  onOpenIosGuide,
  onOptInRecommendedChange,
}: Props) {
  // ページに 1 個しか置かないので固定 id。推奨帯から `#id` で飛べる必要があり、
  // useId() の不透明な値ではアンカーにできない。
  const switchId = PUSH_OPT_IN_SWITCH_ID;
  const isClient = useSyncExternalStore(
    subscribeNoop,
    getIsClientSnapshot,
    getServerSnapshot,
  );
  const [phase, setPhase] = useState<"idle" | "busy" | "error">("idle");
  const [stored, setStored] = useState<StoredWebPushState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const registerConfigured = isClient && isWebPushConfigured();
  const pushSupported = isClient && isPushSupported();
  const available = registerConfigured && pushSupported;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!available) {
        if (!cancelled) setHydrated(true);
        return;
      }
      if (isNotificationPermissionDenied()) {
        // permission !== granted 時と同様に、保存済み購読を残さない（#56 CodeRabbit）
        await resolveActiveWebPushState();
        if (!cancelled) {
          setPermissionDenied(true);
          setStored(null);
          setHydrated(true);
        }
        return;
      }
      const state = await resolveActiveWebPushState();
      if (!cancelled) {
        setStored(state);
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [available]);

  useEffect(() => {
    if (!stored || !available) return;
    let cancelled = false;
    void (async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await syncServiceWorkerLang(registration, lang);
      }
      if (cancelled) return;

      // 言語一致: 何もしない
      if (stored.lang === lang) return;

      // 旧データ（lang 未保存）: GeonicDB は触らずローカルだけ記録（#61 移行なし）
      if (stored.lang === undefined) {
        const claimed: StoredWebPushState = { ...stored, lang };
        writeStoredWebPushState(claimed);
        if (!cancelled) setStored(claimed);
        return;
      }

      // 表示言語が変わった: 購読の q を作り直す（POST→DELETE）
      setPhase("busy");
      try {
        const next = await resyncWebPushSubscriptionLang({ lang });
        if (!cancelled) {
          setStored(next);
          setPhase("idle");
        }
      } catch {
        if (!cancelled) {
          // 再同期が POST 後に破綻した場合は localStorage がクリアされている
          // （沈黙障害を避け UI をオフへ。#52 のオフ操作 5xx 保持とは文脈が異なる）
          setStored(readStoredWebPushState());
          setPhase("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lang, stored, available]);

  // 通知で立てたバッジを、アプリが前面になったときに消す（#41）
  useEffect(() => {
    if (!available || !stored) return;
    return installAppBadgeClearOnForeground();
  }, [available, stored]);

  // オンを勧められる状態（対応済み・許可拒否でない・未購読）だけ帯を出させる。
  // アンマウント時（OptionalFeatureBoundary が握り潰した場合を含む）は false に戻す。
  const optInRecommended =
    available && hydrated && !permissionDenied && stored == null;
  useEffect(() => {
    onOptInRecommendedChange?.(optInRecommended);
    return () => {
      onOptInRecommendedChange?.(false);
    };
  }, [optInRecommended, onOptInRecommendedChange]);

  const onEnable = useCallback(async () => {
    setPhase("busy");
    try {
      const next = await enableWebPushNotifications({ lang });
      setStored(next);
      setPhase("idle");
    } catch {
      if (isNotificationPermissionDenied()) {
        await resolveActiveWebPushState();
        setPermissionDenied(true);
        setStored(null);
        setPhase("idle");
        return;
      }
      setPhase("error");
    }
  }, [lang]);

  const onDisable = useCallback(async () => {
    setPhase("busy");
    try {
      await disableWebPushNotifications({});
      setStored(null);
      setPhase("idle");
    } catch {
      setPhase("error");
    }
  }, []);

  const onToggle = useCallback(
    (nextChecked: boolean) => {
      if (nextChecked) {
        void onEnable();
      } else {
        void onDisable();
      }
    },
    [onEnable, onDisable],
  );

  // 機能オフ（API キー未設定）または SSR: 何も出さない
  if (!registerConfigured) {
    return null;
  }

  // Push 非対応: iOS 未インストールだけ手順へ誘導。それ以外は UI ごと出さない（#65）
  if (!pushSupported) {
    let iosLike = false;
    let standalone = false;
    try {
      iosLike = isIosLikeDevice();
      standalone = isRunningAsInstalledPwa();
    } catch {
      return null;
    }

    // インストール済みなのに Push が無い（例: iOS 16.4 未満）→ 打つ手なし
    if (!(iosLike && !standalone)) {
      return null;
    }

    return (
      <div className="push-opt-in" data-testid="push-ios-install-hint">
        <p className="push-opt-in__status" role="status">
          {strings.pushIosInstallHint}
        </p>
        <button
          type="button"
          className="push-opt-in__guide"
          onClick={(event) => {
            onOpenIosGuide?.(event.currentTarget);
          }}
        >
          {strings.a2hsIosGuideOpenLabel}
        </button>
      </div>
    );
  }

  if (!hydrated) {
    return null;
  }

  // OS / ブラウザが通知を拒否済み: トグルは出さず復旧案内のみ
  if (permissionDenied) {
    return (
      <div className="push-opt-in">
        <p className="push-opt-in__status" role="status">
          {strings.pushPermissionDeniedLabel}
        </p>
      </div>
    );
  }

  const enabled = stored != null;
  const busy = phase === "busy";
  const hint = busy
    ? strings.pushBusyLabel
    : enabled
      ? strings.pushToggleDescriptionOn
      : strings.pushToggleDescriptionOff;

  return (
    <div className="push-opt-in" id={PUSH_OPT_IN_ANCHOR_ID}>
      <div className="push-opt-in__row">
        <div className="push-opt-in__copy">
          <label
            htmlFor={switchId}
            id={`${switchId}-label`}
            className="push-opt-in__title"
          >
            {strings.pushToggleLabel}
          </label>
          <span className="push-opt-in__hint" id={`${switchId}-hint`}>
            {hint}
          </span>
        </div>
        <input
          id={switchId}
          type="checkbox"
          role="switch"
          className="push-opt-in__switch"
          checked={enabled}
          disabled={busy}
          aria-busy={busy}
          aria-checked={enabled}
          aria-labelledby={`${switchId}-label`}
          aria-describedby={`${switchId}-hint`}
          onChange={(event) => {
            onToggle(event.target.checked);
          }}
        />
      </div>
      {phase === "error" ? (
        <p className="push-opt-in__error" role="alert">
          {strings.pushErrorLabel}
        </p>
      ) : null}
    </div>
  );
}
