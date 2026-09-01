import type { BannerVariant } from "@/config/alert-colors";
import type { AlertLevel } from "@/config/alert-colors";

export type EmergencyBannerData = {
  variant: BannerVariant;
  heading: string;
  description: string;
  link: { href: string; label: string } | null;
  updatedAt: string;
};

export type AlertLevelData = {
  level: AlertLevel;
  label: string;
  updatedAt: string;
};

export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  category: string;
  updatedAt: string;
};

export type NewsListData = {
  items: NewsItem[];
};

export type SiteLanguage = "ja" | "ja-easy" | "en";
