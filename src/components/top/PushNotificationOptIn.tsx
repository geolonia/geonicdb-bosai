"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
} from "react";
import type { SiteLanguage } from "@/config/site-language";
import type { UiStrings } from "@/config/ui-strings";
import { installAppBadgeClearOnForeground } from "@/lib/app-badge-client";
import {
  disableWebPushNotifications,
  enableWebPushNotifications,
  isWebPushConfigured,
  resolveActiveWebPushState,
  syncServiceWorkerLang,
  type StoredWebPushState,
} from "@/lib/web-push-client";

type Props = {
  lang: SiteLanguage;
  strings: UiStrings;
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

export function PushNotificationOptIn({ lang, strings }: Props) {
  const switchId = useId();
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
    void navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        void syncServiceWorkerLang(registration, lang);
      }
    });
  }, [lang, stored, available]);

  // 通知で立てたバッジを、アプリが前面になったときに消す（#41）
  useEffect(() => {
    if (!available || !stored) return;
    return installAppBadgeClearOnForeground();
  }, [available, stored]);

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

  // 未対応ブラウザ: 理由を status で明示
  if (!pushSupported) {
    return (
      <div className="push-opt-in">
        <p className="push-opt-in__status" role="status">
          {strings.pushUnsupportedLabel}
        </p>
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
    <div className="push-opt-in">
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
