/**
 * Web Push 購読プロキシ（#35 / #36）のレート制限・同時実行上限。
 *
 * 閾値の根拠:
 * - WAF 120 req / IP / 5 分（evaluationWindowSec=300 を明示）: 正当な購読・解除・
 *   再試行を通しつつ、スクリプトによるサブスクリプション量産を抑える。
 *   **CloudFront 経由トラフィックに対する主たる防御はこちら（WAF）**。
 * - Lambda reserved concurrency 50: 粗いコスト上限の backstop。
 *   CloudFront 経由と Function URL 直叩きは同一プールを共有するため、値を小さくしすぎると
 *   災害時の正規購読急増で住民を締め出しうる。Function URL 直叩きの完全な分離・遮断は
 *   本 PR スコープ外（future follow-up）。
 */

/** WAF RateBasedStatement: IP あたり評価窓内の上限リクエスト数 */
export const WEBPUSH_RATE_LIMIT_PER_5_MIN = 120;

/**
 * WAF RateBasedStatement の評価窓（秒）。AWS 既定は 300。
 * デフォルト依存を避けるため明示し、テストで固定する。
 */
export const WEBPUSH_RATE_LIMIT_EVALUATION_WINDOW_SEC = 300;

/** ScopeDown: この URI プレフィックスに一致するリクエストのみレート制限対象 */
export const WEBPUSH_RATE_LIMIT_URI_PREFIX = "/api/webpush";

/**
 * Lambda reservedConcurrentExecutions。
 * 粗いコスト上限の backstop（主防御は WAF）。災害時の正規急増を締め出さないよう 50。
 */
export const WEBPUSH_LAMBDA_RESERVED_CONCURRENCY = 50;
