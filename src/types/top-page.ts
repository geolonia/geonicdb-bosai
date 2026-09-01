import type { BannerVariant } from "@/config/alert-colors";
import type { AlertLevel } from "@/config/alert-colors";
import type { SiteLanguage } from "@/config/site-language";
import type { LocalizedString } from "@/lib/localized-string";

export type { SiteLanguage };

export type EmergencyBannerData = {
  variant: BannerVariant;
  heading: LocalizedString;
  description: LocalizedString;
  link: { href: string; label: LocalizedString } | null;
  updatedAt: string;
};

export type AlertLevelData = {
  level: AlertLevel;
  label: LocalizedString;
  updatedAt: string;
};

export type NewsItem = {
  id: string;
  title: LocalizedString;
  summary: LocalizedString;
  category: LocalizedString;
  updatedAt: string;
};

export type NewsListData = {
  items: NewsItem[];
};
