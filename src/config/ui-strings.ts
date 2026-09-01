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
    alertLevelPrefix: string;
    alertLevelUpdated: string;
    quickLinksHeading: string;
    newsHeading: string;
    newsUpdated: string;
    footerAccessibility: string;
    footerContact: string;
    footerContactValue: string;
    comingSoon: string;
    loading: string;
    loadError: string;
    bannerLoadingLabel: string;
    quickLinks: {
      shelters: string;
      hazard: string;
      evacuation: string;
      preparedness: string;
    };
    bannerVariants: {
      緊急安全確保: string;
      避難指示: string;
      高齢者等避難: string;
      注意喚起: string;
      お知らせ: string;
    };
    alertLevelMeta: Record<
      1 | 2 | 3 | 4 | 5,
      { action: string; officialNote?: string }
    >;
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
    alertLevelPrefix: "警戒レベル",
    alertLevelUpdated: "更新",
    quickLinksHeading: "クイックリンク",
    newsHeading: "新着・お知らせ",
    newsUpdated: "更新",
    footerAccessibility: "ウェブアクセシビリティ方針",
    footerContact: "お問い合わせ",
    footerContactValue: "防災担当: 000-0000-0000",
    comingSoon: "準備中",
    loading: "読み込み中…",
    loadError: "情報を読み込めませんでした。時間をおいて再度お試しください。",
    bannerLoadingLabel: "緊急情報を読み込み中",
    quickLinks: {
      shelters: "避難所を探す",
      hazard: "ハザードマップ",
      evacuation: "避難情報",
      preparedness: "防災の備え",
    },
    bannerVariants: {
      緊急安全確保: "緊急安全確保",
      避難指示: "避難指示",
      高齢者等避難: "高齢者等避難",
      注意喚起: "注意喚起",
      お知らせ: "お知らせ",
    },
    alertLevelMeta: {
      1: { action: "災害への心構えを高める" },
      2: { action: "自らの避難行動を確認" },
      3: { action: "高齢者等は避難、他の人は準備" },
      4: {
        action: "危険な場所から全員避難",
        officialNote: "警戒レベル4までに全員避難",
      },
      5: {
        action: "命の危険。直ちに安全確保",
        officialNote: "レベル5は既に危険な段階に入っている可能性があります",
      },
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
    alertLevelPrefix: "けいかい レベル",
    alertLevelUpdated: "こうしん",
    quickLinksHeading: "すぐ に みる",
    newsHeading: "あたらしい おしらせ",
    newsUpdated: "こうしん",
    footerAccessibility: "ウェブ アクセシビリティ ほうしん",
    footerContact: "おといあわせ",
    footerContactValue: "ぼうさい たんとう: 000-0000-0000",
    comingSoon: "じゅんびちゅう",
    loading: "よみこみちゅう…",
    loadError: "じょうほうを よみこめませんでした。しばらくして もういちど ためしてください。",
    bannerLoadingLabel: "きんきゅう じょうほうを よみこみちゅう",
    quickLinks: {
      shelters: "ひなんじょを さがす",
      hazard: "ハザードマップ",
      evacuation: "ひなん じょうほう",
      preparedness: "ぼうさいの じゅんび",
    },
    bannerVariants: {
      緊急安全確保: "きんきゅう あんぜん かくほ",
      避難指示: "ひなん しじ",
      高齢者等避難: "こうれいしゃ ひなん",
      注意喚起: "ちゅうい かんき",
      お知らせ: "おしらせ",
    },
    alertLevelMeta: {
      1: { action: "さいがいに そなえる こころを もつ" },
      2: { action: "じぶんの ひなん こうどうを かくにん" },
      3: { action: "こうれいしゃは ひなん、ほかの ひとは じゅんび" },
      4: {
        action: "きけんな ところから みんな ひなん",
        officialNote: "けいかい レベル4までに みんな ひなん",
      },
      5: {
        action: "いのちが あぶない。すぐに あんぜんに",
        officialNote: "レベル5は もう あぶない かもしれません",
      },
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
    alertLevelPrefix: "Alert level",
    alertLevelUpdated: "Updated",
    quickLinksHeading: "Quick Links",
    newsHeading: "News & Updates",
    newsUpdated: "Updated",
    footerAccessibility: "Web Accessibility Policy",
    footerContact: "Contact",
    footerContactValue: "Disaster Management: 000-0000-0000",
    comingSoon: "Coming soon",
    loading: "Loading…",
    loadError: "Could not load information. Please try again later.",
    bannerLoadingLabel: "Loading emergency information",
    quickLinks: {
      shelters: "Find Shelters",
      hazard: "Hazard Map",
      evacuation: "Evacuation Info",
      preparedness: "Preparedness",
    },
    bannerVariants: {
      緊急安全確保: "Emergency safety alert",
      避難指示: "Evacuation order",
      高齢者等避難: "Elderly evacuation",
      注意喚起: "Advisory",
      お知らせ: "Notice",
    },
    alertLevelMeta: {
      1: { action: "Prepare for disasters" },
      2: { action: "Check your evacuation plan" },
      3: { action: "Elderly should evacuate; others prepare" },
      4: {
        action: "Evacuate immediately from dangerous areas",
        officialNote: "Everyone should evacuate by alert level 4",
      },
      5: {
        action: "Life-threatening. Secure safety immediately",
        officialNote: "Level 5 may mean it is already too late to wait",
      },
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
