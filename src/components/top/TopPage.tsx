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
import { toHtmlLang, type SiteLanguage } from "@/config/site-language";
import { UI_STRINGS, type UiStrings } from "@/config/ui-strings";
import { fetchPublicJson } from "@/lib/fetch-public-json";
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

function mockPaths(lang: SiteLanguage) {
  return {
    banner: `/mock/emergency-banner/${lang}.json`,
    alertLevel: `/mock/alert-level/${lang}.json`,
    notices: `/mock/notices/${lang}.json`,
  } as const;
}

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

type BodyProps = {
  lang: SiteLanguage;
  strings: UiStrings;
};

/** lang を key にしてマウントし直すため、初期状態が loading になる。 */
function TopPageBody({ lang, strings }: BodyProps) {
  const [banner, setBanner] = useState<BosaiEmergencyBanner | null>(null);
  const [bannerStatus, setBannerStatus] = useState<LoadStatus>("loading");
  const [alertLevel, setAlertLevel] = useState<BosaiAlertLevel | null>(null);
  const [alertStatus, setAlertStatus] = useState<LoadStatus>("loading");
  const [notices, setNotices] = useState<BosaiNotice[] | null>(null);
  const [noticesStatus, setNoticesStatus] = useState<LoadStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    const paths = mockPaths(lang);

    async function load() {
      const results = await Promise.allSettled([
        fetchPublicJson<unknown>(paths.banner),
        fetchPublicJson<unknown>(paths.alertLevel),
        fetchPublicJson<unknown>(paths.notices),
      ]);
      if (cancelled) return;

      const [bannerResult, alertResult, noticesResult] = results;

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

      if (noticesResult.status === "fulfilled") {
        const parsed = parseResource(noticesResult.value, parseNoticeList);
        if (parsed) {
          setNotices(parsed.items);
          setNoticesStatus("ready");
        } else {
          setNotices(null);
          setNoticesStatus("error");
        }
      } else {
        setNotices(null);
        setNoticesStatus("error");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [lang]);

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

export function TopPage() {
  const [lang, setLang] = usePreferredLanguage();
  const strings = UI_STRINGS[lang];

  useEffect(() => {
    document.documentElement.lang = toHtmlLang(lang);
  }, [lang]);

  return (
    <>
      <SiteHeader strings={strings} lang={lang} onLangChange={setLang} />
      <TopPageBody key={lang} lang={lang} strings={strings} />
    </>
  );
}
