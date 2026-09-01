import { useEffect } from "react";
import { getGeonicdbWsClient } from "@/lib/geonicdb-public-client";

export const BOSAI_LIVE_ENTITY_TYPES = [
  "bosai-Notice",
  "bosai-EmergencyBanner",
  "bosai-AlertLevel",
] as const;

export type BosaiLiveEntityType = (typeof BOSAI_LIVE_ENTITY_TYPES)[number];

export type BosaiLiveUpdateHandlers = {
  "bosai-Notice": () => void;
  "bosai-EmergencyBanner": () => void;
  "bosai-AlertLevel": () => void;
};

/**
 * bosai-Notice / bosai-EmergencyBanner / bosai-AlertLevel の3タイプをWebSocketで購読し、
 * 変更イベント受信時に対応する refetch を呼ぶ。
 *
 * `NEXT_PUBLIC_GEONICDB_WS_API_KEY` が未設定の場合は何もしない（REST取得のみで動作を継続する）。
 * SDKの `connect()` は匿名モードでは使えないため、WS購読には読み取り専用キーが必須。
 */
export function useBosaiLiveUpdates(handlers: BosaiLiveUpdateHandlers): void {
  const onNotice = handlers["bosai-Notice"];
  const onBanner = handlers["bosai-EmergencyBanner"];
  const onAlertLevel = handlers["bosai-AlertLevel"];

  useEffect(() => {
    const client = getGeonicdbWsClient();
    if (!client) return;

    const handleEvent = (event: { entityType: string | string[] }) => {
      const types = Array.isArray(event.entityType)
        ? event.entityType
        : [event.entityType];
      if (types.includes("bosai-Notice")) onNotice();
      if (types.includes("bosai-EmergencyBanner")) onBanner();
      if (types.includes("bosai-AlertLevel")) onAlertLevel();
    };

    client.on("entityCreated", handleEvent);
    client.on("entityUpdated", handleEvent);
    client.on("entityDeleted", handleEvent);

    let cancelled = false;
    client
      .connect()
      .then(() => {
        if (cancelled) return;
        client.subscribe({ entityTypes: [...BOSAI_LIVE_ENTITY_TYPES] });
      })
      .catch(() => {
        // WS接続失敗はREST取得のフォールバックに任せ、致命的エラーにはしない。
      });

    return () => {
      cancelled = true;
      client.off("entityCreated", handleEvent);
      client.off("entityUpdated", handleEvent);
      client.off("entityDeleted", handleEvent);
      client.disconnect();
    };
  }, [onNotice, onBanner, onAlertLevel]);
}
