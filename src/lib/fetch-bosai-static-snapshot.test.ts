import { beforeEach, describe, expect, it, vi } from "vitest";
import { SITE_LANGUAGES } from "@/config/site-language";
import { makeAlertLevel, makeBanner, makeNotice } from "@/test/fixtures";
import type { BosaiStaticSnapshot } from "@/types/bosai-static-snapshot";

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

import {
  assertBosaiStaticSnapshotDeployable,
  countSuccessfulBosaiResources,
  fetchBosaiStaticSnapshot,
} from "@/lib/fetch-bosai-static-snapshot";

describe("fetchBosaiStaticSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.BOSAI_USE_SNAPSHOT_FIXTURE;
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
    expect(snapshot.languages.en.banner.fetchedAt).toBeNull();
    expect(snapshot.languages.en.notices).toEqual({
      ok: true,
      data: [],
      fetchedAt: snapshot.builtAt,
    });
    expect(() => assertBosaiStaticSnapshotDeployable(snapshot)).not.toThrow();
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
      fetchedAt: null,
    });
    expect(snapshot.languages.ja.notices.ok).toBe(true);
    // 部分失敗でもデプロイ可（N-10 のリソース隔離）
    expect(() => assertBosaiStaticSnapshotDeployable(snapshot)).not.toThrow();
  });

  it("returns all-failed snapshot with null fetchedAt when no client (not deployable)", async () => {
    const snapshot = await fetchBosaiStaticSnapshot({
      now: () => new Date("2026-09-02T00:00:00Z"),
    });
    expect(snapshot.builtAt).toBe("2026-09-02T00:00:00.000Z");
    for (const lang of SITE_LANGUAGES) {
      expect(snapshot.languages[lang].banner.ok).toBe(false);
      expect(snapshot.languages[lang].banner.fetchedAt).toBeNull();
      expect(snapshot.languages[lang].alertLevel.fetchedAt).toBeNull();
      expect(snapshot.languages[lang].notices.fetchedAt).toBeNull();
    }
    expect(countSuccessfulBosaiResources(snapshot)).toBe(0);
  });

  it("refuses deploy when every resource failed (N-10 fail-closed on total wipeout)", async () => {
    const getEntities = vi.fn(async () => {
      throw new Error("GeonicDB down");
    });
    const snapshot = await fetchBosaiStaticSnapshot({
      client: { getEntities },
      now: () => new Date("2026-09-02T00:00:00Z"),
    });
    expect(countSuccessfulBosaiResources(snapshot)).toBe(0);
    expect(() => assertBosaiStaticSnapshotDeployable(snapshot)).toThrow(
      /refusing to overwrite last published state \(N-10\)/,
    );
  });

  it("records per-resource fetchedAt at success time (not builtAt start)", async () => {
    let tick = 0;
    const getEntities = vi.fn(async (params: { type: string; q?: string }) => {
      if (!params.q?.includes('"ja"')) return [];
      if (params.type === "bosai-EmergencyBanner")
        return [makeBanner("notice")];
      if (params.type === "bosai-AlertLevel") return [makeAlertLevel(1)];
      if (params.type === "bosai-Notice") return [makeNotice()];
      return [];
    });
    const snapshot = await fetchBosaiStaticSnapshot({
      client: { getEntities },
      now: () => {
        tick += 1;
        return new Date(Date.UTC(2026, 8, 2, 0, tick, 0));
      },
    });
    expect(snapshot.builtAt).toBe("2026-09-02T00:01:00.000Z");
    expect(snapshot.languages.ja.banner.ok).toBe(true);
    expect(snapshot.languages.ja.alertLevel.ok).toBe(true);
    expect(snapshot.languages.ja.notices.ok).toBe(true);
    if (
      snapshot.languages.ja.banner.ok &&
      snapshot.languages.ja.alertLevel.ok &&
      snapshot.languages.ja.notices.ok
    ) {
      expect(snapshot.languages.ja.banner.fetchedAt).not.toBe(snapshot.builtAt);
      expect(snapshot.languages.ja.banner.fetchedAt).toMatch(
        /^2026-09-02T00:0[2-9]:00\.000Z$/,
      );
    }
  });

  it("near-miss: a single successful resource is enough to deploy", () => {
    const fail = { ok: false as const, data: null, fetchedAt: null };
    const snapshot: BosaiStaticSnapshot = {
      builtAt: "2026-09-02T00:00:00.000Z",
      languages: Object.fromEntries(
        SITE_LANGUAGES.map((lang) => [
          lang,
          {
            banner: fail,
            alertLevel: fail,
            notices:
              lang === "ja"
                ? {
                    ok: true as const,
                    data: [makeNotice()],
                    fetchedAt: "2026-09-02T00:00:00.000Z",
                  }
                : fail,
          },
        ]),
      ) as BosaiStaticSnapshot["languages"],
    };
    expect(countSuccessfulBosaiResources(snapshot)).toBe(1);
    expect(() => assertBosaiStaticSnapshotDeployable(snapshot)).not.toThrow();
  });
});
