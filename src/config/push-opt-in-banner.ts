/**
 * ヘッダー上部に出す「通知をオンにすることをおすすめします」帯の設定。
 *
 * 運用でいじるつまみはここだけ。コンポーネント側には数値を直書きしない。
 */

/**
 * 帯を閉じてから再表示するまでの日数。
 *
 * 短くすると通知の到達率は上がるが、住民から見れば毎回出る邪魔な帯になる。
 * 既定は 1 週間。自治体の運用方針に合わせて変更してよい。
 */
export const PUSH_OPT_IN_BANNER_DISMISS_DAYS = 7;

/** 1 日のミリ秒。 */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 再表示までの猶予（ミリ秒）。`PUSH_OPT_IN_BANNER_DISMISS_DAYS` から導出する。 */
export const PUSH_OPT_IN_BANNER_DISMISS_MS =
  PUSH_OPT_IN_BANNER_DISMISS_DAYS * MS_PER_DAY;

/**
 * 初回操作が無いまま帯を出すまでの待ち（ミリ秒）。
 *
 * この帯はヘッダーより上の文書フローに入るため、ロード直後に差し込むと
 * ページ全体が下へずれて CLS になる（A2HS 帯で実測済み。
 * `AddToHomeScreenPrompt` の `A2HS_CHROMIUM_IDLE_MS` と同じ理由）。
 * click / keyup があれば即出す。無操作ならこの時間だけ待つ。
 * 押下（pointerdown）ではなくクリック確定後に出すのは、押下時点でずらすと
 * 利用者の最初のタップが無効になるため。
 */
export const PUSH_OPT_IN_BANNER_REVEAL_IDLE_MS = 30_000;
