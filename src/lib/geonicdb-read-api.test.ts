import { describe, expect, it, vi } from "vitest";
import {
  BOSAI_ENTITY_TYPES,
  BOSAI_TRANSLATION_GROUPS,
  buildAlertLevelQuery,
  buildEmergencyBannerQuery,
  buildNoticesQuery,
  fetchAlertLevel,
  fetchEmergencyBanner,
  fetchNotices,
  quoteNgsiLdString,
} from "@/lib/geonicdb-read-api";

describe("geonicdb-read-api query builders", () => {
  it("builds notices query filtered by language", () => {
    expect(buildNoticesQuery("ja")).toEqual({
      type: BOSAI_ENTITY_TYPES.notice,
      q: 'language=="ja"',
      orderBy: "publishedAt",
      orderDirection: "desc",
      limit: 20,
    });
  });

  it("builds emergency banner singleton query", () => {
    expect(buildEmergencyBannerQuery("zh-CN")).toEqual({
      type: BOSAI_ENTITY_TYPES.emergencyBanner,
      q: `translationGroup=="${BOSAI_TRANSLATION_GROUPS.emergencyBanner}";language=="zh-CN"`,
      limit: 1,
    });
  });

  it("builds alert level singleton query", () => {
    expect(buildAlertLevelQuery("vi")).toEqual({
      type: BOSAI_ENTITY_TYPES.alertLevel,
      q: `translationGroup=="${BOSAI_TRANSLATION_GROUPS.alertLevel}";language=="vi"`,
      limit: 1,
    });
  });

  // near-miss: language codes with special chars must be escaped in q
  it("escapes quotes inside NGSI-LD string literals", () => {
    expect(quoteNgsiLdString('a"b')).toBe('"a\\"b"');
  });
});

describe("geonicdb-read-api fetch helpers", () => {
  it("calls getEntities with the notices query", async () => {
    const getEntities = vi.fn().mockResolvedValue([{ id: "n1" }]);
    const result = await fetchNotices({ getEntities }, "en", { limit: 5 });
    expect(getEntities).toHaveBeenCalledWith(buildNoticesQuery("en", { limit: 5 }));
    expect(result).toEqual([{ id: "n1" }]);
  });

  it("returns null when banner entities are empty", async () => {
    const getEntities = vi.fn().mockResolvedValue([]);
    await expect(
      fetchEmergencyBanner({ getEntities }, "ko"),
    ).resolves.toBeNull();
    expect(getEntities).toHaveBeenCalledWith(buildEmergencyBannerQuery("ko"));
  });

  it("returns the first alert-level entity", async () => {
    const entity = { id: "a1", level: 1 };
    const getEntities = vi.fn().mockResolvedValue([entity]);
    await expect(fetchAlertLevel({ getEntities }, "ja-easy")).resolves.toBe(
      entity,
    );
  });
});
