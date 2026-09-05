// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { configureAxe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { AlertLevelDisplay } from "@/components/top/AlertLevelDisplay";
import { EmergencyBanner } from "@/components/top/EmergencyBanner";
import { NewsList } from "@/components/top/NewsList";
import { PushNotificationOptIn } from "@/components/top/PushNotificationOptIn";
import { QuickLinks } from "@/components/top/QuickLinks";
import { SiteHeader } from "@/components/top/SiteHeader";
import { BANNER_VARIANT_COLORS } from "@/config/alert-colors";
import { contrastRatio } from "@/lib/contrast";
import {
  ALL_BANNER_VARIANTS,
  makeAlertLevel,
  makeBanner,
  makeNotice,
  testStrings,
} from "@/test/fixtures";

/** コンポーネント単体ではページ全体の landmark 構成を持たないため無効化 */
const runAxe = configureAxe({
  rules: {
    region: { enabled: false },
    "landmark-one-main": { enabled: false },
    "landmark-no-duplicate-main": { enabled: false },
  },
});

describe("a11y: EmergencyBanner", () => {
  it.each(ALL_BANNER_VARIANTS)(
    "has no axe violations for variant %s",
    async (variant) => {
      const { container } = render(
        <EmergencyBanner data={makeBanner(variant)} strings={testStrings} />,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    },
  );
});

describe("a11y: AlertLevelDisplay", () => {
  it.each([1, 2, 3, 4, 5] as const)(
    "has no axe violations for level %s",
    async (level) => {
      const { container } = render(
        <AlertLevelDisplay
          data={makeAlertLevel(level)}
          lang="ja"
          strings={testStrings}
        />,
      );
      expect(await runAxe(container)).toHaveNoViolations();
    },
  );

  it("keeps WCAG AA contrast on yellow level 2 (#F2E700)", () => {
    const { bg, text } = BANNER_VARIANT_COLORS.advisory;
    expect(bg.toUpperCase()).toBe("#F2E700");
    expect(contrastRatio(text, bg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("a11y: SiteHeader / QuickLinks / NewsList", () => {
  it("SiteHeader has no axe violations", async () => {
    const { container } = render(
      <SiteHeader
        strings={testStrings}
        lang="ja"
        onLangChange={() => undefined}
      />,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("QuickLinks has no axe violations", async () => {
    const { container } = render(
      <QuickLinks
        heading={testStrings.quickLinksHeading}
        links={[
          {
            id: "shelters",
            label: testStrings.quickLinks.shelters,
            href: null,
            comingSoonLabel: testStrings.comingSoon,
          },
          {
            id: "hazard",
            label: testStrings.quickLinks.hazard,
            href: "/hazard",
            comingSoonLabel: testStrings.comingSoon,
          },
        ]}
      />,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("NewsList has no axe violations", async () => {
    const { container } = render(
      <NewsList
        heading={testStrings.newsHeading}
        updatedLabel={testStrings.newsUpdated}
        items={[makeNotice()]}
        lang="ja"
      />,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });
});

describe("a11y: PushNotificationOptIn", () => {
  it("enable button has no axe violations", async () => {
    process.env.NEXT_PUBLIC_GEONICDB_URL = "https://geonicdb.example.example";
    process.env.NEXT_PUBLIC_GEONICDB_WEBPUSH_API_KEY = "gdb_webpush_test";
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: { permission: "default" },
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {},
    });
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: function PushManager() {},
    });

    const { container, findByRole } = render(
      <PushNotificationOptIn lang="ja" strings={testStrings} />,
    );
    await findByRole("button", { name: testStrings.pushEnableLabel });
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
