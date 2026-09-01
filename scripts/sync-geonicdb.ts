/**
 * GeonicDB WebSocket → public/mock JSON 同期（開発用・docs/ws-sync.md）。
 *
 * クライアントバンドルには含めない。別ターミナルで:
 *   npm run sync:geonicdb
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createGeonicdbSyncClient } from "../src/config/geonicdb";
import {
  SYNC_ENTITY_TYPES,
  applyEntityDelete,
  applyEntityUpsert,
  buildEntityPayload,
  defaultSyncLogger,
} from "../src/lib/sync-geonicdb-mock";

/** `.env` を簡易ロード（既存の process.env は上書きしない）。 */
function loadDotEnv(): void {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function main(): Promise<void> {
  loadDotEnv();
  const mockRoot = path.resolve(process.cwd(), "public/mock");
  const logger = defaultSyncLogger;

  let db;
  try {
    // GEONICDB_SYNC_API_KEY 優先、未設定時は GEONICDB_API_KEY にフォールバック
    db = createGeonicdbSyncClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[sync:geonicdb] 接続設定エラー: ${message}\n` +
        `.env に GEONICDB_URL（必要なら GEONICDB_SYNC_API_KEY または GEONICDB_API_KEY / GEONICDB_TENANT）を設定してください。\n` +
        `ポリシー・APIキーの作成は npm run setup:geonicdb（docs/geonicdb-setup.md）。`,
    );
    process.exit(1);
  }

  logger.info(`[sync:geonicdb] mockRoot=${mockRoot}`);
  logger.info("[sync:geonicdb] connecting…");
  await db.connect();
  db.subscribe({ entityTypes: [...SYNC_ENTITY_TYPES] });

  db.on("subscribed", () => {
    logger.info(
      `[sync:geonicdb] subscribed: ${SYNC_ENTITY_TYPES.join(", ")}`,
    );
  });

  db.on("reconnecting", (info) => {
    logger.warn(`[sync:geonicdb] reconnecting (attempt ${info.attempt})`);
  });

  db.on("error", (err) => {
    logger.error("[sync:geonicdb] error", err);
  });

  const onUpsert = async (event: {
    type: string;
    entityId: string;
    entityType: string | string[];
    data?: Record<string, unknown>;
    entity?: Record<string, unknown>;
  }) => {
    const payload = buildEntityPayload(event);
    const result = await applyEntityUpsert({ mockRoot, payload, logger });
    if (!result.ok) {
      logger.warn(`[sync:geonicdb] skipped ${event.type}: ${result.reason}`);
    }
  };

  db.on("entityCreated", (event) => {
    void onUpsert(event);
  });
  db.on("entityUpdated", (event) => {
    void onUpsert(event);
  });
  db.on("entityDeleted", (event) => {
    void applyEntityDelete({
      mockRoot,
      entityId: event.entityId,
      entityType: event.entityType,
      logger,
    }).then((result) => {
      if (!result.ok) {
        logger.warn(
          `[sync:geonicdb] skipped entityDeleted: ${result.reason}`,
        );
      }
    });
  });

  logger.info(
    "[sync:geonicdb] listening for bosai-* events… (Ctrl+C to stop)",
  );
}

main().catch((error) => {
  console.error("[sync:geonicdb] fatal", error);
  process.exitCode = 1;
});
