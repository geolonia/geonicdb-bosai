import type { SiteLanguage } from "@/types/top-page";

export const UI_STRINGS: Record<
  SiteLanguage,
  {
    siteTitle: string;
    municipalityName: string;
    langLabel: string;
    langJa: string;
    langJaEasy: string;
    langEn: string;
    alertLevelHeading: string;
    alertLevelUpdated: string;
    quickLinksHeading: string;
    newsHeading: string;
    newsUpdated: string;
    footerAccessibility: string;
    footerContact: string;
    footerContactValue: string;
    comingSoon: string;
    quickLinks: {
      shelters: string;
      hazard: string;
      evacuation: string;
      preparedness: string;
    };
  }
> = {
  ja: {
    siteTitle: "防災情報",
    municipalityName: "○○市（テンプレート）",
    langLabel: "表示言語",
    langJa: "日本語",
    langJaEasy: "やさしい日本語",
    langEn: "English",
    alertLevelHeading: "現在の警戒レベル",
    alertLevelUpdated: "更新",
    quickLinksHeading: "クイックリンク",
    newsHeading: "新着・お知らせ",
    newsUpdated: "更新",
    footerAccessibility: "ウェブアクセシビリティ方針",
    footerContact: "お問い合わせ",
    footerContactValue: "防災担当: 000-0000-0000",
    comingSoon: "準備中",
    quickLinks: {
      shelters: "避難所を探す",
      hazard: "ハザードマップ",
      evacuation: "避難情報",
      preparedness: "防災の備え",
    },
  },
  "ja-easy": {
    siteTitle: "ぼうさい じょうほう",
    municipalityName: "○○し（テンプレート）",
    langLabel: "ことば",
    langJa: "にほんご",
    langJaEasy: "やさしい にほんご",
    langEn: "English",
    alertLevelHeading: "いまの けいかい レベル",
    alertLevelUpdated: "こうしん",
    quickLinksHeading: "すぐ に みる",
    newsHeading: "あたらしい おしらせ",
    newsUpdated: "こうしん",
    footerAccessibility: "ウェブ アクセシビリティ ほうしん",
    footerContact: "おといあわせ",
    footerContactValue: "ぼうさい たんとう: 000-0000-0000",
    comingSoon: "じゅんびちゅう",
    quickLinks: {
      shelters: "ひなんじょを さがす",
      hazard: "ハザードマップ",
      evacuation: "ひなん じょうほう",
      preparedness: "ぼうさいの じゅんび",
    },
  },
  en: {
    siteTitle: "Disaster Information",
    municipalityName: "○○ City (Template)",
    langLabel: "Language",
    langJa: "Japanese",
    langJaEasy: "Easy Japanese",
    langEn: "English",
    alertLevelHeading: "Current Alert Level",
    alertLevelUpdated: "Updated",
    quickLinksHeading: "Quick Links",
    newsHeading: "News & Updates",
    newsUpdated: "Updated",
    footerAccessibility: "Web Accessibility Policy",
    footerContact: "Contact",
    footerContactValue: "Disaster Management: 000-0000-0000",
    comingSoon: "Coming soon",
    quickLinks: {
      shelters: "Find Shelters",
      hazard: "Hazard Map",
      evacuation: "Evacuation Info",
      preparedness: "Preparedness",
    },
  },
};

export function formatDateTime(iso: string, lang: SiteLanguage): string {
  const locale = lang === "en" ? "en-US" : "ja-JP";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date(iso));
}
