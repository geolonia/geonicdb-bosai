import { PUSH_OPT_IN_BANNER_DISMISS_MS } from "@/config/push-opt-in-banner";

/** localStorage: 帯を閉じた時刻（epoch ms の 10 進文字列）。 */
export const PUSH_OPT_IN_BANNER_DISMISS_STORAGE_KEY =
  "geonicdb-bosai-push-opt-in-banner-dismissed-at";

/** フッターの通知トグル本体の id（帯からのリンク先 = フォーカス先）。 */
export const PUSH_OPT_IN_SWITCH_ID = "push-opt-in-switch";

/** フッターの通知トグルを囲むブロックの id（スクロール先の目印）。 */
export const PUSH_OPT_IN_ANCHOR_ID = "push-opt-in";

/**
 * 既定の localStorage を取り出す。
 *
 * **必ず try/catch で囲むこと。** これは既定引数として評価される
 * ＝ 呼び出し先の関数本体の try/catch より前に走るため、ここで throw すると
 * 関数がそのまま throw する。Cookie を全ブロックした環境や `file:` /
 * `data:` スキームでは `localStorage` の getter 自体が SecurityError を
 * 投げるので、`typeof localStorage !== "undefined"` では防げない
 *（typeof もプロパティを評価する）。
 */
function defaultStorage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

/**
 * 帯が「閉じられた状態」か。
 *
 * A2HS 帯（`isA2hsDismissed`）と違い恒久 dismiss にはしない。閉じてから
 * `PUSH_OPT_IN_BANNER_DISMISS_DAYS` 日だけ黙り、その後また出す。
 *
 * 未保存・壊れた値・未来の時刻は「閉じられていない」に倒す
 *（通知導線を黙って失わせない）。未来の時刻に猶予を当てないのは、
 * 時計が進んだ端末で閉じた後 NTP で補正されると、時計が記録に追いつく
 * までの分だけ余計に黙るため。記録が未来である間は出す方に倒す。
 *
 * なお記録は端末時計そのものなので、時計が狂った状態で閉じた場合の
 * ずれは原理的に打ち消せない（追いついた後は記録時刻から猶予 1 回分）。
 */
export function isPushOptInBannerDismissed(
  now: number = Date.now(),
  storage: Pick<Storage, "getItem"> | null | undefined = defaultStorage(),
): boolean {
  try {
    if (!storage || typeof storage.getItem !== "function") return false;
    const raw = storage.getItem(PUSH_OPT_IN_BANNER_DISMISS_STORAGE_KEY);
    if (raw === null) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    const age = now - dismissedAt;
    return age >= 0 && age < PUSH_OPT_IN_BANNER_DISMISS_MS;
  } catch {
    return false;
  }
}

/** 帯を閉じた時刻を記録する。private mode 等で失敗しても呼び出し側は落とさない。 */
export function dismissPushOptInBanner(
  now: number = Date.now(),
  storage: Pick<Storage, "setItem"> | null | undefined = defaultStorage(),
): void {
  try {
    if (!storage || typeof storage.setItem !== "function") return;
    storage.setItem(PUSH_OPT_IN_BANNER_DISMISS_STORAGE_KEY, String(now));
  } catch {
    // 保存できなくても帯は当該セッション内で閉じたままにする（呼び出し側の state）
  }
}
