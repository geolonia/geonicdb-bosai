/**
 * ライブ更新（WebSocket）と Web Push が対象とするエンティティタイプ。
 * フロント（src）と Lambda（infra/cdk/lambda）の単一の定義元。
 */
export const BOSAI_LIVE_ENTITY_TYPES = [
  "bosai-Notice",
  "bosai-EmergencyBanner",
  "bosai-AlertLevel",
] as const;

export type BosaiLiveEntityType = (typeof BOSAI_LIVE_ENTITY_TYPES)[number];
