"use client";

import { useCallback, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
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
import { OptionalFeatureBoundary } from "@/components/top/OptionalFeatureBoundary";
import { PushNotificationOptIn } from "@/components/top/PushNotificationOptIn";
import { QuickLinks } from "@/components/top/QuickLinks";
import { SiteFooter } from "@/components/top/SiteFooter";
import { SiteHeader } from "@/components/top/SiteHeader";
import { toHtmlLang } from "@/config/site-language";
import {
  formatAsOfLabel,
  formatLoadError,
  UI_STRINGS,
} from "@/config/ui-strings";
import {
  getGeonicdbPublicClient,
  languagePropertyQuery,
} from "@/lib/geonicdb-public-client";
import { resolveBosaiResourceView } from "@/lib/resolve-bosai-resource-view";
import { usePreferredLanguage } from "@/lib/use-preferred-language";
import { useBosaiLiveUpdates } from "@/lib/use-bosai-live-updates";
import {
  parseAlertLevel,
  parseEmergencyBanner,
  parseNoticeList,
} from "@/lib/validate-top-page-data";
import type { BosaiStaticSnapshot } from "@/types/bosai-static-snapshot";
import type {
  BosaiAlertLevel,
  BosaiEmergencyBanner,
  BosaiNotice,
} from "@/types/top-page";

/** A2HS は初期バンドルから外し、表示時も fixed で CLS を避ける（#55 / Lighthouse） */
const AddToHomeScreenPrompt = dynamic(
  () =>
    import("@/components/top/AddToHomeScreenPrompt").then(
      (m) => m.AddToHomeScreenPrompt,
    ),
  { ssr: false },
);

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

function AsOfNote({ label }: { label: string }) {
  return (
    <p className="bosai-as-of" role="status">
      {label}
    </p>
  );
}

type TopPageProps = {
  /** ビルド時に焼き込んだスナップショット。未指定時はライブのみ（テスト互換）。 */
  initialSnapshot?: BosaiStaticSnapshot;
};

export function TopPage({ initialSnapshot }: TopPageProps = {}) {
  const [lang, setLang] = usePreferredLanguage();
  const strings = UI_STRINGS[lang];
  const langSnapshot = initialSnapshot?.languages[lang];

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

  const refetchBanner = useCallback(() => {
    void bannerQuery.refetch();
  }, [bannerQuery]);
  const refetchAlertLevel = useCallback(() => {
    void alertQuery.refetch();
  }, [alertQuery]);
  const refetchNotices = useCallback(() => {
    void noticesQuery.refetch();
  }, [noticesQuery]);

  useBosaiLiveUpdates({
    "bosai-Notice": refetchNotices,
    "bosai-EmergencyBanner": refetchBanner,
    "bosai-AlertLevel": refetchAlertLevel,
  });

  const banner: BosaiEmergencyBanner | null = parseFirst(
    bannerQuery.entities,
    parseEmergencyBanner,
  );
  const alertLevel: BosaiAlertLevel | null = parseFirst(
    alertQuery.entities,
    parseAlertLevel,
  );
  const notices: BosaiNotice[] | null = parseNotices(noticesQuery.entities);

  const bannerView = resolveBosaiResourceView({
    liveLoading: bannerQuery.loading,
    liveError: bannerQuery.error,
    liveData: banner,
    snapshot: langSnapshot?.banner,
  });
  const alertView = resolveBosaiResourceView({
    liveLoading: alertQuery.loading,
    liveError: alertQuery.error,
    liveData: alertLevel,
    snapshot: langSnapshot?.alertLevel,
  });
  const noticesView = resolveBosaiResourceView({
    liveLoading: noticesQuery.loading,
    liveError: noticesQuery.error,
    liveData: notices,
    snapshot: langSnapshot?.notices,
  });

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
      {bannerView.kind === "ready" ? (
        <>
          <EmergencyBanner data={bannerView.data} strings={strings} />
          {bannerView.stale && bannerView.asOf ? (
            <AsOfNote
              label={formatAsOfLabel(strings.asOfLabel, bannerView.asOf, lang)}
            />
          ) : null}
        </>
      ) : bannerView.kind === "empty" ? null : bannerView.kind === "error" ? (
        <EmergencyBannerError
          message={formatLoadError(strings, bannerView.lastFetchedAt, lang)}
        />
      ) : (
        <EmergencyBannerPlaceholder
          loadingLabel={strings.bannerLoadingLabel}
          loadingText={strings.loading}
        />
      )}
      <main className="top-main" id="main-content">
        {alertView.kind === "ready" ? (
          <>
            <AlertLevelDisplay
              data={alertView.data}
              lang={lang}
              strings={strings}
            />
            {alertView.stale && alertView.asOf ? (
              <AsOfNote
                label={formatAsOfLabel(strings.asOfLabel, alertView.asOf, lang)}
              />
            ) : null}
          </>
        ) : alertView.kind === "empty" ? null : alertView.kind === "error" ? (
          <AlertLevelError
            heading={strings.alertLevelHeading}
            message={formatLoadError(strings, alertView.lastFetchedAt, lang)}
          />
        ) : (
          <AlertLevelPlaceholder strings={strings} />
        )}
        {/* 付加 UI は緊急バナー・警戒レベルより後（WCAG 1.3.2 / #55） */}
        <PushNotificationOptIn lang={lang} strings={strings} />
        <OptionalFeatureBoundary>
          <AddToHomeScreenPrompt strings={strings} />
        </OptionalFeatureBoundary>
        <QuickLinks heading={strings.quickLinksHeading} links={quickLinks} />
        {noticesView.kind === "ready" ? (
          <>
            <NewsList
              heading={strings.newsHeading}
              updatedLabel={strings.newsUpdated}
              items={noticesView.data}
              lang={lang}
            />
            {noticesView.stale && noticesView.asOf ? (
              <AsOfNote
                label={formatAsOfLabel(
                  strings.asOfLabel,
                  noticesView.asOf,
                  lang,
                )}
              />
            ) : null}
          </>
        ) : noticesView.kind === "empty" ? null : noticesView.kind ===
          "error" ? (
          <NewsListError
            heading={strings.newsHeading}
            message={formatLoadError(strings, noticesView.lastFetchedAt, lang)}
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
        testResultsLabel={strings.footerTestResults}
        privacyLabel={strings.footerPrivacy}
        linksLabel={strings.footerLinksLabel}
        contactLabel={strings.footerContact}
        contactValue={strings.footerContactValue}
      />
    </>
  );
}
