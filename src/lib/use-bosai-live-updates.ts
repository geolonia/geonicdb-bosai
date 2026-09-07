import {
  BOSAI_LIVE_ENTITY_TYPES,
  type BosaiLiveEntityType,
} from "@/lib/bosai-live-entity-types";
import { useCallback, useEffect, useRef } from "react";
import { getGeonicdbWsClient } from "@/lib/geonicdb-public-client";

export { BOSAI_LIVE_ENTITY_TYPES, type BosaiLiveEntityType };

export type BosaiLiveUpdateHandlers = {
  "bosai-Notice": () => void;
  "bosai-EmergencyBanner": () => void;
  "bosai-AlertLevel": () => void;
};

/**
 * 復帰の取りこぼし回収をまとめる時間窓（ミリ秒）。
 *
 * bfcache 復帰では `visibilitychange` と `pageshow` が連続で発火し、WS の再接続が続けば
 * `subscribed` も重なる。同じ「復帰」に対して3リソースを何度も取り直さないよう、
 * この窓の中の2回目以降は捨てる。窓を跨いだ復帰は常に再取得する（取りこぼしを増やさない）。
 */
export const RESUME_REFETCH_DEDUPE_MS = 1000;

/**
 * bosai-Notice / bosai-EmergencyBanner / bosai-AlertLevel の3タイプをWebSocketで購読し、
 * 変更イベント受信時に対応する refetch を呼ぶ。
 *
 * WS が繋がっていない間の変更はイベントとして届かないため、**画面が再び可視になったとき**と
 * **WS の購読が（再）確立したとき**にも3リソースをまとめて再取得する（issue #83）。
 * iOS の PWA はバックグラウンドで WS が切断されるので、これが無いと
 * 「Web Push の通知を受けて開いたのに古い警戒レベルが表示され続ける」状態になる。
 * スタンドアロン PWA には手動リロードの導線が無く、利用者が自力で復旧できない。
 *
 * `NEXT_PUBLIC_GEONICDB_WS_API_KEY` が未設定の場合は WS 購読を行わない（REST取得のみで動作を継続する）。
 * SDKの `connect()` は匿名モードでは使えないため、WS購読には読み取り専用キーが必須。
 * **復帰時の再取得は WS キーの有無に関わらず動く。**
 */
export function useBosaiLiveUpdates(handlers: BosaiLiveUpdateHandlers): void {
  const onNotice = handlers["bosai-Notice"];
  const onBanner = handlers["bosai-EmergencyBanner"];
  const onAlertLevel = handlers["bosai-AlertLevel"];

  const lastCatchUpAtRef = useRef(Number.NEGATIVE_INFINITY);

  /** 復帰・再接続時の取りこぼし回収。短時間に重なった呼び出しは1回にまとめる。 */
  const refetchCatchUp = useCallback(() => {
    const now = Date.now();
    if (now - lastCatchUpAtRef.current < RESUME_REFETCH_DEDUPE_MS) return;
    lastCatchUpAtRef.current = now;
    onNotice();
    onBanner();
    onAlertLevel();
  }, [onNotice, onBanner, onAlertLevel]);

  // 復帰時の取りこぼし回収。WS の有無と独立させる（REST のみの構成でも効かせるため）。
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      refetchCatchUp();
    };
    // bfcache からの復帰では visibilitychange が発火しないことがある。
    // 初回ロードでの二重取得を避けるため persisted のときだけ拾う。
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      refetchCatchUp();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [refetchCatchUp]);

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

    // 初回の subscribed は、マウント時の初期取得と重複するので捨てる。
    // 2回目以降＝再接続後の購読確立なので、切断中に起きた変更を回収する。
    let sawFirstSubscribed = false;
    const handleSubscribed = () => {
      if (!sawFirstSubscribed) {
        sawFirstSubscribed = true;
        return;
      }
      refetchCatchUp();
    };

    client.on("entityCreated", handleEvent);
    client.on("entityUpdated", handleEvent);
    client.on("entityDeleted", handleEvent);
    client.on("subscribed", handleSubscribed);

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
      client.off("subscribed", handleSubscribed);
      client.disconnect();
    };
  }, [onNotice, onBanner, onAlertLevel, refetchCatchUp]);
}
