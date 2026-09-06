import { PUSH_OPT_IN_BANNER_DISMISS_MS } from "@/config/push-opt-in-banner";

/** localStorage: 帯を閉じた時刻（epoch ms の 10 進文字列）。 */
export const PUSH_OPT_IN_BANNER_DISMISS_STORAGE_KEY =
  "geonicdb-bosai-push-opt-in-banner-dismissed-at";

/** フッターの通知トグル本体の id（帯からのリンク先 = フォーカス先）。 */
export const PUSH_OPT_IN_SWITCH_ID = "push-opt-in-switch";

/** フッターの通知トグルを囲むブロックの id（スクロール先の目印）。 */
export const PUSH_OPT_IN_ANCHOR_ID = "push-opt-in";

function defaultReadStorage(): Pick<Storage, "getItem"> | null {
  return typeof localStorage !== "undefined" ? localStorage : null;
}

function defaultWriteStorage(): Pick<Storage, "setItem"> | null {
  return typeof localStorage !== "undefined" ? localStorage : null;
}

/**
 * 帯が「閉じられた状態」か。
 *
 * A2HS 帯（`isA2hsDismissed`）と違い恒久 dismiss にはしない。閉じてから
 * `PUSH_OPT_IN_BANNER_DISMISS_DAYS` 日だけ黙り、その後また出す。
 *
 * 端末時計が前後にずれても最大で猶予 1 回分しか狂わないよう、差の絶対値で見る。
 * 未保存・壊れた値は「閉じられていない」に倒す（通知導線を黙って失わせない）。
 */
export function isPushOptInBannerDismissed(
  now: number = Date.now(),
  storage: Pick<Storage, "getItem"> | null | undefined = defaultReadStorage(),
): boolean {
  try {
    if (!storage || typeof storage.getItem !== "function") return false;
    const raw = storage.getItem(PUSH_OPT_IN_BANNER_DISMISS_STORAGE_KEY);
    if (raw === null) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    return Math.abs(now - dismissedAt) < PUSH_OPT_IN_BANNER_DISMISS_MS;
  } catch {
    return false;
  }
}

/** 帯を閉じた時刻を記録する。private mode 等で失敗しても呼び出し側は落とさない。 */
export function dismissPushOptInBanner(
  now: number = Date.now(),
  storage: Pick<Storage, "setItem"> | null | undefined = defaultWriteStorage(),
): void {
  try {
    if (!storage || typeof storage.setItem !== "function") return;
    storage.setItem(PUSH_OPT_IN_BANNER_DISMISS_STORAGE_KEY, String(now));
  } catch {
    // 保存できなくても帯は当該セッション内で閉じたままにする（呼び出し側の state）
  }
}
