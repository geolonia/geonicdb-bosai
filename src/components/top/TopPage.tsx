"use client";

import { useEffect, useState } from "react";
import {
  AlertLevelDisplay,
  AlertLevelError,
  AlertLevelPlaceholder,
} from "@/components/top/AlertLevelDisplay";
import {
  EmergencyBanner,
  EmergencyBannerError,
  EmergencyBannerPlaceholder,
} from "@/components/top/EmergencyBanner";
import {
  NewsList,
  NewsListError,
  NewsListPlaceholder,
} from "@/components/top/NewsList";
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

type LoadStatus = "loading" | "ready" | "error";

function parseResource<T>(
  raw: unknown,
  parser: (value: unknown) => T,
): T | null {
  try {
    return parser(raw);
  } catch {
    return null;
  }
}

export function TopPage() {
  const [lang, setLang] = useState<SiteLanguage>("ja");
  const [banner, setBanner] = useState<EmergencyBannerData | null>(null);
  const [bannerStatus, setBannerStatus] = useState<LoadStatus>("loading");
  const [alertLevel, setAlertLevel] = useState<AlertLevelData | null>(null);
  const [alertStatus, setAlertStatus] = useState<LoadStatus>("loading");
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [newsStatus, setNewsStatus] = useState<LoadStatus>("loading");
  const strings = UI_STRINGS[lang];

  useEffect(() => {
    document.documentElement.lang = lang === "ja-easy" ? "ja" : lang;
  }, [lang]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const results = await Promise.allSettled([
        fetchPublicJson<unknown>(MOCK_PATHS.banner),
        fetchPublicJson<unknown>(MOCK_PATHS.alertLevel),
        fetchPublicJson<unknown>(MOCK_PATHS.news),
      ]);
      if (cancelled) return;

      const [bannerResult, alertResult, newsResult] = results;

      if (bannerResult.status === "fulfilled") {
        const parsed = parseResource(bannerResult.value, parseEmergencyBanner);
        if (parsed) {
          setBanner(parsed);
          setBannerStatus("ready");
        } else {
          setBanner(null);
          setBannerStatus("error");
        }
      } else {
        setBanner(null);
        setBannerStatus("error");
      }

      if (alertResult.status === "fulfilled") {
        const parsed = parseResource(alertResult.value, parseAlertLevel);
        if (parsed) {
          setAlertLevel(parsed);
          setAlertStatus("ready");
        } else {
          setAlertLevel(null);
          setAlertStatus("error");
        }
      } else {
        setAlertLevel(null);
        setAlertStatus("error");
      }

      if (newsResult.status === "fulfilled") {
        const parsed = parseResource(newsResult.value, parseNewsList);
        if (parsed) {
          setNews(parsed.items);
          setNewsStatus("ready");
        } else {
          setNews(null);
          setNewsStatus("error");
        }
      } else {
        setNews(null);
        setNewsStatus("error");
      }
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
      {bannerStatus === "ready" && banner ? (
        <EmergencyBanner data={banner} lang={lang} strings={strings} />
      ) : bannerStatus === "error" ? (
        <EmergencyBannerError message={strings.loadError} />
      ) : (
        <EmergencyBannerPlaceholder
          loadingLabel={strings.bannerLoadingLabel}
          loadingText={strings.loading}
        />
      )}
      <main className="top-main" id="main-content">
        {alertStatus === "ready" && alertLevel ? (
          <AlertLevelDisplay data={alertLevel} lang={lang} strings={strings} />
        ) : alertStatus === "error" ? (
          <AlertLevelError
            heading={strings.alertLevelHeading}
            message={strings.loadError}
          />
        ) : (
          <AlertLevelPlaceholder strings={strings} />
        )}
        <QuickLinks heading={strings.quickLinksHeading} links={quickLinks} />
        {newsStatus === "ready" && news ? (
          <NewsList
            heading={strings.newsHeading}
            updatedLabel={strings.newsUpdated}
            items={news}
            lang={lang}
          />
        ) : newsStatus === "error" ? (
          <NewsListError
            heading={strings.newsHeading}
            message={strings.loadError}
          />
        ) : (
          <NewsListPlaceholder
            heading={strings.newsHeading}
            loadingText={strings.loading}
          />
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
