"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import type { SiteLanguage } from "@/config/site-language";
import type { UiStrings } from "@/config/ui-strings";
import {
  enableWebPushNotifications,
  readStoredWebPushState,
  resolveWebPushRegisterUrl,
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

  const existing = isClient ? (stored ?? readStoredWebPushState()) : null;
  const available =
    isClient && resolveWebPushRegisterUrl() != null && isPushSupported();

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

  if (!available) {
    return null;
  }

  const enabled = existing != null;

  return (
    <div className="push-opt-in">
      {enabled ? (
        <p className="push-opt-in__status" role="status" aria-live="polite">
          {strings.pushEnabledLabel}
        </p>
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
