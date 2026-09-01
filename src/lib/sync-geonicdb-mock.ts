/**
 * GeonicDB WebSocket イベント → public/mock JSON 反映ロジック（docs/ws-sync.md）。
 * 実 WS 接続とは分離し、ユニットテスト可能にする。
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isSiteLanguage, type SiteLanguage } from "@/config/site-language";
import {
  parseAlertLevel,
  parseEmergencyBanner,
  parseNotice,
  parseNoticeList,
} from "@/lib/validate-top-page-data";
import type {
  BosaiAlertLevel,
  BosaiEmergencyBanner,
  BosaiNotice,
} from "@/types/top-page";

export const SYNC_ENTITY_TYPES = [
  "bosai-Notice",
  "bosai-EmergencyBanner",
  "bosai-AlertLevel",
] as const;

export type SyncEntityType = (typeof SYNC_ENTITY_TYPES)[number];

export type SyncApplyResult =
  | {
      ok: true;
      kind: SyncEntityType;
      language: SiteLanguage;
      path: string;
      summary: string;
      operation: "upsert" | "overwrite" | "delete" | "noop-warn";
    }
  | {
      ok: false;
      reason: string;
    };

export type SyncLogger = {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string, cause?: unknown) => void;
};

export const defaultSyncLogger: SyncLogger = {
  info: (message) => console.log(message),
  warn: (message) => console.warn(message),
  error: (message, cause) => console.error(message, cause ?? ""),
};

export function normalizeEntityType(
  entityType: string | string[] | undefined,
): string | null {
  if (typeof entityType === "string" && entityType) return entityType;
  if (Array.isArray(entityType) && typeof entityType[0] === "string") {
    return entityType[0];
  }
  return null;
}

export function isSyncEntityType(value: string): value is SyncEntityType {
  return (SYNC_ENTITY_TYPES as readonly string[]).includes(value);
}

/** EntityEvent の entity / data からパース用ペイロードを組み立てる。 */
export function buildEntityPayload(event: {
  entityId: string;
  entityType: string | string[];
  data?: Record<string, unknown>;
  entity?: Record<string, unknown>;
}): Record<string, unknown> {
  if (event.entity && typeof event.entity === "object") {
    return event.entity;
  }
  const type = normalizeEntityType(event.entityType) ?? "Unknown";
  return {
    id: event.entityId,
    type,
    ...(event.data ?? {}),
  };
}

function mockPath(
  mockRoot: string,
  kind: "notices" | "emergency-banner" | "alert-level",
  language: SiteLanguage,
): string {
  return path.join(mockRoot, kind, `${language}.json`);
}

async function readJsonFile(filePath: string): Promise<unknown> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as unknown;
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function upsertNoticeItems(
  items: BosaiNotice[],
  notice: BosaiNotice,
): BosaiNotice[] {
  const index = items.findIndex((item) => item.id === notice.id);
  if (index >= 0) {
    const next = items.slice();
    next[index] = notice;
    return next;
  }
  return [notice, ...items];
}

export function removeNoticeById(
  items: BosaiNotice[],
  id: string,
): BosaiNotice[] {
  return items.filter((item) => item.id !== id);
}

async function loadNoticeItems(
  filePath: string,
): Promise<BosaiNotice[]> {
  try {
    const raw = await readJsonFile(filePath);
    return parseNoticeList(raw).items;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function applyEntityUpsert(options: {
  mockRoot: string;
  payload: unknown;
  logger?: SyncLogger;
}): Promise<SyncApplyResult> {
  const logger = options.logger ?? defaultSyncLogger;
  if (!options.payload || typeof options.payload !== "object") {
    return { ok: false, reason: "payload must be an object" };
  }
  const type = (options.payload as { type?: unknown }).type;
  if (typeof type !== "string" || !isSyncEntityType(type)) {
    return { ok: false, reason: `unsupported entity type: ${String(type)}` };
  }

  try {
    if (type === "bosai-Notice") {
      const notice = parseNotice(options.payload);
      if (!isSiteLanguage(notice.language)) {
        return { ok: false, reason: `invalid language: ${notice.language}` };
      }
      const filePath = mockPath(options.mockRoot, "notices", notice.language);
      const items = upsertNoticeItems(await loadNoticeItems(filePath), notice);
      await writeJsonFile(filePath, { items });
      const summary = `[entityUpsert] bosai-Notice ${notice.language}: ${notice.title}`;
      logger.info(summary);
      return {
        ok: true,
        kind: type,
        language: notice.language,
        path: filePath,
        summary,
        operation: "upsert",
      };
    }

    if (type === "bosai-EmergencyBanner") {
      const banner = parseEmergencyBanner(options.payload);
      const filePath = mockPath(
        options.mockRoot,
        "emergency-banner",
        banner.language,
      );
      await writeJsonFile(filePath, toMockEmergencyBanner(banner));
      const summary = `[entityUpsert] bosai-EmergencyBanner ${banner.language}: ${banner.heading}`;
      logger.info(summary);
      return {
        ok: true,
        kind: type,
        language: banner.language,
        path: filePath,
        summary,
        operation: "overwrite",
      };
    }

    const alert = parseAlertLevel(options.payload);
    const filePath = mockPath(options.mockRoot, "alert-level", alert.language);
    await writeJsonFile(filePath, toMockAlertLevel(alert));
    const summary = `[entityUpsert] bosai-AlertLevel ${alert.language}: ${alert.label}`;
    logger.info(summary);
    return {
      ok: true,
      kind: type,
      language: alert.language,
      path: filePath,
      summary,
      operation: "overwrite",
    };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : `upsert failed: ${String(error)}`;
    logger.error(`[sync] parse/write failed: ${reason}`, error);
    return { ok: false, reason };
  }
}

export async function applyEntityDelete(options: {
  mockRoot: string;
  entityId: string;
  entityType: string | string[];
  languageHint?: SiteLanguage;
  logger?: SyncLogger;
}): Promise<SyncApplyResult> {
  const logger = options.logger ?? defaultSyncLogger;
  const type = normalizeEntityType(options.entityType);
  if (!type || !isSyncEntityType(type)) {
    return { ok: false, reason: `unsupported entity type: ${String(type)}` };
  }

  if (type === "bosai-EmergencyBanner" || type === "bosai-AlertLevel") {
    const summary = `[entityDeleted] ${type} ${options.entityId} (singleton delete ignored)`;
    logger.warn(summary);
    return {
      ok: true,
      kind: type,
      language: options.languageHint ?? "ja",
      path: "",
      summary,
      operation: "noop-warn",
    };
  }

  // Notice: language は id 末尾か languageHint から推定
  const language =
    options.languageHint ??
    inferLanguageFromNoticeId(options.entityId) ??
    null;
  if (!language) {
    return {
      ok: false,
      reason: `cannot determine language for deleted notice ${options.entityId}`,
    };
  }

  try {
    const filePath = mockPath(options.mockRoot, "notices", language);
    const items = removeNoticeById(
      await loadNoticeItems(filePath),
      options.entityId,
    );
    await writeJsonFile(filePath, { items });
    const summary = `[entityDeleted] bosai-Notice ${language}: ${options.entityId}`;
    logger.info(summary);
    return {
      ok: true,
      kind: type,
      language,
      path: filePath,
      summary,
      operation: "delete",
    };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : `delete failed: ${String(error)}`;
    logger.error(`[sync] delete failed: ${reason}`, error);
    return { ok: false, reason };
  }
}

/** id 形式 `urn:ngsi-ld:bosai-Notice:<group>:<lang>` から言語を拾う。 */
export function inferLanguageFromNoticeId(entityId: string): SiteLanguage | null {
  const parts = entityId.split(":");
  const maybeLang = parts[parts.length - 1];
  return isSiteLanguage(maybeLang) ? maybeLang : null;
}

function toMockEmergencyBanner(banner: BosaiEmergencyBanner) {
  return {
    id: banner.id,
    type: banner.type,
    language: banner.language,
    translationGroup: banner.translationGroup,
    variant: banner.variant,
    heading: banner.heading,
    body: banner.body,
    linkHref: banner.linkHref,
    linkText: banner.linkText,
    updatedAt: banner.updatedAt,
  };
}

function toMockAlertLevel(alert: BosaiAlertLevel) {
  return {
    id: alert.id,
    type: alert.type,
    language: alert.language,
    translationGroup: alert.translationGroup,
    level: alert.level,
    label: alert.label,
    body: alert.body,
    updatedAt: alert.updatedAt,
  };
}
