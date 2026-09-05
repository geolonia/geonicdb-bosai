/**
 * ライブ更新（WebSocket）と Web Push が対象とするエンティティタイプ。
 * 定義本体は `shared/bosai-live-entity-types.ts`（Lambda と共有）。
 * WS 用と Push 用は独立した定数（#48）。
 */
export {
  BOSAI_LIVE_ENTITY_TYPES,
  BOSAI_WEBPUSH_ENTITY_TYPES,
  type BosaiLiveEntityType,
  type BosaiWebPushEntityType,
} from "../../shared/bosai-live-entity-types";
