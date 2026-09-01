"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  isSiteLanguage,
  LANG_STORAGE_KEY,
  type SiteLanguage,
} from "@/config/site-language";

const LANG_CHANGE_EVENT = "geonicdb-bosai-lang-change";

function readStoredLanguage(): SiteLanguage {
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (isSiteLanguage(stored)) return stored;
  } catch {
    // private mode 等
  }
  return "ja";
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
    () => "ja" as const,
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
