/** 内閣府公式警戒レベル配色（guidelines.md 1.2） */
export const ALERT_LEVEL_COLORS = {
  1: { bg: "#FFFFFF", text: "#1a1a1a", border: "#767676" },
  2: { bg: "#F2E700", text: "#1a1a1a", border: "#1a1a1a" },
  3: { bg: "#FF2800", text: "#FFFFFF", border: "#FF2800" },
  4: { bg: "#AA00AA", text: "#FFFFFF", border: "#AA00AA" },
  5: { bg: "#0C000C", text: "#FFFFFF", border: "#0C000C" },
} as const;

export type AlertLevel = keyof typeof ALERT_LEVEL_COLORS;

/** 緊急バナー重大度バリアント → 内閣府配色マッピング */
export const BANNER_VARIANT_COLORS = {
  緊急安全確保: ALERT_LEVEL_COLORS[5],
  避難指示: ALERT_LEVEL_COLORS[4],
  高齢者等避難: ALERT_LEVEL_COLORS[3],
  注意喚起: ALERT_LEVEL_COLORS[2],
  お知らせ: { bg: "#f5f5f5", text: "#1a1a1a", border: "#767676" },
} as const;

export type BannerVariant = keyof typeof BANNER_VARIANT_COLORS;

export const ALERT_LEVEL_LABELS: Record<
  AlertLevel,
  { action: string; officialNote?: string }
> = {
  1: { action: "災害への心構えを高める" },
  2: { action: "自らの避難行動を確認" },
  3: { action: "高齢者等は避難、他の人は準備" },
  4: {
    action: "危険な場所から全員避難",
    officialNote: "警戒レベル4までに全員避難",
  },
  5: {
    action: "命の危険。直ちに安全確保",
    officialNote: "レベル5は既に危険な段階に入っている可能性があります",
  },
};
