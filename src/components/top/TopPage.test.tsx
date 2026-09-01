// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TopPage } from "@/components/top/TopPage";
import { LANG_STORAGE_KEY } from "@/config/site-language";
import {
  makeAlertLevel,
  makeBanner,
  makeNotice,
} from "@/test/fixtures";

const bannerJa = makeBanner("notice", {
  heading: "バナー見出しJA",
  body: "バナー本文JA",
});
const alertJa = makeAlertLevel(1, { label: "レベル1ラベル" });
const noticesJa = {
  items: [makeNotice({ title: "お知らせタイトルJA" })],
};

describe("TopPage load states", () => {
  beforeEach(() => {
    localStorage.setItem(LANG_STORAGE_KEY, "ja");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("shows loading placeholders then ready content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        await new Promise((r) => setTimeout(r, 20));
        if (url.includes("/emergency-banner/")) {
          return Response.json(bannerJa);
        }
        if (url.includes("/alert-level/")) {
          return Response.json(alertJa);
        }
        if (url.includes("/notices/")) {
          return Response.json(noticesJa);
        }
        return new Response("not found", { status: 404 });
      }),
    );

    render(<TopPage />);
    expect(screen.getAllByText(/読み込み中/).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText("バナー見出しJA")).toBeInTheDocument();
    });
    expect(screen.getByText("レベル1ラベル")).toBeInTheDocument();
    expect(screen.getByText("お知らせタイトルJA")).toBeInTheDocument();
  });

  it("shows error UI when fetches fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("boom", { status: 500 })),
    );

    render(<TopPage />);

    await waitFor(() => {
      expect(
        screen.getAllByText(/情報を読み込めませんでした/).length,
      ).toBeGreaterThan(0);
    });
  });
});
