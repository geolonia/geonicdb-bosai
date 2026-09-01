"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_SITE_LANGUAGE,
  detectSiteLanguage,
  isSiteLanguage,
  LANG_STORAGE_KEY,
  type SiteLanguage,
} from "@/config/site-language";

const LANG_CHANGE_EVENT = "geonicdb-bosai-lang-change";

/**
 * 表示言語の決定順:
 * 1. localStorage の保存値（利用者が明示的に選んだ言語。ブラウザ設定より優先）
 * 2. ブラウザの言語設定（`navigator.languages`）で最初に一致した対応言語
 * 3. 既定言語（日本語）
 */
function readStoredLanguage(): SiteLanguage {
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (isSiteLanguage(stored)) return stored;
  } catch {
    // private mode 等
  }

  const fromBrowser = detectSiteLanguage(
    navigator.languages ??
      (navigator.language ? [navigator.language] : undefined),
  );
  return fromBrowser ?? DEFAULT_SITE_LANGUAGE;
}

function subscribe(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(LANG_CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(LANG_CHANGE_EVENT, handler);
  };
}

export function usePreferredLanguage(): [
  SiteLanguage,
  (lang: SiteLanguage) => void,
] {
  const lang = useSyncExternalStore(
    subscribe,
    readStoredLanguage,
    // SSR/静的生成時は navigator が無いため既定言語。hydration 後に
    // クライアント側の判定（localStorage → ブラウザ言語）へ切り替わる。
    () => DEFAULT_SITE_LANGUAGE,
  );

  const setLang = useCallback((next: SiteLanguage) => {
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event(LANG_CHANGE_EVENT));
  }, []);

  return [lang, setLang];
}
