/**
 * 画面オープン中の WebSocket ライブ更新が対象とするエンティティタイプ。
 * フロント（src）と Lambda（infra/cdk/lambda）の単一の定義元。
 *
 * Web Push 用の `BOSAI_WEBPUSH_ENTITY_TYPES` とは意図的に分ける。
 * WS は画面を開いている間の即時反映なのでノイズにならない（3タイプ全部）。
 * Push は端末への割り込みなので警戒レベル変更だけに絞る（#48）。
 * 片方だけ変えたいときに両方を誤って変えないよう、定数を独立させている。
 */
export const BOSAI_LIVE_ENTITY_TYPES = [
  "bosai-Notice",
  "bosai-EmergencyBanner",
  "bosai-AlertLevel",
] as const;

export type BosaiLiveEntityType = (typeof BOSAI_LIVE_ENTITY_TYPES)[number];

/**
 * Web Push サブスクリプション作成時の購読対象エンティティタイプ。
 * 住民端末への割り込みは警戒レベル変更時のみ（#48）。
 * 画面の WS 更新対象は `BOSAI_LIVE_ENTITY_TYPES` を参照すること。
 */
export const BOSAI_WEBPUSH_ENTITY_TYPES = ["bosai-AlertLevel"] as const;

export type BosaiWebPushEntityType =
  (typeof BOSAI_WEBPUSH_ENTITY_TYPES)[number];
