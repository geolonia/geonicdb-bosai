import type { SiteLanguage } from "@/config/site-language";

export function mockPaths(lang: SiteLanguage) {
  const encoded = encodeURIComponent(lang);
  return {
    banner: `/mock/emergency-banner/${encoded}.json`,
    alertLevel: `/mock/alert-level/${encoded}.json`,
    notices: `/mock/notices/${encoded}.json`,
  } as const;
}

export type LoadStatus = "loading" | "ready" | "error";

export type ResourceState<T> = {
  status: LoadStatus;
  /** このデータがどの言語向けか。lang 切替直後は古いまま残し得る */
  dataLang: SiteLanguage | null;
  data: T | null;
};

/**
 * 表示用ステータス。
 * - 現在 lang 向けのデータが揃っている → ready/error
 * - それ以外（未取得・別言語の残骸）→ loading
 * key={lang} remount を使わず、世代番号で古い fetch 結果を捨てる。
 */
export function viewStatus<T>(
  state: ResourceState<T>,
  lang: SiteLanguage,
): LoadStatus {
  if (state.dataLang === lang && state.status !== "loading") {
    return state.status;
  }
  return "loading";
}
