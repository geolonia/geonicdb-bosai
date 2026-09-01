import { SITE_LANGUAGES, type SiteLanguage } from "@/config/site-language";
import { mockPaths } from "@/lib/top-page-load";

const prefetched = new Set<string>();

/** 言語切替で次に選ばれそうなモック JSON をブラウザに先読みさせる。 */
export function prefetchLanguageMocks(lang: SiteLanguage): void {
  if (typeof document === "undefined") return;
  const paths = mockPaths(lang);
  for (const href of Object.values(paths)) {
    if (prefetched.has(href)) continue;
    prefetched.add(href);
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = href;
    link.as = "fetch";
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }
}

/** 現在以外の言語をまとめて prefetch（select へのフォーカス時）。 */
export function prefetchOtherLanguageMocks(current: SiteLanguage): void {
  for (const lang of SITE_LANGUAGES) {
    if (lang === current) continue;
    prefetchLanguageMocks(lang);
  }
}
