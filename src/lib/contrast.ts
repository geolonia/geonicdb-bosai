/**
 * 相対輝度とコントラスト比（WCAG 2.x）。
 * 警戒レベル黄色 (#F2E700) など配色の回帰用。
 */
function channel(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    throw new Error(`Expected #RRGGBB, got ${hex}`);
  }
  const r = channel(Number.parseInt(normalized.slice(0, 2), 16));
  const g = channel(Number.parseInt(normalized.slice(2, 4), 16));
  const b = channel(Number.parseInt(normalized.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
