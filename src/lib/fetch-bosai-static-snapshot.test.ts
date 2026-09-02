import { beforeEach, describe, expect, it, vi } from "vitest";
import { SITE_LANGUAGES } from "@/config/site-language";
import { makeAlertLevel, makeBanner, makeNotice } from "@/test/fixtures";

vi.mock("@/lib/geonicdb-public-client", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/geonicdb-public-client")
  >("@/lib/geonicdb-public-client");
  return {
    ...actual,
    getGeonicdbPublicClient: vi.fn(() => {
      throw new Error("NEXT_PUBLIC_GEONICDB_URL is not set");
    }),
  };
});

import { fetchBosaiStaticSnapshot } from "@/lib/fetch-bosai-static-snapshot";

describe("fetchBosaiStaticSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bakes per-language entities from GeonicDB (build-time path)", async () => {
    const banner = makeBanner("evacuation-order");
    const alert = makeAlertLevel(4);
    const notice = makeNotice();
    const getEntities = vi.fn(async (params: { type: string; q?: string }) => {
      if (!params.q?.includes('"ja"')) return [];
      if (params.type === "bosai-EmergencyBanner") return [banner];
      if (params.type === "bosai-AlertLevel") return [alert];
      if (params.type === "bosai-Notice") return [notice];
      return [];
    });

    const snapshot = await fetchBosaiStaticSnapshot({
      client: { getEntities },
      now: () => new Date("2026-09-02T12:34:00+09:00"),
    });

    expect(snapshot.builtAt).toBe("2026-09-02T03:34:00.000Z");
    expect(Object.keys(snapshot.languages).sort()).toEqual(
      [...SITE_LANGUAGES].sort(),
    );
    expect(snapshot.languages.ja.banner).toEqual({
      ok: true,
      data: banner,
      fetchedAt: snapshot.builtAt,
    });
    expect(snapshot.languages.ja.alertLevel.ok).toBe(true);
    expect(snapshot.languages.ja.notices).toEqual({
      ok: true,
      data: [notice],
      fetchedAt: snapshot.builtAt,
    });
    expect(snapshot.languages.en.banner.ok).toBe(false);
    expect(snapshot.languages.en.notices).toEqual({
      ok: true,
      data: [],
      fetchedAt: snapshot.builtAt,
    });
  });

  it("isolates per-resource failures (one getEntities throw does not wipe others)", async () => {
    const banner = makeBanner("notice");
    const getEntities = vi.fn(async (params: { type: string; q?: string }) => {
      if (!params.q?.includes('"ja"')) return [];
      if (params.type === "bosai-EmergencyBanner") return [banner];
      if (params.type === "bosai-AlertLevel") {
        throw new Error("alert down");
      }
      if (params.type === "bosai-Notice") return [makeNotice()];
      return [];
    });

    const snapshot = await fetchBosaiStaticSnapshot({
      client: { getEntities },
      now: () => new Date("2026-09-02T00:00:00Z"),
    });

    expect(snapshot.languages.ja.banner.ok).toBe(true);
    expect(snapshot.languages.ja.alertLevel).toEqual({
      ok: false,
      data: null,
      fetchedAt: snapshot.builtAt,
    });
    expect(snapshot.languages.ja.notices.ok).toBe(true);
  });

  it("returns all-failed snapshot when no client can be resolved (build without URL)", async () => {
    const snapshot = await fetchBosaiStaticSnapshot({
      now: () => new Date("2026-09-02T00:00:00Z"),
    });
    expect(snapshot.builtAt).toBe("2026-09-02T00:00:00.000Z");
    for (const lang of SITE_LANGUAGES) {
      expect(snapshot.languages[lang].banner.ok).toBe(false);
      expect(snapshot.languages[lang].banner.fetchedAt).toBeNull();
    }
  });
});
