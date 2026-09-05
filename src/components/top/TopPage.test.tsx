// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LANG_STORAGE_KEY, SITE_LANGUAGES } from "@/config/site-language";
import { makeAlertLevel, makeBanner, makeNotice } from "@/test/fixtures";
import type { BosaiStaticSnapshot } from "@/types/bosai-static-snapshot";

const useLdEntitiesMock = vi.hoisted(() => vi.fn());

vi.mock("@geolonia/geonicdb-sdk/react", () => ({
  useLdEntities: (...args: unknown[]) => useLdEntitiesMock(...args),
}));

vi.mock("@/lib/geonicdb-public-client", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/geonicdb-public-client")
  >("@/lib/geonicdb-public-client");
  return {
    ...actual,
    getGeonicdbPublicClient: () => ({ tag: "mock-public-client" }),
  };
});

import { TopPage } from "@/components/top/TopPage";

const bannerJa = makeBanner("notice", {
  heading: "バナー見出しJA",
  body: "バナー本文JA",
});
const alertJa = makeAlertLevel(1, { label: "レベル1ラベル" });
const noticeJa = makeNotice({ title: "お知らせタイトルJA" });
const builtAt = "2026-09-02T03:00:00.000Z";

function makeSnapshot(overrides?: { bannerOk?: boolean }): BosaiStaticSnapshot {
  const bannerOk = overrides?.bannerOk ?? true;
  const langSnap = {
    banner: bannerOk
      ? ({ ok: true, data: bannerJa, fetchedAt: builtAt } as const)
      : ({ ok: false, data: null, fetchedAt: null } as const),
    alertLevel: {
      ok: true as const,
      data: alertJa,
      fetchedAt: builtAt,
    },
    notices: {
      ok: true as const,
      data: [noticeJa],
      fetchedAt: builtAt,
    },
  };
  return {
    builtAt,
    languages: Object.fromEntries(
      SITE_LANGUAGES.map((lang) => [lang, langSnap]),
    ) as BosaiStaticSnapshot["languages"],
  };
}

const idle = {
  entities: [] as unknown[],
  loading: false,
  error: null as Error | null,
  refetch: async () => undefined,
};

describe("TopPage load states", () => {
  beforeEach(() => {
    localStorage.setItem(LANG_STORAGE_KEY, "ja");
    useLdEntitiesMock.mockImplementation(
      (_client: unknown, options: { type?: string }) => {
        if (options.type === "bosai-EmergencyBanner") {
          return { ...idle, entities: [bannerJa] };
        }
        if (options.type === "bosai-AlertLevel") {
          return { ...idle, entities: [alertJa] };
        }
        if (options.type === "bosai-Notice") {
          return { ...idle, entities: [noticeJa] };
        }
        return idle;
      },
    );
  });

  afterEach(() => {
    useLdEntitiesMock.mockReset();
    localStorage.clear();
  });

  it("shows ready content from useLdEntities", async () => {
    render(<TopPage />);
    await waitFor(() => {
      expect(screen.getByText("バナー見出しJA")).toBeInTheDocument();
    });
    expect(screen.getByText("レベル1ラベル")).toBeInTheDocument();
    expect(screen.getByText("お知らせタイトルJA")).toBeInTheDocument();
    expect(useLdEntitiesMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: "bosai-EmergencyBanner",
        q: 'language=="ja"',
      }),
    );
  });

  it("shows loading placeholders while hooks are loading", () => {
    useLdEntitiesMock.mockReturnValue({
      ...idle,
      loading: true,
      entities: [],
    });
    render(<TopPage />);
    expect(screen.getAllByText(/読み込み中/).length).toBeGreaterThan(0);
  });

  it("shows error UI when hooks report an error", async () => {
    useLdEntitiesMock.mockReturnValue({
      ...idle,
      error: new Error("network"),
      entities: [],
    });
    render(<TopPage />);
    await waitFor(() => {
      expect(
        screen.getAllByText(/情報を読み込めませんでした/).length,
      ).toBeGreaterThan(0);
    });
  });

  it("shows build-time snapshot without loading when live is still pending (N-10)", () => {
    useLdEntitiesMock.mockReturnValue({
      ...idle,
      loading: true,
      entities: [],
    });
    render(<TopPage initialSnapshot={makeSnapshot()} />);
    expect(screen.getByText("バナー見出しJA")).toBeInTheDocument();
    expect(screen.getByText("レベル1ラベル")).toBeInTheDocument();
    expect(screen.queryByText(/読み込み中/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/この情報は .* 時点/).length).toBeGreaterThan(0);
  });

  it("keeps snapshot with as-of when GeonicDB is down", async () => {
    useLdEntitiesMock.mockReturnValue({
      ...idle,
      error: new Error("geonicdb down"),
      entities: [],
    });
    render(<TopPage initialSnapshot={makeSnapshot()} />);
    await waitFor(() => {
      expect(screen.getByText("バナー見出しJA")).toBeInTheDocument();
    });
    expect(screen.getAllByText(/この情報は .* 時点/).length).toBeGreaterThan(0);
    expect(
      screen.queryByText(/情報を読み込めませんでした/),
    ).not.toBeInTheDocument();
  });

  it("shows generic loadError when live and snapshot both fail without last fetch time", async () => {
    useLdEntitiesMock.mockReturnValue({
      ...idle,
      error: new Error("network"),
      entities: [],
    });
    render(<TopPage initialSnapshot={makeSnapshot({ bannerOk: false })} />);
    await waitFor(() => {
      expect(
        screen.getByText(/情報を読み込めませんでした/),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(/最終取得/)).not.toBeInTheDocument();
  });

  it("still renders emergency content when matchMedia is unavailable (#55)", async () => {
    const original = window.matchMedia;
    // jsdom でも明示的に欠落させ、A2HS がトップを巻き込まないことを固定する
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: undefined,
    });

    try {
      render(<TopPage />);
      await waitFor(() => {
        expect(screen.getByText("バナー見出しJA")).toBeInTheDocument();
      });
      expect(screen.getByText("レベル1ラベル")).toBeInTheDocument();
      expect(screen.getByText("お知らせタイトルJA")).toBeInTheDocument();
      expect(screen.queryByTestId("a2hs-prompt")).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        writable: true,
        value: original,
      });
    }
  });

  it("places optional prompts after emergency banner and alert level (#55)", async () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    Object.defineProperty(navigator, "platform", {
      configurable: true,
      value: "iPhone",
    });
    Object.defineProperty(navigator, "maxTouchPoints", {
      configurable: true,
      value: 5,
    });
    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      value: false,
    });
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: "",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;

    render(<TopPage />);
    const banner = await screen.findByText("バナー見出しJA");
    const alert = screen.getByText("レベル1ラベル");
    const a2hs = await screen.findByTestId("a2hs-prompt");

    expect(
      banner.compareDocumentPosition(a2hs) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      alert.compareDocumentPosition(a2hs) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
