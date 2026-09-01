"use client";

import { useEffect, useRef, useState } from "react";
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
import { toHtmlLang, type SiteLanguage } from "@/config/site-language";
import { UI_STRINGS } from "@/config/ui-strings";
import { fetchPublicJson } from "@/lib/fetch-public-json";
import {
  mockPaths,
  viewStatus,
  type ResourceState,
} from "@/lib/top-page-load";
import { usePreferredLanguage } from "@/lib/use-preferred-language";
import {
  parseAlertLevel,
  parseEmergencyBanner,
  parseNoticeList,
} from "@/lib/validate-top-page-data";
import type {
  BosaiAlertLevel,
  BosaiEmergencyBanner,
  BosaiNotice,
} from "@/types/top-page";

function initialResource<T>(): ResourceState<T> {
  return { status: "loading", dataLang: null, data: null };
}

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

function settleResource<T>(
  result: PromiseSettledResult<unknown>,
  parser: (value: unknown) => T,
  lang: SiteLanguage,
): ResourceState<T> {
  if (result.status !== "fulfilled") {
    return { status: "error", dataLang: lang, data: null };
  }
  const parsed = parseResource(result.value, parser);
  if (!parsed) {
    return { status: "error", dataLang: lang, data: null };
  }
  return { status: "ready", dataLang: lang, data: parsed };
}

export function TopPage() {
  const [lang, setLang] = usePreferredLanguage();
  const strings = UI_STRINGS[lang];
  const fetchGen = useRef(0);

  const [bannerState, setBannerState] =
    useState<ResourceState<BosaiEmergencyBanner>>(initialResource);
  const [alertState, setAlertState] =
    useState<ResourceState<BosaiAlertLevel>>(initialResource);
  const [noticesState, setNoticesState] =
    useState<ResourceState<BosaiNotice[]>>(initialResource);

  useEffect(() => {
    document.documentElement.lang = toHtmlLang(lang);
  }, [lang]);

  useEffect(() => {
    const gen = ++fetchGen.current;
    const paths = mockPaths(lang);
    const targetLang = lang;

    async function load() {
      const results = await Promise.allSettled([
        fetchPublicJson<unknown>(paths.banner),
        fetchPublicJson<unknown>(paths.alertLevel),
        fetchPublicJson<unknown>(paths.notices),
      ]);
      // 言語切替や Strict Mode の cleanup で世代が進んでいたら破棄
      if (gen !== fetchGen.current) return;

      const [bannerResult, alertResult, noticesResult] = results;
      setBannerState(settleResource(bannerResult, parseEmergencyBanner, targetLang));
      setAlertState(settleResource(alertResult, parseAlertLevel, targetLang));
      const notices = settleResource(noticesResult, parseNoticeList, targetLang);
      setNoticesState({
        status: notices.status,
        dataLang: notices.dataLang,
        data: notices.data ? notices.data.items : null,
      });
    }

    void load();
  }, [lang]);

  const bannerStatus = viewStatus(bannerState, lang);
  const alertStatus = viewStatus(alertState, lang);
  const noticesStatus = viewStatus(noticesState, lang);

  const banner =
    bannerStatus === "ready" && bannerState.dataLang === lang
      ? bannerState.data
      : null;
  const alertLevel =
    alertStatus === "ready" && alertState.dataLang === lang
      ? alertState.data
      : null;
  const notices =
    noticesStatus === "ready" && noticesState.dataLang === lang
      ? noticesState.data
      : null;

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
        <EmergencyBanner data={banner} strings={strings} />
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
        {noticesStatus === "ready" && notices ? (
          <NewsList
            heading={strings.newsHeading}
            updatedLabel={strings.newsUpdated}
            items={notices}
            lang={lang}
          />
        ) : noticesStatus === "error" ? (
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
