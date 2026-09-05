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
 * 1. localStorage の保存値（利用者が明示的に選んだ言語）
 * 2. `document.documentElement.lang`（SSR の lang。hydration 直後の言語切替 CLS を防ぐ）
 * 3. ブラウザの言語設定（`navigator.languages`）
 * 4. 既定言語（日本語）
 *
 * CI Lighthouse 実測: SSR は ja フィクスチャなのにクライアントが en へ切り替わり、
 * main#main-content が y=303→276 に動いて CLS=0.06033 固定で発生した。
 */
function readStoredLanguage(): SiteLanguage {
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (isSiteLanguage(stored)) return stored;
  } catch {
    // private mode 等
  }

  const fromDom = document.documentElement.lang;
  if (isSiteLanguage(fromDom)) {
    return fromDom;
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
    // SSR/静的生成時は navigator が無いため既定言語。
    // クライアント初回も documentElement.lang（SSR）を優先し、食い違い CLS を避ける。
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
