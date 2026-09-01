import type { AlertLevel, BannerVariant } from "@/config/alert-colors";
import type { SiteLanguage } from "@/config/site-language";

/** 全 bosai-* エンティティ共通プロパティ（docs/data-model.md） */
export type BosaiCommonProps = {
  language: SiteLanguage;
  translationGroup: string;
  updatedAt: string;
};

export type BosaiNotice = BosaiCommonProps & {
  id: string;
  type: "bosai-Notice";
  title: string;
  body: string;
  publishedAt: string;
};

export type BosaiEmergencyBanner = BosaiCommonProps & {
  id: string;
  type: "bosai-EmergencyBanner";
  variant: BannerVariant;
  heading: string;
  body: string;
  linkHref: string | null;
  linkText: string | null;
};

export type BosaiAlertLevel = BosaiCommonProps & {
  id: string;
  type: "bosai-AlertLevel";
  level: AlertLevel;
  label: string;
  body: string;
};

export type BosaiNoticeList = {
  items: BosaiNotice[];
};

/** @deprecated 互換エイリアス — 新コードは Bosai* を使う */
export type EmergencyBannerData = BosaiEmergencyBanner;
export type AlertLevelData = BosaiAlertLevel;
export type NewsItem = BosaiNotice;
export type NewsListData = BosaiNoticeList;
