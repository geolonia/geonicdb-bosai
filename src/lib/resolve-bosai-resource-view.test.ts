import { describe, expect, it } from "vitest";
import { resolveBosaiResourceView } from "@/lib/resolve-bosai-resource-view";
import { makeBanner } from "@/test/fixtures";

const banner = makeBanner("notice");
const fetchedAt = "2026-09-02T03:00:00.000Z";

describe("resolveBosaiResourceView", () => {
  it("prefers live data when the live fetch succeeded", () => {
    const live = makeBanner("advisory", { heading: "live" });
    const view = resolveBosaiResourceView({
      liveLoading: false,
      liveError: null,
      liveData: live,
      snapshot: { ok: true, data: banner, fetchedAt },
    });
    expect(view).toEqual({
      kind: "ready",
      data: live,
      stale: false,
      asOf: null,
    });
  });

  it("shows build-time snapshot immediately while live is still loading (N-10)", () => {
    const view = resolveBosaiResourceView({
      liveLoading: true,
      liveError: null,
      liveData: null,
      snapshot: { ok: true, data: banner, fetchedAt },
    });
    expect(view).toEqual({
      kind: "ready",
      data: banner,
      stale: true,
      asOf: fetchedAt,
    });
  });

  it("keeps snapshot when GeonicDB live fetch fails", () => {
    const view = resolveBosaiResourceView({
      liveLoading: false,
      liveError: new Error("network"),
      liveData: null,
      snapshot: { ok: true, data: banner, fetchedAt },
    });
    expect(view.kind).toBe("ready");
    if (view.kind === "ready") {
      expect(view.stale).toBe(true);
      expect(view.asOf).toBe(fetchedAt);
    }
  });

  it("returns F-45 error with lastFetchedAt when both live and snapshot fail", () => {
    const view = resolveBosaiResourceView({
      liveLoading: false,
      liveError: new Error("network"),
      liveData: null,
      snapshot: { ok: false, data: null, fetchedAt },
    });
    expect(view).toEqual({ kind: "error", lastFetchedAt: fetchedAt });
  });

  it("returns loading when live is pending and no usable snapshot exists", () => {
    const view = resolveBosaiResourceView({
      liveLoading: true,
      liveError: null,
      liveData: null,
      snapshot: { ok: false, data: null, fetchedAt: null },
    });
    expect(view).toEqual({ kind: "loading" });
  });

  it("near-miss: empty live notices array is success, must not fall back to snapshot", () => {
    const snapshotNotices = [makeBanner("notice")];
    // notices use BosaiNotice[]; use empty array as the live success sentinel.
    const view = resolveBosaiResourceView({
      liveLoading: false,
      liveError: null,
      liveData: [] as unknown[],
      snapshot: {
        ok: true,
        data: snapshotNotices as unknown[],
        fetchedAt,
      },
    });
    expect(view).toEqual({
      kind: "ready",
      data: [],
      stale: false,
      asOf: null,
    });
  });

  it("near-miss: live null (missing entity) falls back to snapshot, not error", () => {
    const view = resolveBosaiResourceView({
      liveLoading: false,
      liveError: null,
      liveData: null,
      snapshot: { ok: true, data: banner, fetchedAt },
    });
    expect(view.kind).toBe("ready");
    if (view.kind === "ready") {
      expect(view.stale).toBe(true);
    }
  });
});
