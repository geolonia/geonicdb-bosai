import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyEntityDelete,
  applyEntityUpsert,
  buildEntityPayload,
  inferLanguageFromNoticeId,
  removeNoticeById,
  upsertNoticeItems,
} from "@/lib/sync-geonicdb-mock";
import type { BosaiNotice } from "@/types/top-page";

const baseNotice = {
  id: "urn:ngsi-ld:bosai-Notice:sync-test:ja",
  type: "bosai-Notice",
  language: "ja",
  translationGroup: "sync-test",
  title: "同期テスト",
  body: "本文",
  publishedAt: "2026-09-01T17:00:00+09:00",
  updatedAt: "2026-09-01T17:00:00+09:00",
} as const;

describe("upsertNoticeItems / removeNoticeById", () => {
  it("prepends new notices and replaces existing ids", () => {
    const first = { ...baseNotice, id: "a", title: "A" } as BosaiNotice;
    const second = { ...baseNotice, id: "b", title: "B" } as BosaiNotice;
    const updated = { ...first, title: "A2" };
    expect(upsertNoticeItems([], first).map((n) => n.id)).toEqual(["a"]);
    expect(upsertNoticeItems([first], second).map((n) => n.id)).toEqual([
      "b",
      "a",
    ]);
    expect(upsertNoticeItems([first, second], updated)[0]?.title).toBe("A2");
  });

  it("removes by id", () => {
    const items = [
      { ...baseNotice, id: "a" },
      { ...baseNotice, id: "b" },
    ] as BosaiNotice[];
    expect(removeNoticeById(items, "a").map((n) => n.id)).toEqual(["b"]);
  });
});

describe("buildEntityPayload / inferLanguageFromNoticeId", () => {
  it("prefers full entity when present", () => {
    const entity = { id: "x", type: "bosai-Notice", title: "t" };
    expect(
      buildEntityPayload({
        entityId: "x",
        entityType: "bosai-Notice",
        data: { title: "ignored" },
        entity,
      }),
    ).toBe(entity);
  });

  it("reconstructs from data when entity is missing", () => {
    expect(
      buildEntityPayload({
        entityId: "urn:ngsi-ld:bosai-Notice:g:en",
        entityType: ["bosai-Notice"],
        data: { title: { type: "Property", value: "Hello" } },
      }),
    ).toMatchObject({
      id: "urn:ngsi-ld:bosai-Notice:g:en",
      type: "bosai-Notice",
    });
  });

  it("infers language from notice urn", () => {
    expect(
      inferLanguageFromNoticeId("urn:ngsi-ld:bosai-Notice:g:ja-easy"),
    ).toBe("ja-easy");
    // near-miss: trailing segment that is not a site language
    expect(inferLanguageFromNoticeId("urn:ngsi-ld:bosai-Notice:g:fr")).toBeNull();
  });
});

describe("applyEntityUpsert / applyEntityDelete", () => {
  it("writes banner/alert overwrite and notice upsert/delete to mock root", async () => {
    const mockRoot = await mkdtemp(path.join(os.tmpdir(), "bosai-sync-"));
    const logs: string[] = [];
    const logger = {
      info: (m: string) => logs.push(m),
      warn: (m: string) => logs.push(`WARN ${m}`),
      error: (m: string) => logs.push(`ERR ${m}`),
    };

    const noticeResult = await applyEntityUpsert({
      mockRoot,
      payload: baseNotice,
      logger,
    });
    expect(noticeResult.ok).toBe(true);
    const noticeFile = path.join(mockRoot, "notices", "ja.json");
    const noticeJson = JSON.parse(await readFile(noticeFile, "utf8")) as {
      items: BosaiNotice[];
    };
    expect(noticeJson.items).toHaveLength(1);
    expect(noticeJson.items[0]?.title).toBe("同期テスト");

    const bannerResult = await applyEntityUpsert({
      mockRoot,
      payload: {
        id: "urn:ngsi-ld:bosai-EmergencyBanner:current-banner:en",
        type: "bosai-EmergencyBanner",
        language: "en",
        translationGroup: "current-banner",
        variant: "notice",
        heading: "All clear",
        body: "No alerts.",
        linkHref: null,
        linkText: null,
        updatedAt: "2026-09-01T17:00:00+09:00",
      },
      logger,
    });
    expect(bannerResult.ok).toBe(true);
    const banner = JSON.parse(
      await readFile(path.join(mockRoot, "emergency-banner", "en.json"), "utf8"),
    ) as { heading: string };
    expect(banner.heading).toBe("All clear");

    const alertResult = await applyEntityUpsert({
      mockRoot,
      payload: {
        id: "urn:ngsi-ld:bosai-AlertLevel:current-alert-level:ko",
        type: "bosai-AlertLevel",
        language: "ko",
        translationGroup: "current-alert-level",
        level: 2,
        label: "level 2",
        body: "check",
        updatedAt: "2026-09-01T17:00:00+09:00",
      },
      logger,
    });
    expect(alertResult.ok).toBe(true);

    const deleted = await applyEntityDelete({
      mockRoot,
      entityId: baseNotice.id,
      entityType: "bosai-Notice",
      logger,
    });
    expect(deleted.ok).toBe(true);
    const afterDelete = JSON.parse(await readFile(noticeFile, "utf8")) as {
      items: BosaiNotice[];
    };
    expect(afterDelete.items).toHaveLength(0);

    const singletonDelete = await applyEntityDelete({
      mockRoot,
      entityId: "urn:ngsi-ld:bosai-EmergencyBanner:current-banner:en",
      entityType: "bosai-EmergencyBanner",
      logger,
    });
    expect(singletonDelete.ok).toBe(true);
    if (singletonDelete.ok) {
      expect(singletonDelete.operation).toBe("noop-warn");
    }

    // near-miss: invalid payload is skipped without throwing
    const bad = await applyEntityUpsert({
      mockRoot,
      payload: { type: "bosai-Notice", language: "ja" },
      logger,
    });
    expect(bad.ok).toBe(false);

    await rm(mockRoot, { recursive: true, force: true });
  });

  it("parses Property-form notice payloads from websocket shape", async () => {
    const mockRoot = await mkdtemp(path.join(os.tmpdir(), "bosai-sync-prop-"));
    const payload = buildEntityPayload({
      entityId: "urn:ngsi-ld:bosai-Notice:prop:ja",
      entityType: "bosai-Notice",
      data: {
        language: { type: "Property", value: "ja" },
        translationGroup: { type: "Property", value: "prop" },
        title: { type: "Property", value: "Property形式" },
        body: { type: "Property", value: "body" },
        publishedAt: { type: "Property", value: "2026-09-01T17:00:00+09:00" },
        updatedAt: { type: "Property", value: "2026-09-01T17:00:00+09:00" },
      },
    });
    // id/type must be on entity for NGSI-LD — add them as WS entity would
    const result = await applyEntityUpsert({
      mockRoot,
      payload: { ...payload, id: payload.id, type: "bosai-Notice" },
    });
    expect(result.ok).toBe(true);
    await rm(mockRoot, { recursive: true, force: true });
  });
});
