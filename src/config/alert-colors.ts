/** 内閣府公式警戒レベル配色（guidelines.md 1.2） */
export const ALERT_LEVEL_COLORS = {
  1: { bg: "#FFFFFF", text: "#1a1a1a", border: "#767676" },
  2: { bg: "#F2E700", text: "#1a1a1a", border: "#1a1a1a" },
  3: { bg: "#FF2800", text: "#FFFFFF", border: "#FF2800" },
  4: { bg: "#AA00AA", text: "#FFFFFF", border: "#AA00AA" },
  5: { bg: "#0C000C", text: "#FFFFFF", border: "#0C000C" },
} as const;

export type AlertLevel = keyof typeof ALERT_LEVEL_COLORS;

/**
 * 緊急バナー重大度バリアント（docs/data-model.md）。
 * 日本語ラベルは UI_STRINGS.bannerVariants で解決する。
 */
export const BANNER_VARIANT_COLORS = {
  "emergency-safety": ALERT_LEVEL_COLORS[5],
  "evacuation-order": ALERT_LEVEL_COLORS[4],
  "elderly-evacuation": ALERT_LEVEL_COLORS[3],
  advisory: ALERT_LEVEL_COLORS[2],
  notice: { bg: "#f5f5f5", text: "#1a1a1a", border: "#767676" },
} as const;

export type BannerVariant = keyof typeof BANNER_VARIANT_COLORS;

export const BANNER_VARIANTS = Object.keys(
  BANNER_VARIANT_COLORS,
) as BannerVariant[];
