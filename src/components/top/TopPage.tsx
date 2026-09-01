"use client";

import { useEffect, useMemo } from "react";
import { useLdEntities } from "@geolonia/geonicdb-sdk/react";
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
import { toHtmlLang } from "@/config/site-language";
import { UI_STRINGS } from "@/config/ui-strings";
import {
  getGeonicdbPublicClient,
  languagePropertyQuery,
} from "@/lib/geonicdb-public-client";
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

type ViewStatus = "loading" | "error" | "ready";

/** useLdEntities 第1引数（react エントリの GeonicDB とコアの型が分かれている）。 */
type LdClient = Parameters<typeof useLdEntities>[0];

/** env 未設定時でも hooks を無条件呼び出しできるよう、必ず失敗するスタブ。 */
const MISSING_CONFIG_CLIENT = {
  getEntities: async () => {
    throw new Error("NEXT_PUBLIC_GEONICDB_URL is not set");
  },
} as unknown as LdClient;

function parseFirst<T>(
  entities: unknown[],
  parser: (value: unknown) => T,
): T | null {
  const first = entities[0];
  if (!first) return null;
  try {
    return parser(first);
  } catch {
    return null;
  }
}

function parseNotices(entities: unknown[]): BosaiNotice[] | null {
  try {
    return parseNoticeList(entities).items;
  } catch {
    return null;
  }
}

function resourceStatus(
  loading: boolean,
  error: Error | null,
  data: unknown,
): ViewStatus {
  if (loading) return "loading";
  if (error || data == null) return "error";
  return "ready";
}

export function TopPage() {
  const [lang, setLang] = usePreferredLanguage();
  const strings = UI_STRINGS[lang];

  const client = useMemo((): LdClient => {
    try {
      return getGeonicdbPublicClient() as unknown as LdClient;
    } catch {
      return MISSING_CONFIG_CLIENT;
    }
  }, []);

  const q = languagePropertyQuery(lang);

  const bannerQuery = useLdEntities(client, {
    type: "bosai-EmergencyBanner",
    q,
    limit: 1,
  });
  const alertQuery = useLdEntities(client, {
    type: "bosai-AlertLevel",
    q,
    limit: 1,
  });
  const noticesQuery = useLdEntities(client, {
    type: "bosai-Notice",
    q,
    limit: 50,
  });

  useEffect(() => {
    document.documentElement.lang = toHtmlLang(lang);
  }, [lang]);

  const banner: BosaiEmergencyBanner | null = parseFirst(
    bannerQuery.entities,
    parseEmergencyBanner,
  );
  const alertLevel: BosaiAlertLevel | null = parseFirst(
    alertQuery.entities,
    parseAlertLevel,
  );
  const notices: BosaiNotice[] | null = parseNotices(noticesQuery.entities);

  const bannerStatus = resourceStatus(
    bannerQuery.loading,
    bannerQuery.error,
    banner,
  );
  const alertStatus = resourceStatus(
    alertQuery.loading,
    alertQuery.error,
    alertLevel,
  );
  const noticesStatus = resourceStatus(
    noticesQuery.loading,
    noticesQuery.error,
    notices,
  );

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
