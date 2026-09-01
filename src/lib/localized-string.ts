import type { SiteLanguage } from "@/types/top-page";

/** API/JSON から取得する多言語対応テキスト。 */
export type LocalizedString =
  | string
  | Partial<Record<SiteLanguage, string>>;

export function resolveLocalizedString(
  value: LocalizedString,
  lang: SiteLanguage,
): string {
  if (typeof value === "string") {
    return value;
  }
  return value[lang] ?? value.ja ?? "";
}
