/**
 * ライブ更新・Web Push が対象とするエンティティタイプ。
 * Lambda（infra/cdk/lambda/webpush-proxy）からも同一配列を参照する。
 */
export const BOSAI_LIVE_ENTITY_TYPES = [
  "bosai-Notice",
  "bosai-EmergencyBanner",
  "bosai-AlertLevel",
] as const;

export type BosaiLiveEntityType = (typeof BOSAI_LIVE_ENTITY_TYPES)[number];
