"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { SiteLanguage } from "@/config/site-language";
import type { UiStrings } from "@/config/ui-strings";
import {
  disableWebPushNotifications,
  enableWebPushNotifications,
  resolveActiveWebPushState,
  resolveWebPushRegisterUrl,
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
  const isClient = useSyncExternalStore(
    subscribeNoop,
    getIsClientSnapshot,
    getServerSnapshot,
  );
  const [phase, setPhase] = useState<"idle" | "busy" | "error">("idle");
  const [stored, setStored] = useState<StoredWebPushState | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const available =
    isClient && resolveWebPushRegisterUrl() != null && isPushSupported();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!available) {
        if (!cancelled) setHydrated(true);
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

  const onEnable = useCallback(async () => {
    setPhase("busy");
    try {
      const next = await enableWebPushNotifications({ lang });
      setStored(next);
      setPhase("idle");
    } catch {
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

  if (!available || !hydrated) {
    return null;
  }

  const enabled = stored != null;

  return (
    <div className="push-opt-in">
      {enabled ? (
        <div className="push-opt-in__enabled">
          <p className="push-opt-in__status" role="status" aria-live="polite">
            {strings.pushEnabledLabel}
          </p>
          <button
            type="button"
            className="push-opt-in__button push-opt-in__button--secondary"
            onClick={() => {
              void onDisable();
            }}
            disabled={phase === "busy"}
            aria-busy={phase === "busy"}
          >
            {phase === "busy"
              ? strings.pushBusyLabel
              : strings.pushDisableLabel}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="push-opt-in__button"
          onClick={() => {
            void onEnable();
          }}
          disabled={phase === "busy"}
          aria-busy={phase === "busy"}
        >
          {phase === "busy" ? strings.pushBusyLabel : strings.pushEnableLabel}
        </button>
      )}
      {phase === "error" ? (
        <p className="push-opt-in__error" role="alert">
          {strings.pushErrorLabel}
        </p>
      ) : null}
    </div>
  );
}
