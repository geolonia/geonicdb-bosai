// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LANG_STORAGE_KEY } from "@/config/site-language";
import {
  makeAlertLevel,
  makeBanner,
  makeNotice,
} from "@/test/fixtures";

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
});
