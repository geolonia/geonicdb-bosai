"use client";

import { useEffect, useState } from "react";
import {
  AlertLevelDisplay,
  AlertLevelPlaceholder,
} from "@/components/top/AlertLevelDisplay";
import {
  EmergencyBanner,
  EmergencyBannerPlaceholder,
} from "@/components/top/EmergencyBanner";
import { NewsList, NewsListPlaceholder } from "@/components/top/NewsList";
import { QuickLinks } from "@/components/top/QuickLinks";
import { SiteFooter } from "@/components/top/SiteFooter";
import { SiteHeader } from "@/components/top/SiteHeader";
import { UI_STRINGS } from "@/config/ui-strings";
import { fetchPublicJson } from "@/lib/fetch-public-json";
import {
  parseAlertLevel,
  parseEmergencyBanner,
  parseNewsList,
} from "@/lib/validate-top-page-data";
import type {
  AlertLevelData,
  EmergencyBannerData,
  NewsItem,
  SiteLanguage,
} from "@/types/top-page";

const MOCK_PATHS = {
  banner: "/mock/emergency-banner.json",
  alertLevel: "/mock/alert-level.json",
  news: "/mock/news.json",
} as const;

export function TopPage() {
  const [lang, setLang] = useState<SiteLanguage>("ja");
  const [banner, setBanner] = useState<EmergencyBannerData | null>(null);
  const [alertLevel, setAlertLevel] = useState<AlertLevelData | null>(null);
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const strings = UI_STRINGS[lang];

  useEffect(() => {
    document.documentElement.lang = lang === "ja-easy" ? "ja" : lang;
  }, [lang]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [bannerRaw, alertRaw, newsRaw] = await Promise.all([
        fetchPublicJson<unknown>(MOCK_PATHS.banner),
        fetchPublicJson<unknown>(MOCK_PATHS.alertLevel),
        fetchPublicJson<unknown>(MOCK_PATHS.news),
      ]);
      if (cancelled) return;
      setBanner(parseEmergencyBanner(bannerRaw));
      setAlertLevel(parseAlertLevel(alertRaw));
      setNews(parseNewsList(newsRaw).items);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const quickLinks = [
    {
      id: "shelters",
      label: strings.quickLinks.shelters,
      href: null,
      comingSoonLabel: strings.comingSoon,
    },
    {
      id: "hazard",
      label: strings.quickLinks.hazard,
      href: null,
      comingSoonLabel: strings.comingSoon,
    },
    {
      id: "evacuation",
      label: strings.quickLinks.evacuation,
      href: null,
      comingSoonLabel: strings.comingSoon,
    },
    {
      id: "preparedness",
      label: strings.quickLinks.preparedness,
      href: null,
      comingSoonLabel: strings.comingSoon,
    },
  ];

  return (
    <>
      <SiteHeader strings={strings} lang={lang} onLangChange={setLang} />
      {banner ? (
        <EmergencyBanner data={banner} />
      ) : (
        <EmergencyBannerPlaceholder />
      )}
      <main className="top-main" id="main-content">
        {alertLevel ? (
          <AlertLevelDisplay data={alertLevel} lang={lang} strings={strings} />
        ) : (
          <AlertLevelPlaceholder strings={strings} />
        )}
        <QuickLinks heading={strings.quickLinksHeading} links={quickLinks} />
        {news ? (
          <NewsList
            heading={strings.newsHeading}
            updatedLabel={strings.newsUpdated}
            items={news}
            lang={lang}
          />
        ) : (
          <NewsListPlaceholder heading={strings.newsHeading} />
        )}
      </main>
      <SiteFooter
        accessibilityLabel={strings.footerAccessibility}
        contactLabel={strings.footerContact}
        contactValue={strings.footerContactValue}
      />
    </>
  );
}
